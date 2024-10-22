import Redis from "ioredis";
import config from "../config.js";

const redis = new Redis({ host: config.redis.host, port: 6379 });

export default redis;
