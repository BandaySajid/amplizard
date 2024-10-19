//import * as util from "../util.js";
//import redis from "../db/redis.js";
import { CoreMessage, CoreTool, LanguageModelV1, generateText, tool } from "ai";
import { initGenAI } from "./api.js";
import { ModelInitConfig, ModelConfig } from "./types.js";

/*const sendImageForAnalysisFunctionDeclaration = {
  description: "Send image for analysis.",
  parameters: z.object({
    promptForAi: z
      .string()
      .describe(
        `Prompt for an AI to analyze an image, ensuring clarity in the verification process while adhering to security and ethical guidelines. For example: "Please compare these two images and identify any signs of damage.`,
      ),
    imageUrl: z
      .string()
      .describe("url of the order image to compare the customer image with."),
  }),
  execute: async ({
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

    // const analysis = await callVisionModel(
    //   prompt,
    //   [compareWithImage, customerImagePart],
    //   {},
    // );

    // return analysis;
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
}*/

/*function closeChat(chatId: string, closeMessage: string) {
  // Model.closeChat(chatId, closeMessage);
  console.log("chat closed by function");
  return { status: "success", description: "chat has been closed!" };
}*/

export class Model {
  public chatId?: string;
  public botId?: string;
  public modelName?: string;
  private model: LanguageModelV1;
  private history?: CoreMessage[];
  public knowledge?: string;
  public systemInstruction: CoreMessage;
  // private fetchHooksFunctionDeclaration: CoreTool;
  private tools: Record<string, CoreTool<any, any>>;
  private modelConfig: ModelConfig;

  constructor(
    {
      modelName,
      provider,
      botId,
      chatId,
      apiKey,
      modelId,
      instruction,
      config,
    }: ModelInitConfig,
    history: CoreMessage[],
  ) {
    if (!modelId || !provider || !apiKey) {
      throw new Error(" modelId, provider, and apiKey are required parameters");
    }

    console.log("model id is:", modelId);

    this.chatId = chatId;
    this.botId = botId;
    this.modelName = modelName;
    this.systemInstruction = { role: "system", content: instruction as string };
    this.tools = {};
    this.modelConfig = { ...config };

    const model = initGenAI({ model: modelId, provider }, apiKey);
    this.history = [this.systemInstruction, ...history];
    this.model = model;
  }

  async sendMessage(userPrompt: string, _: boolean = false): Promise<string> {
    //streamed message functionality to be implemented.
    this.history?.push({ role: "user", content: userPrompt });

    const result = await generateText({
      model: this.model,
      //temperature: 0,
      //prompt: prompt, // used without message history.
      tools: this.tools,
      messages: this.history,
      ...this.modelConfig,
    });

    for (const msg of result.responseMessages) {
      this.history?.push(msg);
    }

    return result.text;
  }

  addTool(toolName: string, funcTool: CoreTool) {
    this.tools[toolName] = tool(funcTool as any);
  }

  getHistory() {
    return this.history;
  }

  // static closeChat(chatId: string, closeMessage: string) {
  //   Model.getModel(chatId)!.closed = true;
  //   Model.getModel(chatId)!.closeMessage = closeMessage;
  //   Model.models.delete(chatId);
  // }
}
