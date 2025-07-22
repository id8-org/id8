export interface EvidenceReference {
  stat: string;
  url: string;
}

export interface DeepDiveStage {
  // Market Opportunity section
  market_opportunity?: {
    scores?: {
      product_market_fit?: number;
      market_size?: number;
      market_timing?: number;
    };
    narratives?: {
      product_market_fit?: string;
      market_size?: string;
      market_timing?: string;
    };
    details?: any[];
  };
  
  // Execution Capability section
  execution_capability?: {
    scores?: {
      founders_ability?: number;
      technical_feasibility?: number;
      go_to_market?: number;
    };
    narratives?: {
      founders_ability?: string;
      technical_feasibility?: string;
      go_to_market?: string;
    };
    details?: any[];
  };
  
  // Business Viability section
  business_viability?: {
    scores?: {
      profitability_potential?: number;
      competitive_moat?: number;
    };
    narratives?: {
      profitability_potential?: string;
      competitive_moat?: string;
    };
    details?: any[];
  };
  
  // Strategic Alignment & Risks section
  strategic_alignment_risks?: {
    scores?: {
      strategic_exit?: number;
      regulatory_and_external_risks?: number;
    };
    narratives?: {
      strategic_exit?: string;
      regulatory_and_external_risks?: string;
    };
    details?: any[];
  };
  
  // Overall deep dive metadata
  created_at?: string;
  notes?: string;
  
  // Legacy fields for backward compatibility
  product_market_fit_score?: number;
  product_market_fit_narrative?: string;
  market_size_score?: number;
  market_size_narrative?: string;
  market_timing_score?: number;
  market_timing_narrative?: string;
  founders_execution_score?: number;
  founders_execution_narrative?: string;
  technical_feasibility_score?: number;
  technical_feasibility_narrative?: string;
  competitive_moat_score?: number;
  competitive_moat_narrative?: string;
  profitability_potential_score?: number;
  profitability_potential_narrative?: string;
  strategic_exit_score?: number;
  strategic_exit_narrative?: string;
  regulatory_risk_score?: number;
  regulatory_risk_narrative?: string;
  customer_validation_plan?: string;
  go_to_market_score?: number;
  go_to_market_narrative?: string;
  overall_investor_attractiveness_score?: number;
  overall_investor_attractiveness_narrative?: string;
  generation_notes?: string;
}

export interface IteratingStage {
  validate_assumptions?: {
    hypothesis: string;
    method: string;
    timeline: string;
    success_metric: string;
    findings: string;
  }[];
  iteration_log?: {
    version: string;
    changes: string;
    rationale: string;
    outcomes: string;
  }[];
  rescore?: {
    element: string;
    score: number;
    confidence: number;
    narrative: string;
  }[];
  business_model_canvas_updates?: string;
  market_snapshot?: string;
  analogous_success_failure_analysis?: {
    name: string;
    similarity: string;
    outcome: string;
    narrative: string;
  }[];
  early_traction_plan?: string;
  feedback_loops?: string;
  pivot_persevere_kill_framework?: string;
  validation_metrics_dashboard?: {
    metric: string;
    current_value: string;
    target_value: string;
  }[];
  generation_notes?: string;
  // Allow extra fields for future-proofing
  [key: string]: any;
}

// Stage type for idea lifecycle
export type Stage = 'suggested' | 'deep-dive' | 'iterating' | 'considering' | 'closed';

// Shared lifecycle stages array
export const LIFECYCLE_STAGES: { key: Stage; label: string }[] = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'deep-dive', label: 'Deep Dive' },
  { key: 'iterating', label: 'Iterating' },
  { key: 'considering', label: 'Considering' },
  { key: 'closed', label: 'Closed' },
];

// StageDetails type for modal (expand as needed)
export interface StageDetails {
  stage: Stage;
  date?: string;
  notes?: string;
  description?: string;
  scopeAndCommitment?: string;
  sourceOfInspiration?: string;
  coreAssumptions?: string[];
  riskiestAssumptions?: string[];
  version?: string;
  favorite?: boolean;
  marketOpportunity?: any;
  executionCapability?: any;
  businessViability?: any;
  strategicAlignment?: any;
}

export interface Idea {
  id: string;
  idea_number: number;
  user_id?: string;
  repo_id?: string; // Optional: may not be present for BYOI ideas
  title: string;
  hook?: string;
  value?: string;
  evidence?: string;
  evidence_reference?: EvidenceReference;
  differentiator?: string;
  deep_dive?: DeepDiveStage;
  score?: number;
  mvp_effort?: number;
  deep_dive_requested?: boolean;
  created_at?: string;
  llm_raw_response?: string;
  deep_dive_raw_response?: string;
  status: 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';
  type?: string;
  business_model?: string;
  market_positioning?: string;
  revenue_streams?: string;
  target_audience?: string;
  competitive_advantage?: string;
  go_to_market_strategy?: string;
  success_metrics?: string;
  risk_factors?: string;
  iteration_notes?: string;
  vertical?: string;
  horizontal?: string;
  repo_usage?: string;
  assumptions?: string[];
  source_type?: 'byoi' | 'madlib' | 'system';
  verticals?: string[];
  horizontals?: string[];
  tags?: string[];
  owner_name?: string;
  potential?: number;
  user?: { first_name?: string; last_name?: string };
  idea_name?: string;
  overall_score?: number;
  effort_score?: number;
  scope_commitment?: string;
  source_of_inspiration?: string;
  problem_statement?: string;
  elevator_pitch?: string;
  core_assumptions?: string[];
  riskiest_assumptions?: string[];
  generation_notes?: string;
  iterating?: IteratingStage;
  // Repository-related fields
  repo_language?: string;
  repo_stars?: number;
  repo_forks?: number;
  repo_watchers?: number;
  repo_url?: string;
  mvp_steps?: string[];
  mvp_steps_progress?: boolean[];
  // Allow extra fields for future-proofing
  [key: string]: any;
}

export interface IdeaWithPotential extends Idea {
  potential: number;
  isHighPotential: boolean;
  isQuickWin: boolean;
  isRecent: boolean;
} 