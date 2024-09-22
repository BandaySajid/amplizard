import { callVisionModel, getAgentChatSession } from "./api.js";
import {
  ChatSession,
  EnhancedGenerateContentResponse,
} from "@google/generative-ai";
import * as util from "../util.js";
import redis from "../db/redis.js";
import { jsonrepair } from "jsonrepair";

function isTriggerRespError(arg: any): arg is TriggerRespError {
  return arg && arg.status === "error" && arg.description;
}

interface HookData {
  url: string;
  method: string;
  headers: Headers;
  payload: object;
}

type HooksDataString = string;

interface TriggerRespError {
  status: "error";
  description: string;
}

type ChatId = string;

interface ModelData {
  chatId: ChatId;
  botId: string;
  modelName: string;
  chat: ChatSession;
  isHookDataSet: boolean;
  hookData?: HooksDataString;
}

type ModelStore = Map<ChatId, Model>;

const functions = {
  triggerHook: async ({
    hookName,
    data,
  }: {
    hookName: string;
    data: string;
  }) => {
    try {
      let parsed;
      try {
        if (typeof data === "string") {
          data = data.replaceAll("\\", "");
        }
        parsed = JSON.parse(data);
      } catch (err) {
        parsed = jsonrepair(data);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
      }
      return triggerHook(hookName, parsed);
    } catch (err) {
      console.error("Invalid json data to trigger the hook:", err);
      return triggerHook(hookName, {
        status: "error",
        description: "Invalid json data to trigger the hook",
      } as TriggerRespError);
    }
  },

  sendImageForAnalysis: async ({
    promptForAi,
    imageUrl,
    customerImage,
  }: {
    promptForAi: string;
    imageUrl: string;
    customerImage: string;
  }) => {
    console.log("sending image for analysis");
    return await sendImageForAnalysis(promptForAi, imageUrl, customerImage);
  },

  closeChat({ chatId, message }: { chatId: string; message: string }) {
    return closeChat(chatId, message);
  },
};

async function getImageFromUrl(url: string) {
  const resp = await fetch(url, { mode: "no-cors" });

  const blob = await resp.blob();

  const base64Data = await util.blobToBase64(blob);

  return base64Data;
}

async function analyzeAndCompareImages(
  prompt: string,
  compareWithImageUrl: string,
  customerImage: string,
) {
  try {
    const base64Data = await getImageFromUrl(compareWithImageUrl);
    const compareWithImage = util.imageToGenerativePart(base64Data);

    const customerImagePart = util.imageToGenerativePart(customerImage);

    const analysis = await callVisionModel(
      prompt,
      [compareWithImage, customerImagePart],
      {},
    );

    return analysis;
  } catch (err) {
    console.error("ANALYSIS ERROR:", err);
    return { status: "error", description: "internal analysis system error!" };
  }
}

async function sendImageForAnalysis(
  promptForAi: string,
  imageUrl: string,
  customerImage: string,
) {
  const resp = await analyzeAndCompareImages(
    promptForAi,
    imageUrl,
    customerImage,
  );

  return resp;
}

async function callApi(
  url: string,
  method: string,
  headers: Headers,
  body: BodyInit,
) {
  const options = {} as RequestInit;
  options.method = method;

  if (method?.toUpperCase() !== "GET" && method?.toUpperCase() !== "HEAD") {
    if (Object.keys(headers).length > 0) {
      options.body = JSON.stringify(body);
    }
  }

  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }

  const resp = await fetch(url, options);

  const jsonResp = await resp.json();
  return jsonResp;
}

async function triggerHook(hook: string, data: HookData | TriggerRespError) {
  console.log(`[TRIGGER]: ${hook} with data being triggered`, data);

  if (isTriggerRespError(data)) {
    return {
      status: data.status,
      description: data.description,
    };
  }

  try {
    if (typeof data.payload === "string") {
      data.payload = JSON.parse(data.payload);
    }

    if (typeof data.headers === "string") {
      data.headers = JSON.parse(data.headers);
    }

    console.log("data for api", data);

    const response = await callApi(
      data.url,
      data.method,
      data.headers,
      data.payload as BodyInit,
    );

    return response;
  } catch (err) {
    console.error("HOOK_TRIGGER_ERROR:", err);
    return {
      status: "error",
      description: "Error occured when triggering the hook!",
    };
  }
}

