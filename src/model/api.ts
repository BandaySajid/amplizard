import { LanguageModelV1 } from "ai";

import { MODEL_IDS } from "./model_types.js";
import { GEN_AI_PROVIDER, HarmCategory, HarmBlockThreshold } from "./types.js";
import { createAIProvider } from "./provider.js";

type GEN_AI = {
  provider: string;
  model: string;
};

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

export function initGenAI(AI: GEN_AI, apiKey: string): LanguageModelV1 {
  if (!(AI.provider in GEN_AI_PROVIDER)) {
    throw new Error("Unknown AI provider");
  }

  if (!(AI.model in MODEL_IDS[AI.provider as keyof typeof MODEL_IDS])) {
    throw new Error(`Unknown AI Model for provider ${AI.provider}`);
  }

  const provider = createAIProvider(AI.provider, apiKey);

  const model = provider(AI.model); //TODO: modify this to support model config, like safety settings etc.

  return model;
}
