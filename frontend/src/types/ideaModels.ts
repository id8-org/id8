import type { DeepDiveStage } from './idea';
export type { DeepDiveStage };

export interface SuggestedIdeaCard {
  id: string;
  ideaNumber?: number;
  title: string;
  score?: number;
  effort?: number;
  sourceType?: string;
  createdAt?: string;
  tags?: string[];
  vertical?: string;
  horizontal?: string;
  elevatorPitch?: string;
  problemStatement?: string;
  // Add more fields if needed for card display
}

export interface DeepDiveIdeaCard {
  id: string;
  ideaNumber?: number;
  title: string;
  score?: number;
  effort?: number;
  sourceType?: string;
  createdAt?: string;
  tags?: string[];
  vertical?: string;
  horizontal?: string;
  elevatorPitch?: string;
  problemStatement?: string;
  deepDive?: DeepDiveStage;
  // Add more fields as needed for deep dive card display
}

export interface IteratingIdeaCard {
  id: string;
  ideaNumber?: number;
  title: string;
  score?: number;
  effort?: number;
  sourceType?: string;
  createdAt?: string;
  tags?: string[];
  vertical?: string;
  horizontal?: string;
  elevatorPitch?: string;
  problemStatement?: string;
  deepDive?: DeepDiveStage;
  // Iteration details summary (optional, for expandable section)
  iterationSummary?: string;
  // Add more fields as needed for iteration details
  iterating?: {
    steps?: Array<{ completed?: boolean; label?: string; value?: string }>;
    timeboxDuration?: string;
    // Add more fields as needed
  };
} 