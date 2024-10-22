//import * as util from "../util.js";
//import redis from "../db/redis.js";
import { CoreMessage, CoreTool, LanguageModelV1, generateText, tool } from "ai";
import { initGenAI } from "./api.js";
import { ModelInitConfig, ModelConfig } from "./types.js";

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
  public knowledge?: CoreMessage;
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
      knowledge,
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
    this.knowledge = {
      role: "system",
      content: "Knowledge base: " + knowledge,
    };
    this.tools = {};
    this.modelConfig = { ...config };

    const model = initGenAI({ model: modelId, provider }, apiKey);
    this.history = [this.systemInstruction, this.knowledge, ...history];
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
