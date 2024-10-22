export enum OpenAIChatModelId {
  "o1-preview" = "o1-preview",
  "o1-mini" = "o1-mini",
  "gpt-4o" = "gpt-4o",
  // "gpt-4o-2024-05-13" = "gpt-4o-2024-05-13",
  // "gpt-4o-2024-08-06" = "gpt-4o-2024-08-06",
  "gpt-4o-mini" = "gpt-4o-mini",
  // "gpt-4o-mini-2024-07-18" = "gpt-4o-mini-2024-07-18",
  "gpt-4-turbo" = "gpt-4-turbo",
  // "gpt-4-turbo-2024-04-09" = "gpt-4-turbo-2024-04-09",
  // "gpt-4-turbo-preview" = "gpt-4-turbo-preview",
  // "gpt-4-0125-preview" = "gpt-4-0125-preview",
  // "gpt-4-1106-preview" = "gpt-4-1106-preview",
  "gpt-4" = "gpt-4",
  // "gpt-4-0613" = "gpt-4-0613",
  // "gpt-3.5-turbo-0125" = "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo" = "gpt-3.5-turbo",
  // "gpt-3.5-turbo-1106" = "gpt-3.5-turbo-1106",
}

export enum GoogleGenerativeAIModelId {
  "gemini-1.5-flash-latest" = "gemini-1.5-flash-latest",
  "gemini-1.5-flash" = "gemini-1.5-flash",
  // "gemini-1.5-flash-002" = "gemini-1.5-flash-002",
  "gemini-1.5-pro-latest" = "gemini-1.5-pro-latest",
  "gemini-1.5-pro" = "gemini-1.5-pro",
  // "gemini-1.5-pro-002" = "gemini-1.5-pro-002",
  // "gemini-1.0-pro" = "gemini-1.0-pro",
  // "gemini-pro" = "gemini-pro",
}

export enum AnthropicMessagesModelId {
  "claude-3-5-sonnet-20240620" = "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229" = "claude-3-opus-20240229",
  "claude-3-sonnet-20240229" = "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307" = "claude-3-haiku-20240307",
}

export enum GoogleVertexModelId {
  "gemini-1.5-flash" = "gemini-1.5-flash",
  "gemini-1.5-pro" = "gemini-1.5-pro",
  "gemini-1.0-pro" = "gemini-1.0-pro",
  "gemini-1.0-pro-vision" = "gemini-1.0-pro-vision",
}

export enum BedrockChatModelId {
  "amazon.titan-tg1-large" = "amazon.titan-tg1-large",
  "amazon.titan-text-express-v1" = "amazon.titan-text-express-v1",
  "anthropic.claude-v2:1" = "anthropic.claude-v2:1",
  "anthropic.claude-3-sonnet-20240229-v1:0" = "anthropic.claude-3-sonnet-20240229-v1:0",
  "anthropic.claude-3-5-sonnet-20240620-v1:0" = "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "anthropic.claude-3-haiku-20240307-v1:0" = "anthropic.claude-3-haiku-20240307-v1:0",
  "anthropic.claude-3-opus-20240229-v1:0" = "anthropic.claude-3-opus-20240229-v1:0",
  "cohere.command-r-v1:0" = "cohere.command-r-v1:0",
  "cohere.command-r-plus-v1:0" = "cohere.command-r-plus-v1:0",
  "meta.llama2-13b-chat-v1" = "meta.llama2-13b-chat-v1",
  "meta.llama2-70b-chat-v1" = "meta.llama2-70b-chat-v1",
  "meta.llama3-8b-instruct-v1:0" = "meta.llama3-8b-instruct-v1:0",
  "meta.llama3-70b-instruct-v1:0" = "meta.llama3-70b-instruct-v1:0",
  "mistral.mistral-7b-instruct-v0:2" = "mistral.mistral-7b-instruct-v0:2",
  "mistral.mixtral-8x7b-instruct-v0:1" = "mistral.mixtral-8x7b-instruct-v0:1",
  "mistral.mistral-large-2402-v1:0" = "mistral.mistral-large-2402-v1:0",
  "mistral.mistral-small-2402-v1:0" = "mistral.mistral-small-2402-v1:0",
}

export enum MistralChatModelId {
  "open-mistral-7b" = "open-mistral-7b",
  "open-mixtral-8x7b" = "open-mixtral-8x7b",
  "open-mixtral-8x22b" = "open-mixtral-8x22b",
  "open-mistral-nemo" = "open-mistral-nemo",
  "pixtral-12b-2409" = "pixtral-12b-2409",
  "mistral-small-latest" = "mistral-small-latest",
  "mistral-large-latest" = "mistral-large-latest",
}

export enum CohereChatModelId {
  "command-r-plus" = "command-r-plus",
  "command-r" = "command-r",
  "command" = "command",
  "command-light" = "command-light",
}

export const MODEL_IDS = {
  OPEN_AI: OpenAIChatModelId,
  GOOGLE: GoogleGenerativeAIModelId,
  //GOOGLE_VERTEX: GoogleVertexModelId,
  //ANTHROPIC: AnthropicMessagesModelId,
  //BEDROCK: BedrockChatModelId,
  //MISTRAL: MistralChatModelId,
  //COHERE: CohereChatModelId,
};
