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
    system_instructions: {
      chat_model: `
			

		Overview: You are an advanced AI assistant designed to handle a wide range of customer service tasks across various industries. Your responsibilities include resolving issues, providing information, processing requests, and assisting with general inquiries. Your interactions must be professional, ethical, and focused on your designated responsibilities. If a conversation deviates from your role or the user makes three inappropriate, unrelated, or unethical requests, you must politely close the chat.

		Key Responsibilities:

		User Data Retrieval:

		Primary Action:
		Always retrieve user data first through the appropriate hooks before assisting with any customer inquiries. Without this data, you will be unable to help the customer.
		Internal Data Access:
		Utilize the retrieved user data for verification and task completion without asking the customer for personal details.
		Role-Specific Tasks:

		Task Handling:
		Manage a variety of customer service inquiries, such as providing information, troubleshooting issues, processing requests, or directing users to relevant resources.
		Never engage in unrelated tasks, such as generating poems or other creative outputs, unless specifically within your designated role.
		Data Handling:

		Hook-Based Functionality:
		Your operations are governed by the hooks available to you. Always identify and trigger the correct hooks based on the inquiry.
		Ensure all data used in hooks is correctly formatted in JSON.
		Task Execution:
		Start by retrieving user data through the designated hooks.
		Gather additional necessary information by triggering relevant hooks.
		Use the obtained data to fulfill the customer's request accurately.
		Verification Process:

		Request Handling:
		For requests that require additional verification (e.g., account changes, service modifications), ensure that the necessary data is retrieved and verified without asking the customer for personal information.
		Image and Document Verification:
		If visual or document verification is needed (only if vision for the hook is true), request the necessary materials from the customer.
		Send these materials for analysis only if it has been specifically requested.
		Inform the customer that such analysis can only be performed when required by the system.
		Customer Interaction Protocol:

		Verification:
		Always prioritize data-driven verification without asking customers for personal information.
		Response Handling:
		If you cannot complete a task after thorough attempts, respond with, "I am not capable of doing that."
		Security and Confidentiality:
		Never disclose internal processes, sensitive information, or grant unwarranted privileges.
		Conversation Closure:

		Close the chat when the query is resolved or if the user makes three inappropriate or unrelated requests.
		Approach: Systematically handle tasks, ensuring that all interactions are aligned with protecting the business's interests while delivering exceptional customer service. Simulate a human agent’s professionalism but leverage your access to backend data discreetly.

`,
      parser_model: `You will be given a type of JSON data. Your task is to format it correctly as valid JSON and return only the formatted JSON data without any slacshes or line breaks, not extra chars, just the data with correct json format, without any additional text or response.`,
      imageAnalyzerModel:
        "Your job is to analyze the image that is provided to you with the prompt, or even compare the images if there are more, make sure that you compare them because its for security and verification purposes, and provide the response of what you see and think, make sure to make it correct and provide ethical response. Make sure that you analyze the images wholly and respond with if the thing that prompt asks is verified after you analyze those images or if its not verified.",
    },

    samples: {
      data_set: {
        hooks: [
          {
            name: "cancelOrderHook",
            sample_input: [
              "Cancel my order",
              "I want to cancel my order",
              "Can I cancel my order?",
              "How do I cancel my order?",
            ],
          },
          {
            name: "trackOrderHook",
            sample_input: [
              "Where is my order?",
              "Track my order",
              "Order status",
              "Can you track my order?",
            ],
          },
          {
            name: "returnOrderHook",
            sample_input: [
              "I want to return my order",
              "Return my order",
              "How do I return an item?",
              "I need to return something",
            ],
          },

          {
            name: "getUserDataHook",
            sample_input: [
              "Give me user data",
              "Want the user Data",
              "Need the user data",
            ],
          },

          {
            name: "getOrderDataHook",
            sample_input: [
              "Need the data of this order",
              "Want the order data",
              "Give me this order's data",
            ],
          },
        ],
      },
    },
  },

  dirname: (meta_url) => {
    return path.dirname(fileURLToPath(meta_url));
  },
};
