export enum HarmBlockThreshold {
  HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_NONE = "BLOCK_NONE",
}

export enum HarmCategory {
  HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
  HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
  HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
  HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
}

export enum GEN_AI_PROVIDER {
  OPEN_AI = "OPEN_AI",
  ANTHROPIC = "ANTHROPIC",
  GOOGLE = "GOOGLE",
  GOOGLE_VERTEX = "GOOGLE_VERTEX",
  BEDROCK = "BEDROCK",
  MISTRAL = "MISTRAL",
  COHERE = "COHERE",
}

export type ModelConfig = {
  temperature?: number;
  maxSteps?: number;
};

export type ModelInitConfig = {
  modelName?: string;
  provider: string;
  botId?: string;
  chatId?: string;
  apiKey: string;
  modelId: string;
  instruction?: string;
  config?: ModelConfig;
  knowledge?: string;
};
