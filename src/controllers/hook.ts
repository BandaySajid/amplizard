import express, { NextFunction } from "express";
import { db } from "../db/connection.js";
import crypto from "node:crypto";
import { Hook } from "../types/hook.js";
import { respError, renderStatus } from "../util.js";

const reqMethods = ["GET", "POST", "PATCH", "PUT"];

export async function handleCreateHook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { bot_id } = req.params;

    const [bot] = await db`SELECT * FROM bots where bot_id = ${bot_id}`;

    if (!bot) {
      return respError(404, "Bot with this id or name does not exist", res);
    }

    const hook = req.body as Hook;

    if (hook.api_calling) {
      hook.api_calling = true;
      hook.rephrase = false;
      if (!reqMethods.includes(hook.method)) {
        return respError(404, "invalid request method", res);
      }
    } else {
      hook.api_calling = false;
      if (hook.rephrase) {
        hook.rephrase = true;
      }
    }

    hook.bot_id = bot.bot_id;

    hook.hook_id = crypto.randomUUID();

    await db`INSERT INTO hooks ${db(hook)}`;

    res.setHeader("HX-Redirect", `/bots/${bot_id}/hooks`);

    res
      .status(201)
      .json({ status: "success", description: "hook created successfully" });
  } catch (err) {
    next(err);
  }
}

export async function renderCreateHook(
  req: express.Request,
  res: express.Response,
) {
  try {
    const [existing_bot] =
      await db`SELECT * FROM bots where bot_id = ${req.params.bot_id}`;

    if (!existing_bot) {
      return res.render("404", { title: "404" });
    }

    return res.render("bot/edit-hook", {
      title: "New Hook",
      edit: false,
      url: `/api/v1/bots/${req.params.bot_id}/hooks/`,
      method: "post",
      reqMethods,
    });
  } catch (err) {
    return res.render("404", {
      title: "404",
    });
  }
}

async function getHooks(
  bot_id: string,
  hook_id: string | undefined = undefined,
) {
  let hooks;
  if (!hook_id) {
    hooks = await db`SELECT * FROM hooks where bot_id = ${bot_id}`;
  } else {
    [hooks] =
      await db`SELECT * FROM hooks where bot_id = ${bot_id} AND hook_id = ${hook_id}`;
  }
  return hooks;
}

export async function renderHooks(
  req: express.Request,
  res: express.Response,
  next: NextFunction,
) {
  try {
    const hooks = (await getHooks(req.params.bot_id)) as Hook[];
    return res.render("bot/hooks", {
      title: "Hooks",
      hooks,
      bot_id: req.params.bot_id,
    });
  } catch (err) {
    next(err);
  }
}

export async function renderEditHook(
  req: express.Request,
  res: express.Response,
) {
  let hook;
  try {
    hook = (await getHooks(req.params.bot_id, req.params.hook_id)) as Hook[];

    if (!hook) {
      return res.render("404", { title: "not found" });
    }
    return res.render("bot/edit-hook", {
      title: "Hook",
      hook,
      url: `/api/v1/bots/${req.params.bot_id}/hooks/${req.params.hook_id}`,
      method: "put",
      reqMethods,
    });
  } catch (err) {}
}

export async function handleGetHook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { hook_id, bot_id } = req.params;

    if (!bot_id) {
      return res.status(400).json({
        status: "error",
        error: "bot_id is required!",
      });
    }

    const [existing_bot] =
      await db`SELECT * FROM bots where bot_id = ${bot_id}`;

    if (!existing_bot) return respError(404, "Bot does not exist", res);

    const hooks = getHooks(bot_id, hook_id);

    res.status(200).json({
      status: "success",
      [hook_id ? "hook" : "hooks"]: hooks,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateHook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { bot_id, hook_id } = req.params;

    const allowed_updates = [
      "name",
      "url",
      "payload",
      "method",
      "headers",
      "signal",
      "response",
      "rephrase",
      "api_calling",
    ];

    const requested_updates = Object.keys(req.body);

    if (requested_updates.length <= 0) {
      return renderStatus(
        400,
        `At least 1 update is required from [${allowed_updates}]`,
        res,
      );
    }

    const are_valid_updates = requested_updates.every((update) => {
      return allowed_updates.includes(update);
    });

    if (!are_valid_updates) {
      return renderStatus(400, `Allowed updates [${allowed_updates}]`, res);
    }

    const [bot] = await db`SELECT * FROM bots where bot_id = ${bot_id}`;

    if (!bot) {
      return respError(404, "Bot with this id does not exist", res);
    }

    const hook: Hook = req.body;
    if (hook.api_calling) {
      hook.api_calling = true;
      hook.rephrase = false;
      if (!reqMethods.includes(hook.method)) {
        return respError(404, "invalid request method", res);
      }
    } else {
      hook.api_calling = false;
      if (hook.rephrase) {
        hook.rephrase = true;
      } else {
        hook.rephrase = false;
      }
    }

    hook.bot_id = bot.bot_id;

    const [ex_hook] =
      await db`SELECT * FROM hooks where hook_id = ${hook_id} AND bot_id = ${bot_id}`;

    if (!ex_hook) return respError(404, "Hook does not exist", res);

    await db`UPDATE hooks SET ${db(hook)} where hook_id = ${hook_id}`;

    renderStatus(200, "hook updated successfully", res);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteHook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  try {
    const { hook_id, bot_id } = req.params;

    const [hook] =
      await db`SELECT * FROM hooks where bot_id = ${bot_id} AND hook_id = ${hook_id}`;

    if (!hook) {
      return respError(404, "Hook does not exist", res);
    }

    await db`DELETE FROM hooks WHERE hook_id = ${hook.hook_id};`;

    return res.status(200).json({
      status: "success",
      description: "hook deleted successfully!",
    });
  } catch (error) {
    next(error);
  }
}
