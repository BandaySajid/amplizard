import express from "express";
import crypto from "node:crypto";
import { db } from "../db/connection.js";
import { Hook } from "../types/hook.js";
import { RenderData } from "../types/bot.js";
import { respError, renderStatus } from "../util.js";
import redis from "../db/redis.js";
import * as util from "../util.js";
import { body, validationResult } from "express-validator";
import { Model } from "../model/model.js";
import config from "../config.js";

type Bot = {
  bot_id: crypto.UUID;
  name: string;
  description?: string;
};

type ChatSessionTokenData = {
  chatId: string;
  botId: string;
  createdOn: number;
};

const MAX_FILE_SIZE = 20 * (1000 * 1000);
const LOCALHOST = `http://localhost:${config.server.port}`;
const REMOTEHOST = `https://amplizard.com`;
const CACHE_EXPIRE_TIME = 7200; //will be 2 hours

const ImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

async function getHooks(bot_id: string): Promise<Hook[]> {
  const hooks =
    (await db`SELECT * FROM hooks where bot_id = ${bot_id}`) as Hook[];

  return hooks;
}

async function setBotCache(bot: Bot): Promise<void> {
  const identifier = `bot:${bot.bot_id}`;
  await redis.hset(`bot:${bot.bot_id}`, bot);
  await redis.expire(identifier, CACHE_EXPIRE_TIME);
}

async function getBotCache(botId: string): Promise<Bot | undefined> {
  return (await redis.hgetall(`bot:${botId}`)) as Bot;
}

async function deleteBotCache(botId: string): Promise<void> {
  await redis.del(botId);
}

export async function handleCreateBot(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const bot_id = crypto.randomUUID();

    const { name, description } = req.body;

    const bot = {
      bot_id,
      name,
    } as Bot;

    if (description) bot.description = description;

    await db`INSERT INTO bots ${db(bot)}`;

    res.setHeader("HX-Redirect", `/bots/${bot_id}`);

    res.status(201).json({
      status: "success",
      bot,
    });
  } catch (err) {
    next(err);
  }
}

export function renderCreateBot(_: express.Request, res: express.Response) {
  return res.render("bot/edit-bot", {
    title: "New Bot",
    type: "New",
    method: "post",
    url: `/api/v1/bots`,
  });
}

export async function renderBots(_: express.Request, res: express.Response) {
  let bots;
  try {
    bots = await db`SELECT * FROM bots`;
    return res.render("bot/bots", { title: "Bots", bots });
  } catch (err) {
    console.error("an error occured!");
    return res.send("error");
  }
}

async function getBot(bot_id: string) {
  const [bot] = await db`SELECT * FROM bots where bot_id = ${bot_id}`;

  return bot;
}

