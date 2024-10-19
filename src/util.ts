import crypto from "node:crypto";
import redis from "./db/redis.js";
import express from "express";
import nodeUtil from "node:util";
import { db } from "./db/connection.js";

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const timeout = nodeUtil.promisify(setTimeout);

export function hash_it(plaintext: string) {
  const hash = crypto.createHash("sha512").update(plaintext).digest("hex");
  return hash;
}

export function compare_hash(hash: string, plaintext: string) {
  return hash_it(plaintext) === hash;
}

export async function deleteSession(sessionId: string) {
  const deletedSession = await redis.del(sessionId);

  if (deletedSession === 0) {
    throw new Error(
      "no authorization / session token associated with the user!",
    );
  }
}

export function generate_api_key() {
  return crypto.randomBytes(16).toString("hex");
}

export function respError(
  statusCode: number,
  error: string,
  res: express.Response,
  adProp: undefined | object = undefined, //additional prop
) {
  return res.status(statusCode).json({ status: "error", error, ...adProp });
}

export function generateRandomString(length: number) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

export function renderStatus(
  status: number,
  text: string,
  res: express.Response,
) {
  res.render("components/status", {
    text,
    layout: false,
    color: status < 302 ? "green" : "red",
  });
}

export function imageToGenerativePart(
  base64Data: string,
  mimeType: string = "image/jpeg",
) {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

export async function getBotCache(botId: string) {
  let bot = await redis.hgetall("bot:" + botId);
  if (!bot || Object.keys(bot).length <= 0) {
    console.log("No bot from redis cache!");
    [bot] = await db`SELECT * FROM bots where bot_id = ${botId}`;

    if (!bot) {
      return null;
    }

    await redis.hset(`bot:${botId}`, bot);
  } else {
    console.log("returning bot from redis cache!");
  }

  return bot;
}
