export interface ServerMessage {
  type: "chat";
  id: string;
  role: "user" | "bot";
  message: string;
  end: boolean;
}

export interface ClientMessage {
  type: "chat";
  message: string;
}

export function isServerMessage(arg: any): arg is ServerMessage {
  return (
    arg &&
    arg.type === "chat" &&
    typeof arg.id &&
    typeof arg.role === "string" &&
    typeof arg.message === "string" &&
    typeof arg.end === "boolean"
  );
}

export function isClientMessage(arg: any): arg is ClientMessage {
  return arg && typeof arg.message === "string" && arg.type === "chat";
}

export interface RespError {
  status: number;
  error: string;
}

export function isRespError(arg: any): arg is RespError {
  return arg && typeof arg.status === "number" && typeof arg.error === "string";
}
