// Utility functions for IdeaWorkspace component
// Extracted to improve maintainability and separation of concerns

import type { Idea as NormalizedIdea } from '../types/idea';
import type { IdeaStatus } from '../lib/api';
import type { Stage } from '../types/index';
import { triggerDeepDive, triggerIterationTasks, triggerConsiderationTasks, triggerClosureTasks } from '../lib/api';

// Utility to map backend status to Stage
export function mapStatusToStage(status: string): Stage {
  switch (status) {
    case 'deep_dive':
      return 'deep_dive';
    case 'iterating':
      return 'iterating';
    case 'considering':
      return 'considering';
    case 'closed':
      return 'closed';
    default:
      return 'suggested';
  }
}

// Utility to map Stage back to backend status string
export function mapStageToStatus(stage: Stage): IdeaStatus {
  switch (stage) {
    case 'deep_dive':
      return 'deep_dive';
    case 'iterating':
      return 'iterating';
    case 'considering':
      return 'considering';
    case 'closed':
      return 'closed';
    default:
      return 'suggested';
  }
}

// Utility to get potential consistently
export function getPotential(idea: NormalizedIdea): number {
  if (typeof idea.potential === 'number') return idea.potential;
  if (typeof idea.score === 'number' && typeof idea.mvp_effort === 'number') return idea.score - idea.mvp_effort;
  return 0;
}

// Add a normalization helper for ideas
export function normalizeIdea(idea: Partial<NormalizedIdea> & { id?: string }): NormalizedIdea {
  let type = idea.type;
  if (typeof type === 'string') {
    const t = type.trim().toLowerCase().replace(/[-_\s]/g, '');
    if (t === 'sidehustle') type = 'side_hustle';
    else if (t === 'fullscale' || t === 'fulltime' || t === 'full_time') type = 'full_scale';
  }
  let source_type: 'byoi' | 'madlib' | 'system' | undefined = undefined;
  if (idea.source_type === 'byoi' || idea.source_type === 'madlib' || idea.source_type === 'system') {
    source_type = idea.source_type;
  }
  
  // Defensive deep_dive normalization: ensure customer_validation_plan exists
  const deep_dive = idea.deep_dive && typeof idea.deep_dive === 'object' ? { ...idea.deep_dive } : {};
  if (deep_dive) {
    const sections = (deep_dive as Record<string, unknown>).sections;
    // For each major section, ensure customer_validation_plan exists
    ['market_opportunity', 'execution_capability', 'business_viability', 'strategic_alignment_risks'].forEach(key => {
      const section = (deep_dive as Record<string, Record<string, unknown>>)[key];
      if (section) {
        if (typeof section.customer_validation_plan !== 'string') {
          section.customer_validation_plan = '';
        }
      }
    });
    // Defensive: if sections exist, keep them
    if (sections) {
      (deep_dive as Record<string, unknown>).sections = sections;
    }
  }
  
  return {
    ...idea,
    type,
    source_type,
    deep_dive,
    iterating: idea.iterating && typeof idea.iterating === 'object' ? idea.iterating : {},
  } as NormalizedIdea;
}

// Utility to create a blank idea for Add Idea modal
export function getBlankIdea(): NormalizedIdea {
  return {
    id: '',
    idea_number: 0,
    user_id: '',
    repo_id: '',
    title: '',
    hook: '',
    value: '',
    evidence: '',
    differentiator: '',
    call_to_action: '',
    deep_dive: undefined,
    score: 0,
    mvp_effort: 0,
    deep_dive_requested: false,
    status: 'suggested',
    type: '',
    business_model: '',
    market_positioning: '',
    revenue_streams: '',
    target_audience: '',
    competitive_advantage: '',
    go_to_market_strategy: '',
    success_metrics: '',
    risk_factors: '',
    iteration_notes: '',
    business_intelligence: {},
    repo_usage: '',
    repo_language: '',
    repo_stars: 0,
    repo_forks: 0,
    repo_watchers: 0,
    repo_url: '',
    assumptions: [],
    source_type: undefined, // must be undefined, not empty string
    vertical: '',
    horizontal: '',
    scope_commitment: '',
    source_of_inspiration: '',
    problem_statement: '',
    elevator_pitch: '',
    core_assumptions: [],
    riskiest_assumptions: [],
    generation_notes: '',
    customer_validation_plan: '',
    potential: 0,
    tam: 0,
    sam: 0,
    som: 0,
    iterating: undefined,
  };
}

