import crypto from "node:crypto";

export type Hook = {
  hook_id: crypto.UUID;
  bot_id: crypto.UUID;
  name: string;
  signal: string;
  method: string;
  url: string;
  api_calling: boolean;
  rephrase: boolean;
  payload: string;
  headers: string;
  response: string;
};
