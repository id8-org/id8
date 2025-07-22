import { z } from "zod";

export const suggestedSchema = z.object({
  stage: z.literal("Suggested"),
  confidence: z.number(),
  generation_method: z.enum(["ai", "system", "byoi"]),
  idea_name: z.string(),
  scope_commitment: z.string(),
  source_of_inspiration: z.string(),
  problem_statement: z.string(),
  elevator_pitch: z.string(),
  core_assumptions: z.array(z.string()),
  riskiest_assumptions: z.array(z.string()),
  target_audience: z.string(),
  overall_score: z.number(),
  overall_score_narrative: z.string(),
  effort_score: z.number(),
  effort_score_narrative: z.string(),
  summary: z.string(),
  value_prop: z.string(),
  fit_check: z.string(),
  next_actions: z.array(z.string()),
});