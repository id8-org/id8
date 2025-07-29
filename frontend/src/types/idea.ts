// Import shared types from api.ts to avoid duplication
import type { EvidenceReference, DeepDiveStage, IteratingStage } from './api';
import type { BusinessIntelligence } from './business-intelligence';

// Re-export types for backward compatibility
export type { EvidenceReference, DeepDiveStage, IteratingStage, BusinessIntelligence };

// Stage type for idea lifecycle
export type Stage = 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';

// Shared lifecycle stages array
export const LIFECYCLE_STAGES: { key: Stage; label: string }[] = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'deep_dive', label: 'Deep Dive' },
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
  marketOpportunity?: DeepDiveStage['market_opportunity'];
  executionCapability?: DeepDiveStage['execution_capability'];
  businessViability?: DeepDiveStage['business_viability'];
  strategicAlignment?: DeepDiveStage['strategic_alignment_risks'];
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
  business_intelligence?: BusinessIntelligence;
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