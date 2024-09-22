import { WebSocketServer } from "ws";
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV !== "production") {
  const WSS = new WebSocketServer({ host: "0.0.0.0", port: 6969 });

  WSS.on("listening", () => console.log("HOT RELOADING is active!!!"));

  const files = fs.readdirSync("./src/views/", { recursive: true });

  for (const file of files) {
    fs.watchFile(path.join("./src/views/", file), { interval: 50 }, () => {
      for (const client of WSS.clients) {
        client.send("reload");
      }
    });
  }

  WSS.on("error", (_) => {});
}
