import { z } from "zod";

export const iteratingExperimentSchema = z.object({
  proposed_experiment_summary: z.string(),
  hypothesis: z.string(),
  validation_method: z.string(),
  success_metrics: z.string(),
  timeline: z.string(),
  rationale: z.string(),
  user_feedback_action: z.enum(["accept", "edit", "replace"]),
  edited_or_replacement_details: z.string().optional(),
  next_steps: z.string(),
});