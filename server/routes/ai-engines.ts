import type { Express } from "express";
import type { Request, Response } from "express";

// Available API Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Text/Chat Models Configuration
const TEXT_ENGINES = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    endpoint: 'https://api.openai.com/v1/chat/completions',
    available: !!OPENAI_API_KEY
  },
  perplexity: {
    name: 'Perplexity',
    models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online', 'sonar'],
    endpoint: 'https://api.perplexity.ai/chat/completions',
    available: !!PERPLEXITY_API_KEY
  },
  huggingface: {
    name: 'HuggingFace',
    models: ['microsoft/DialoGPT-large', 'meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
    endpoint: 'https://api-inference.huggingface.co/models',
    available: !!HF_API_KEY
  }
} as const;

// Image Models Configuration
const IMAGE_ENGINES = {
  openai: {
    name: 'OpenAI DALL-E',
    models: ['dall-e-3', 'dall-e-2'],
    available: !!OPENAI_API_KEY
  },
  huggingface: {
    name: 'HuggingFace',
    models: {
      'counterfeit-v25': 'gsdf/Counterfeit-V2.5',
      'waifu-diffusion': 'hakurei/waifu-diffusion',
      'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
      'anything-v4': 'andite/anything-v4.0',
      'anime-diffusion': 'Ojimi/anime-kawai-diffusion'
    },
    available: !!HF_API_KEY
  }
} as const;

type TextEngine = keyof typeof TEXT_ENGINES;
type ImageEngine = keyof typeof IMAGE_ENGINES;

// Chat/Text Generation Functions
async function openaiChat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
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
    throw new Error(`OpenAI error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function perplexityChat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
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
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Perplexity error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function huggingfaceChat(params: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const prompt = `${params.system}\n\nUser: ${params.user}\nAssistant:`;
  
  const res = await fetch(`https://api-inference.huggingface.co/models/${params.model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: params.max_tokens || 1000,
        temperature: params.temperature || 0.6,
        return_full_text: false,
      }
    }),
  });

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("Model is warming up. Please try again in 30-60 seconds.");
    }
    throw new Error(`HuggingFace error: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data[0]?.generated_text || "" : data.generated_text || "";
}

// Image Generation Functions
async function openaiImage(prompt: string, size: string = "1024x1024"): Promise<string> {
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
    throw new Error(`OpenAI Image error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from OpenAI.");
  }
  return `data:image/png;base64,${b64}`;
}

