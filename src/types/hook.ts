import crypto from "node:crypto";

export type Hook = {
  hook_id: crypto.UUID;
  bot_id: crypto.UUID;
  name: string;
  description?: string;
  method: string;
  url: string;
  vision: boolean;
  payload: string;
  headers: string;
};
