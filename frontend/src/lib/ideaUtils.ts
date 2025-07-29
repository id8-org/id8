// Centralized utility for mapping backend Idea objects to frontend ProjectData shape
import type { Idea } from '@/lib/api';

export type Stage = 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  currentStage: Stage;
  version: number;
  previousVersions?: any[];
  rating: number;
  effort: number;
  potential: number;
  scores: {
    productMarket: number;
    technical: number;
    market: number;
    competitive: number;
  };
  problem?: string;
  solution?: string;
  marketSnapshot?: string;
  lensesAnalysis?: string;
  businessModel?: string;
  marketPositioning?: string;
  competitiveAdvantage?: string;
  goToMarket?: string;
  successMetrics?: string;
  elevatorPitch?: {
    hook: string;
    value: string;
    evidence: string;
    differentiator: string;
    callToAction: string;
  };
  repository?: {
    name: string;
    language: string;
    stars: number;
    forks: number;
    watchers: number;
    url: string;
  };
  goNoGo?: string;
  goNoGoReason?: string;
  deepDiveScores?: any;
  deepDiveSections?: any;
  marketOpportunity?: string;
  competitorMap?: string;
  summary?: string;
  callToAction?: string;
  tam?: number;
  sam?: number;
  som?: number;
  marketSize?: number;
  growthRate?: number;
  evidence?: any;
  assumptions?: string[];
  closure_reason?: string;
  post_mortem?: string;
  iterationValidation?: string;
  iterationLearning?: string;
  iterationOutcomes?: string;
  iterationNextSteps?: string;
  stakeholderAlignment?: string;
  riskMitigation?: string;
  approvalCriteria?: string;
  scope_commitment?: string;
  source_of_inspiration?: string;
  problem_statement?: string;
  elevator_pitch?: string;
  core_assumptions?: string[];
  riskiest_assumptions?: string[];
  generation_notes?: string;
  customer_validation_plan?: string;
  stakeholderFeedback?: string;
  uniqueValue?: string;
  stakeholderNeeds?: string;
  alignmentNotes?: string;
  launchPlan?: string;
  communicationStrategy?: string;
  pitchMaterials?: string;
  deliverables?: string;
  milestones?: string;
  actionItems?: string;
  iterating?: any;
  considering?: any;
  deep_dive?: any;
}

export function mapIdeaToProjectData(idea: any): ProjectData | undefined {
  if (!idea) return undefined;
  // Map backend status to frontend stage
  const mapStatusToStage = (status: string): Stage => {
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
  };
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description, // Only use canonical field
    currentStage: mapStatusToStage(idea.status || 'suggested'),
    version: 1,
    previousVersions: [],
    rating: idea.score ?? 0, // Only use canonical field
    effort: idea.mvp_effort ?? 0, // Only use canonical field
    potential: idea.potential ?? (idea.score ? (idea.score - (idea.mvp_effort || 0)) : 0),
    scores: {
      productMarket: idea.score ?? 0,
      technical: idea.deep_dive?.deep_dive_scores?.technical ?? 0,
      market: idea.deep_dive?.deep_dive_scores?.market ?? 0,
      competitive: idea.deep_dive?.deep_dive_scores?.competitive ?? 0,
    },
    problem: idea.problem_statement, // Only use canonical field
    solution: idea.solution,
    marketSnapshot: idea.market_snapshot,
    lensesAnalysis: idea.lenses_analysis,
    businessModel: idea.business_model,
    marketPositioning: idea.market_positioning,
    competitiveAdvantage: idea.competitive_advantage,
    goToMarket: idea.go_to_market_strategy,
    successMetrics: idea.success_metrics,
    elevatorPitch: idea.elevator_pitch ? idea.elevator_pitch : undefined, // Only use canonical field
    repository: idea.repo_id ? {
      name: idea.repo_id,
      language: idea.repo_language || '',
      stars: idea.repo_stars || 0,
      forks: idea.repo_forks || 0,
      watchers: idea.repo_watchers || 0,
      url: idea.repo_url || '',
    } : undefined,
    goNoGo: idea.go_no_go,
    goNoGoReason: idea.go_no_go_reason,
    deepDiveScores: idea.deep_dive?.deep_dive_scores,
    deepDiveSections: idea.deep_dive?.sections,
    marketOpportunity: idea.deep_dive?.market_opportunity,
    competitorMap: idea.deep_dive?.competitor_map,
    summary: idea.summary,
    callToAction: idea.call_to_action,
    tam: idea.tam,
    sam: idea.sam,
    som: idea.som,
    marketSize: idea.market_size,
    growthRate: idea.growth_rate,
    evidence: idea.evidence,
    assumptions: idea.assumptions,
    closure_reason: idea.closure_reason,
    post_mortem: idea.post_mortem,
    iterationValidation: idea.iteration_validation,
    iterationLearning: idea.iteration_learning,
    iterationOutcomes: idea.iteration_outcomes,
    iterationNextSteps: idea.iteration_next_steps,
    stakeholderAlignment: idea.stakeholder_alignment,
    riskMitigation: idea.risk_mitigation,
    approvalCriteria: idea.approval_criteria,
    scope_commitment: idea.scope_commitment,
    source_of_inspiration: idea.source_of_inspiration,
    problem_statement: idea.problem_statement,
    elevator_pitch: idea.elevator_pitch,
    core_assumptions: idea.core_assumptions,
    riskiest_assumptions: idea.riskiest_assumptions,
    generation_notes: idea.generation_notes,
    customer_validation_plan: idea.customer_validation_plan,
    stakeholderFeedback: idea.stakeholder_feedback,
    uniqueValue: idea.unique_value,
    stakeholderNeeds: idea.stakeholder_needs,
    alignmentNotes: idea.alignment_notes,
    launchPlan: idea.launch_plan,
    communicationStrategy: idea.communication_strategy,
    pitchMaterials: idea.pitch_materials,
    deliverables: idea.deliverables,
    milestones: idea.milestones,
    actionItems: idea.action_items,
    iterating: idea.iterating,
    considering: idea.considering,
    deep_dive: idea.deep_dive,
  };
}

