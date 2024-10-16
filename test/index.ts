import assert from "node:assert";
import testModelPerformance from "./model.js";

import { generateText } from "ai";
import { MockLanguageModelV1 } from "ai/test";

async function testModel() {
  //testModelPerformance(10);
  const result = await generateText({
    model: new MockLanguageModelV1({
      doGenerate: async () => ({
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
        text: `Hello, world!`,
      }),
    }),
    prompt: "Hello, test!",
  });

  console.log("got result", result);
}

testModel();
