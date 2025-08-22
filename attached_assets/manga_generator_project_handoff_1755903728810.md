# Manga Generator — Project Handoff

> TL;DR: Front‑end on Replit, art engine on your GPU (Automatic1111) or a free API. Ship chapters as CBZ.

---

## 1) Architecture (at a glance)
- **Authoring/Orchestration**: Replit app (React) — turns prose → manga script (pages/panels) and calls an image engine.
- **Image Engines (choose 1):**
  - **Local GPU (Recommended, free):** Automatic1111 (Stable Diffusion WebUI) via REST API (`/sdapi/v1/txt2img`, `/sdapi/v1/img2img`).
  - **Hugging Face Inference API (free tier):** models like `stabilityai/stable-diffusion-xl-base-1.0`, `hakurei/waifu-diffusion`.
- **Bridge (when local):** Cloudflare Tunnel or ngrok exposes `http://127.0.0.1:7860` to the Replit app.
- **Output:** Panels → CBZ exporter in app; optional page layout.

---

## 2) Roles & Handoff Ownership
- **Owner:** You (project lead)
- **Script/Paneling:** Monday (LLM in app) or Claude (optional) → produces JSON panel script.
- **Illustration:** Automatic1111 (local) or HF API (cloud).
- **Assembly/Export:** Replit UI (CBZ generator included).

---

## 3) Prereqs
**Local machine (Linux/NVIDIA):**
- RTX 4070 (8GB VRAM) or better; Drivers ≥ 550, CUDA runtimes present via PyTorch wheels.
- Python 3.10–3.11.

**Replit:**
- One project with: client (React) + minimal Node/Express proxy.
- Secrets panel access.

---

## 4) Local Engine Setup (Automatic1111)
1. **Install & Launch with API**
   ```bash
   cd ~/stable-diffusion-webui
   # Edit once to make flags permanent
   nano webui-user.sh
   # Replace contents with:
   export COMMANDLINE_ARGS="--api --xformers --medvram --opt-sdp-attention --port 7860 --listen 127.0.0.1"
   # Save, then launch
   bash webui.sh
   ```
2. **Quick API test**
   ```bash
   curl -s -X POST "http://127.0.0.1:7860/sdapi/v1/txt2img" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"manga panel, crosshatching, screentones","width":512,"height":768,"steps":20}' | jq '.images[0] != null'
   ```
3. **Expose to internet (pick one)**
   - **Cloudflare Tunnel (no login):**
     ```bash
     cd ~ && curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
     chmod +x cloudflared
     ./cloudflared tunnel --url http://127.0.0.1:7860
     ```
     Copy the `https://<name>.trycloudflare.com` URL.
   - **ngrok:**
     ```bash
     ngrok config add-authtoken <YOUR_TOKEN>
     ngrok http 7860
     ```

---

## 5) Replit Setup (Proxy + Client)
**Secrets (Replit → 🔒 Secrets):**
- `A1111_URL` = `https://<your-tunnel>.trycloudflare.com` (or ngrok URL)
- Optional cloud fallback: `HF_API_KEY` (Hugging Face)

