//import * as util from "../util.js";
//import redis from "../db/redis.js";
import { CoreMessage, CoreTool, LanguageModelV1, generateText, tool } from "ai";
import { initGenAI } from "./api.js";
import { ModelInitConfig, ModelConfig, MODEL_TYPE } from "./types.js";
import config from "../config.js";

const MODELS = {
  chat: initGenAI(config.gemini.chat_api_key),
  hook: initGenAI(config.gemini.hook_api_key),
};

console.log(
  `initialized ${MODELS.chat.length} chat models and ${MODELS.hook.length} hook models.`,
);

type ModelIndex = {
  chat: number;
  hook: number;
};

export class Model {
  public chatId?: string;
  public botId?: string;
  public modelName?: string;
  static model: LanguageModelV1;
  private history?: CoreMessage[];
  public knowledge?: CoreMessage;
  public systemInstruction: CoreMessage;
  private tools: Record<string, CoreTool<any, any>>;
  private modelConfig: ModelConfig;
  static indexes: ModelIndex = { chat: -1, hook: -1 };
  private type: MODEL_TYPE;

  constructor(
    {
      modelName,
      botId,
      chatId,
      instruction,
      config,
      knowledge,
      type,
    }: ModelInitConfig,
    history: CoreMessage[],
  ) {
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
    this.type = type;

    this.history = [this.systemInstruction, this.knowledge, ...history];
  }

  async sendMessage(userPrompt: string, _: boolean = false): Promise<string> {
    //TODO: implement message streaming.

    Model.balanceModels(this.type);

    console.log("Total no. of models:", MODELS["chat"].length);
    console.log(
      `using model number for (${this.type}):`,
      Model.indexes[this.type],
    );

    this.history?.push({ role: "user", content: userPrompt });

    const result = await generateText({
      model: Model.model!,
      //temperature: 0,
      //prompt: prompt, // used without message history.
      tools: this.tools,
      messages: this.history,
      ...this.modelConfig,
    });

    for (const msg of result.responseMessages) {
      this.history?.push(msg);
    }

    console.log(`${this.type}-USAGE :`, result.usage);

    return result.text;
  }

  static balanceModels(type: MODEL_TYPE) {
    Model.indexes[type] += 1;

    if (Model.indexes[type] >= MODELS[type].length) {
      Model.indexes[type] = 0;
    }

    Model.model = MODELS[type][Model.indexes[type]];
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
