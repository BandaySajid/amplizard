//import * as util from "../util.js";
//import redis from "../db/redis.js";
import { CoreMessage, CoreTool, LanguageModelV1, generateText, tool } from "ai";
import { initGenAI } from "./api.js";
import { ModelInitConfig, ModelConfig } from "./types.js";

type ModelIndex = {
  [key: string]: number;
};

type TokenUsage = {
  input: number;
  output: number;
  total: number;
};

type Context = CoreMessage[];

type ModelType = string;

type ModelStore = {
  [key: ModelType]: { models: LanguageModelV1[]; context: Context };
};

export class Model {
  public chatId?: string;
  public botId?: string;
  public modelName?: string;
  static model: LanguageModelV1;
  private history?: CoreMessage[];
  private tools: Record<string, CoreTool<any, any>>;
  private modelConfig: ModelConfig;
  static indexes: ModelIndex = {};
  private type: string;
  private tokens: TokenUsage;
  public closed: boolean;
  private instructions: CoreMessage[];
  static MODELS: ModelStore = {};

  constructor(
    {
      modelName,
      botId,
      chatId,
      config,
      type,
      instructions,
      saveHistory,
    }: ModelInitConfig,
    history: CoreMessage[],
  ) {
    this.chatId = chatId;
    this.botId = botId;
    this.modelName = modelName;
    this.closed = false;
    if (saveHistory) {
      this.history = [];
    }
    this.instructions = instructions || [];

    //TODO: Context Caching

    this.tools = {};
    this.modelConfig = { ...config };
    this.type = type;
    this.history?.push(...history);
    this.tokens = { input: 0, output: 0, total: 0 };
    Model.indexes[type] = -1;
  }

  static initModel(type: string, api_key: string, context: Context) {
    Model.MODELS[type] = { models: initGenAI(api_key), context };
  }

  async sendMessage(userPrompt: string, _: boolean = false): Promise<string> {
    console.log("prompt:", userPrompt);
    //TODO: implement message streaming.
    const user_msg = { role: "user", content: userPrompt } as CoreMessage;

    Model.balanceModels(this.type);

    //so that we intitialize each instance of model with only its own chat history and not with the context, since the context or system prompts are same for all models / agents.
    const historyWithContext = [...this.instructions];

    historyWithContext.push(...Model.getContext(this.type));

    if (this.history) {
      this.history.push(user_msg);
      historyWithContext.push(...this.history);
    } else {
      historyWithContext.push(user_msg);
    }

    console.log(
      "------------ chat messages --------------",
      historyWithContext,
    );

    const result = await generateText({
      model: Model.model!,
      temperature: 1,
      tools: this.tools,
      messages: historyWithContext,
      ...this.modelConfig,
    });

    if (this.history) {
      for (const msg of result.response.messages) {
        this.history.push(msg);
      }
    }

    console.log(`[${this.type}] Current token usage:`, result.usage);

    this.tokens.input += result.usage.promptTokens;
    this.tokens.output += result.usage.completionTokens;
    this.tokens.total += result.usage.totalTokens;

    console.log(`[${this.type}] Total token usage:`, this.tokens);

    return result.text;
  }

  static getContext(key: string): Context {
    return Model.MODELS[key].context;
  }

  static balanceModels(type: string) {
    Model.indexes[type] += 1;
    const models = Model.MODELS[type].models;

    if (Model.indexes[type] >= models.length) {
      Model.indexes[type] = 0;
    }

    Model.model = models[Model.indexes[type]];
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
