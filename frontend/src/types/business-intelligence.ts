/**
 * Type definitions for DeepDive business intelligence data
 */

export interface BusinessModelCanvas {
  key_partners: string;
  key_activities: string;
  key_resources: string;
  value_propositions: string;
  customer_relationships: string;
  channels: string;
  customer_segments: string;
  cost_structure: string;
  revenue_streams: string;
}

export interface RoadmapPhase {
  title: string;
  duration: string;
  tasks: string[];
  progress: number;
}

export interface Roadmap {
  phase_1: RoadmapPhase;
  phase_2: RoadmapPhase;
  phase_3: RoadmapPhase;
}

export interface MetricValue {
  name: string;
  target: number;
  current: number;
  trend: string;
}

export interface BusinessMetrics {
  user_metrics: MetricValue[];
  business_metrics: MetricValue[];
  product_metrics: MetricValue[];
}

export interface ROIProjection {
  revenue: number;
  costs: number;
  roi: number;
}

export interface ROIProjections {
  year_1: ROIProjection;
  year_2: ROIProjection;
  year_3: ROIProjection;
}

export interface MarketSnapshot {
  market_size: string;
  growth_rate: string;
  key_players: string[];
  market_trends: string;
  regulatory_environment: string;
  competitive_landscape: string;
  entry_barriers: string;
  total_market?: { value: string; explanation: string };
  addressable_market?: { value: string; explanation: string };
  obtainable_market?: { value: string; explanation: string };
}

export interface VCComparison {
  vc_firm: string;
  thesis_focus: string;
  alignment_score: number;
  key_alignment_points: string;
  potential_concerns: string;
  investment_likelihood: string;
}

export interface BusinessIntelligence {
  business_model?: BusinessModelCanvas;
  roadmap?: Roadmap;
  metrics?: BusinessMetrics;
  roi_projections?: ROIProjections;
  market_snapshot?: MarketSnapshot;
  vc_comparisons?: VCComparison[];
}

export interface TabContentProps {
  businessIntelligence: BusinessIntelligence | null;
  idea: { id: string; title: string; value?: string; score?: number; mvp_effort?: number; [key: string]: unknown }; // More specific typing
  loading?: boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color: string;
}

export interface MarketLayerData {
  name: string;
  value: number;
  label: string | null;
  color: string;
  explanation: string | null;
}