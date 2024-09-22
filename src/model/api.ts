import {
  ChatSession,
  Content,
  GenerativeModel,
  GoogleGenerativeAI,
  ModelParams,
  Part,
  Tool,
} from "@google/generative-ai";
import config from "../config.js";
import { getContext } from "./context/index.js";
import {
  triggerHookFunctionDeclaration,
  sendImageForAnalysisFunctionDeclaration,
  closeChatFunctionDeclaration,
} from "./functions.js";

import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

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

export interface CustomModelParams {
  generationConfig?: {
    topK?: number;
    topP?: number;
    candidateCount?: number;
    maxOutputTokens?: number;
    temperature?: number;
    responseMimeType?: string;
  };
  systemInstruction?: string | Part;
  tools?: Tool[];
}

const DEFAULT_GENERATION_PARAMS = {
  temperature: 0.8,
  topK: 40,
  topP: 0.95,
  candidateCount: 1, //can only be set to 1, specified in the docs.
};

const AGENT_MODEL_ID = "gemini-1.5-flash";
const PARSER_MODEL_ID = "gemini-1.5-flash";
const VISION_MODEL_ID = "gemini-1.5-flash";

function initGenAI(apiKeys: Array<string>) {
  const genAIs: GoogleGenerativeAI[] = [];
  for (const key of apiKeys) {
    const genAI = new GoogleGenerativeAI(key);
    genAIs.push(genAI);
  }
  return genAIs;
}

const genAIs = initGenAI(config.gemini.api_key.split(","));

function balanceAgentModels(params: CustomModelParams) {
  // set any passed parameters
  params.generationConfig = { ...DEFAULT_GENERATION_PARAMS };

  const models: GenerativeModel[] = [];

  for (const AI of genAIs) {
    const model = AI.getGenerativeModel({
      model: AGENT_MODEL_ID,
      safetySettings,
      ...params,
      systemInstruction:
        config.gemini.system_instructions.chat_model + getContext(),
      tools: [
        {
          functionDeclarations: [
            triggerHookFunctionDeclaration,
            sendImageForAnalysisFunctionDeclaration,
            closeChatFunctionDeclaration,
          ],
        },
      ],
    });

    models.push(model);
  }

  let currentModel = 0;

  return function () {
    const model = models[currentModel];

    if (currentModel >= models.length - 1) {
      currentModel = 0;
    } else {
      currentModel += 1;
    }

    return model;
  };
}

const getAgentModel = balanceAgentModels({});

export function getAgentChatSession(history?: Content[]): ChatSession {
  const model = getAgentModel();
  const chat = model.startChat({ history });
  return chat;
}

function balanceUtilModels() {
  let current = 0;
  return function (params: ModelParams) {
    const AI = genAIs[current];

    if (current >= genAIs.length) {
      current = 0;
    } else {
      current += 1;
    }

    return AI.getGenerativeModel(params);
  };
}

const getUtilModel = balanceUtilModels();

export async function callParserModel(
  textPrompt: string,
  params: CustomModelParams,
) {
  // set any passed parameters
  params.generationConfig = { ...DEFAULT_GENERATION_PARAMS };
  params.generationConfig!.maxOutputTokens = 1024;
  params.generationConfig!.responseMimeType = "application/json";

  const model = getUtilModel({
    model: PARSER_MODEL_ID,
    safetySettings,
    ...params,
    systemInstruction: config.gemini.system_instructions.parser_model,
  });

  const result = await model.generateContent(textPrompt);
  const response = result.response;
  return response.text();
}

export async function callVisionModel(
  textPrompt: string,
  images: Part[],
  params: CustomModelParams,
) {
  // set any passed parameters
  params.generationConfig = { ...DEFAULT_GENERATION_PARAMS };
  params.generationConfig!.maxOutputTokens = 1024;

  const model = getUtilModel({
    model: VISION_MODEL_ID,
    generationConfig: params.generationConfig,
    safetySettings,
    systemInstruction: config.gemini.system_instructions.imageAnalyzerModel,
  });

  const finalPrompt = [textPrompt, ...images];

  const result = await model.generateContent(finalPrompt);
  const response = result.response;
  return response.text();
}
