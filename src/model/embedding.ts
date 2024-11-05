import { embed, embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { db } from "../db/connection.js";
import config from "../config.js";

const google = createGoogleGenerativeAI({
  apiKey: config.gemini.embedding_api_key,
});

const embeddingModel = google.textEmbeddingModel("text-embedding-004");

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split(".")
    .filter((i) => i !== "");
};

export async function generateEmbeddings(
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
}

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export async function findRelevantContent(userQuery: string) {
  console.log("user query:", userQuery);
  const vectors = await generateEmbedding(userQuery);
  const userQueryEmbedded = JSON.stringify(vectors);

  const similarGuides = await db`
    SELECT content AS name, 
           embeddings.embedding <=> ${userQueryEmbedded} AS similarity 
    FROM embeddings 
    WHERE embeddings.embedding <=> ${userQueryEmbedded} < 0.5 
    ORDER BY similarity 
    LIMIT 4
  `;

  console.log("got similarGuides", similarGuides);

  return similarGuides;
}