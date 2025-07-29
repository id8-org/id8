// API-related type definitions

export interface EvidenceReference {
  stat: string;
  url: string;
  type?: string;
  title?: string;
}

// Deep Dive types
export interface DeepDiveCategoryScores {
  product_market_fit?: number;
  market_size?: number;
  market_timing?: number;
  founders_ability?: number;
  technical_feasibility?: number;
  go_to_market?: number;
  profitability_potential?: number;
  competitive_moat?: number;
  strategic_exit?: number;
  regulatory_and_external_risks?: number;
}

export interface DeepDiveCategoryNarratives {
  product_market_fit?: string;
  market_size?: string;
  market_timing?: string;
  founders_ability?: string;
  technical_feasibility?: string;
  go_to_market?: string;
  profitability_potential?: string;
  competitive_moat?: string;
  strategic_exit?: string;
  regulatory_and_external_risks?: string;
}

export interface DeepDiveCategory {
  scores?: DeepDiveCategoryScores;
  narratives?: DeepDiveCategoryNarratives;
  details?: string[];
}

export interface DeepDiveStage {
  market_opportunity?: DeepDiveCategory;
  execution_capability?: DeepDiveCategory;
  business_viability?: DeepDiveCategory;
  strategic_alignment_risks?: DeepDiveCategory;
  overall_score?: number;
  summary?: string;
  created_at?: string;
  notes?: string;
  customer_validation_plan?: string;
  generation_notes?: string;
}

// Iteration types
export interface IteratingStage {
  validate_assumptions?: {
    hypothesis: string;
    method: string;
    timeline: string;
    success_metric: string;
    findings: string;
  }[];
  iteration_log?: {
    version: number;
    changes: string;
    rationale: string;
    outcome: string;
  }[];
  rescore?: {
    score_name: string;
    new_score: number;
    confidence: number;
    rationale: string;
  }[];
  business_model_canvas_updates?: string;
  market_snapshot?: string;
  analogous_success_failure_analysis?: {
    comparable: string;
    lesson: string;
    narrative: string;
  }[];
  early_traction_plan?: string;
  feedback_loops?: string;
  pivot_persevere_kill_framework?: string;
  validation_metrics_dashboard?: {
    metric: string;
    value: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  generation_notes?: string;
}

// Business Intelligence types
export interface BusinessIntelligence {
  market_analysis?: Record<string, any>;
  competitive_landscape?: Record<string, any>;
  customer_segments?: Record<string, any>;
  financial_projections?: Record<string, any>;
}

// Shortlist types
export interface Shortlist {
  id: string;
  user_id: string;
  idea_id: string;
  created_at: string;
}

// Generate idea request types
export interface GenerateIdeaRequest {
  industry?: string;
  business_model?: string;
  vertical?: string;
  horizontal?: string;
  context?: string;
  use_personalization?: boolean;
  flow_type?: string;
}

export interface GenerateIdeaResponse {
  ideas: Idea[];
  message?: string;
}

// Stage version control types
export interface Suggested {
  id: string;
  idea_id: string;
  data: Record<string, any>;
  version: number;
  llm_raw_response?: string;
  created_at: string;
  updated_at: string;
}

export interface SuggestedCreate {
  idea_id: string;
  data: Record<string, any>;
  version?: number;
  llm_raw_response?: string;
}

export interface DeepDive {
  id: string;
  idea_id: string;
  data: Record<string, any>;
  version: number;
  llm_raw_response?: string;
  created_at: string;
  updated_at: string;
}

export interface DeepDiveCreate {
  idea_id: string;
  data: Record<string, any>;
  version?: number;
  llm_raw_response?: string;
}

export interface Iterating {
  id: string;
  idea_id: string;
  data: Record<string, any>;
  version: number;
  llm_raw_response?: string;
  created_at: string;
  updated_at: string;
}

export interface IteratingCreate {
  idea_id: string;
  data: Record<string, any>;
  version?: number;
  llm_raw_response?: string;
}

export interface IteratingExperiment {
  proposed_experiment_summary: string;
  hypothesis: string;
  validation_method: string;
  success_metrics: string;
  timeline: string;
  rationale: string;
  user_feedback_action: "accept" | "edit" | "replace";
  edited_or_replacement_details?: string;
  next_steps: string;
}

export interface Considering {
  id: string;
  idea_id: string;
  data: Record<string, any>;
  version: number;
  llm_raw_response?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsideringCreate {
  idea_id: string;
  data: Record<string, any>;
  version?: number;
  llm_raw_response?: string;
}