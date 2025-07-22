import { z } from 'zod';

export const evidenceReferenceSchema = z.object({
  type: z.string(),
  title: z.string(),
  url: z.string().url(),
});

export const ideaStatusSchema = z.enum(['suggested', 'deep_dive', 'iterating', 'considering', 'closed']);

export const deepDiveVersionSchema = z.object({
  version: z.number(),
  created_at: z.string(),
  content: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
});

export const repoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  language: z.string().optional(),
  stars: z.number().optional(),
  forks: z.number().optional(),
  watchers: z.number().optional(),
  url: z.string().url().optional(),
});

export const ideaSchema = z.object({
  id: z.string(),
  title: z.string(),
  idea_number: z.number().optional(),
  user_id: z.string().optional(),
  hook: z.string().optional(),
  value: z.string().optional(),
  score: z.number().optional(),
  mvp_effort: z.number().optional(),
  potential: z.number().optional(),
  status: ideaStatusSchema.optional(),
  type: z.enum(['side_hustle', 'full_scale']).optional(),
  source_type: z.enum(['byoi', 'system', 'madlib']).optional(),
  repo_id: z.string().optional(),
  repo_url: z.string().url().nullable().optional(),
  repo_language: z.string().nullable().optional(),
  repo_stars: z.number().optional(),
  repo_forks: z.number().optional(),
  repo_watchers: z.number().optional(),
  deep_dive: z.object({
    market_opportunity: z.record(z.any()).optional(),
    execution_capability: z.record(z.any()).optional(),
    business_viability: z.record(z.any()).optional(),
    strategic_alignment_risks: z.record(z.any()).optional(),
    overall_score: z.number().optional(),
    summary: z.string().optional(),
  }).passthrough().optional(),
  business_model: z.string().nullable().optional(),
  market_positioning: z.string().nullable().optional(),
  competitive_advantage: z.string().nullable().optional(),
  go_to_market_strategy: z.string().nullable().optional(),
  success_metrics: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  differentiator: z.string().nullable().optional(),
  call_to_action: z.string().nullable().optional(),
  verticals: z.array(z.string()).optional(),
  horizontals: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  deep_dive_requested: z.boolean().optional(),
  // Add any other backend fields as needed
}).passthrough();

export const ideaWithPotentialSchema = ideaSchema.extend({
  potential: z.number(), // required for this schema
  isHighPotential: z.boolean(),
  isQuickWin: z.boolean(),
  isRecent: z.boolean(),
});

// Export types
export type EvidenceReferenceSchema = z.infer<typeof evidenceReferenceSchema>;
export type IdeaStatusSchema = z.infer<typeof ideaStatusSchema>;
export type DeepDiveVersionSchema = z.infer<typeof deepDiveVersionSchema>;
export type RepoSchema = z.infer<typeof repoSchema>;
export type IdeaSchema = z.infer<typeof ideaSchema>;
export type IdeaWithPotentialSchema = z.infer<typeof ideaWithPotentialSchema>; 