export async function handleGetBot(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { id } = req.params;

    let result;

    if (id) {
      result = await db`SELECT * FROM bots where bot_id = ${id}`;
    } else {
      result = await db`SELECT * FROM bots`;
    }

    if (id && result.length <= 0) {
      return res.render("404", { title: "bot does not exist" });
    }

    res.status(201).json({
      status: "success",
      [id ? "bot" : "bots"]: id ? result[0] : result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateBot(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { id } = req.params;

    const allowed_updates = ["name", "description", "url"];

    const requested_updates = Object.keys(req.body);

    if (requested_updates.length <= 0) {
      return renderStatus(
        404,
        `at least 1 update is required from [${allowed_updates}]!`,
        res,
      );
    }

    const are_valid_updates = requested_updates.every((update) => {
      return allowed_updates.includes(update);
    });

    if (!are_valid_updates) {
      return renderStatus(404, `allowed_updates [${allowed_updates}]`, res);
    }

    const existing_values = await db`SELECT * FROM bots where bot_id = ${id}`;

    if (existing_values.length <= 0) {
      return respError(404, "Bot with this data does not exist!", res);
    }

    const bot = existing_values[0] as Bot;

    await db`UPDATE bots SET ${db(req.body)} where bot_id = ${bot.bot_id}`;

    renderStatus(200, "bot updated successfully!", res);

    await deleteBotCache(bot.bot_id);
  } catch (error) {
    next(error);
  }
}

export async function renderEditBots(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const data = {} as RenderData;
    const bot = (await getBot(req.params.id)) as Bot;
    if (!bot) {
      return res.render("404", { title: "404" });
    }

    data.bot = bot;

    return res.render("bot/edit-bot", {
      title: "Edit",
      data,
      type: "Edit",
      method: "put",
      url: `/api/v1/bots/${req.params.id}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteBot(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const bot_id = req.params.id;

    const [bot] =
      (await db`SELECT * FROM bots where bot_id = ${bot_id}`) as Bot[];

    if (!bot) {
      return respError(404, "bot does not exist!", res);
    }

    await db`DELETE FROM bots WHERE bot_id = ${bot.bot_id};`;

    deleteBotCache(bot.bot_id);

    res.setHeader("HX-Location", `/bots/`);

    return res.status(200).json({
      status: "success",
      description: "bot deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
}

async function createNewChat(botId: string, botName: string): Promise<string> {
  const chatId = crypto.randomUUID();
  const model = new Model({
    provider: "GOOGLE",
    modelName: botName,
    botId,
    chatId,
    apiKey: config.gemini.api_key,
    modelId: "gemini-1.5-flash",
  });

  let hooks = await getHooks(botId);

  hooks = hooks.map((hook) => {
    try {
      hook.payload = JSON.parse(hook.payload);

      hook.headers = JSON.parse(hook.headers);
    } catch (err) {}

    return hook;
  });

  model.initModelInstruction(JSON.stringify(hooks));

  return chatId;
}

export async function handleCreateChatSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    console.log("creating new chat session");
    const { bot_id } = req.params;
    const { saveHistory } = req.body;

    if (saveHistory) {
      await body("saveHistory")
        .isBoolean()
        .withMessage("invalid saveHistory data!")
        .run(req);

      const vr = validationResult(req);

      if (!vr.isEmpty()) {
        const errors = vr.array();
        return respError(422, "data validation failed!", res, {
          errors,
        });
      }
    }

    const exBot = (await getBot(bot_id)) as Bot;

    if (!exBot) {
      return respError(404, "bot with this id does not exist!", res);
    }

    const botHooks = await getHooks(bot_id);

    if (botHooks.length <= 0) {
      return respError(
        400,
        "Bot has not been configured yet. Hook configuration is requried",
        res,
      );
    }

    const newChatId = await createNewChat(exBot.bot_id, exBot.name);

    const accessToken = util.generate_jwt({
      chatId: newChatId,
      botId: bot_id,
      createdOn: Date.now(),
    } as ChatSessionTokenData);

    res.status(201).json({
      status: "success",
      description: "New chat session created",
      token: accessToken,
      chatId: newChatId,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleChat(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const htmxRequest = req.headers["hx-request"];
    let { prompt } = req.body;
    const { bot_id, chat_id } = req.params;

    if (!(prompt?.trim().length > 0) && !req.file) {
      return respError(400, "message or a file is required!", res);
    }

    let model = Model.getModel(chat_id);

    if (!model) {
      return respError(404, "chat history does not exist!", res);
    }

    //setting hooks data only when a new chat session is created.

    // if customer sent an image.
    if (req.file) {
      if (req.file.size > MAX_FILE_SIZE) {
        return respError(400, "File size should be less than 20MB", res);
      }

      if (!ImageMimeTypes.includes(req.file.mimetype))
        return respError(400, "File should be an image.!", res);

      const customerImage = req.file.buffer.toString("base64");

      console.log("customer sent an image!!");

      await redis.set("customerImage:" + chat_id, customerImage);

      prompt = "Sent you the image";
    }

    const message = await model.sendMessage(prompt);

    const modelName = model.getModelDetails().modelName;

    if (model.closed) {
      console.log("model has been closed with reason:", model.closeMessage);
      if (htmxRequest) {
        return res.status(200).render("components/chatClosed", {
          message: model.closeMessage,
          redirectUrl: "/",
          sender: "system",
        });
      }

      return res.status(200).json({
        status: "success",
        sender: "system",
        name: modelName,
        closed: true,
      });
    }

    if (htmxRequest) {
      return res.status(200).render("partials/Message", {
        message,
        sender: "AI",
        layout: false,
        name: modelName,
        closed: false,
      });
    }
    return res.status(200).json({
      status: "success",
      message,
      sender: "AI",
      name: modelName,
      closed: false,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRenderChat(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const chatId = req.params.chat_id as string;

    const chatSession = Model.getModel(chatId)?.getModelDetails();

    if (!chatSession) {
      return res.status(404).render("404", {
        title: "Chat not found",
        embed: true,
        description: "Chat does not exist!",
      });
    }

    const bot = (await util.getBotCache(chatSession.botId)) as Bot;

    if (!bot) {
      return respError(404, "bot does not exist!", res);
    }

    const botData = {
      name: bot.name,
      botId: chatSession.botId,
      chatId: chatId,
    };

    const endpoint = `/api/v1/bots/${bot.bot_id}/chat/${chatId}`;

    return res.render("chatbot", {
      title: "bot",
      noMenu: true,
      bot: botData,
      chatUrl:
        config.environment === "production"
          ? REMOTEHOST + endpoint
          : LOCALHOST + endpoint,
    });
  } catch (err) {
    next(err);
  }
}
