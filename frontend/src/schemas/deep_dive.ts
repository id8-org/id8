import { z } from "zod";

export const deepDiveSchema = z.object({
  stage: z.literal("Deep Dive"),
  confidence: z.number(),
  generation_method: z.enum(["ai", "system", "byoi"]),
  problem_solution: z.string(),
  target_customer: z.string(),
  market_snapshot: z.string(),
  customer_feedback: z.string(),
  founder_lens: z.string(),
  next_actions: z.array(z.string()),
});