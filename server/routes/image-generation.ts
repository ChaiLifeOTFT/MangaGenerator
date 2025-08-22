import type { Express } from "express";
import type { Request, Response } from "express";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;

// Available HuggingFace models for manga/anime generation
const HF_MODELS = {
  'counterfeit-v25': 'gsdf/Counterfeit-V2.5',
  'waifu-diffusion': 'hakurei/waifu-diffusion',
  'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
  'anything-v4': 'andite/anything-v4.0',
} as const;

type HFModelKey = keyof typeof HF_MODELS;

interface ImageGenerationRequest {
  prompt: string;
  size?: string;
  engine?: 'openai' | 'huggingface';
  model?: HFModelKey;
}

// Enhanced HuggingFace image generation with cold start handling
async function hfImage(prompt: string, model: HFModelKey = 'counterfeit-v25'): Promise<string> {
  if (!HF_API_KEY) {
    throw new Error("HF_API_KEY is not configured");
  }

  const modelPath = HF_MODELS[model];
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${modelPath}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        inputs: prompt,
        parameters: {
          negative_prompt: "blurry, low quality, distorted, bad anatomy",
          guidance_scale: 7.5,
          num_inference_steps: 20,
        }
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 503) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.error?.includes('loading')) {
        throw new Error("Model is warming up (cold start). Please try again in 30-60 seconds.");
      }
    }
    const errorText = await res.text().catch(() => '');
    throw new Error(`HuggingFace API failed: ${res.status} - ${errorText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
}

// OpenAI DALL-E image generation
async function openaiImage(prompt: string, size: string = "1024x1024"): Promise<string> {
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
      prompt,
      size,
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

// Main image generation function with engine selection
async function generateImage(params: ImageGenerationRequest): Promise<string> {
  const { prompt, size, engine, model } = params;

  // Auto-detect engine if not specified
  let selectedEngine = engine;
  if (!selectedEngine) {
    if (OPENAI_API_KEY) {
      selectedEngine = 'openai';
    } else if (HF_API_KEY) {
      selectedEngine = 'huggingface';
    } else {
      throw new Error("No image generation API keys configured");
    }
  }

  // Generate image based on selected engine
  if (selectedEngine === 'openai') {
    return await openaiImage(prompt, size);
  } else if (selectedEngine === 'huggingface') {
    return await hfImage(prompt, model);
  } else {
    throw new Error(`Unknown image generation engine: ${selectedEngine}`);
  }
}

export function registerImageRoutes(app: Express) {
  // Get available engines and models
  app.get("/api/image/engines", (req: Request, res: Response) => {
    const engines = [];
    
    if (OPENAI_API_KEY) {
      engines.push({
        id: 'openai',
        name: 'OpenAI DALL-E 3',
        models: [{ id: 'dall-e-3', name: 'DALL-E 3' }]
      });
    }
    
    if (HF_API_KEY) {
      engines.push({
        id: 'huggingface',
        name: 'HuggingFace',
        models: Object.entries(HF_MODELS).map(([key, value]) => ({
          id: key,
          name: key.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          path: value
        }))
      });
    }

    res.json({ 
      engines,
      defaultEngine: OPENAI_API_KEY ? 'openai' : 'huggingface'
    });
  });

  // Generate single image
  app.post("/api/image/generate", async (req: Request, res: Response) => {
    try {
      const { prompt, size, engine, model } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      const imageUrl = await generateImage({ prompt, size, engine, model });
      res.json({ 
        imageUrl,
        engine: engine || (OPENAI_API_KEY ? 'openai' : 'huggingface'),
        model: model || 'counterfeit-v25'
      });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  // Batch image generation with throttling
  app.post("/api/image/generate-batch", async (req: Request, res: Response) => {
    try {
      const { prompts, size, engine, model, batchSize = 2 } = req.body;
      
      if (!prompts || !Array.isArray(prompts)) {
        return res.status(400).json({ error: "Missing or invalid prompts array" });
      }

      const results: { prompt: string; imageUrl?: string; error?: string }[] = [];
      
      // Process in batches to avoid overwhelming free APIs
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (prompt: string) => {
          try {
            const imageUrl = await generateImage({ prompt, size, engine, model });
            return { prompt, imageUrl };
          } catch (error) {
            return { 
              prompt, 
              error: error instanceof Error ? error.message : "Generation failed" 
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches for free APIs
        if (i + batchSize < prompts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      res.json({ 
        results,
        total: prompts.length,
        successful: results.filter(r => r.imageUrl).length
      });
    } catch (error) {
      console.error("Batch image generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate batch images" 
      });
    }
  });

  // Legacy endpoint for backward compatibility
  app.post("/api/openai/image", async (req: Request, res: Response) => {
    try {
      const { prompt, size } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      // Use default engine and model
      const imageUrl = await generateImage({ prompt, size });
      res.json({ imageUrl });
    } catch (error) {
      console.error("Legacy image API error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });
}