import { ChannelConfig, User, UserRole } from "./types";

export const DEFAULT_USER: User = {
  id: 'u_1',
  name: 'Admin User',
  role: UserRole.OWNER
};

// --- AI MODELS CONFIGURATION ---
export const AI_MODELS = {
  FLASH: { 
    id: 'gemini-2.0-flash', 
    label: '⚡ Economy (Gemini 2.0 Flash)',
    desc: 'Fast, Free/Cheap. Good for drafts.' 
  },
  PRO: { 
    id: 'gemini-3-pro-preview', 
    label: '🚀 Pro (Gemini 3 Pro)',
    desc: 'Slower, Expensive. Best for final scripts.' 
  }
};

// Pricing per 1M tokens (Estimated)
export const PRICING_TIERS = {
    [AI_MODELS.FLASH.id]: { INPUT: 0.10, OUTPUT: 0.40 },
    [AI_MODELS.PRO.id]: { INPUT: 1.25, OUTPUT: 5.00 }
};

export const DEFAULT_GLOBAL_SYSTEM_PROMPT = `
You are an expert content strategist and scriptwriter for YouTube.
GLOBAL RULES APPLICABLE TO ALL CHANNELS:
1. QUALITY: Content must be engaging, factual, and well-structured.
2. FORMATTING: Do not use markdown bolding (**text**) within the spoken voiceover text. Keep it plain text for easy reading.
3. SAFETY: Do not generate hate speech, dangerous content, or sexually explicit material.
4. ENGAGEMENT: Focus on high retention. Use hooks, open loops, and clear payoffs.
5. LANGUAGE: Ensure natural phrasing native to the requested language.
`.trim();

export const DEFAULT_CHANNELS: ChannelConfig[] = [
  {
    id: 'ch_tech',
    name: 'Tech Futurist',
    description: 'Deep dives into AI, Robotics, and Space.',
    scriptPrompt: `Role: Lead scriptwriter for "Tech Futurist".
Tone: Excited, visionary, fast-paced.
Structure: Hook (0:00-0:45), Intro (0:45-1:30), 3 Main Points, Conclusion/CTA.
Requirements: Use analogies to explain complex tech. Keep sentences punchy.`,
    imageGenPrompt: `Visual Style: Cyberpunk, high contrast, neon blue and purple lighting, futuristic UI overlays, cinematic depth of field.
Scenes: Show robots, data centers, holograms, and space exploration.
Quality: 8k, Unreal Engine 5 render style.`,
    thumbnailPrompt: `Style: High CTR, Shocking comparison or "Future is Here" vibe.
Text Overlay: Big, bold, sans-serif font (Yellow or White). Max 3 words.
Concept: Split screen contrasting old vs new, or a robot doing something human.`
  },
  {
    id: 'ch_mystery',
    name: 'Unsolved Files',
    description: 'True crime and paranormal mysteries.',
    scriptPrompt: `Role: Storyteller for "Unsolved Files".
Tone: Suspenseful, dark, slow-paced, serious, investigative.
Structure: Cold Open (Scary fact), The Backstory, The Incident, Theories, Unsettling Conclusion.
Requirements: Build tension gradually. Use rhetorical questions.`,
    imageGenPrompt: `Visual Style: Film noir, shadowy, desaturated colors, grain effect, realistic 35mm photography.
Scenes: Crime scenes (non-gory), misty forests, abandoned houses, old documents.`,
    thumbnailPrompt: `Style: Mysterious, dark background with one highlighted subject. Red circles or arrows pointing to clues.
Text Overlay: Gritty, distressed font. Questions like "WHO?" or "WHY?".`
  },
  {
    id: 'ch_money',
    name: 'Passive Income OS',
    description: 'Finance and side hustles.',
    scriptPrompt: `Role: Financial analyst for "Passive Income OS".
Tone: Professional, trustworthy, actionable, direct, no-fluff.
Structure: Problem (The Trap), The Opportunity, Step-by-Step Guide, Risks, Payoff.
Requirements: Focus on numbers and ROI. Use "You" frequently.`,
    imageGenPrompt: `Visual Style: Clean, minimalist, bright lighting, "Corporate Memphis" 3D style or high-quality stock footage look.
Scenes: Laptops, graphs going up, money piles, clean desk setups.`,
    thumbnailPrompt: `Style: Bright background (Green or Blue). Expressive face holding money or pointing at a chart.
Text Overlay: Green numbers (e.g., "$10,000/Mo"). Bold Impact font.`
  }
];

export const MOCK_PROJECTS = [];