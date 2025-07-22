// DeepDiveStage
export const deepDiveStageSchema =
z.object({
  product_market_fit_score: z.number().optional(),
  product_market_fit_narrative: z.string().optional(),
  market_size_score: z.number().optional(),
  market_size_narrative: z.string().optional(),
  market_timing_score: z.number().optional(),
  market_timing_narrative: z.string().optional(),
  founders_execution_score: z.number().optional(),
  founders_execution_narrative: z.string().optional(),
  technical_feasibility_score: z.number().optional(),
  technical_feasibility_narrative: z.string().optional(),
  competitive_moat_score: z.number().optional(),
  competitive_moat_narrative: z.string().optional(),
  profitability_potential_score: z.number().optional(),
  profitability_potential_narrative: z.string().optional(),
  strategic_exit_score: z.number().optional(),
  strategic_exit_narrative: z.string().optional(),
  regulatory_risk_score: z.number().optional(),
  regulatory_risk_narrative: z.string().optional(),
  customer_validation_plan: z.string().optional(),
  go_to_market_score: z.number().optional(),
  go_to_market_narrative: z.string().optional(),
  overall_investor_attractiveness_score: z.number().optional(),
  overall_investor_attractiveness_narrative: z.string().optional(),
  generation_notes: z.string().optional(),
})

// IteratingStage
export const iteratingStageSchema =
z.object({
  validate_assumptions: z.array(z.any()).optional(),
  iteration_log: z.array(z.any()).optional(),
  rescore: z.array(z.any()).optional(),
  business_model_canvas_updates: z.string().optional(),
  market_snapshot: z.string().optional(),
  analogous_success_failure_analysis: z.array(z.any()).optional(),
  early_traction_plan: z.string().optional(),
  feedback_loops: z.string().optional(),
  pivot_persevere_kill_framework: z.string().optional(),
  validation_metrics_dashboard: z.array(z.any()).optional(),
  generation_notes: z.string().optional(),
})

// ConsideringIdeaData
export const consideringIdeaDataSchema =
z.object({
  stakeholder_alignment: z.any(),
  execution_communication: z.any(),
  summary: z.string().optional(),
  progress: z.number().optional(),
})

