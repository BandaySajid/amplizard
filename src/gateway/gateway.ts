import WebSocket, { WebSocketServer } from "ws";
import {
  ClientMessage,
  ServerMessage,
  isClientMessage,
  isServerMessage,
} from "../types/common.js";

const gateway = new WebSocketServer({ noServer: true, clientTracking: true });

interface ClientData {
  id: string;
  socket: WebSocket;
}

const clients: Map<string, ClientData> = new Map();

export function sendMessage(message: ServerMessage, apiKey: string) {
  if (!isServerMessage(message)) {
    throw new Error(
      "SEND-MESSAGE-ERROR: unsupported message, message should a ServerMessage",
    );
  }

  const client = clients.get(apiKey);

  if (!client) {
    throw new Error("SEND-MESSAGE-ERROR: No client record found!!!");
  }
}

gateway.on("connection", (socket, req) => {
  const api_key = req.headers.apiKey as string;

  const clientData = { id: api_key, socket: socket } as ClientData;

  clients.set(api_key, clientData);

  socket.on("message", (buffer) => {
    console.log("[CLIENT]:- Message:", buffer);
    const msgStr = buffer.toString();

    try {
      const msg = JSON.parse(msgStr) as ClientMessage;

      if (!isClientMessage(msg)) {
        throw `Received unsupported message: ${msgStr}`;
      }
    } catch (error) {
      const err = error as Error;
      console.error("Received invalid message:", err.message || err);
    }
  });

  socket.on("error", (error) => {
    console.error("[CLIENT]:- Error:", error);
  });

  socket.on("close", (code) => {
    console.log("[CLIENT]: client connection closed with code:", code);
    clients.delete(api_key);
  });
});

gateway.on("error", (error: Error) => {
  console.error("[GATEWAY]: Error:", error);
});

gateway.on("closed", (code: number) => {
  console.error("[GATEWAY]: Closed with code:", code);
});

gateway.on("listening", () => {
  console.log("[GATEWAY]:- Listening on:", gateway.address());
});

export default gateway;
