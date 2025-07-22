export interface Iteration {
  id: string;
  ideaId: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  risk_focus: string;
  hypothesis: string;
  method: string;
  tools: string[];
  task_list: string[];
  success_metric: string;
  target: string;
  confidence_score_before: number;
  confidence_score_after?: number;
  raw_results?: Record<string, any>;
  learnings?: string[];
  hypothesis_supported?: boolean;
  decision?: "Pivot" | "Persevere" | "Kill";
  next_action?: string;
  rationale?: string;
} 