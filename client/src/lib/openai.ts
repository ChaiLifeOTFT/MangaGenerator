// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export interface OpenAIChatRequest {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIImageRequest {
  apiKey: string;
  prompt: string;
  size?: string;
}

export async function openaiChat({
  apiKey,
  model,
  system,
  user,
  temperature = 0.6,
  max_tokens = 4000,
}: OpenAIChatRequest): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens,
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

export async function openaiImage({
  apiKey,
  prompt,
  size = "1024x1024",
}: OpenAIImageRequest): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
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
