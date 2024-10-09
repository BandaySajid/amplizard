// import queries from "./json/queries.json" assert { type: "json" };
import fs from "node:fs";
import path from "node:path";
import config from "../../config.js";

const __dirname = config.dirname(import.meta.url);

const instruction = fs.readFileSync(
  path.join(__dirname, "./txt/instruction.txt"),
);

const rules = fs.readFileSync(path.join(__dirname, "./txt/rules.txt"));
const examples = fs.readFileSync(path.join(__dirname, "./txt/examples.txt"));

export function getContext() {
  return { instruction, rules, examples };
}
