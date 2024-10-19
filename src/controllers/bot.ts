import express from "express";
import crypto from "node:crypto";
import { db } from "../db/connection.js";
import { Hook } from "../types/hook.js";
import { RenderData } from "../types/bot.js";
import { respError, renderStatus } from "../util.js";
import redis from "../db/redis.js";
import * as util from "../util.js";
import { body, validationResult } from "express-validator";
import { prepareChatAgent, getChatAgent } from "../model/agent.js";
import config from "../config.js";
import { MODEL_IDS } from "../model/model_types.js";
const ai_providers = Object.keys(MODEL_IDS);

type Bot = {
  bot_id: crypto.UUID;
  name: string;
  description?: string;
  knowledge?: string;
  ai_provider: string;
  ai_model: string;
  api_key: string;
};

type ChatSessionTokenData = {
  chatId: string;
  botId: string;
  createdOn: number;
};

const MAX_FILE_SIZE = 20 * (1000 * 1000);
const LOCALHOST = `http://localhost:${config.server.port}`;
const REMOTEHOST = `https://amplizard.com`;
//const CACHE_EXPIRE_TIME = 7200; //will be 2 hours

const ImageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

/*async function getHooks(bot_id: string): Promise<Hook[]> {
  const hooks =
    (await db`SELECT * FROM hooks where bot_id = ${bot_id}`) as Hook[];

  return hooks;
}*/

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

    const { name, description, ai_provider, ai_model, api_key } = req.body;

    const bot = {
      bot_id,
      name,
      ai_provider,
      ai_model,
      api_key,
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
    ai_providers,
  });
}

export async function renderBots(_: express.Request, res: express.Response) {
  try {
    const bots = await db`SELECT * FROM bots`;
    return res.render("bot/bots", { title: "Bots", bots });
  } catch (err) {
    console.error("an error occured while rendering!", err);
    return res.send("error");
  }
}

export async function renderUpdateBotKnowledge(
  req: express.Request,
  res: express.Response,
) {
  try {
    const bot_id = req.params.id;
    const [bot] =
      (await db`SELECT knowledge FROM bots where bot_id = ${bot_id}`) as Bot[];
    const k = bot.knowledge;
    res.render("bot/knowledge", {
      title: "Knowledge",
      knowledge: k ? k : "",
      url: "/api/v1/bots/" + bot_id + "/knowledge",
      method: "put",
    });
  } catch (err) {
    console.error("an error occured while rendering!", err);
    return res.send("error");
  }
}

export async function handleUpdateBotKnowledge(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { knowledge } = req.body;

    await db`UPDATE bots SET knowledge = ${knowledge} where bot_id = ${req.params.id}`;
    return res.json({
      status: "success",
      description: "bot knowledge updated successfully!",
    });
  } catch (err) {
    next(err);
  }
}

export function renderAIModels(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const provider = req.query.ai_provider;
    let elements: string[] = [];
    const renderObj = {
      elements,
      label: "AI Model",
      id: "model-selector",
      name: "ai_model",
      class: "flex flex-col justify-center",
      layout: false,
    };
    if (!provider) {
      for (const p of ai_providers) {
        for (const m of Object.values(MODEL_IDS[p as keyof typeof MODEL_IDS])) {
          elements.push(m);
        }
      }
      renderObj.elements = elements;
      return res.status(200).render("partials/select", renderObj);
    }
    elements = Object.values(MODEL_IDS[provider as keyof typeof MODEL_IDS]);
    console.log("got elements", elements);
    renderObj.elements = elements;
    console.log("final renderObj", renderObj);
    return res.status(200).render("partials/select", renderObj);
  } catch (err) {
    next(err);
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

    const allowed_updates = [
      "name",
      "description",
      "ai_provider",
      "ai_model",
      "api_key",
    ];

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

export async function renderEditBot(
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

    const ai_models = Object.values(
      MODEL_IDS[bot.ai_provider as keyof typeof MODEL_IDS],
    );

    return res.render("bot/edit-bot", {
      title: "Edit",
      data,
      type: "Edit",
      method: "put",
      url: `/api/v1/bots/${req.params.id}`,
      ai_providers,
      ai_models,
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

async function createNewChat(
  botId: string,
  botName: string,
  provider: string,
  modelId: string,
  apiKey: string,
  knowledge?: string,
): Promise<string> {
  const chatId = crypto.randomUUID();

  prepareChatAgent({
    provider,
    modelName: botName,
    botId,
    chatId,
    apiKey,
    modelId,
    knowledge,
    config: { maxSteps: 5 },
  });

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

    const newChatId = await createNewChat(
      exBot.bot_id,
      exBot.name,
      exBot.ai_provider,
      exBot.ai_model,
      exBot.api_key,
      exBot.knowledge,
    );

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
    const { chat_id } = req.params;

    if (!(prompt?.trim().length > 0) && !req.file) {
      return respError(400, "message or a file is required!", res);
    }

    let model = getChatAgent(chat_id);

    if (!model) {
      return respError(404, "chat history does not exist!", res);
    }

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

    const modelName = model.modelName;

    // if (model.closed) {
    //   console.log("model has been closed with reason:", model.closeMessage);
    //   if (htmxRequest) {
    //     return res.status(200).render("components/chatClosed", {
    //       message: model.closeMessage,
    //       redirectUrl: "/",
    //       sender: "system",
    //     });
    //   }
    //
    //   return res.status(200).json({
    //     status: "success",
    //     sender: "system",
    //     name: modelName,
    //     closed: true,
    //   });
    // }

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

    const chatSession = getChatAgent(chatId);

    if (!chatSession) {
      return res.status(404).render("404", {
        title: "Chat not found",
        embed: true,
        description: "Chat does not exist!",
      });
    }

    const bot = (await util.getBotCache(chatSession.botId as string)) as Bot;

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
