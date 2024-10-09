import { z } from "zod";

const toolResultContentSchema = z.object({
  type: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
  isError: z.boolean().optional(),
});

export const querySchema = z.object({
  role: z.string(),
  content: z.array(z.record(z.any()).optional()),
});
