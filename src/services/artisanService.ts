import { GoogleGenAI, Type } from "@google/genai";
import { ArtisanGuide } from "../types";

const SYSTEM_INSTRUCTION = `Role: You are the "Master Artisan AI," a vocational mentor for youth in Nigeria.
Objective: Provide practical, safety-first, step-by-step instructions for manual trades.
Tone: Simple English/Pidgin mix where appropriate. Be encouraging but firm on safety.
Output Requirement: You must ALWAYS respond in a strict JSON format.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Task Title" },
    safety: { type: Type.STRING, description: "Safety warnings" },
    tools: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of tools" },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER },
          instruction: { type: Type.STRING }
        },
        required: ["step", "instruction"]
      }
    },
    pro_tip: { type: Type.STRING, description: "A local tip or 'hack' for Nigerian materials" },
    bing_query: { type: Type.STRING, description: "specific technical diagram search term" },
    youtube_query: { type: Type.STRING, description: "step by step video search term" }
  },
  required: ["title", "safety", "tools", "steps", "pro_tip", "bing_query", "youtube_query"]
};

export async function generateArtisanGuide(query: string, signal?: AbortSignal): Promise<ArtisanGuide> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a vocational guide for: ${query}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    timestamp: Date.now(),
    id: crypto.randomUUID(),
  };
}

export async function fetchWikimediaImages(query: string): Promise<string[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages|images&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=4&piprop=thumbnail&pithumbsize=500`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.query || !data.query.pages) return [];
    
    const images: string[] = [];
    Object.values(data.query.pages).forEach((page: any) => {
      if (page.thumbnail && page.thumbnail.source) {
        images.push(page.thumbnail.source);
      }
    });
    
    return images;
  } catch (error) {
    console.error("Wikimedia Image Search Error:", error);
    return [];
  }
}

export async function fetchYouTubeVideo(query: string): Promise<string | undefined> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return undefined;

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`
    );
    const data = await response.json();
    return data.items?.[0]?.id?.videoId;
  } catch (error) {
    console.error("YouTube Search Error:", error);
    return undefined;
  }
}
