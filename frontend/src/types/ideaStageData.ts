export interface SuggestedIdeaData {
  title: string;
  elevatorPitch?: { hook?: string; value?: string };
  rating?: number;
  effort?: number;
  currentStage?: string;
}

export interface IteratingItem {
  category: 'Validation & Learning' | 'Refinement & Iteration' | 'Market Alignment & Decision-Making';
  element: string;
  details: string;
  narrative: string;
  outcome: string;
}

export interface ValidationLearningData {
  experiments: Array<{ experiment: string; hypothesis: string; method: string; results: string; narrative: string }>;
  feedback_loops: Array<{ source: string; integration: string; narrative: string }>;
}

export interface RefinementIterationData {
  iteration_log: Array<{ version: string; changes: string; rationale: string; outcome: string }>;
  rescoring: Array<{ score_name: string; new_score: number; confidence: number; rationale: string }>;
  bmc_updates: Array<{ component: string; change: string; rationale: string; outcome: string }>;
}

export interface MarketAlignmentDecisionData {
  market_snapshot?: string;
  analogous_analysis: Array<{ comparable: string; lesson: string; narrative: string }>;
  early_traction_plan?: string;
  pivot_framework?: string;
}

export interface ValidationMetricsDashboardData {
  metrics: Record<string, any>;
}

export interface IteratingIdeaData {
  validation_learning: ValidationLearningData;
  refinement_iteration: RefinementIterationData;
  market_alignment_decision: MarketAlignmentDecisionData;
  validation_metrics_dashboard: ValidationMetricsDashboardData;
  deep_dive_data?: DeepDiveIdeaData;
  summary?: string;
}

export interface DeepDiveItem {
  category: 'Market Opportunity' | 'Execution Capability' | 'Business Viability' | 'Strategic Alignment & Risks';
  element: string;
  score: number;
  narrative: string;
}

export interface DeepDiveCategoryData {
  scores: Record<string, number | undefined>;
  narratives: Record<string, string | undefined>;
  customer_validation_plan?: string;
}

export interface DeepDiveIdeaData {
  market_opportunity?: DeepDiveCategoryData;
  execution_capability?: DeepDiveCategoryData;
  business_viability?: DeepDiveCategoryData;
  strategic_alignment_risks?: DeepDiveCategoryData;
  overall_score?: number;
  summary?: string;
}

export interface StakeholderAlignmentData {
  stakeholder_analysis: Array<{ stakeholder: string; key_findings: string; narrative: string; action: string }>;
  risk_mitigation_plan: Array<{ risk: string; mitigation: string; narrative: string; action: string }>;
}

export interface ExecutionCommunicationData {
  mvp_definition?: string;
  go_to_market_plan?: string;
  lean_pitch_deck?: string;
  one_pager?: string;
  narratives: Record<string, string>;
  next_steps?: string;
}

export interface ConsideringIdeaData {
  stakeholder_alignment: StakeholderAlignmentData;
  execution_communication: ExecutionCommunicationData;
  summary?: string;
  progress?: number;
}

export interface ClosedIdeaData {
  closure_reason?: string;
  post_mortem?: string;
  // Add more fields as needed for Closed
} 