// import queries from "./json/queries.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import config from "../../config.js";
import queries from "./json/queries.json" assert { type: "json" };
import inappropriate_queries from "./json/inappropriate_queries.json" assert { type: "json" };

const __dirname = config.dirname(import.meta.url);

const chatInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/chat.txt"),
  "utf8",
);

const hookInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/hook.txt"),
  "utf8",
);

const chat_context = [...queries, ...inappropriate_queries];

export function getContext() {
  return {
    chatAgent: {
      instruction: chatInstruction,
      context: chat_context,
    },
    hookAgent: { instruction: hookInstruction },
  };
}
