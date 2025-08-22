import type { Express } from "express";
import type { Request, Response } from "express";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

async function perplexityChat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      temperature: params.temperature || 0.6,
      max_tokens: params.max_tokens || 4000,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Perplexity Chat API error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No content returned from Perplexity model.");
  }
  return content;
}

export function registerPerplexityRoutes(app: Express) {
  // Check if API key is configured
  app.get("/api/openai/status", (req: Request, res: Response) => {
    res.json({ 
      configured: !!PERPLEXITY_API_KEY,
      message: PERPLEXITY_API_KEY ? "Perplexity API key is configured" : "Perplexity API key is not configured"
    });
  });

  // Generate manga script - keeping the same endpoint for compatibility
  app.post("/api/openai/chat", async (req: Request, res: Response) => {
    try {
      const { model, system, user, temperature, max_tokens } = req.body;
      
      if (!system || !user) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const content = await perplexityChat({
        model: "sonar", // Using Perplexity's lightweight model
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

  // Image generation - return a placeholder since Perplexity doesn't support image generation
  app.post("/api/openai/image", async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      // Return a placeholder image since Perplexity doesn't support image generation
      // This is a simple 1024x1024 white square with text
      const svgImage = `
        <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
          <rect width="1024" height="1024" fill="#f0f0f0"/>
          <text x="512" y="512" font-family="Arial" font-size="24" fill="#666" text-anchor="middle" dy=".3em">
            Image generation not available with Perplexity API
          </text>
          <text x="512" y="550" font-family="Arial" font-size="18" fill="#999" text-anchor="middle" dy=".3em">
            ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}
          </text>
        </svg>
      `;
      
      const base64 = Buffer.from(svgImage).toString('base64');
      const imageUrl = `data:image/svg+xml;base64,${base64}`;
      
      res.json({ imageUrl });
    } catch (error) {
      console.error("Image API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });
}