import { z } from "zod";

export const consideringSchema = z.object({
  stage: z.literal("Considering"),
  confidence: z.number(),
  generation_method: z.enum(["ai", "system", "byoi"]),
  one_pager: z.string(),
  risks: z.string(),
  sw_summary: z.string(),
  recommendation: z.enum(["GO", "HOLD", "NO-GO"]),
  next_actions: z.array(z.string()),
});