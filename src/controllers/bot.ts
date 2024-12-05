import express from "express";
import crypto from "node:crypto";
import { db } from "../db/connection.js";
import { RenderData } from "../types/bot.js";
import { respError, renderStatus } from "../util.js";
import redis from "../db/redis.js";
import * as util from "../util.js";
import { body, validationResult } from "express-validator";
import { prepareChatAgent, getChatAgent } from "../model/agent.js";
import config from "../config.js";
import { CoreMessage } from "ai";
import { Hook } from "../types/hook.js";
import { generateEmbeddings } from "../model/embedding.js";
import { Resource } from "../model/types.js";

type Bot = {
  bot_id: crypto.UUID;
  name: string;
  description?: string;
  knowledge?: string;
};

async function createOrUpdateResource(resource: Resource): Promise<boolean> {
  const [exr] =
    (await db`SELECT id FROM resources where bot_id = ${resource.bot_id}`) as Resource[];

  if (!exr) {
    resource.id = crypto.randomUUID();
    await db`INSERT INTO resources ${db(resource)}`;
  } else {
    resource.id = exr.id;
    await db`UPDATE resources SET content = ${resource.content} where bot_id = ${resource.bot_id}`;
  }

  const embeddings = await generateEmbeddings(resource.content);

  const emb_vals = embeddings.map((e) => {
    return {
      id: crypto.randomUUID(),
      resource_id: resource.id,
      content: e.content,
      embedding: JSON.stringify(e.embedding),
    };
  });

  console.log("embeddings generated");

  await db`INSERT into embeddings ${db(emb_vals)}`;

  return true;
}

// const MAX_FILE_SIZE = 20 * (1000 * 1000);

const LOCALHOST = `http://${config.server.ip}:${config.server.port}`;
const REMOTEHOST = `https://amplizard.com`;
//const CACHE_EXPIRE_TIME = 7200; //will be 2 hours

// const ImageMimeTypes = [
//   "image/png",
//   "image/jpeg",
//   "image/webp",
//   "image/heic",
//   "image/heif",
// ];

//formatting model chat history to ui compatible chat history.
function formatChatHistory(history: CoreMessage[]) {
  const final = history
    .map((msg) => {
      let sender;
      let message;
      if (msg.role === "assistant") {
        sender = "AI";
      } else if (msg.role === "user") {
        sender = "user";
      }
      if (typeof msg.content === "string") {
        message = msg.content;
      } else if (Array.isArray(msg.content)) {
        const c = msg.content[0];
        if (c.type === "text") {
          message = c.text;
        }
      }

      if (sender && message) {
        return { sender, message };
      }
    })
    .filter((m) => m);

  return final;
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
    //ai_providers,
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
    const [r] =
      (await db`SELECT content FROM resources where bot_id = ${bot_id}`) as Resource[];
    res.render("bot/knowledge", {
      title: "Knowledge",
      knowledge: r?.content || "",
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
    const { id } = req.params;

    await createOrUpdateResource({
      content: knowledge,
      bot_id: id,
    } as Resource);

    return res.json({
      status: "success",
      description: "bot knowledge updated successfully!",
    });
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

    const allowed_updates = ["name", "description"];

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

async function createNewChat(
  botId: string,
  botName: string,
  hooks: Hook[],
  // knowledge?: string,
): Promise<string> {
  const chatId = crypto.randomUUID();

  await prepareChatAgent(
    {
      modelName: botName,
      botId,
      chatId,
      type: "chat",
      config: { maxSteps: 8, maxTokens: 1000 },
      saveHistory: true,
    },
    hooks,
  );

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

    const hooks =
      (await db`SELECT * FROM hooks where bot_id = ${bot_id}`) as Hook[];

    const newChatId = await createNewChat(
      exBot.bot_id,
      exBot.name,
      hooks,
      // exBot.knowledge,
    );

    res.status(201).json({
      status: "success",
      description: "New chat session created",
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
  const htmxRequest = req.headers["hx-request"];
  try {
    let { prompt } = req.body;
    const { chat_id } = req.params;

    if (!(prompt?.trim().length > 0) && !req.file) {
      return respError(400, "message is required!", res);
    }

    let agent = getChatAgent(chat_id);

    if (!agent) {
      return respError(404, "chat history does not exist!", res);
    }

    const message = await agent.sendMessage(prompt);

    const modelName = agent.modelName;

    if (agent.closed) {
      if (htmxRequest) {
        return res.status(200).render("components/chatClosed", {
          message: "Chat closed due to inappropriate behaviour",
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
        message: message.trimEnd(),
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
    console.error(`Error with api route ${req.url}`, err);

    if (htmxRequest) {
      return res.status(200).render("partials/Message", {
        message: "System error occured",
        sender: "AI",
        layout: false,
        closed: false,
        error: true,
      });
    }

    return res.status(400).json({
      status: "error",
      message: "System error occured",
      sender: "AI",
      closed: false,
    });
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
        layout: false,
      });
    }

    const botData = {
      name: chatSession.modelName,
      botId: chatSession.botId,
      chatId: chatId,
    };

    const endpoint = `/api/v1/bots/${botData.botId}/chat/${chatId}`;

    const history = formatChatHistory(
      chatSession.getHistory() as CoreMessage[],
    );

    console.log("chat history", history);

    return res.render("chatbot", {
      title: "bot",
      noMenu: true,
      bot: botData,
      chatUrl:
        config.environment === "production"
          ? REMOTEHOST + endpoint
          : LOCALHOST + endpoint,
      history,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleEmbedBot(
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
        layout: false,
      });
    }

    // const bot = (await util.getBotCache(chatSession.botId as string)) as Bot;
    //
    // if (!bot) {
    //   return respError(404, "bot does not exist!", res);
    // }

    const botData = {
      name: chatSession.modelName,
      botId: chatSession.botId,
      chatId: chatId,
    };

    const endpoint = `/api/v1/bots/${botData.botId}/chat/${chatId}`;

    const history = formatChatHistory(
      chatSession.getHistory() as CoreMessage[],
    );

    console.log("chat history", history);

    return res.render("chatbot", {
      title: "bot",
      noMenu: true,
      bot: botData,
      chatUrl:
        config.environment === "production"
          ? REMOTEHOST + endpoint
          : LOCALHOST + endpoint,
      history,
    });
  } catch (err) {
    next(err);
  }
}
