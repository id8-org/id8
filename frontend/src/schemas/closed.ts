import { z } from "zod";

export const closedSchema = z.object({
  stage: z.literal("Closed"),
  generation_method: z.enum(["ai", "system", "byoi"]),
  closure_reason: z.string().optional(),
  post_mortem: z.string().optional(),
  next_actions: z.array(z.string()),
});