export function getLongTitle(idea: any) {
  const base = idea.title || idea.hook || idea.value || idea.idea_name || 'Untitled Idea';
  return idea.idea_number ? `${base} #${idea.idea_number}` : base;
}

export function getProductAndDescriptionTitle(idea: any) {
  // Prefer title (product name) + description, fallback to value if no description
  const product = idea.title || idea.idea_name || '';
  const desc = idea.description || idea.value || '';
  return desc ? `${product}: ${desc}` : product;
}

export function getTitleAndHookTitle(idea: any) {
  const product = idea.title || idea.idea_name || '';
  const hook = idea.hook || '';
  return hook ? `${product}: ${hook}` : product;
}

export function mapIdeaToIdeaModalProps(idea: any) {
  if (!idea) return null;
  // Map backend status to frontend stage
  const mapStatusToStage = (status: string): Stage => {
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
  };
  // Build stageHistory array
  const stageHistory = [];
  const currentStage = mapStatusToStage(idea.status || 'suggested');
  
  // DEEP DIVE (always include if deep_dive exists)
  if (idea.deep_dive && Object.keys(idea.deep_dive).length > 0) {
    const deepDive = idea.deep_dive;
    stageHistory.push({
      stage: 'deep_dive',
      date: deepDive.created_at || idea.updated_at || idea.created_at,
      notes: deepDive.notes || '',
      // Pass the complete deep dive data structure
      deep_dive: deepDive,
      // Also provide individual sections for backward compatibility
      marketOpportunity: {
        score: deepDive.market_opportunity?.scores?.product_market_fit ?? 0,
        rationale: deepDive.market_opportunity?.narratives?.product_market_fit ?? '',
        details: deepDive.market_opportunity?.details ?? [],
        breakdown: deepDive.market_opportunity?.scores ?? {},
      },
      executionCapability: {
        score: deepDive.execution_capability?.scores?.founders_ability ?? 0,
        rationale: deepDive.execution_capability?.narratives?.founders_ability ?? '',
        details: deepDive.execution_capability?.details ?? [],
        breakdown: deepDive.execution_capability?.scores ?? {},
      },
      businessViability: {
        score: deepDive.business_viability?.scores?.profitability_potential ?? 0,
        rationale: deepDive.business_viability?.narratives?.profitability_potential ?? '',
        details: deepDive.business_viability?.details ?? [],
        breakdown: deepDive.business_viability?.scores ?? {},
      },
      strategicAlignment: {
        score: deepDive.strategic_alignment_risks?.scores?.strategic_exit ?? 0,
        rationale: deepDive.strategic_alignment_risks?.narratives?.strategic_exit ?? '',
        details: deepDive.strategic_alignment_risks?.details ?? [],
        breakdown: deepDive.strategic_alignment_risks?.scores ?? {},
      },
    });
  }
  
  // SUGGESTED
  if (idea.status === 'suggested' || idea.status === undefined) {
    stageHistory.push({
      stage: 'suggested',
      date: idea.created_at,
      notes: idea.generation_notes || '',
      description: idea.description || '',
      scopeAndCommitment: idea.scope_commitment || '',
      sourceOfInspiration: idea.source_of_inspiration || '',
      coreAssumptions: Array.isArray(idea.core_assumptions) ? idea.core_assumptions : (idea.core_assumptions ? [idea.core_assumptions] : []),
      riskiestAssumptions: Array.isArray(idea.riskiest_assumptions) ? idea.riskiest_assumptions : (idea.riskiest_assumptions ? [idea.riskiest_assumptions] : []),
      version: idea.version || 1,
      favorite: !!idea.favorite,
    });
  }
  
  return {
    ...idea,
    problem: idea.problem_statement || '',
    elevatorPitch: idea.elevator_pitch || '',
    overallScore: idea.score || 0,
    effort: idea.mvp_effort || 0,
    currentStage,
    stageHistory: stageHistory.length > 0 ? stageHistory : [],
    // Pass the complete deep_dive object for the modal to use
    deep_dive: idea.deep_dive || {},
    // Add missing fields that the IdeaModal expects
    differentiator: idea.differentiator || '',
    call_to_action: idea.call_to_action || '',
    evidence_reference: idea.evidence_reference || {},
    hook: idea.hook || '',
    value: idea.value || '',
    evidence: idea.evidence || '',
    scope_commitment: idea.scope_commitment || '',
    source_of_inspiration: idea.source_of_inspiration || '',
    core_assumptions: Array.isArray(idea.core_assumptions) ? idea.core_assumptions : (idea.core_assumptions ? [idea.core_assumptions] : []),
    riskiest_assumptions: Array.isArray(idea.riskiest_assumptions) ? idea.riskiest_assumptions : (idea.riskiest_assumptions ? [idea.riskiest_assumptions] : []),
    generation_notes: idea.generation_notes || '',
    repo_usage: idea.repo_usage || '',
    repo_url: idea.repo_url || '',
    repo_name: idea.repo_name || '',
    repo_description: idea.repo_description || '',
    mvp_steps: Array.isArray(idea.mvp_steps) ? idea.mvp_steps : [],
    prerequisites: Array.isArray(idea.prerequisites) ? idea.prerequisites : [],
    assumptions: Array.isArray(idea.assumptions) ? idea.assumptions : (idea.assumptions ? [idea.assumptions] : []),
    type: idea.type || null,
    status: idea.status || 'suggested',
    created_at: idea.created_at,
    llm_raw_response: idea.llm_raw_response || '',
  };
}

