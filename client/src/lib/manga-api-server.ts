import { MangaScript, Panel, StyleBible } from "../types/manga";

const SYSTEM_MANGA_GENERATOR = `You are a Manga Generator AI. Transform ANY input writing into a structured manga script with JSON output.
Follow this JSON schema EXACTLY (no prose outside JSON):
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
    {
      "number": number,
      "panels": [
        {
          "id": string, // e.g. "1-1"
          "description": string, // clear camera, action, setting
          "dialogue": string[],  // plain lines; lettering handled later
          "sfx": string[],       // onomatopoeia only, no quotes
          "notes": string        // optional extra direction
        }
      ]
    }
  ]
}

Guidelines:
- 18–28 pages; 4–7 panels per page (adjust to content length). If input is short, produce 8–12 pages.
- Pacing: cold open ↦ inciting incident ↦ rising action ↦ beat at end of Chapter 1.
- Visual direction: dynamic Japanese manga (black & white, crosshatching, screentones, speed lines).
- Keep character designs consistent. Place meaningful cliffhanger at final page.
- IMPORTANT: Output ONLY the JSON. No commentary.`;

const SYSTEM_MANGA_ILLUSTRATOR = `You are Manga Illustrator AI. You receive structured panel descriptions and a style bible. Your task is to generate concise, unambiguous image prompts for manga-style, black-and-white panels suitable for an image model. You do NOT alter story beats.
Return one prompt per panel, JSON array of objects: [{"panel_id": string, "prompt": string}]. The prompt MUST be <300 words and include: setting, characters with consistent appearance, composition, camera angle, lighting, linework, screentone notes, and where to leave negative space for bubbles if applicable.`;

const IMAGE_STYLE_PRIMER = `Black-and-white Japanese manga panel. Dynamic composition. Clean inks, bold shadows, crosshatching, screentones, motion/speed lines. High contrast. Leave clear negative space for speech bubbles if dialogue exists. No color.`;

export function buildGeneratorUserPrompt(rawText: string, desiredPages = 20): string {
  return `Transform the following source text into a full Chapter 1 manga script. Target ~${desiredPages} pages.\n\nSOURCE:\n${rawText}`;
}

export function buildIllustratorUserPrompt(styleBible: StyleBible, panels: Array<{panel_id: string; description: string}>): string {
  const clamp = (s: string) => (s || "").slice(0, 2000);
  return `STYLE_BIBLE (keep designs consistent):\n${clamp(JSON.stringify(styleBible, null, 2))}\n\nPANELS (produce one concise image prompt per panel):\n${clamp(JSON.stringify(panels, null, 2))}`;
}

export function buildImagePrompt(panel: Panel, styleBible: StyleBible): string {
  const charList = (styleBible?.characters || [])
    .map((c) => `${c.name}: ${c.appearance}; costume: ${c.costume}; typical poses: ${c.poses?.join(", ")}; expressions: ${c.expressions?.join(", ")}`)
    .join(" | ");
  const dialogueHint = panel.dialogue?.length
    ? `Leave negative space along ${panel.dialogue.length > 1 ? "top and side" : "top"} for speech bubbles.`
    : "Leave generous negative space for possible lettering.";

  return [
    IMAGE_STYLE_PRIMER,
    `Panel ${panel.id}: ${panel.description}`,
    `SFX cues: ${panel.sfx?.join(", ") || "none"}.`,
    `Characters: ${charList || "Follow style bible."}`,
    `Camera/composition: Prioritize clarity of action; dynamic angle; readable silhouettes.`,
    dialogueHint,
  ].join("\n");
}

// Check if API key is configured on the server
export async function checkAPIStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/openai/status");
    const data = await res.json();
    return data.configured;
  } catch (error) {
    console.error("Failed to check API status:", error);
    return false;
  }
}

export async function generateMangaScript(
  inputText: string,
  model: string,
  desiredPages: number
): Promise<MangaScript> {
  const userPrompt = buildGeneratorUserPrompt(inputText, desiredPages);
  
  const res = await fetch("/api/openai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: SYSTEM_MANGA_GENERATOR,
      user: userPrompt,
      temperature: 0.6,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate manga script");
  }

  const data = await res.json();
  const rawResponse = data.content;

  let json: MangaScript;
  try {
    json = JSON.parse(rawResponse);
  } catch (e) {
    // Try to salvage JSON from fenced code
    const match = rawResponse.match(/```json([\s\S]*?)```/);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      throw new Error("Failed to parse manga script JSON response");
    }
  }

  return json;
}

export async function generateIllustratorPrompts(
  model: string,
  styleBible: StyleBible,
  panels: Panel[]
): Promise<Record<string, string>> {
  const panelList = panels.map((panel) => ({
    panel_id: panel.id,
    description: panel.description,
  }));

  const userPrompt = buildIllustratorUserPrompt(styleBible, panelList);
  
  const res = await fetch("/api/openai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: SYSTEM_MANGA_ILLUSTRATOR,
      user: userPrompt,
      temperature: 0.4,
      max_tokens: 6000,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate illustrator prompts");
  }

  const data = await res.json();
  const rawResponse = data.content;

  const arr: Array<{panel_id: string; prompt: string}> = JSON.parse(rawResponse);
  const map: Record<string, string> = {};
  for (const item of arr) {
    map[item.panel_id] = item.prompt;
  }
  return map;
}

export async function generatePanelImage(
  panel: Panel,
  styleBible: StyleBible,
  imageSize: string,
  illustratorPrompt?: string
): Promise<string> {
  const prompt = illustratorPrompt
    ? `${IMAGE_STYLE_PRIMER}\n${illustratorPrompt}`
    : buildImagePrompt(panel, styleBible);

  const res = await fetch("/api/openai/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      size: imageSize,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate image");
  }

  const data = await res.json();
  return data.imageUrl;
}