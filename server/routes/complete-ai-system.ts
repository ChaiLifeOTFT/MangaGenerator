import type { Express } from "express";
import type { Request, Response } from "express";

// All available API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_NIN = process.env.OPENAI_API_NIN;
const OPENAI_API_SYTH = process.env.OPENAI_API_SYTH;
const HF_API_KEY = process.env.HF_API_KEY;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Multi-Modal AI Engine Configuration
const AI_ENGINES = {
  text: {
    openai_primary: {
      name: 'OpenAI Primary',
      key: OPENAI_API_KEY,
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      endpoint: 'https://api.openai.com/v1/chat/completions',
      available: !!OPENAI_API_KEY
    },
    openai_nin: {
      name: 'OpenAI Nin',
      key: OPENAI_API_NIN,
      models: ['gpt-4o', 'gpt-4o-mini'],
      endpoint: 'https://api.openai.com/v1/chat/completions',
      available: !!OPENAI_API_NIN
    },
    openai_syth: {
      name: 'OpenAI Syth',
      key: OPENAI_API_SYTH,
      models: ['gpt-4o', 'gpt-4o-mini'],
      endpoint: 'https://api.openai.com/v1/chat/completions',
      available: !!OPENAI_API_SYTH
    },
    perplexity: {
      name: 'Perplexity',
      key: PERPLEXITY_API_KEY,
      models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
      endpoint: 'https://api.perplexity.ai/chat/completions',
      available: !!PERPLEXITY_API_KEY
    },
    huggingface: {
      name: 'HuggingFace',
      key: HF_API_KEY,
      models: ['microsoft/DialoGPT-large', 'meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
      endpoint: 'https://api-inference.huggingface.co/models',
      available: !!HF_API_KEY
    }
  },
  image: {
    openai_primary: {
      name: 'OpenAI DALL-E',
      key: OPENAI_API_KEY,
      models: ['dall-e-3', 'dall-e-2'],
      available: !!OPENAI_API_KEY
    },
    openai_nin: {
      name: 'OpenAI Nin DALL-E',
      key: OPENAI_API_NIN,
      models: ['dall-e-3', 'dall-e-2'],
      available: !!OPENAI_API_NIN
    },
    openai_syth: {
      name: 'OpenAI Syth DALL-E',
      key: OPENAI_API_SYTH,
      models: ['dall-e-3', 'dall-e-2'],
      available: !!OPENAI_API_SYTH
    },
    huggingface: {
      name: 'HuggingFace',
      key: HF_API_KEY,
      models: {
        'counterfeit-v25': 'gsdf/Counterfeit-V2.5',
        'waifu-diffusion': 'hakurei/waifu-diffusion',
        'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
        'anything-v4': 'andite/anything-v4.0',
        'anime-diffusion': 'Ojimi/anime-kawai-diffusion',
        'manga-diffusion': 'ogkalu/Comic-Diffusion'
      },
      available: !!HF_API_KEY
    }
  },
  voice: {
    elevenlabs: {
      name: 'ElevenLabs',
      key: ELEVENLABS_API_KEY,
      voices: ['Rachel', 'Drew', 'Clyde', 'Paul', 'Domi', 'Dave', 'Fin', 'Sarah'],
      available: !!ELEVENLABS_API_KEY
    }
  },
  code: {
    github: {
      name: 'GitHub Copilot',
      key: GITHUB_TOKEN,
      available: !!GITHUB_TOKEN
    }
  }
} as const;

// Text Generation with Multi-Engine Support
async function generateText(params: {
  system: string;
  user: string;
  engine?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<{ content: string; engine: string; model: string }> {
  const { system, user, engine, model, temperature, max_tokens } = params;

  // Get available text engines
  const availableEngines = Object.entries(AI_ENGINES.text)
    .filter(([_, config]) => config.available);

  if (availableEngines.length === 0) {
    throw new Error("No text generation engines available");
  }

  // Select engine
  const selectedEngine = engine && availableEngines.find(([key]) => key === engine)
    ? engine 
    : availableEngines[0][0];

  const engineConfig = AI_ENGINES.text[selectedEngine as keyof typeof AI_ENGINES.text];
  const selectedModel = model || engineConfig.models[0];

  let res: any;

  if (selectedEngine === 'huggingface') {
    // Handle HuggingFace text generation differently
    const prompt = `${system}\n\nUser: ${user}\nAssistant:`;
    
    res = await fetch(`${engineConfig.endpoint}/${selectedModel}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${engineConfig.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: max_tokens || 1000,
          temperature: temperature || 0.6,
          return_full_text: false,
        }
      }),
    });
  } else {
    // Handle OpenAI and Perplexity
    const requestBody = {
      model: selectedModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: temperature || 0.6,
      max_tokens: max_tokens || 4000,
    };

    // Add response format for OpenAI engines
    if (selectedEngine.startsWith('openai')) {
      (requestBody as any).response_format = { type: "json_object" };
    }

    res = await fetch(engineConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${engineConfig.key}`,
      },
      body: JSON.stringify(requestBody),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`${engineConfig.name} error: ${res.status} - ${errorData.error?.message || res.statusText}`);
  }

  const data = await res.json();
  
  let content: string;
  if (selectedEngine === 'huggingface') {
    content = Array.isArray(data) ? data[0]?.generated_text || "" : data.generated_text || "";
  } else {
    content = data.choices?.[0]?.message?.content?.trim() || "";
  }
  
  return { content, engine: selectedEngine, model: selectedModel };
}

// Image Generation with Multi-Engine Support
async function generateImage(params: {
  prompt: string;
  engine?: string;
  model?: string;
  size?: string;
}): Promise<{ imageUrl: string; engine: string; model: string }> {
  const { prompt, engine, model, size } = params;

  // Get available image engines
  const availableEngines = Object.entries(AI_ENGINES.image)
    .filter(([_, config]) => config.available);

  if (availableEngines.length === 0) {
    throw new Error("No image generation engines available");
  }

  // Prefer HuggingFace for manga/anime, then OpenAI
  const selectedEngine = engine && availableEngines.find(([key]) => key === engine)
    ? engine 
    : availableEngines.find(([key]) => key === 'huggingface')?.[0] || availableEngines[0][0];

  const engineConfig = AI_ENGINES.image[selectedEngine as keyof typeof AI_ENGINES.image];
  
  let imageUrl: string;
  let selectedModel: string;

  if (selectedEngine === 'huggingface') {
    const hfModels = engineConfig.models as Record<string, string>;
    const modelKey = model || 'counterfeit-v25';
    selectedModel = hfModels[modelKey] || hfModels['counterfeit-v25'];
    
    const res = await fetch(`https://api-inference.huggingface.co/models/${selectedModel}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${engineConfig.key}`,
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
      throw new Error(`HuggingFace error: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    imageUrl = `data:image/png;base64,${base64}`;
  } else {
    // OpenAI engines
    selectedModel = 'dall-e-3';
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${engineConfig.key}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        prompt,
        size: size || "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`${engineConfig.name} error: ${res.status} - ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("No image returned from OpenAI.");
    }
    imageUrl = `data:image/png;base64,${b64}`;
  }

  return { imageUrl, engine: selectedEngine, model: selectedModel };
}

// Voice Generation with ElevenLabs
async function generateVoice(params: {
  text: string;
  voice?: string;
  model?: string;
}): Promise<{ audioUrl: string; voice: string }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const { text, voice = 'Rachel', model = 'eleven_monolingual_v1' } = params;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs error: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const audioUrl = `data:audio/mpeg;base64,${base64}`;

  return { audioUrl, voice };
}

// GitHub Code Assistant
async function getCodeAssistance(params: {
  prompt: string;
  language?: string;
}): Promise<{ suggestion: string; language: string }> {
  if (!GITHUB_TOKEN) {
    throw new Error("GitHub token not configured");
  }

  const { prompt, language = 'javascript' } = params;

  // Using GitHub's public API for code suggestions
  const res = await fetch("https://api.github.com/search/code", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github.v3+json",
    },
  });

  // Fallback to OpenAI for code generation if GitHub API doesn't provide what we need
  if (OPENAI_API_KEY) {
    const codeResult = await generateText({
      system: `You are a expert ${language} programmer. Provide clean, efficient code solutions.`,
      user: prompt,
      engine: 'openai_primary'
    });
    
    return { suggestion: codeResult.content, language };
  }

  throw new Error("No code assistance available");
}