// Shared utility to sum Deep Dive section scores consistently
export function getDeepDiveSectionScores(deepDive: any) {
  // Helper to sum an array of numbers, treating null/undefined as 0
  const sum = (arr: (number | undefined | null)[]) => arr.reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);

  // Market Opportunity: product_market_fit, market_size, market_timing (max 30)
  const marketScores = [
    deepDive?.market_opportunity?.scores?.product_market_fit ?? 0,
    deepDive?.market_opportunity?.scores?.market_size ?? 0,
    deepDive?.market_opportunity?.scores?.market_timing ?? 0,
  ];
  // Execution Capability: founders_ability, technical_feasibility, go_to_market (max 30)
  const execScores = [
    deepDive?.execution_capability?.scores?.founders_ability ?? 0,
    deepDive?.execution_capability?.scores?.technical_feasibility ?? 0,
    deepDive?.execution_capability?.scores?.go_to_market ?? 0,
  ];
  // Business Viability: profitability_potential, competitive_moat (max 20)
  const viabilityScores = [
    deepDive?.business_viability?.scores?.profitability_potential ?? 0,
    deepDive?.business_viability?.scores?.competitive_moat ?? 0,
  ];
  // Strategic Alignment: strategic_exit, regulatory_risks (max 20)
  const alignScores = [
    deepDive?.strategic_alignment_risks?.scores?.strategic_exit ?? 0,
    deepDive?.strategic_alignment_risks?.scores?.regulatory_risks ?? 0,
  ];

  const totalScore = sum(marketScores) + sum(execScores) + sum(viabilityScores) + sum(alignScores);
  const totalMax = 30 + 30 + 20 + 20;
  return {
    marketOpportunity: {
      score: sum(marketScores),
      max: 30,
      breakdown: marketScores,
    },
    executionCapability: {
      score: sum(execScores),
      max: 30,
      breakdown: execScores,
    },
    businessViability: {
      score: sum(viabilityScores),
      max: 20,
      breakdown: viabilityScores,
    },
    strategicAlignment: {
      score: sum(alignScores),
      max: 20,
      breakdown: alignScores,
    },
    totalScore,
    totalMax,
  };
}

