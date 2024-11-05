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
  `initialized ${MODELS.chat.length} chat agents and ${MODELS.hook.length} hook agents.`,
);

type ModelIndex = {
  chat: number;
  hook: number;
};

type TokenUsage = {
  input: number;
  output: number;
  total: number;
};

type Context = CoreMessage[];

type ModelContext = {
  [key: string]: Context;
};

export class Model {
  public chatId?: string;
  public botId?: string;
  public modelName?: string;
  static model: LanguageModelV1;
  static context: ModelContext = {};
  private history?: CoreMessage[];
  private tools: Record<string, CoreTool<any, any>>;
  private modelConfig: ModelConfig;
  static indexes: ModelIndex = { chat: -1, hook: -1 };
  private type: MODEL_TYPE;
  private tokens: TokenUsage;
  public closed: boolean;
  private instructions: CoreMessage[];

  constructor(
    { modelName, botId, chatId, config, type, instructions, saveHistory }: ModelInitConfig,
    history: CoreMessage[],
  ) {
    this.chatId = chatId;
    this.botId = botId;
    this.modelName = modelName;
    this.closed = false;
    if (saveHistory) {
      this.history = []
    }
    this.instructions = instructions || [];

    //TODO: Context Caching

    this.tools = {};
    this.modelConfig = { ...config };
    this.type = type;

    this.history?.push(...history);
    this.tokens = { input: 0, output: 0, total: 0 };
  }

  async sendMessage(userPrompt: string, _: boolean = false): Promise<string> {
    //TODO: implement message streaming.
    const user_msg = { role: "user", content: userPrompt } as CoreMessage;

    Model.balanceModels(this.type);

    //so that we intitialize each instance of model with only its own chat history and not with the context, since the context or system prompts are same for all models / agents.
    const historyWithContext = [
      ...this.instructions,
    ];

    historyWithContext.push(...Model.getContext(this.type))

    if (this.history) {
      this.history.push(user_msg);
      historyWithContext.push(...this.history);
    } else {
      historyWithContext.push(user_msg)
    }

    console.log(historyWithContext);

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

    console.log("Current token usage:", result.usage);

    this.tokens.input += result.usage.promptTokens;
    this.tokens.output += result.usage.completionTokens;
    this.tokens.total += result.usage.totalTokens;

    console.log("Total token usage:", this.tokens);

    return result.text;
  }

  static setContext(key: string, context: Context) {
    Model.context[key] = context;
  }

  static getContext(key: string): Context {
    return Model.context[key];
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
