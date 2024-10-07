import fs from "node:fs";
import config from "../../config.js";
import path from "node:path";

const __dirname = config.dirname(import.meta.url);
const filesInDir = fs.readdirSync(path.join(__dirname, "./json"));

let context: string[] | string = [];

for (const file of filesInDir) {
  context.push(
    fs.readFileSync(path.join(__dirname, `./json/${file}`), "utf-8"),
  );
}

context = JSON.stringify(context);

export function getContext() {
  return context as string;
}
