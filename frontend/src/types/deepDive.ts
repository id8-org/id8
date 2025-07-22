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