export function registerCompleteAIRoutes(app: Express) {
  // System status endpoint
  app.get("/api/ai/system-status", (req: Request, res: Response) => {
    const status = {
      text: {
        engines: Object.entries(AI_ENGINES.text).map(([key, config]) => ({
          id: key,
          name: config.name,
          models: config.models,
          available: config.available
        })),
        totalAvailable: Object.values(AI_ENGINES.text).filter(e => e.available).length
      },
      image: {
        engines: Object.entries(AI_ENGINES.image).map(([key, config]) => ({
          id: key,
          name: config.name,
          models: key === 'huggingface' ? Object.keys(config.models as any) : config.models,
          available: config.available
        })),
        totalAvailable: Object.values(AI_ENGINES.image).filter(e => e.available).length
      },
      voice: {
        engines: Object.entries(AI_ENGINES.voice).map(([key, config]) => ({
          id: key,
          name: config.name,
          voices: config.voices,
          available: config.available
        })),
        totalAvailable: Object.values(AI_ENGINES.voice).filter(e => e.available).length
      },
      code: {
        engines: Object.entries(AI_ENGINES.code).map(([key, config]) => ({
          id: key,
          name: config.name,
          available: config.available
        })),
        totalAvailable: Object.values(AI_ENGINES.code).filter(e => e.available).length
      },
      payments: {
        stripe: {
          available: !!STRIPE_SECRET_KEY,
          publicKey: !!process.env.VITE_STRIPE_PUBLIC_KEY
        }
      }
    };

    res.json(status);
  });

  // Multi-modal generation endpoint
  app.post("/api/ai/generate-complete", async (req: Request, res: Response) => {
    try {
      const { 
        text, image, voice, code,
        textEngine, imageEngine, voiceEngine,
        textModel, imageModel, voiceModel,
        prompt, codeLanguage
      } = req.body;

      const results: any = {};

      // Generate text if requested
      if (text && prompt) {
        try {
          const textResult = await generateText({
            system: text.system || "You are a helpful assistant.",
            user: text.user || prompt,
            engine: textEngine,
            model: textModel,
            temperature: text.temperature,
            max_tokens: text.max_tokens
          });
          results.text = textResult;
        } catch (error) {
          results.text = { error: error instanceof Error ? error.message : "Text generation failed" };
        }
      }

      // Generate image if requested
      if (image && prompt) {
        try {
          const imageResult = await generateImage({
            prompt: image.prompt || prompt,
            engine: imageEngine,
            model: imageModel,
            size: image.size
          });
          results.image = imageResult;
        } catch (error) {
          results.image = { error: error instanceof Error ? error.message : "Image generation failed" };
        }
      }

      // Generate voice if requested
      if (voice && (voice.text || prompt)) {
        try {
          const voiceResult = await generateVoice({
            text: voice.text || prompt,
            voice: voiceModel,
            model: voice.model
          });
          results.voice = voiceResult;
        } catch (error) {
          results.voice = { error: error instanceof Error ? error.message : "Voice generation failed" };
        }
      }

      // Generate code if requested
      if (code && prompt) {
        try {
          const codeResult = await getCodeAssistance({
            prompt: code.prompt || prompt,
            language: codeLanguage || code.language
          });
          results.code = codeResult;
        } catch (error) {
          results.code = { error: error instanceof Error ? error.message : "Code generation failed" };
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Complete AI generation error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Multi-modal generation failed" 
      });
    }
  });

  // Individual service endpoints
  app.post("/api/ai/text", async (req: Request, res: Response) => {
    try {
      const result = await generateText(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Text generation failed" });
    }
  });

  app.post("/api/ai/image", async (req: Request, res: Response) => {
    try {
      const result = await generateImage(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Image generation failed" });
    }
  });

  app.post("/api/ai/voice", async (req: Request, res: Response) => {
    try {
      const result = await generateVoice(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Voice generation failed" });
    }
  });

  app.post("/api/ai/code", async (req: Request, res: Response) => {
    try {
      const result = await getCodeAssistance(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Code assistance failed" });
    }
  });

  // Legacy endpoints for backward compatibility
  app.get("/api/openai/status", (req: Request, res: Response) => {
    const totalEngines = [
      ...Object.values(AI_ENGINES.text).filter(e => e.available),
      ...Object.values(AI_ENGINES.image).filter(e => e.available),
      ...Object.values(AI_ENGINES.voice).filter(e => e.available),
      ...Object.values(AI_ENGINES.code).filter(e => e.available)
    ].length;

    res.json({ 
      configured: totalEngines > 0,
      message: `Complete AI System: ${totalEngines} engines available (Text, Image, Voice, Code)`
    });
  });

  app.post("/api/openai/chat", async (req: Request, res: Response) => {
    try {
      const result = await generateText(req.body);
      res.json({ content: result.content });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Chat failed" });
    }
  });

  app.post("/api/openai/image", async (req: Request, res: Response) => {
    try {
      const result = await generateImage(req.body);
      res.json({ imageUrl: result.imageUrl });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Image generation failed" });
    }
  });
}