import { FunctionDeclaration } from "@google/generative-ai";

export const triggerHookFunctionDeclaration = {
  name: "triggerHook",
  parameters: {
    type: "OBJECT",
    description: "Trigger hook and get the response.",
    properties: {
      hookName: {
        type: "STRING",
        description: "Name of the hook to trigger",
      },
      data: {
        type: "STRING",
        description:
          "The data to trigger the hook, its a JSON object of url, method, payload, headers. Make sure to add real data to them.",
      },
    },
    required: ["hookName", "data"],
  },
} as FunctionDeclaration;

export const sendImageForAnalysisFunctionDeclaration = {
  name: "sendImageForAnalysis",
  parameters: {
    type: "OBJECT",
    description: "Send image for analysis.",
    properties: {
      promptForAi: {
        type: "STRING",
        description:
          "Prompt to an ai for what and how to analyze the image. This prompt should be designed to verify things clearly and should follow the security and ethical rules. Example: Compare these two images and tell me if their is a damage in the image",
      },
      imageUrl: {
        type: "STRING",
        description:
          "url of the order image to compare the customer image with.",
      },
    },
    required: ["promptForAi", "imageUrl"],
  },
} as FunctionDeclaration;

export const closeChatFunctionDeclaration = {
  name: "closeChat",
  parameters: {
    type: "OBJECT",
    description: "Close the chat.",
    properties: {
      message: {
        type: "STRING",
        description:
          "Message to customer about chat getting closed due to (mention the reason)",
      },
    },
    required: ["message"],
  },
} as FunctionDeclaration;
