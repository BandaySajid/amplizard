import { CoreMessage } from "ai";
import { Model } from "./model.js";
import { ModelInitConfig } from "./types.js";
import { getContext } from "./context/index.js";
import { db } from "../db/connection.js";
import { jsonrepair } from "jsonrepair";
import { Hook } from "../types/hook.js";
import { z } from "zod";
//import { cacheContext } from "./context/cache.js";

type ChatId = string;
type ChatAgentStore = Map<ChatId, Model>;

const IMC_DEFAULT = 3;

function isTriggerRespError(arg: any): arg is TriggerRespError {
  return arg && arg.status === "error" && arg.description;
}

interface HookData {
  url: string;
  method: string;
  headers: Headers;
  payload: object;
}

interface TriggerRespError {
  status: "error";
  description: string;
}

const context = getContext();

const chatAgentContext = [
  {
    role: "system",
    content: context.chatAgent.instruction,
  },
  ...context.chatAgent.context,
];

const hookAgentContext = [
  {
    role: "system",
    content: context.hookAgent.instruction,
  },
  ...context.hookAgent.context,
];

Model.setContext("chat", chatAgentContext as CoreMessage[]);
Model.setContext("hook", hookAgentContext as CoreMessage[]);

const chatAgentStore = new Map() as ChatAgentStore;

const hookAgent = prepareHookAgent({
  type: "hook",
  config: { maxSteps: 5 },
});

export async function prepareChatAgent(
  modelInitConfig: ModelInitConfig,
): Promise<Model> {
  let imc = 0;
  if (!modelInitConfig.config) modelInitConfig.config = {};

  const agent = new Model(modelInitConfig, []);

  const fetchHookFunctionDeclaration = {
    description: "Fetch available hook to trigger according to the intent.",
    parameters: z
      .object({ intent: z.string() })
      .describe(
        "What's your intent? What do you want to accomplish? what is the query about? What does user need ? Clearly state what you're trying to achieve or what data you need for the AI to effectively identify the relevant hook. Example: Need ceo name because user wants to know the name of the ceo",
      ),
    execute: async ({ intent }: { intent: string }) => {
      const result = await fetchHookHandler(
        intent,
        modelInitConfig.botId as string,
        hookAgent,
        agent.currentUserQuery as string,
      );

      console.log("got result from fetching hooks", result);
      return result;
    },
  };

  const inappr_m_declaration = {
    description: "Increment inapproriate messages counter",
    parameters: z
      .object({ message: z.string() })
      .describe("inapproriate message from user"),
    execute: async () => {
      imc += 1;
      if (imc >= IMC_DEFAULT) {
        console.log("closing chat");
        chatAgentStore.delete(agent.chatId!);
        agent.closed = true;
        return {
          result: "Chat closed due to inapproriate behaviour of the user",
        };
      }

      console.log("inapproriate_messages counter incremented to", imc);

      return { result: "inapproriate messages counter incremented." };
    },
  };

  //TODO: Context Caching
  // await cacheContext(
  //   "gemini-1.5-flash-001",
  //   "context_cache",
  //   context.chatAgent.instruction as string,
  //   context.chatAgent.context as CoreMessage[],
  // );

  agent.addTool("fetchHook", fetchHookFunctionDeclaration);
  agent.addTool("triggerHook", triggerHookFunctionDeclaration);
  agent.addTool("triggerInappropriateMessageCounter", inappr_m_declaration);

  chatAgentStore.set(modelInitConfig.chatId as ChatId, agent);

  return agent;
}

function prepareHookAgent(modelInitConfig: ModelInitConfig) {
  //modelInitConfig.instruction = context.hookAgent.instruction;
  //const history = [...context.hookAgent.context] as CoreMessage[];
  const agent = new Model(modelInitConfig, []);
  return agent;
}

export function getChatAgent(chatId: ChatId) {
  return chatAgentStore.get(chatId);
}

/*
 * Main Chat Agent.
 * Hook Agent.
 * Image analysis agent.
 */