export function toSuggestedIdeaCard(idea: any) {
  return {
    id: idea.id,
    ideaNumber: idea.idea_number,
    title: idea.title,
    score: idea.score,
    effort: idea.mvp_effort,
    sourceType: idea.source_type || 'not_set',
    elevatorPitch: idea.elevator_pitch || '',
    problemStatement: idea.problem_statement || '',
    // Add missing fields that the UI expects
    hook: idea.hook || '',
    value: idea.value || '',
    evidence: idea.evidence || '',
    differentiator: idea.differentiator || '',
    call_to_action: idea.call_to_action || '',
    evidence_reference: idea.evidence_reference || {},
    repo_usage: idea.repo_usage || '',
    assumptions: Array.isArray(idea.assumptions) ? idea.assumptions : (idea.assumptions ? [idea.assumptions] : []),
    core_assumptions: Array.isArray(idea.core_assumptions) ? idea.core_assumptions : (idea.core_assumptions ? [idea.core_assumptions] : []),
    riskiest_assumptions: Array.isArray(idea.riskiest_assumptions) ? idea.riskiest_assumptions : (idea.riskiest_assumptions ? [idea.riskiest_assumptions] : []),
    scope_commitment: idea.scope_commitment || '',
    source_of_inspiration: idea.source_of_inspiration || '',
    generation_notes: idea.generation_notes || '',
    repo_url: idea.repo_url || '',
    repo_name: idea.repo_name || '',
    repo_description: idea.repo_description || '',
    mvp_steps: Array.isArray(idea.mvp_steps) ? idea.mvp_steps : [],
    prerequisites: Array.isArray(idea.prerequisites) ? idea.prerequisites : [],
    type: idea.type || null,
    status: idea.status || 'suggested',
    created_at: idea.created_at,
    llm_raw_response: idea.llm_raw_response || '',
  };
}

export function toDeepDiveIdeaCard(idea: any) {
  // Calculate deep dive scores if available
  const deepDiveScores = idea.deep_dive ? getDeepDiveSectionScores(idea.deep_dive) : null;
  
  return {
    id: idea.id,
    ideaNumber: idea.idea_number,
    title: idea.title,
    score: idea.score,
    effort: idea.mvp_effort,
    sourceType: idea.source_type || 'not_set',
    elevatorPitch: idea.elevator_pitch || '',
    problemStatement: idea.problem_statement || '',
    deepDiveScores: deepDiveScores,
    deepDiveData: idea.deep_dive,
    // Add missing fields that the UI expects
    hook: idea.hook || '',
    value: idea.value || '',
    evidence: idea.evidence || '',
    differentiator: idea.differentiator || '',
    call_to_action: idea.call_to_action || '',
    evidence_reference: idea.evidence_reference || {},
    repo_usage: idea.repo_usage || '',
    assumptions: Array.isArray(idea.assumptions) ? idea.assumptions : (idea.assumptions ? [idea.assumptions] : []),
    core_assumptions: Array.isArray(idea.core_assumptions) ? idea.core_assumptions : (idea.core_assumptions ? [idea.core_assumptions] : []),
    riskiest_assumptions: Array.isArray(idea.riskiest_assumptions) ? idea.riskiest_assumptions : (idea.riskiest_assumptions ? [idea.riskiest_assumptions] : []),
    scope_commitment: idea.scope_commitment || '',
    source_of_inspiration: idea.source_of_inspiration || '',
    generation_notes: idea.generation_notes || '',
    repo_url: idea.repo_url || '',
    repo_name: idea.repo_name || '',
    repo_description: idea.repo_description || '',
    mvp_steps: Array.isArray(idea.mvp_steps) ? idea.mvp_steps : [],
    prerequisites: Array.isArray(idea.prerequisites) ? idea.prerequisites : [],
    type: idea.type || null,
    status: idea.status || 'deep_dive',
    created_at: idea.created_at,
    llm_raw_response: idea.llm_raw_response || '',
    deep_dive_raw_response: idea.deep_dive_raw_response || '',
  };
}

