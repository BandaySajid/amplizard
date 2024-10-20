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

  dirname: (meta_url) => {
    return path.dirname(fileURLToPath(meta_url));
  },
};