**Server: `server/index.js`**
```js
import express from "express";
import fetch from "node-fetch";
const app = express();
app.use(express.json({ limit: "20mb" }));
const A1111_URL = process.env.A1111_URL; // e.g. https://abc.trycloudflare.com

app.post("/api/txt2img", async (req, res) => {
  try {
    const r = await fetch(`${A1111_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/img2img", async (req, res) => {
  try {
    const r = await fetch(`${A1111_URL}/sdapi/v1/img2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(3000, () => console.log("Proxy running on :3000"));
```

**Client image call (txt2img)**
```js
async function a1111ImageFromProxy(prompt, opts = {}) {
  const payload = {
    prompt,
    negative_prompt: "color, low quality, watermark, extra digits, malformed hands",
    width: opts.width ?? 768,
    height: opts.height ?? 1024,
    steps: opts.steps ?? 26,
    cfg_scale: opts.cfg ?? 7,
    sampler_name: opts.sampler ?? "Euler a",
    seed: opts.seed ?? -1,
    batch_size: 1,
  };
  const res = await fetch("/api/txt2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("A1111 proxy failed " + res.status);
  const data = await res.json();
  return `data:image/png;base64,${data.images[0]}`;
}
```

**Client image call (img2img) for consistency**
```js
async function a1111Img2ImgFromProxy(b64Image, prompt, opts = {}) {
  const payload = {
    prompt,
    negative_prompt: "color, low quality, watermark, extra digits, malformed hands",
    width: opts.width ?? 768,
    height: opts.height ?? 1024,
    steps: opts.steps ?? 22,
    cfg_scale: opts.cfg ?? 6,
    denoising_strength: opts.denoise ?? 0.3,
    sampler_name: opts.sampler ?? "Euler a",
    seed: opts.seed ?? -1,
    init_images: [b64Image.replace(/^data:image\/\w+;base64,/, "")],
  };
  const res = await fetch("/api/img2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("A1111 img2img failed " + res.status);
  const data = await res.json();
  return `data:image/png;base64,${data.images[0]}`;
}
```

---

## 6) Script Format (LLM → Panels JSON)
**System prompt (generator):**
```text
You are a Manga Generator AI. Output ONLY valid JSON with this shape:
{
  "title": string,
  "style_bible": {
    "setting": string,
    "themes": string[],
    "visual_motifs": string[],
    "characters": [
      {"name": string, "role": string, "age": string, "appearance": string, "costume": string, "poses": string[], "expressions": string[]}
    ]
  },
  "pages": [
    { "number": number, "panels": [
      {"id": string, "description": string, "dialogue": string[], "sfx": string[], "notes": string}
    ] }
  ]
}
Constraints: 18–28 pages, 4–7 panels per page. Black‑and‑white manga cinematography; end with a strong beat.
```

**Image prompt template (per panel):**
```text
Black‑and‑white Japanese manga panel. Dynamic composition. Clean inks, bold shadows, crosshatching, screentones, speed lines. High contrast.
Scene: {{panel.description}}
Characters: {{style_bible.characters summarized with consistent traits}}
Leave negative space for speech bubbles. No color.
```

---

## 7) Workflow
1. Paste chapter prose → **Generate Script** (LLM) → JSON with pages/panels.
2. Lock **style_bible**; reuse in all prompts.
3. For first appearances, use **txt2img**; for sequential panels in same scene, use **img2img** with `denoising_strength ≈ 0.25–0.35` to keep faces/clothes consistent.
4. Fix seeds by scene or character.
5. Export **CBZ** when satisfied.

---

## 8) Free Cloud Fallback (Hugging Face)
Add Secret: `HF_API_KEY`.

**Client hook:**
```js
async function hfImage(prompt, model = "stabilityai/stable-diffusion-xl-base-1.0") {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: prompt })
  });
  if (res.status === 503) throw new Error("Model waking up. Retry in ~30–60s.");
  if (!res.ok) throw new Error("HF API failed " + res.status);
  const buf = await res.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `data:image/png;base64,${b64}`;
}
```

**Open models to avoid 403:**
- `stabilityai/stable-diffusion-xl-base-1.0`
- `runwayml/stable-diffusion-v1-5`
- `hakurei/waifu-diffusion`

---

## 9) Troubleshooting
- **403 (HF):** Model is gated or you didn’t accept terms. Switch to open models or click “Access repository.”
- **503 (HF):** Cold start; wait and retry.
- **CORS errors:** Always route through the Replit proxy (server/index.js), not directly from the browser to A1111/HF.
- **OOM on 8GB VRAM:** Reduce resolution (e.g., 640×896), add `--medvram`, fewer steps, use `Euler a`.
- **Inconsistent faces:** Lock seed; move to **img2img**; consider a character LoRA.

---

## 10) Delivery Targets
- **MVP:** 8–12 pages, 4–6 panels/page, CBZ export working.
- **Full Chapter:** 18–28 pages; consistent style bible; seeds locked by scene; img2img used for continuity.

---

## 11) Ops & Safety
- Keep tunnel URL secret; rotate periodically.
- Never expose keys in client code; use Replit Secrets + server proxy.
- Respect model licenses (HF checkpoints, LoRAs).

---

## 12) Handoff Checklist
- [ ] A1111 runs with `--api` and responds locally.
- [ ] Tunnel URL copied into Replit `A1111_URL` secret.
- [ ] Replit proxy endpoints `/api/txt2img` and `/api/img2img` live.
- [ ] Script JSON generation yields valid pages/panels.
- [ ] Image generation succeeds for 3 sample panels.
- [ ] CBZ export opens in Sumatra/YACReader.

---

**Contact / Owner Notes**
- Monday handles scripting prompts, fixes, and consistency advice.
- For zero‑budget runs: prefer Local GPU → HF fallback.

