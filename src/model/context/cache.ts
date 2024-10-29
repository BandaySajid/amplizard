import { GoogleAICacheManager } from "@google/generative-ai/server";
import config from "../../config.js";
import { CoreMessage } from "ai";
import {
  Content,
  FunctionCallPart,
  FunctionResponsePart,
  TextPart,
} from "@google/generative-ai";

const cacheManager = new GoogleAICacheManager(config.gemini.cache_api_key, {
  apiVersion: "v1beta",
});

const DEFAULT_CACHE_TTL = 600; // 10 minutes

export async function cacheContext(
  model: string,
  displayName: string,
  systemInstruction: string,
  messages: CoreMessage[],
  ttlSeconds: number = DEFAULT_CACHE_TTL,
): Promise<string> {
  //converting vercel ai sdk message content format gemini lib supported content format for caching purposes.
  const rawContent = messages.map((msg) => {
    let role =
      msg.role === "assistant" || msg.role === "tool" ? "model" : msg.role;
    let parts: (
      | FunctionCallPart
      | FunctionResponsePart
      | TextPart
      | undefined
    )[] = [];

    if (Array.isArray(msg.content)) {
      const final = msg.content?.map((c) => {
        if (c.type === "tool-call") {
          return {
            functionCall: { name: c.toolName, args: c.args },
          } as FunctionCallPart;
        } else if (c.type === "tool-result") {
          return {
            functionResponse: {
              name: c.toolName,
              response: c.result,
            },
          } as FunctionResponsePart;
        } else if (c.type === "text") {
          return {
            text: c.text,
          } as TextPart;
        }
      });

      parts = final;
    } else {
      parts = [{ text: msg.content }];
    }

    return { role: role, parts };
  }) as Content[];

  console.log("caching the context");

  const cache = await cacheManager.create({
    model: model,
    displayName,
    systemInstruction,
    contents: rawContent,
    ttlSeconds,
  });

  console.log("content has been cached");

  return cache.displayName!;
}
