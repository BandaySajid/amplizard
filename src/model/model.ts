//import * as util from "../util.js";
//import redis from "../db/redis.js";
import { CoreMessage, CoreTool, LanguageModelV1, generateText, tool } from "ai";
import { initGenAI } from "./api.js";
import { ModelInitConfig, ModelConfig, MODEL_TYPE } from "./types.js";
import config from "../config.js";
import fs from "node:fs/promises";

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

export class Model {
  public chatId?: string;
  public botId?: string;
  public modelName?: string;
  static model: LanguageModelV1;
  private history?: CoreMessage[];
  public knowledge?: CoreMessage;
  public systemInstruction: CoreMessage | undefined;
  private tools: Record<string, CoreTool<any, any>>;
  private modelConfig: ModelConfig;
  static indexes: ModelIndex = { chat: -1, hook: -1 };
  private type: MODEL_TYPE;
  private tokens: TokenUsage;
  public currentUserQuery: string | null;

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
    this.currentUserQuery = null;
    this.chatId = chatId;
    this.botId = botId;
    this.modelName = modelName;
    this.history = [];

    //TODO: Context Caching

    if (instruction) {
      this.systemInstruction = {
        role: "system",
        content: instruction as string,
      };
      this.history?.push(this.systemInstruction);
    } else {
      this.systemInstruction = undefined;
    }
    this.knowledge = {
      role: "system",
      content: "Knowledge base: " + knowledge,
    };
    this.tools = {};
    this.modelConfig = { ...config };
    this.type = type;

    this.history?.push(this.knowledge);
    this.history?.push(...history);
    this.tokens = { input: 0, output: 0, total: 0 };
  }

  async sendMessage(userPrompt: string, _: boolean = false): Promise<string> {
    //TODO: implement message streaming.

    this.currentUserQuery = userPrompt;

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

    this.tokens.input += result.usage.promptTokens;
    this.tokens.output += result.usage.completionTokens;
    this.tokens.total += result.usage.totalTokens;

    //await fs.writeFile("chat.json", JSON.stringify(this.history));

    //console.log("chat history dumped to a file");

    console.log("TOKEN USAGE:", this.tokens);

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