async function fetchHookHandler(
  intent: string,
  bot_id: string,
  hookAgent: Model,
  currentUserQuery: string,
) {
  try {
    const hooks = await db`SELECT * FROM hooks where bot_id = ${bot_id}`;
    const modHooks = hooks.map((hook) => {
      if (hook.api_calling) {
        try {
          hook.payload = JSON.parse(hook.payload);

          hook.headers = JSON.parse(hook.headers);
        } catch (err) {}

        return {
          name: hook.name,
          url: hook.url,
          method: hook.method,
          payload: hook.payload,
          headers: hook.headers,
          signal: hook.signal,
        };
      }

      return {
        name: hook.name,
        signal: hook.signal,
        response: hook.response,
        rephrase: hook.rephrase,
      };
    });

    console.log("[FETCHED-HOOKS]:", modHooks);
    console.log({ intent, currentUserQuery });

    if (modHooks.length <= 0) {
      return {
        result: {
          status: "NO_HOOKS",
          description: "No hooks available to trigger!",
        },
      };
    } else {
      let finalFetchedHook = await hookAgent.sendMessage(
        `User: ${currentUserQuery}\nIntent: ${intent}\nHooks: ${JSON.stringify(modHooks)}.\n Return the hook that specifically satisfies the intent and the query and can perform the action that intent expects, otherwise just say 'No relevant hooks available to trigger'. Make sure the hook is returned in correct json format, just the json object, not a markdown format,`,
      );

      console.log("final fetched hook:", finalFetchedHook);
      if (typeof finalFetchedHook === "string")
        try {
          finalFetchedHook = JSON.parse(finalFetchedHook);
        } catch (err) {}
      return { result: finalFetchedHook };
    }
  } catch (err) {
    return {
      status: "error",
      description: "Error fetching hooks",
    };
  }
}

const triggerHookFunctionDeclaration = {
  description: "Trigger hook and get the response.",
  parameters: z.object({
    hookName: z.string().describe("Name of the hook to trigger"),
    data: z
      .string()
      .describe(
        "To trigger the hook, ensure that the data is a stringified JSON object that includes the URL, method, payload, and headers. Use escape sequences to incorporate this object into a string. Remember to add or replace it with actual data.",
      ),
  }),
  execute: async ({
    hookName,
    data,
  }: {
    hookName: string;
    data: object | string;
  }) => {
    console.log("got data for triggering hook", data);
    try {
      let parsed;
      if (typeof data === "string") {
        try {
          data = data.replaceAll("\\", "");
          parsed = JSON.parse(data);
        } catch (err) {
          parsed = jsonrepair(data);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
        }
      } else {
        parsed = data;
      }

      let result = await triggerHook(hookName, parsed);
      result = { result };
      console.log("got result:", result);
      return result;
    } catch (err) {
      console.error("Invalid json data to trigger the hook:", err);
      return triggerHook(hookName, {
        status: "error",
        description: "Invalid json data to trigger the hook",
      } as TriggerRespError);
    }
  },
};

async function callApi(
  url: string,
  method: string,
  headers: Headers,
  body: BodyInit,
) {
  const options = {} as RequestInit;
  options.method = method;

  if (method?.toUpperCase() !== "GET" && method?.toUpperCase() !== "HEAD") {
    if (Object.keys(headers).length > 0) {
      options.body = JSON.stringify(body);
    }
  }

  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }

  const resp = await fetch(url, options);

  const jsonResp = await resp.json();

  return jsonResp;
}

async function triggerHook(hook: string, data: HookData | TriggerRespError) {
  console.log(`[TRIGGER]: ${hook} with data being triggered`, data);

  if (isTriggerRespError(data)) {
    return {
      status: data.status,
      description: data.description,
    };
  }

  try {
    const [currentHook] =
      (await db`SELECT * FROM hooks where name = ${hook}`) as Hook[];

    if (!currentHook) return "no hook found";

    if (!currentHook.api_calling) {
      return currentHook.response;
    }

    if (typeof data.payload === "string") {
      data.payload = JSON.parse(data.payload);
    }

    if (typeof data.headers === "string") {
      data.headers = JSON.parse(data.headers);
    }

    console.log("data for api", data);

    const response = await callApi(
      data.url,
      data.method,
      data.headers,
      data.payload as BodyInit,
    );

    console.log("got api response");

    return response;
  } catch (err) {
    console.error("HOOK_TRIGGER_ERROR:", err);
    return {
      status: "error",
      description: "Error occured when triggering the hook!",
    };
  }
}