async function huggingfaceImage(prompt: string, model: string = 'gsdf/Counterfeit-V2.5'): Promise<string> {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt: "blurry, low quality, distorted, bad anatomy, text, watermark",
        guidance_scale: 7.5,
        num_inference_steps: 20,
      }
    }),
  });

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error("Model is warming up. Please try again in 30-60 seconds.");
    }
    throw new Error(`HuggingFace Image error: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
}

// Main Generation Functions with Auto-Fallback
async function generateText(params: {
  system: string;
  user: string;
  engine?: TextEngine;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<{ content: string; engine: string; model: string }> {
  const { system, user, engine, model, temperature, max_tokens } = params;

  // Determine available engines
  const availableEngines = Object.entries(TEXT_ENGINES)
    .filter(([_, config]) => config.available)
    .map(([key]) => key as TextEngine);

  if (availableEngines.length === 0) {
    throw new Error("No text generation engines available");
  }

  // Select engine (use specified or fallback to first available)
  const selectedEngine = engine && availableEngines.includes(engine) 
    ? engine 
    : availableEngines[0];

  const engineConfig = TEXT_ENGINES[selectedEngine];
  const selectedModel = model || engineConfig.models[0];

  let content: string;

  try {
    switch (selectedEngine) {
      case 'openai':
        content = await openaiChat({ model: selectedModel, system, user, temperature, max_tokens });
        break;
      case 'perplexity':
        content = await perplexityChat({ model: selectedModel, system, user, temperature, max_tokens });
        break;
      case 'huggingface':
        content = await huggingfaceChat({ model: selectedModel, system, user, temperature, max_tokens });
        break;
      default:
        throw new Error(`Unknown engine: ${selectedEngine}`);
    }

    return { content, engine: selectedEngine, model: selectedModel };
  } catch (error) {
    // Try fallback engines if primary fails
    const fallbackEngines = availableEngines.filter(e => e !== selectedEngine);
    
    for (const fallbackEngine of fallbackEngines) {
      try {
        const fallbackModel = TEXT_ENGINES[fallbackEngine].models[0];
        
        switch (fallbackEngine) {
          case 'openai':
            content = await openaiChat({ model: fallbackModel, system, user, temperature, max_tokens });
            break;
          case 'perplexity':
            content = await perplexityChat({ model: fallbackModel, system, user, temperature, max_tokens });
            break;
          case 'huggingface':
            content = await huggingfaceChat({ model: fallbackModel, system, user, temperature, max_tokens });
            break;
        }
        
        return { content, engine: fallbackEngine, model: fallbackModel };
      } catch (fallbackError) {
        continue; // Try next fallback
      }
    }
    
    throw error; // All engines failed
  }
}

async function generateImage(params: {
  prompt: string;
  engine?: ImageEngine;
  model?: string;
  size?: string;
}): Promise<{ imageUrl: string; engine: string; model: string }> {
  const { prompt, engine, model, size } = params;

  // Determine available engines
  const availableEngines = Object.entries(IMAGE_ENGINES)
    .filter(([_, config]) => config.available)
    .map(([key]) => key as ImageEngine);

  if (availableEngines.length === 0) {
    throw new Error("No image generation engines available");
  }

  // Select engine (prefer HuggingFace for anime/manga style, then OpenAI)
  const selectedEngine = engine && availableEngines.includes(engine) 
    ? engine 
    : availableEngines.includes('huggingface') ? 'huggingface' : availableEngines[0];

  let imageUrl: string;
  let selectedModel: string;

  try {
    switch (selectedEngine) {
      case 'openai':
        selectedModel = 'dall-e-3';
        imageUrl = await openaiImage(prompt, size);
        break;
      case 'huggingface':
        const hfModels = IMAGE_ENGINES.huggingface.models;
        const modelKey = model || 'counterfeit-v25';
        selectedModel = hfModels[modelKey as keyof typeof hfModels] || hfModels['counterfeit-v25'];
        imageUrl = await huggingfaceImage(prompt, selectedModel);
        break;
      default:
        throw new Error(`Unknown image engine: ${selectedEngine}`);
    }

    return { imageUrl, engine: selectedEngine, model: selectedModel };
  } catch (error) {
    // Try fallback engines
    const fallbackEngines = availableEngines.filter(e => e !== selectedEngine);
    
    for (const fallbackEngine of fallbackEngines) {
      try {
        switch (fallbackEngine) {
          case 'openai':
            selectedModel = 'dall-e-3';
            imageUrl = await openaiImage(prompt, size);
            break;
          case 'huggingface':
            const hfModels = IMAGE_ENGINES.huggingface.models;
            selectedModel = hfModels['counterfeit-v25'];
            imageUrl = await huggingfaceImage(prompt, selectedModel);
            break;
        }
        
        return { imageUrl, engine: fallbackEngine, model: selectedModel };
      } catch (fallbackError) {
        continue;
      }
    }
    
    throw error;
  }
}

export function registerAIEngineRoutes(app: Express) {
  // Get available engines and their status
  app.get("/api/ai/status", (req: Request, res: Response) => {
    const textEngines = Object.entries(TEXT_ENGINES).map(([key, config]) => ({
      id: key,
      name: config.name,
      models: config.models,
      available: config.available
    }));

    const imageEngines = Object.entries(IMAGE_ENGINES).map(([key, config]) => ({
      id: key,
      name: config.name,
      models: key === 'huggingface' ? Object.keys(config.models) : config.models,
      available: config.available
    }));

    const defaultTextEngine = textEngines.find(e => e.available)?.id || null;
    const defaultImageEngine = imageEngines.find(e => e.available)?.id || null;

    res.json({
      text: {
        engines: textEngines,
        default: defaultTextEngine
      },
      image: {
        engines: imageEngines,
        default: defaultImageEngine
      },
      configured: !!(OPENAI_API_KEY || HF_API_KEY || PERPLEXITY_API_KEY)
    });
  });

  // Generate text/chat
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { system, user, engine, model, temperature, max_tokens } = req.body;
      
      if (!system || !user) {
        return res.status(400).json({ error: "Missing required parameters: system and user" });
      }

      const result = await generateText({ system, user, engine, model, temperature, max_tokens });
      res.json(result);
    } catch (error) {
      console.error("AI Chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate text" 
      });
    }
  });

  // Generate image
  app.post("/api/ai/image", async (req: Request, res: Response) => {
    try {
      const { prompt, engine, model, size } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Missing prompt parameter" });
      }

      const result = await generateImage({ prompt, engine, model, size });
      res.json(result);
    } catch (error) {
      console.error("AI Image error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  // Legacy endpoints for backward compatibility
  app.get("/api/openai/status", (req: Request, res: Response) => {
    const hasAnyKey = !!(OPENAI_API_KEY || HF_API_KEY || PERPLEXITY_API_KEY);
    res.json({ 
      configured: hasAnyKey,
      message: hasAnyKey 
        ? `Multi-engine AI configured: ${[OPENAI_API_KEY && 'OpenAI', HF_API_KEY && 'HuggingFace', PERPLEXITY_API_KEY && 'Perplexity'].filter(Boolean).join(', ')}`
        : "No AI API keys configured"
    });
  });

  app.post("/api/openai/chat", async (req: Request, res: Response) => {
    try {
      const { system, user, model, temperature, max_tokens } = req.body;
      const result = await generateText({ system, user, model, temperature, max_tokens });
      res.json({ content: result.content });
    } catch (error) {
      console.error("Legacy chat error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate response" 
      });
    }
  });

  app.post("/api/openai/image", async (req: Request, res: Response) => {
    try {
      const { prompt, size } = req.body;
      const result = await generateImage({ prompt, size });
      res.json({ imageUrl: result.imageUrl });
    } catch (error) {
      console.error("Legacy image error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });
}