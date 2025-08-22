import type { Express } from "express";
import type { Request, Response } from "express";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function openaiChat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature || 0.6,
      max_tokens: params.max_tokens || 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`OpenAI Chat API error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No content returned from chat model.");
  }
  return content;
}

async function openaiImage(params: {
  prompt: string;
  size?: string;
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: params.prompt,
      size: params.size || "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`OpenAI Image API error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from OpenAI.");
  }
  return `data:image/png;base64,${b64}`;
}

export function registerOpenAIRoutes(app: Express) {
  // Check if API key is configured
  app.get("/api/openai/status", (req: Request, res: Response) => {
    res.json({ 
      configured: !!OPENAI_API_KEY,
      message: OPENAI_API_KEY ? "OpenAI API key is configured" : "OpenAI API key is not configured"
    });
  });

  // Generate manga script
  app.post("/api/openai/chat", async (req: Request, res: Response) => {
    try {
      const { model, system, user, temperature, max_tokens } = req.body;
      
      if (!system || !user) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const content = await openaiChat({
        model: model || "gpt-4o-mini",
        system,
        user,
        temperature,
        max_tokens,
      });

      res.json({ content });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate chat response" 
      });
    }
  });

  // Generate image
  app.post("/api/openai/image", async (req: Request, res: Response) => {
    try {
      const { prompt, size } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      const imageUrl = await openaiImage({ prompt, size });
      res.json({ imageUrl });
    } catch (error) {
      console.error("Image API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });
}