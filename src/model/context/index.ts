// import queries from "./json/queries.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import config from "../../config.js";
import queries from "./json/queries.json" assert { type: "json" };
import inappropriate_queries from "./json/inappropriate_queries.json" assert { type: "json" };
import fetch_hooks from "./json/fetch_hooks.json" assert { type: "json" };
import actor_context from "./json/actor.json" assert { type: "json" };

const __dirname = config.dirname(import.meta.url);

const chatInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/chat.txt"),
  "utf8",
);

const hookInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/hook.txt"),
  "utf8",
);

const actorInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/actor.txt"),
  "utf8",
);

const actionGenInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/action-generator.txt"),
  "utf8",
);

const analyzerInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/instructions/analyzer.txt"),
  "utf8",
);

const chat_context = queries; //[...queries, ...inappropriate_queries];

const hook_context = fetch_hooks;

export function getContext() {
  return {
    chatAgent: {
      instruction: chatInstruction,
      context: chat_context,
    },
    hookAgent: { instruction: hookInstruction, context: hook_context },
    actorAgent: { instruction: actorInstruction, context: actor_context },
    actionGenAgent: { instruction: actionGenInstruction, context: [] },
  };
}