function closeChat(chatId: string, closeMessage: string) {
  Model.closeChat(chatId, closeMessage);
  console.log("chat closed by function");
  return { status: "success", description: "chat has been closed!" };
}

async function functionCaller(
  response: EnhancedGenerateContentResponse,
  chat: ChatSession,
  chatId: string,
): Promise<EnhancedGenerateContentResponse> {
  const calls = response.functionCalls();

  if (!calls) {
    return response;
  }

  const call = calls[0];

  let args = call.args as any;

  if (call.name === "sendImageForAnalysis") {
    const identifier = "customerImage:" + chatId;
    const customerImage = await redis.get(identifier);
    args.customerImage = customerImage;

    await redis.del(identifier);
  }

  if (call.name === "closeChat") {
    args.chatId = chatId;
    console.log("closing chat!!!");
  }

  const cr = await functions[call.name as keyof typeof functions](args);

  if (call.name === "sendImageForAnalysis") {
    console.log("Image analysis respone:", cr);
  }

  const result = await chat.sendMessage([
    {
      functionResponse: {
        name: call.name,
        //adding additional response field, because I guess it expects an object response,
        response: { response: cr },
      },
    },
  ]);

  const finalResponse = result.response;

  return functionCaller(finalResponse, chat, chatId);
}

export class Model {
  private static models: ModelStore = new Map();
  private modelData: ModelData;
  public isHookDataSet: boolean;
  public closed: boolean;
  public closeMessage: string = "";

  constructor({
    modelName,
    botId,
    chatId,
  }: {
    modelName?: string;
    botId?: string;
    chatId: string;
  }) {
    if (!chatId) {
      throw new Error("chatId is required");
    }
    //const exModel = Model.getModel(chatId);
    /*if (exModel) {
      this.modelData = exModel;
      this.isHookDataSet = exModel.isHookDataSet;
      return;
    }*/

    const chatSession = getAgentChatSession();

    if (!modelName || !botId) {
      throw new Error("modelName and botId are required parameters");
    }

    const model: ModelData = {
      chatId,
      botId,
      modelName,
      chat: chatSession,
      isHookDataSet: false,
    };

    this.isHookDataSet = false;
    this.modelData = model;
    this.closed = false;
    Model.models.set(chatId, this);
  }

  initializeHooks(hookData: HooksDataString) {
    if (this.modelData.isHookDataSet) {
      return;
    }
    this.isHookDataSet = true;
    this.modelData.hookData = hookData; //this.modelData is a pointer to (static models) object, so that will be updated as well.
    this.modelData.isHookDataSet = true;
  }

  async sendMessage(userPrompt: string, _: boolean = false) {
    //streamed message functionality to be implemented.

    const prompt = this.generatePrompt(
      userPrompt,
      this.modelData.modelName,
      this.modelData.hookData as string,
    );

    const result = await this.modelData.chat.sendMessage(prompt);

    const response = result.response;

    const finalResult = await functionCaller(
      response,
      this.modelData.chat,
      this.modelData.chatId,
    );

    const finalResponse = finalResult.text();
    return finalResponse;
  }

  private initModelNameInstruction(name: string) {
    return `${name}: E-commerce Customer Service AI Assistant
			You are ${name}`;
  }

  private generatePrompt(
    userPrompt: string,
    modelName: string,
    hookData: HooksDataString,
  ) {
    return (
      this.initModelNameInstruction(modelName) +
      "\n" +
      "Hooks: " +
      hookData +
      "\n" +
      "Prompt: " +
      userPrompt
    );
  }

  static getModel(chatId: string) {
    return Model.models.get(chatId);
  }

  getModelDetails() {
    return { ...this.modelData, chat: undefined };
  }

  getHistory() {
    return this.modelData.chat.getHistory();
  }

  static closeChat(chatId: string, closeMessage: string) {
    Model.getModel(chatId)!.closed = true;
    Model.getModel(chatId)!.closeMessage = closeMessage;
    Model.models.delete(chatId);
  }
}
