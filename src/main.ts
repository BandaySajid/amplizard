import config from "./config.js";
import server from "./server.js";

server.listen(config.server.port, config.server.host, () => {
  console.log("server running on port:", config.server);
});
