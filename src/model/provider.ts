import {
  createOpenAI,
  OpenAIProvider,
  OpenAIProviderSettings,
} from "@ai-sdk/openai";

import {
  AnthropicProvider,
  AnthropicProviderSettings,
  createAnthropic,
} from "@ai-sdk/anthropic";

import {
  GoogleVertexProvider,
  createVertex,
  GoogleVertexProviderSettings,
} from "@ai-sdk/google-vertex";

import {
  AmazonBedrockProvider,
  AmazonBedrockProviderSettings,
  createAmazonBedrock,
} from "@ai-sdk/amazon-bedrock";
import {
  MistralProvider,
  createMistral,
  MistralProviderSettings,
} from "@ai-sdk/mistral";

import {
  CohereProvider,
  CohereProviderSettings,
  createCohere,
} from "@ai-sdk/cohere";

import {
  createGoogleGenerativeAI,
  GoogleGenerativeAIProvider,
  GoogleGenerativeAIProviderSettings,
} from "@ai-sdk/google";

const AI_CREATOR = {
  OPEN_AI: {
    create: function (options: OpenAIProviderSettings): OpenAIProvider {
      return createOpenAI(options);
    },
  },
  GOOGLE: {
    create: function (
      options: GoogleGenerativeAIProviderSettings,
    ): GoogleGenerativeAIProvider {
      return createGoogleGenerativeAI(options);
    },
  },
  GOOGLE_VERTEX: {
    create: function (
      options: GoogleVertexProviderSettings,
    ): GoogleVertexProvider {
      return createVertex(options);
    },
  },
  ANTHROPIC: {
    create: function (options: AnthropicProviderSettings): AnthropicProvider {
      return createAnthropic(options);
    },
  },
  BEDROCK: {
    create: function (
      options: AmazonBedrockProviderSettings,
    ): AmazonBedrockProvider {
      return createAmazonBedrock(options);
    },
  },
  MISTRAL: {
    create: function (options: MistralProviderSettings): MistralProvider {
      return createMistral(options);
    },
  },
  COHERE: {
    create: function (options: CohereProviderSettings): CohereProvider {
      return createCohere(options);
    },
  },
};

export function createAIProvider(provider: string, apiKey: string) {
  const p = AI_CREATOR[provider as keyof typeof AI_CREATOR].create({ apiKey });

  return p;
}