// Helper function to determine required tasks based on status transition
export function getRequiredTasksForTransition(fromStatus: Stage, toStatus: Stage): string[] {
  const taskMap: Record<string, string[]> = {
    'suggested->deep_dive': ['deep_dive'],
    'suggested->iterating': ['deep_dive', 'iterating'],
    'suggested->considering': ['deep_dive', 'iterating', 'considering'],
    'suggested->closed': ['deep_dive', 'iterating', 'considering', 'closure'],
    'deep_dive->iterating': ['iterating'],
    'deep_dive->considering': ['iterating', 'considering'],
    'deep_dive->closed': ['iterating', 'considering', 'closure'],
    'iterating->considering': ['considering'],
    'iterating->closed': ['considering', 'closure'],
    'considering->closed': ['closure']
  };
  
  const key = `${fromStatus}->${toStatus}`;
  return taskMap[key] || [];
}

// Helper function to execute cascading tasks
export async function executeCascadingTasks(idea: NormalizedIdea, tasks: string[]): Promise<void> {
  console.log('🔍 DEBUG: Executing cascading tasks:', tasks, 'for idea', idea.id);
  
  for (const task of tasks) {
    console.log(`🔍 DEBUG: Executing task: ${task} for idea ${idea.id}`);
    
    switch (task) {
      case 'deep_dive':
        await triggerDeepDive(idea.id);
        break;
      case 'iterating':
        await triggerIterationTasks(idea.id);
        break;
      case 'considering':
        await triggerConsiderationTasks(idea.id);
        break;
      case 'closure':
        await triggerClosureTasks(idea.id);
        break;
      default:
        console.warn(`🔍 WARNING: Unknown task type: ${task}`);
    }
  }
}

// Helper to get signal scores from idea.deep_dive
export function getSignalScores(idea: NormalizedIdea): Record<string, number> | null {
  const sections = (idea.deep_dive as any)?.sections || [];
  if (!sections) return null;
  const section = sections.find((s: any) => /signal score/i.test(s.title));
  if (!section) return null;
  try {
    const match = section.content.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (typeof obj === 'object') return obj;
    }
  } catch {}
  // Try to parse as key: value lines
  const lines = section.content.split('\n');
  const scores: Record<string, number> = {};
  let found = false;
  for (const line of lines) {
    const m = line.match(/([\w\s]+):\s*(\d+)/);
    if (m) {
      scores[m[1].trim()] = parseInt(m[2], 10);
      found = true;
    }
  }
  return found ? scores : null;
}

// Helper to safely add width/height if present
export function withFrozenSize(style: any, isDragging: boolean) {
  const frozen: Record<string, any> = {
    minWidth: '220px',
    minHeight: '120px',
    maxWidth: '100%',
  };
  if (isDragging) {
    if (style && 'width' in style) frozen.width = style.width;
    else frozen.width = '100%';
    if (style && 'height' in style) frozen.height = style.height;
  } else {
    frozen.width = '100%';
  }
  return { ...style, ...frozen };
}

// Helper to map type to label
export function getTypeLabel(type?: string) {
  if (!type) return '';
  if (type === 'side_hustle') return 'Side Hustle';
  if (type === 'full_scale') return 'Full Scale';
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
}

// Defensive helpers for nested arrays
export function safeArray(val: any) {
  return Array.isArray(val) ? val : [];
}

// Inline mapping function to convert backend deep_dive to DeepDiveStage
export function mapDeepDiveToStage(deepDive: any) {
  if (!deepDive) return {};
  return {
    product_market_fit_score: deepDive.market_opportunity?.scores?.product_market_fit,
    market_size_score: deepDive.market_opportunity?.scores?.market_size,
    market_timing_score: deepDive.market_opportunity?.scores?.market_timing,
    founders_execution_score: deepDive.execution_capability?.scores?.founders_ability,
    technical_feasibility_score: deepDive.execution_capability?.scores?.technical_feasibility,
    go_to_market_score: deepDive.execution_capability?.scores?.go_to_market,
    profitability_potential_score: deepDive.business_viability?.scores?.profitability_potential,
    competitive_moat_score: deepDive.business_viability?.scores?.competitive_moat,
    strategic_exit_score: deepDive.strategic_alignment_risks?.scores?.strategic_exit,
    regulatory_risk_score: deepDive.strategic_alignment_risks?.scores?.regulatory_risks,
    overall_investor_attractiveness_score: deepDive.strategic_alignment_risks?.scores?.overall_investor_score,
    // Add narratives if needed
  };
}

// Helper for stage analytics
export function getStageAnalytics(ideasForStage: NormalizedIdea[]) {
  const arr = Array.isArray(ideasForStage) ? ideasForStage : [];
  const count = arr.length;
  const avgScore = count > 0 ? Math.round(arr.reduce((sum, i) => (i.score || 0) + sum, 0) / count) : 0;
  const nextTip = count === 0 ? 'Add ideas to get started!' : avgScore >= 8 ? 'Promote your best ideas!' : 'Refine and research.';
  return { count, avgScore, nextTip };
}