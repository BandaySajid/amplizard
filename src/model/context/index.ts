// import queries from "./json/queries.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import config from "../../config.js";
import context from "./context.json" assert { type: "json" };

const __dirname = config.dirname(import.meta.url);

const chatInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/chat-instruction.txt"),
  "utf8",
);

const hookInstruction = fs.readFileSync(
  path.join(__dirname, "./txt/hook-instruction.txt"),
  "utf8",
);

const rules = fs.readFileSync(path.join(__dirname, "./txt/rules.txt"), "utf8");
const examples = fs.readFileSync(
  path.join(__dirname, "./txt/examples.txt"),
  "utf8",
);

export function getContext() {
  return {
    chatAgent: {
      instruction: chatInstruction,
      rules,
      examples,
      context: context,
    },
    hookAgent: { instruction: hookInstruction },
  };
}
