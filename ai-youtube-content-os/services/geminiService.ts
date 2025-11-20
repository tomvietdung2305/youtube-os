import { GoogleGenAI, Type } from "@google/genai";
import { ChannelConfig, VideoGenerationSchema, HookGenerationSchema, RepurposingSchema, HookVariant, TokenUsage, RepurposingPackage } from "../types";
import { StorageService } from "./storageService";
import { PRICING_TIERS } from "../constants";

// Helper to get the API client safely
const getAiClient = async () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to calculate cost dynamically based on model
const calculateUsage = (usageMeta: any, modelId: string): TokenUsage => {
    const input = usageMeta?.promptTokenCount || 0;
    const output = usageMeta?.candidatesTokenCount || 0;
    
    // Get pricing for model, fallback to 0 if unknown
    const pricing = PRICING_TIERS[modelId] || { INPUT: 0, OUTPUT: 0 };

    const cost = ((input / 1000000) * pricing.INPUT) + 
                 ((output / 1000000) * pricing.OUTPUT);
    
    return {
        inputTokens: input,
        outputTokens: output,
        estimatedCost: parseFloat(cost.toFixed(5))
    };
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = await getAiClient();
  const models = ['imagen-4.0-generate-001', 'imagen-3.0-generate-001'];
  let lastError;

  for (const model of models) {
    try {
        const response = await ai.models.generateImages({
            model: model, 
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
                outputMimeType: 'image/jpeg'
            }
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
            return `data:image/jpeg;base64,${imageBytes}`;
        }
    } catch (error) {
        console.warn(`Image generation failed with ${model}:`, error);
        lastError = error;
    }
  }
  console.error("Image Generation Error:", lastError);
  throw new Error("No image generated. The prompt might have triggered safety filters, or the service is temporarily unavailable.");
};

// --- PHASE 1: HOOK GENERATION ---
export const generateHooks = async (
    topic: string, 
    audience: string, 
    language: string, 
    channel: ChannelConfig
): Promise<{ hooks: HookVariant[], usage: TokenUsage }> => {
    const ai = await getAiClient();
    const globalSystemPrompt = await StorageService.getGlobalSystemPrompt();
    const modelId = StorageService.getPreferredModel();
    
    const prompt = `
        ${globalSystemPrompt}
        
        Generate 4 distinct "Killer Hooks" (First 3-10 seconds of video) for a YouTube video.
        
        TOPIC: ${topic}
        TARGET AUDIENCE: ${audience}
        LANGUAGE: ${language}
        CHANNEL STYLE: ${channel.scriptPrompt}
        
        TYPES REQUIRED:
        1. CONTROVERSIAL (Challenge a common belief)
        2. STORY (Start in the middle of action)
        3. QUESTION (Provoke curiosity)
        4. STATISTIC (Shocking number)
        
        Output strict JSON.
    `;

    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: HookGenerationSchema,
            temperature: 0.8
        }
    });

    const parsed = JSON.parse(response.text || "{}");
    // Add IDs to hooks
    const hooksWithIds = (parsed.hooks || []).map((h: any) => ({ ...h, id: crypto.randomUUID() }));
    
    return {
        hooks: hooksWithIds,
        usage: calculateUsage(response.usageMetadata, modelId)
    };
};

// --- PHASE 2: BLUEPRINT GENERATION ---
export const generateVideoPackage = async (
  topic: string,
  mode: 'ORIGINAL' | 'REWRITE',
  language: 'EN' | 'VI' | 'EN_VI',
  channel: ChannelConfig,
  targetAudience: string,
  selectedHook: string
): Promise<{ data: any, usage: TokenUsage }> => {
  const ai = await getAiClient();
  const globalSystemPrompt = await StorageService.getGlobalSystemPrompt();
  const modelId = StorageService.getPreferredModel();

  const systemPrompt = `
    ${globalSystemPrompt}

    TASK: Generate a VIDEO BLUEPRINT for a YouTube long-form video.
    
    CONTEXT:
    - TOPIC: ${topic}
    - TARGET AUDIENCE: ${targetAudience}
    - SELECTED HOOK (Use this to start the script structure): "${selectedHook}"
    
    STRUCTURE REQUIREMENTS:
    1. Generate exactly 12 SECTIONS in the 'script_sections' array.
    2. For 'voiceover_text', RETURN AN EMPTY STRING "". We will generate the deep content later.
    3. Focus creativity on 'section_title' and 'visual_prompt'.
    4. 'visual_prompt' must be detailed (Describe B-roll, Text overlays, Animations).
    
    METADATA REQUIREMENTS:
    1. SEO: High-CTR Title, Description, 15 Tags.
    2. THUMBNAIL: Concept and overlay text.

    LANGUAGE: ${language}
    MODE: ${mode}
  `;

  const contentParts: any[] = [];
  let promptText = `
    --- CHANNEL IDENTITY ---
    ${channel.scriptPrompt}
    --- VISUAL STYLE ---
    ${channel.imageGenPrompt}
    --- THUMBNAIL GUIDANCE ---
    ${channel.thumbnailPrompt}
  `;
  
  contentParts.push({ text: promptText });

  if (channel.thumbnailRefImage) {
    const match = channel.thumbnailRefImage.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      contentParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      contentParts.push({ text: "Use this reference image for thumbnail style." });
    }
  }

  const response = await ai.models.generateContent({
    model: modelId, 
    contents: { role: 'user', parts: contentParts },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: VideoGenerationSchema,
      temperature: 0.7,
    }
  });

  return {
      data: JSON.parse(response.text || "{}"),
      usage: calculateUsage(response.usageMetadata, modelId)
  };
};

// --- PHASE 3: DEEP CONTENT ---
export const generateSectionContent = async (
    channel: ChannelConfig,
    topic: string,
    sectionTitle: string,
    visualContext: string,
    language: string
): Promise<string> => {
    const ai = await getAiClient();
    const globalSystemPrompt = await StorageService.getGlobalSystemPrompt();
    const modelId = StorageService.getPreferredModel();
    
    const prompt = `
        ${globalSystemPrompt}
        CHANNEL IDENTITY: ${channel.scriptPrompt}
        TOPIC: ${topic}
        SECTION TITLE: ${sectionTitle}
        VISUAL CONTEXT: ${visualContext}
        LANGUAGE: ${language}

        TASK: Write voiceover content for this section (800-1200 words).
        Do NOT include "Scene" or "Visual" labels. Just the spoken words.
    `;

    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: { temperature: 0.7, maxOutputTokens: 8192 }
    });

    return response.text || "";
};

// --- PHASE 4: REPURPOSING ---
export const generateRepurposedContent = async (
    project: any
): Promise<{ data: RepurposingPackage, usage: TokenUsage }> => {
    const ai = await getAiClient();
    const modelId = StorageService.getPreferredModel();
    
    // Aggregate available script text
    const scriptContext = project.script.map((s: any) => s.voiceover_text).join("\n").substring(0, 10000); // Limit context

    const prompt = `
        Based on this YouTube script, generate repurposed content:
        1. 3 YouTube Shorts Ideas (Title + Visual Concept).
        2. 1 Engaging Community Tab Post (Poll or Question).
        3. 1 Short Social Media Blurb (Twitter/TikTok style).

        SCRIPT CONTEXT:
        ${scriptContext}
    `;

    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: RepurposingSchema
        }
    });

    return {
        data: JSON.parse(response.text || "{}"),
        usage: calculateUsage(response.usageMetadata, modelId)
    };
};