export function toIteratingIdeaCard(idea: any) {
  return {
    id: idea.id,
    ideaNumber: idea.idea_number,
    title: idea.title,
    score: idea.score,
    effort: idea.mvp_effort,
    sourceType: idea.source_type || 'not_set',
    elevatorPitch: idea.elevator_pitch || '',
    problemStatement: idea.problem_statement || '',
    // Add missing fields that the UI expects
    hook: idea.hook || '',
    value: idea.value || '',
    evidence: idea.evidence || '',
    differentiator: idea.differentiator || '',
    call_to_action: idea.call_to_action || '',
    evidence_reference: idea.evidence_reference || {},
    repo_usage: idea.repo_usage || '',
    assumptions: Array.isArray(idea.assumptions) ? idea.assumptions : (idea.assumptions ? [idea.assumptions] : []),
    core_assumptions: Array.isArray(idea.core_assumptions) ? idea.core_assumptions : (idea.core_assumptions ? [idea.core_assumptions] : []),
    riskiest_assumptions: Array.isArray(idea.riskiest_assumptions) ? idea.riskiest_assumptions : (idea.riskiest_assumptions ? [idea.riskiest_assumptions] : []),
    scope_commitment: idea.scope_commitment || '',
    source_of_inspiration: idea.source_of_inspiration || '',
    generation_notes: idea.generation_notes || '',
    repo_url: idea.repo_url || '',
    repo_name: idea.repo_name || '',
    repo_description: idea.repo_description || '',
    mvp_steps: Array.isArray(idea.mvp_steps) ? idea.mvp_steps : [],
    prerequisites: Array.isArray(idea.prerequisites) ? idea.prerequisites : [],
    type: idea.type || null,
    status: idea.status || 'iterating',
    created_at: idea.created_at,
    llm_raw_response: idea.llm_raw_response || '',
    iterating: idea.iterating || {},
  };
} 

// Filtering and sorting helpers for Kanban/IdeaWorkspace
export interface IdeaFilters {
  language: string;
  age: string;
  ideaType: string;
  showNew: boolean;
  showSeen: boolean;
  showManual: boolean;
  showGenerated: boolean;
  minScore: number;
  maxEffort: number;
}

export function filterIdeas(
  ideas: any[],
  filters: IdeaFilters,
  seenIdeas: Set<string>,
  shortlist: string[],
  showFavoritesOnly: boolean
) {
  let newFilteredIdeas = ideas;
  // Filter by language
  if (filters.language !== 'all') {
    newFilteredIdeas = newFilteredIdeas.filter(idea => idea.language === filters.language);
  }
  // Filter by age (placeholder, implement as needed)
  // Filter by idea type
  if (filters.ideaType !== 'all') {
    newFilteredIdeas = newFilteredIdeas.filter(idea => idea.type === filters.ideaType);
  }
  // Filter by seen status
  if (!filters.showNew || !filters.showSeen) {
    newFilteredIdeas = newFilteredIdeas.filter(idea => {
      const isSeen = seenIdeas.has(idea.id);
      return (filters.showNew && !isSeen) || (filters.showSeen && isSeen);
    });
  }
  // Filter by source (manual vs generated)
  if (!filters.showManual || !filters.showGenerated) {
    newFilteredIdeas = newFilteredIdeas.filter(idea => {
      const isManual = !idea.repo_id;
      return (filters.showManual && isManual) || (filters.showGenerated && !isManual);
    });
  }
  // Filter by score
  if (filters.minScore > 0) {
    newFilteredIdeas = newFilteredIdeas.filter(idea => (idea.score || 0) >= filters.minScore);
  }
  // Filter by effort
  if (filters.maxEffort < 10) {
    newFilteredIdeas = newFilteredIdeas.filter(idea => (idea.mvp_effort || 10) <= filters.maxEffort);
  }
  if (showFavoritesOnly) {
    newFilteredIdeas = newFilteredIdeas.filter(idea => shortlist.includes(idea.id));
  }
  return newFilteredIdeas;
}

export function sortIdeas(ideas: any[]) {
  return ideas.slice().sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    const effortA = a.mvp_effort ?? 10;
    const effortB = b.mvp_effort ?? 10;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return effortA - effortB;
  });
} 