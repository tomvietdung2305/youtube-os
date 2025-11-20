import { Type } from "@google/genai";

// --- User & Permissions ---
export enum UserRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

// --- Configuration ---
export interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  
  // Split Prompts
  scriptPrompt: string;       // Instructions for the script structure and tone
  imageGenPrompt: string;     // Instructions for the visual style of scenes
  thumbnailPrompt: string;    // Instructions for the thumbnail text and concept
  
  // Reference for Thumbnail
  thumbnailRefImage?: string; // Base64 encoded image to guide thumbnail style
}

// --- New Features Models ---
export interface HookVariant {
  id: string;
  type: 'CONTROVERSIAL' | 'STORY' | 'QUESTION' | 'STATISTIC';
  content: string;
}

export interface RepurposingPackage {
  shorts_ideas: { title: string; visual_concept: string }[];
  community_post: string;
  social_blurb: string; // For TikTok/FB/Twitter
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // In USD
}

// --- Generated Content Models ---
export interface ScriptSection {
  section_title: string;
  voiceover_text: string; // Deep content
  visual_prompt: string; // AI Image prompt
  imageUrl?: string; // Base64 encoded image
}

export interface SeoPackage {
  youtube_title: string;
  youtube_description: string; // 180-260 words
  tags: string[]; // 15 tags
}

export interface ThumbnailPackage {
  thumbnail_text: string; // < 3 words
  thumbnail_visual_prompt: string;
  imageUrl?: string; // Base64 encoded image
}

export interface VideoProject {
  id: string;
  channelId: string;
  topic: string; // Or reference link
  mode: 'ORIGINAL' | 'REWRITE';
  language: 'EN' | 'VI' | 'EN_VI';
  targetAudience: string; // New: Audience Persona
  createdAt: string; // ISO Date
  createdBy: string;
  
  // Hook Logic
  hookVariants?: HookVariant[];
  selectedHook?: string;

  // The Output
  status: 'DRAFT' | 'GENERATED' | 'PUBLISHED';
  script: ScriptSection[];
  seo: SeoPackage;
  thumbnail: ThumbnailPackage;
  repurposing?: RepurposingPackage; // New: Repurposing content
  
  // Cost Tracking
  tokenUsage?: TokenUsage;
}

// --- API Response Schema (matches Gemini Output) ---
export const VideoGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    seo: {
      type: Type.OBJECT,
      properties: {
        youtube_title: { type: Type.STRING },
        youtube_description: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["youtube_title", "youtube_description", "tags"]
    },
    thumbnail: {
      type: Type.OBJECT,
      properties: {
        thumbnail_text: { type: Type.STRING },
        thumbnail_visual_prompt: { type: Type.STRING },
      },
      required: ["thumbnail_text", "thumbnail_visual_prompt"]
    },
    script_sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section_title: { type: Type.STRING },
          voiceover_text: { type: Type.STRING },
          visual_prompt: { type: Type.STRING },
        },
        required: ["section_title", "voiceover_text", "visual_prompt"]
      }
    }
  },
  required: ["seo", "thumbnail", "script_sections"]
};

export const HookGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    hooks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['CONTROVERSIAL', 'STORY', 'QUESTION', 'STATISTIC'] },
          content: { type: Type.STRING }
        },
        required: ["type", "content"]
      }
    }
  },
  required: ["hooks"]
};

export const RepurposingSchema = {
    type: Type.OBJECT,
    properties: {
        shorts_ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    visual_concept: { type: Type.STRING }
                }
            }
        },
        community_post: { type: Type.STRING },
        social_blurb: { type: Type.STRING }
    }
};