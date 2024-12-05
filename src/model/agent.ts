import { CoreMessage } from "ai";
import { Model } from "./model.js";
import { ModelInitConfig } from "./types.js";
import { getContext } from "./context/index.js";
import { db } from "../db/connection.js";
import { Hook } from "../types/hook.js";
import { z } from "zod";
import { findRelevantContent } from "./embedding.js";
import config from "../config.js";
import { jsonSchema } from "ai";
//import { cacheContext } from "./context/cache.js";

type ChatId = string;
type ChatAgentStore = Map<ChatId, Model>;

const IMC_DEFAULT = 3;

function isHookRespError(arg: any): arg is HookRespError {
  return arg && arg.status === "error" && arg.description;
}

interface TriggerHookData {
  url: string;
  method: string;
  headers: Headers;
  payload: { [key: string]: any };
}

interface HookRespError {
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

const actionGenAgentContext = [
  {
    role: "system",
    content: context.actionGenAgent.instruction,
  },
  ...context.actionGenAgent.context,
];

const actorAgentContext = [
  {
    role: "system",
    content: context.actorAgent.instruction,
  },
  ...context.actorAgent.context,
];

Model.initModel(
  "chat",
  config.gemini.gemini_api_key,
  chatAgentContext as CoreMessage[],
);

Model.initModel(
  "actionGen",
  config.gemini.gemini_api_key,
  actionGenAgentContext as CoreMessage[],
);

Model.initModel(
  "actor",
  config.gemini.gemini_api_key,
  actorAgentContext as CoreMessage[],
);

const chatAgentStore = new Map() as ChatAgentStore;

const actionGenAgent = prepareActionGenAgent({
  type: "actionGen",
  config: { maxSteps: 5 },
  instructions: actionGenAgentContext as CoreMessage[],
});

export async function prepareChatAgent(
  modelInitConfig: ModelInitConfig,
  hooks: Hook[],
): Promise<Model> {
  let imc = 0;
  if (!modelInitConfig.config) modelInitConfig.config = {};

  const action_gen_resp = await actionGenAgent.sendMessage(
    `Here are the hooks: ${JSON.stringify(hooks)}`,
  );

  console.log("Response from action generator:", action_gen_resp);

  const actorAgent = prepareActorAgent({
    type: "actor",
    config: { maxSteps: 5 },
    saveHistory: true,
    instructions: [
      {
        role: "system",
        content: `Here are the actions you can perform by triggering the hooks: ${action_gen_resp} remember this.`,
      },
    ],
  });

  const instructions = [
    {
      role: "system",
      content: `Your name from now is: ${modelInitConfig.modelName}, remember this.`,
    },
  ];

  modelInitConfig.instructions = instructions as CoreMessage[];

  const agent = new Model(modelInitConfig, [] as CoreMessage[]);

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

  const submit_query_to_actor = {
    description:
      "Submit query to actor, everytime you have a query, submit that to actor.",
    parameters: z.object({
      messages: z
        .array(z.string())
        .describe(
          "An array of messages from user, from start to end, not the beginning but the start of the current query.",
        ),
      intent: z.string().describe("The intent of the customer."),
    }),
    execute: async ({
      messages,
      intent,
    }: {
      messages: Array<string>;
      intent: string;
    }) => {
      console.log("Submitting query to actor!!!", messages);

      const resp = await actorAgent.sendMessage(
        `Messages from customer: ${messages}\nCustomer's Intent: ${intent}`,
      );

      console.log("got result from actor:", resp);
      return { result: resp };
    },
  };

  // const addResourceFunctionDeclaration = {
  //   description: `add a resource to your knowledge base. If the user provides a random piece of knowledge unprompted, use this tool without asking for confirmation.`,
  //   parameters: z.object({
  //     content: z
  //       .string()
  //       .describe("the content or resource to add to the knowledge base"),
  //   }),
  //   execute: async ({ content }: { content: string }) =>
  //     createResource({ content }),
  // };

  // const getDataFromKnowledgeBaseFunctionDeclaration = {
  //   description: `Use this when there are no hooks available to trigger or when the triggered hooks didn't provide info or peform action which the current user query wanted, use this to check if you can provide info or answer the query / question. Use this to get information from your knowledge base. Always try and use this after fetching and triggering hooks if the hooks didn't provide answer to user's query.`,
  //   parameters: z.object({
  //     question: z.string().describe("the users question"),
  //   }),
  //   execute: async ({ question }: { question: string }) => {
  //     const result = await findRelevantContent(question);
  //     return { result };
  //   },
  // };

  //TODO: Context Caching
  // await cacheContext(
  //   "gemini-1.5-flash-001",
  //   "context_cache",
  //   context.chatAgent.instruction as string,
  //   context.chatAgent.context as CoreMessage[],
  // );

  // agent.addTool("fetchHook", fetchHookFunctionDeclaration);

  agent.addTool("submitQueryToActor", submit_query_to_actor);
  actorAgent.addTool("triggerHook", triggerHookFunctionDeclaration);
  agent.addTool("triggerInappropriateMessageCounter", inappr_m_declaration);

  // agent.addTool(
  //   "checkKnowledgeBase",
  //   getDataFromKnowledgeBaseFunctionDeclaration,
  // );

  chatAgentStore.set(modelInitConfig.chatId as ChatId, agent);

  return agent;
}

function prepareActorAgent(modelInitConfig: ModelInitConfig) {
  const agent = new Model(modelInitConfig, []);
  return agent;
}

function prepareActionGenAgent(modelInitConfig: ModelInitConfig) {
  const agent = new Model(modelInitConfig, []);
  return agent;
}

export function getChatAgent(chatId: ChatId) {
  return chatAgentStore.get(chatId);
}

const hookSchema = jsonSchema<{
  hookName: string;
  data: {
    url: string;
    method: string;
    headers: object;
    payload: object;
  };
}>({
  type: "object",
  properties: {
    hookName: { type: "string", description: "hook name" },
    data: {
      type: "object",
      description: "hook data",
      properties: {
        url: { type: "string", description: "hook url" },
        method: { type: "string", description: "hook method" },
        headers: {
          type: "object",
          description: "hook headers",
          properties: {
            null: {
              type: "string",
              describe: "null value",
            },
          },
          additionalProperties: true,
        },
        payload: {
          type: "object",
          description: "hook payload with real data",
          properties: {
            null: {
              type: "string",
              describe: "null value",
            },
          },
          additionalProperties: true,
        },
      },
      required: ["url", "method", "headers", "payload"],
    },
  },
  required: ["hookName", "data"],
});

const triggerHookFunctionDeclaration = {
  description: "Trigger hook and get the response.",
  parameters: hookSchema,
  execute: async ({
    hookName,
    data,
  }: {
    hookName: string;
    data: TriggerHookData;
  }) => {
    console.log("got data for triggering hook", data);
    try {
      let result = await triggerHook(hookName, data);
      result = { result };
      console.log("got result:", result);
      return result;
    } catch (err) {
      console.error(`Error triggering hook ${hookName}:`, err);
      return triggerHook(hookName, {
        status: "error",
        description: `Error triggering hook`,
      } as HookRespError);
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

async function triggerHook(
  hook: string,
  data: TriggerHookData | HookRespError,
) {
  console.log(`[TRIGGER]: ${hook} with data being triggered`, data);

  if (isHookRespError(data)) {
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
      if ((data.payload as string).length <= 0) {
        data.payload = {};
      } else {
        data.payload = JSON.parse(data.payload);
      }
    }

    if (typeof data.headers === "string") {
      if ((data.headers as string).length <= 0) {
        data.headers = {} as Headers;
      } else {
        data.headers = JSON.parse(data.headers);
      }
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
