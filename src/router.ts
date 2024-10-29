import express from "express";
import * as bot_controller from "./controllers/bot.js";
import * as hook_controller from "./controllers/hook.js";
import * as validator from "./middleware/validator.js";

import multer from "multer";
const storage = multer.memoryStorage();
const fileUpload = multer({ storage });

//base api url : /api/auth/..
const bot_router = express.Router();
bot_router.post("/bots", validator.validateBot, bot_controller.handleCreateBot);
bot_router.get("/bots/:id", bot_controller.handleGetBot);
bot_router.get("/bots", bot_controller.handleGetBot); //get all bots

bot_router.put(
  "/bots/:id",

  validator.validateBot,
  bot_controller.handleUpdateBot,
);
bot_router.put(
  "/bots/:id/knowledge",
  validator.validateBotKnowledge,
  bot_controller.handleUpdateBotKnowledge,
);
bot_router.delete(
  "/bots/:id",

  bot_controller.handleDeleteBot,
);
bot_router.post(
  "/bots/:bot_id/chat/new",

  bot_controller.handleCreateChatSession,
);
bot_router.post(
  "/bots/:bot_id/chat/:chat_id",

  fileUpload.single("image"),
  bot_controller.handleChat,
);

const hook_router = express.Router();
//since multiple hooks will be created / updated or deleted at the same time hitting just one button, so there is no need for update, delete apis.
hook_router.post(
  "/bots/:bot_id/hooks",
  validator.validateHook,

  hook_controller.handleCreateHook,
);
hook_router.put(
  "/bots/:bot_id/hooks/:hook_id",
  validator.validateHook,

  hook_controller.handleUpdateHook,
);
hook_router.get(
  "/bots/:bot_id/hooks",

  hook_controller.handleGetHook,
);
hook_router.get(
  "/bots/:bot_id/hooks/:hook_id",

  hook_controller.handleGetHook,
);
hook_router.delete(
  "/bots/:bot_id/hooks/:hook_id",

  hook_controller.handleDeleteHook,
);

// for rendering views.
const views_router = express.Router();

views_router.get("/", (req, res) => {
  res.redirect("/bots");
});

views_router.get(
  "/pricing",
  function (_: express.Request, res: express.Response) {
    return res.render("comingSoon", {
      title: "pricing",
    });
  },
);

views_router.get(
  "/bots/:bot_id/chat/:chat_id",
  bot_controller.handleRenderChat,
);

views_router.get("/bots", bot_controller.renderBots);

views_router.get(
  "/bots/new",

  bot_controller.renderCreateBot,
);

views_router.get("/bots/:id", bot_controller.renderEditBot);

views_router.get(
  "/bots/:id/knowledge",

  bot_controller.renderUpdateBotKnowledge,
);

views_router.get(
  "/bots/:bot_id/hooks/new",

  hook_controller.renderCreateHook,
);

views_router.get(
  "/bots/:bot_id/hooks/",

  hook_controller.renderHooks,
);

views_router.get(
  "/bots/:bot_id/hooks/:hook_id",

  hook_controller.renderEditHook,
);

export { bot_router, hook_router, views_router };
