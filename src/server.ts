import express from "express";
import { bot_router, hook_router, views_router } from "./router.js";
import { init } from "./db/connection.js";
import { PostgresError } from "postgres";
import gateway from "./gateway/gateway.js";
import http from "node:http";
import internal from "node:stream";
import { db } from "./db/connection.js";
import { engine } from "express-handlebars";
import config from "./config.js";
import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";

const __dirname = config.dirname(import.meta.url);
const processErrors = ["uncaughtException", "unhandledRejection"];

const app = express();
await init(); //initializing database with schema.
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); //for json request body
app.use(cookieParser());

app.set("view engine", "hbs");
app.engine(
  "hbs",
  engine({
    extname: "hbs",
    helpers: {
      eq: function (v1: any, v2: any) {
        return v1 === v2;
      },
      objGet: function (obj: any, varName: any) {
        const elem = obj[varName];
        if (!elem) {
          return null;
        }
        return elem;
      },
      setVar: function (varName: any, varValue: any, options: any) {
        options.data.root[varName] = varValue;
      },
      getVar: function (varName: any, options: any) {
        return options.data.root[varName];
      },
      concat: function () {
        var outStr = "";
        for (var arg in arguments) {
          if (typeof arguments[arg] != "object") {
            outStr += arguments[arg];
          }
        }
        return outStr;
      },
      json: function (varName: any) {
        return JSON.stringify(varName);
      },
      notEq: function (varName: any, options: any) {
        if (!options.data.root[varName]) {
          return true;
        }
        return false;
      },
      prodEnv() {
        if (process.env.NODE_ENV === "production") {
          return true;
        }
        return false;
      },
      devEnv() {
        if (process.env.NODE_ENV !== "production") {
          return true;
        }
        return false;
      },
    },
    layoutsDir: path.join(__dirname, "/views/layouts"),
    defaultLayout: "main.hbs",
    partialsDir: path.join(__dirname, "/views/partials"),
  }),
);

app.use(cors({ methods: ["OPTIONS", "POST"], origin: "*" }));
app.use(express.static(path.join(__dirname, "./static")));
app.set("views", path.join(__dirname, "./views"));

app.use(views_router);
//app.use("/api/v1/", auth_router);
app.use("/api/v1/", bot_router);
app.use("/api/v1/", hook_router);

// custom error handler.
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("ERROR with server route", req.url);
    console.error("[SERVER ERROR]:", err);
    if (res.headersSent) {
      console.log("headers sent")
      return next(err);
    }
    if (err.name === "PostgresError") {
      const error = err as PostgresError;
      const ec = Number(error.code);
      let description;
      if (ec === 23505) {
        description =
          error.table_name?.slice(0, error.table_name.length - 1) +
          " " +
          error.constraint_name?.split("_")[1] +
          " already taken";
      } else if (ec === 42703) {
        description = `invalid property: ${error.message.split(" ")[1]}`;
      } else {
        description = "Error with data";
      }

      if (!res.headersSent) {
        return res.status(400).json({ status: "error", error: description });
      }
    }

    if (!res.headersSent) {
      res.status(500).json({ status: "error", error: "internal server error" });
    }
  },
);

const server = http.createServer(app);

app.all("*", (_, res) => {
  return res.render("404");
});

server.on(
  "upgrade",
  async (
    request: http.IncomingMessage,
    socket: internal.Duplex,
    head: Buffer,
  ) => {
    try {
      console.log("[GATEWAY]: Connection upgrade!!!");

      const api_key = request.url?.split("/")[1];

      if (!api_key) {
        return socket.destroy();
      }

      const [bot] = await db`SELECT * FROM bots where api_key = ${api_key}`;

      if (!bot) {
        return socket.destroy();
      }

      gateway.handleUpgrade(request, socket, head, function done(ws) {
        request.headers.api_key = api_key;
        gateway.emit("connection", ws, request);
      });
    } catch (e) {
      console.error("an error occurred", e);
      return socket.destroy();
    }
  },
);

for (const error of processErrors) {
  process.on(error, (error) => {
    console.error("[INTERNAL SERVER ERROR]:", error);
  });
}

export default server;
