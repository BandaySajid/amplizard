import test from "node:test";
import assert from "node:assert";
import httpClient from "./httpClient.js";
import { setTimeout } from "node:timers/promises";

//performance testing.

const request = httpClient("http://localhost:9090");

export default async function testModelPerformance(requestCount: number) {
  for (let i = 0; i < requestCount; i++) {
    await setTimeout(500, "result");
    console.log("[REQUEST-TRIGGER]:", i);
    request("/api/v1/bots/a6452388-a937-4551-8da7-8fea93c5af10/chat/new", {
      headers: {
        "x-api-key": "48b4d8531917f4bed2f4e57722137900",
        "content-type": "application/json",
      },
      body: JSON.stringify({ saveHistory: true }),
      method: "POST",
    }).then((data) => {
      console.log(`REQUEST ${i}: NEW CHAT`);
      if (data.ok) {
        request(
          `/api/v1/bots/a6452388-a937-4551-8da7-8fea93c5af10/chat/${(data as any).data.chatId}`,
          {
            method: "POST",
            headers: {
              "x-api-key": "48b4d8531917f4bed2f4e57722137900",
              "content-type": "application/json",
            },
            body: JSON.stringify({ prompt: "Hello" }),
          },
        ).then((data) => {
          console.log(
            `REQUEST ${i}: CHATTING:` + i,
            (data as any).data.message,
          );
        });
      }
    });
  }
}
