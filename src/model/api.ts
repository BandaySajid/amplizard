import { LanguageModelV1 } from "ai";

import { HarmCategory, HarmBlockThreshold } from "./types.js";

import { createGoogleGenerativeAI } from "@ai-sdk/google";

const MODEL_ID = "gemini-1.5-flash";
//const DEFAULT_CACHE_NAME = "context_cache";

// Default safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

export function initGenAI(apiKey: string): LanguageModelV1[] {
  const AIs: LanguageModelV1[] = [];
  const apiKeys = apiKey.split(",");
  for (const key of apiKeys) {
    const provider = createGoogleGenerativeAI({ apiKey: key });
    const ai = provider(MODEL_ID, {
      safetySettings: safetySettings,
      //cachedContent: DEFAULT_CACHE_NAME,
    });
    AIs.push(ai);
  }
  return AIs;
}
