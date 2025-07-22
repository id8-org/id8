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