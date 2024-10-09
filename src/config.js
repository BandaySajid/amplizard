import { fileURLToPath } from "node:url";
import path from "node:path";

export default {
  environment: process.env.NODE_ENV || "development",

  server: {
    host: process.env.host || "localhost",
    port: Number(process.env.port) || 9090,
  },

  websocket: {
    host: process.env.ws_host || "localhost",
    port: Number(process.env.ws_port) || 9091,
  },

  jwt: {
    access_token_secret:
      process.env.ACCESS_TOKEN_SECRET || "2108319230213j213lj21jlk313",
    refresh_token_secret:
      process.env.REFRESH_TOKEN_SECRET || "kjdsflkdjsflkdf1908243890213",
  },

  database: {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
  },

  redis: {
    host: process.env.redis_host || "localhost",
    url: process.env.redis_url || "redis://localhost:6379",
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT),
    username: process.env.SMTP_USERNAME || "",
    password: process.env.SMTP_PASSWORD || "",
  },

  gemini: {
    api_key: process.env.gemini_api_key || "",
  },

  dirname: (meta_url) => {
    return path.dirname(fileURLToPath(meta_url));
  },
};
