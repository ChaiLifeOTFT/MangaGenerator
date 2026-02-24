#!/usr/bin/env python3
"""
MangaForge Fast Pipeline — Generate a full manga chapter in one shot.
Parallel DALL-E generation + automatic page composition + CBZ output.

Usage:
    python fast_manga.py "Your manga concept description" [output_dir]
    python fast_manga.py "A samurai cat in space" /tmp/samurai_cat/

Generates: script → parallel panel art → composed pages → CBZ
"""

import json, os, sys, time, requests, concurrent.futures
from pathlib import Path

API_KEY = os.environ.get("OPENAI_API_KEY") or open(os.path.expanduser("~/.openclaw/.env")).read().split("OPENAI_API_KEY=")[1].strip().split("\n")[0]
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
MAX_PARALLEL = 4  # DALL-E rate limit safe


def chat(prompt, system="You are a manga script writer."):
    """Call GPT-4o for script generation."""
    r = requests.post("https://api.openai.com/v1/chat/completions", headers=HEADERS, json={
        "model": "gpt-4o",
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        "temperature": 0.8,
        "response_format": {"type": "json_object"}
    }, timeout=60)
    return json.loads(r.json()["choices"][0]["message"]["content"])


def generate_image(prompt, fname):
    """Generate a single DALL-E 3 panel."""
    try:
        r = requests.post("https://api.openai.com/v1/images/generations", headers=HEADERS, json={
            "model": "dall-e-3",
            "prompt": prompt,
            "n": 1,
            "size": "1024x1024",
            "style": "vivid",
            "quality": "standard"
        }, timeout=120)
        data = r.json()
        if "data" in data and len(data["data"]) > 0:
            img_url = data["data"][0]["url"]
            img_data = requests.get(img_url, timeout=60).content
            with open(fname, "wb") as f:
                f.write(img_data)
            return {"file": fname, "status": "ok", "size": len(img_data)}
        else:
            return {"file": fname, "status": "failed", "error": data.get("error", {}).get("message", "unknown")}
    except Exception as e:
        return {"file": fname, "status": "failed", "error": str(e)}


def generate_panel_task(args):
    """Worker for parallel generation."""
    panel_id, prompt, fname = args
    print(f"  [{panel_id}] generating...", flush=True)
    result = generate_image(prompt, fname)
    status = "OK" if result["status"] == "ok" else "FAIL"
    size_kb = result.get("size", 0) // 1024
    print(f"  [{panel_id}] {status} {f'({size_kb}KB)' if size_kb else result.get('error', '')}", flush=True)
    return panel_id, result


def fast_generate(concept, output_dir):
    """Full pipeline: concept → script → parallel art → composed pages → CBZ."""
    os.makedirs(output_dir, exist_ok=True)
    t0 = time.time()

    # === Step 1: Generate script ===
    print(f"\n=== STEP 1: Script Generation ===")
    print(f"Concept: {concept}")

    script = chat(f"""Create a manga script based on this concept: "{concept}"

Return JSON with this structure:
{{
  "title": "Title Here",
  "style_bible": {{
    "setting": "description of the world/setting",
    "themes": ["theme1", "theme2", "theme3"],
    "visual_motifs": ["motif1", "motif2"],
    "characters": [{{"name":"...","role":"...","age":"...","appearance":"...","costume":"..."}}]
  }},
  "pages": [
    {{
      "number": 1,
      "panels": [
        {{"id": "1-1", "description": "visual description", "dialogue": ["Character: line"], "sfx": ["SOUND"], "notes": "direction"}}
      ]
    }}
  ]
}}

Create 3 pages with 4 panels each (12 panels total). Make it dramatic, emotional, with strong visual storytelling. Mix action, dialogue, and atmospheric panels.""")

    title = script.get("title", "Untitled")
    pages = script.get("pages", [])
    total_panels = sum(len(p["panels"]) for p in pages)
    script_time = time.time() - t0

    script_path = os.path.join(output_dir, "script.json")
    with open(script_path, "w") as f:
        json.dump(script, f, indent=2)

    print(f'"{title}" — {len(pages)} pages, {total_panels} panels ({script_time:.1f}s)')

    # === Step 2: Parallel panel generation ===
    print(f"\n=== STEP 2: Panel Art (parallel x{MAX_PARALLEL}) ===")
    t1 = time.time()

    style_prefix = "Black and white manga art style, high contrast ink drawing, detailed Japanese manga illustration. "
    chars = {c["name"]: c for c in script.get("style_bible", {}).get("characters", [])}
    setting = script.get("style_bible", {}).get("setting", "")

    tasks = []
    for page in pages:
        for panel in page["panels"]:
            pid = panel["id"]
            fname = os.path.join(output_dir, f'panel_{pid.replace("-", "_")}.png')

            prompt = style_prefix + panel["description"]
            for cname, cinfo in chars.items():
                if cname.lower() in panel["description"].lower():
                    prompt += f" {cname}: {cinfo['appearance']} wearing {cinfo.get('costume', 'appropriate attire')}."
            prompt += f" Setting: {setting}"

            tasks.append((pid, prompt, fname))

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_PARALLEL) as executor:
        futures = {executor.submit(generate_panel_task, task): task[0] for task in tasks}
        for future in concurrent.futures.as_completed(futures):
            pid, result = future.result()
            results[pid] = result

    art_time = time.time() - t1
    ok_count = sum(1 for r in results.values() if r["status"] == "ok")
    print(f"\n{ok_count}/{total_panels} panels generated ({art_time:.1f}s)")

    # === Step 3: Compose pages ===
    print(f"\n=== STEP 3: Page Composition ===")
    t2 = time.time()

    compose_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "compose_pages.py")
    composed_dir = os.path.join(output_dir, "composed")

    import subprocess
    result = subprocess.run(
        [sys.executable, compose_script, script_path, output_dir, composed_dir],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"Composition error: {result.stderr}")

    compose_time = time.time() - t2

    # === Summary ===
    total_time = time.time() - t0
    cbz_files = [f for f in os.listdir(composed_dir) if f.endswith('.cbz')] if os.path.isdir(composed_dir) else []

    print(f"\n{'='*50}")
    print(f"COMPLETE: {title}")
    print(f"  Script:      {script_time:.1f}s")
    print(f"  Panel art:   {art_time:.1f}s ({ok_count} panels, {MAX_PARALLEL} parallel)")
    print(f"  Composition: {compose_time:.1f}s")
    print(f"  TOTAL:       {total_time:.1f}s")
    if cbz_files:
        cbz_path = os.path.join(composed_dir, cbz_files[0])
        size_mb = os.path.getsize(cbz_path) / (1024 * 1024)
        print(f"  CBZ: {cbz_path} ({size_mb:.1f}MB)")
    print(f"{'='*50}")

    return {
        "title": title,
        "script": script_path,
        "panels": ok_count,
        "total_time": total_time,
        "output_dir": output_dir,
        "composed_dir": composed_dir,
        "cbz": os.path.join(composed_dir, cbz_files[0]) if cbz_files else None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} \"manga concept\" [output_dir]")
        print(f"Example: {sys.argv[0]} \"A samurai cat defending a ramen shop from ninja dogs\"")
        sys.exit(1)

    concept = sys.argv[1]
    safe_name = concept[:40].replace(" ", "_").replace("/", "_").replace("'", "").replace('"', '')
    output_dir = sys.argv[2] if len(sys.argv) > 2 else f"/tmp/manga_{safe_name}"

    fast_generate(concept, output_dir)
