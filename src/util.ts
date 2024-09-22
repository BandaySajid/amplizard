import crypto from "node:crypto";
import config from "./config.js";
import jwt from "jsonwebtoken";
import { TokenData, RedactedUser } from "./types/auth.js";
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

export function generate_jwt(
  auth_token_data: TokenData,
  type: number = 1,
  expiresIn: number | undefined = undefined,
) {
  const secret =
    type === 2
      ? config.jwt.refresh_token_secret
      : config.jwt.access_token_secret;
  const options = { algorithm: "HS256" } as jwt.SignOptions;

  if (expiresIn) options.expiresIn = expiresIn;

  const token = jwt.sign(auth_token_data, secret, options);
  return token;
}

export async function saveSession(user: RedactedUser, exp: number) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  await redis.hset(sessionId, user as any);
  await redis.lpush("activeSession:" + user.user_id, sessionId);
  await redis.expire(sessionId, exp);
  return sessionId;
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

export function validateToken(token: string, type: number = 1) {
  try {
    const secret =
      type === 2
        ? config.jwt.refresh_token_secret
        : config.jwt.access_token_secret;

    const result = jwt.verify(token, secret);
    return result;
  } catch (ex) {
    return null;
  }
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
