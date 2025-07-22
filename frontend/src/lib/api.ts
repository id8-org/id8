import axios from 'axios';
import { normalizeIdea } from '../components/IdeaWorkspace';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- ROCK SOLID AUTH TOKEN HANDLING ---
// On import, set the Authorization header from localStorage if present
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Always set the Authorization header from localStorage before every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // Ensure headers is always an object of type AxiosRequestHeaders
  config.headers = Object.assign({}, config.headers);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  } else if (config.headers['Authorization']) {
    delete config.headers['Authorization'];
  }
  return config;
});

// Helper to force-refresh the token header (call after login/register/logout if needed)
export function refreshApiAuthHeader() {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export interface Repo {
  id: string;
  name: string;
  url: string;
  summary?: string;
  language?: string;
  created_at?: string;
  trending_period: string;
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
}

export type IdeaStatus = 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';

export interface Idea {
  id: string;
  idea_number: number;
  user_id?: string;
  repo_id?: string;
  title: string;
  hook?: string;
  value?: string;
  evidence?: string;
  differentiator?: string;
  call_to_action?: string;
  deep_dive?: DeepDive;
  score?: number;
  mvp_effort?: number;
  deep_dive_requested: boolean;
  deepDiveStatus?: 'loading' | 'ready' | 'error';
  created_at?: string;
  llm_raw_response?: string;
  deep_dive_raw_response?: string;
  status: IdeaStatus;
  type?: string;
  // Iteration fields
  business_model?: string;
  market_positioning?: string;
  revenue_streams?: string;
  target_audience?: string;
  competitive_advantage?: string;
  go_to_market_strategy?: string;
  success_metrics?: string;
  risk_factors?: string;
  iteration_notes?: string;
  // Business Intelligence fields
  business_intelligence?: {
    market_size?: number;
    growth_rate?: number;
    competitive_landscape?: string;
    regulatory_environment?: string;
  };
  // Repository fields
  repo_usage?: string;
  repo_language?: string;
  repo_stars?: number;
  repo_forks?: number;
  repo_watchers?: number;
  repo_url?: string;
  // Assumptions and metadata
  assumptions?: string[];
  source_type?: string;
  vertical?: string;
  horizontal?: string;
  // New suggested stage fields
  scope_commitment?: string;
  source_of_inspiration?: string;
  problem_statement?: string;
  elevator_pitch?: string;
  core_assumptions?: string[];
  riskiest_assumptions?: string[];
  generation_notes?: string;
  customer_validation_plan?: string;
  // Additional fields that might be present
  potential?: number;
  tam?: number;
  sam?: number;
  som?: number;
  // Iterating stage fields
  iterating?: any;
  // Considering stage fields
  considering?: any;
}

export interface DeepDiveSection {
  title: string;
  content: string;
}

export interface DeepDive {
  market_opportunity?: {
    scores: Record<string, number>;
    narratives: Record<string, string>;
    customer_validation_plan: string;
  };
  execution_capability?: {
    scores: Record<string, number>;
    narratives: Record<string, string>;
    customer_validation_plan: string;
  };
  business_viability?: {
    scores: Record<string, number>;
    narratives: Record<string, string>;
    customer_validation_plan: string;
  };
  strategic_alignment_risks?: {
    scores: Record<string, number>;
    narratives: Record<string, string>;
    customer_validation_plan: string;
  };
  overall_score?: number;
  summary?: string;
  // Backward compatibility with old format
  sections?: DeepDiveSection[];
  raw?: string;
  error?: string;
}

export interface DeepDiveResponse {
  status: string;
  deep_dive?: DeepDive;
  message?: string;
  idea?: Idea;
  config?: any;
}

export interface DeepDiveVersion {
  id: string;
  idea_id: string;
  version_number: number;
  fields: DeepDive;
  llm_raw_response?: string;
  created_at?: string;
}

// API Functions
export const getRepos = async (lang?: string, search?: string, period?: string) => {
  try {
    const response = await api.get('/repos/', { 
      params: { 
        language: lang, 
        search,
        period: period || 'daily'
      } 
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching repos:', error);
    throw error;
  }
};

export const getRepoStats = async () => {
  try {
    const response = await api.get('/repos/stats');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching repo stats:', error);
    throw error;
  }
};

export const getRepoHealth = async () => {
  try {
    const response = await api.get('/repos/health');
    return response.data;
  } catch (error: unknown) {
    console.error('Error fetching repo health:', error);
    throw error;
  }
};

export const loadTrendingRepos = async (period: string = 'daily', languages?: string) => {
  try {
    const response = await api.post('/repos/load', null, {
      params: {
        period,
        languages
      }
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error loading trending repos:', error);
    throw error;
  }
};

export const refreshTrendingRepos = async (period: string = 'daily', languages?: string) => {
  try {
    const response = await api.post('/repos/refresh', null, {
      params: {
        period,
        languages
      }
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Error refreshing trending repos:', error);
    throw error;
  }
};

export const getIdeas = async (repoId: string) => {
  try {
    const response = await api.get(`/api/ideas/repo/${repoId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ideas:', error);
    throw error;
  }
};

export interface Config {
  max_ideas: number;
  deep_dive: boolean;
  market_snapshot: boolean;
  lenses: boolean;
  export_tools: boolean;
  team: boolean;
  priority_support: boolean;
  max_team_members: number;
  collaboration: boolean;
  [key: string]: any;
}

// Helper to robustly extract ideas array from API response
function extractIdeasArray(res: any): Idea[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.ideas)) return res.ideas;
  return [];
}

// Update getAllIdeas to use the new /api/ideas/list endpoint
export const getAllIdeas = async (): Promise<Idea[]> => {
  try {
    const response = await api.get('/api/ideas/list?status=suggested');
    // Always return the array, not the object
    const ideas = Array.isArray(response.data.ideas) ? response.data.ideas : [];
    return ideas.map(normalizeIdea);
  } catch (error) {
    console.error('Error fetching all ideas:', error);
    return [];
  }
};

// Update getShortlist to use the new /api/ideas/shortlist endpoint
export const getShortlist = async (): Promise<Idea[]> => {
  try {
    const response = await api.get('/api/ideas/shortlist');
    return extractIdeasArray(response.data);
  } catch (error) {
    console.error('Error fetching shortlist:', error);
    return [];
  }
};

/**
 * Build the user context for LLM personalization.
 * - For solo users: returns a single user context object.
 * - For team users: returns an array of user context objects (one per member).
 * Excludes onboarding_completed, onboarding_step, and is_processed fields.
 * Optionally includes resume fields if available.
 */
export async function buildUserContext(user: any): Promise<Record<string, any>[] | Record<string, any> | undefined> {
  if (!user) return undefined;
  // Helper to strip unwanted fields
  const stripFields = (profile: any) => {
    if (!profile) return undefined;
    const {
      onboarding_completed, onboarding_step, created_at, updated_at, is_processed, ...rest
    } = profile;
    return rest;
  };
  // If team, fetch all team members and their profiles
  if (user.account_type === 'team' && user.team && Array.isArray(user.team.members)) {
    // Each member should have a profile
    return user.team.members.map((member: any) => ({
      ...stripFields(member.profile),
      email: member.email,
      account_type: member.account_type,
      tier: member.tier,
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      team_id: member.team_id,
      // Optionally add resume fields if available
      ...(member.resume ? {
        extracted_skills: member.resume.extracted_skills,
        work_experience: member.resume.work_experience,
        education: member.resume.education,
      } : {})
    }));
  }
  // Solo user
  return {
    ...stripFields(user.profile),
    email: user.email,
    account_type: user.account_type,
    tier: user.tier,
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    team_id: user.team_id,
    // Optionally add resume fields if available
    ...(user.resume ? {
      extracted_skills: user.resume.extracted_skills,
      work_experience: user.resume.work_experience,
      education: user.resume.education,
    } : {})
  };
}

export const generateIdea = async (ideaData: Partial<Idea>, user: any) => {
  const user_context = await buildUserContext(user);
  return api.post('/api/ideas/generate', {
    ...ideaData,
    user_context: JSON.stringify(user_context), // <-- Send as string
  });
};

export const triggerDeepDive = async (ideaId: string, user?: any): Promise<DeepDiveResponse> => {
  let body: any = { request: {} };
  if (user) {
    const user_context = await buildUserContext(user);
    body.request.user_context = user_context;
  }
  // Always send a JSON object with a 'request' key
  const response = await api.post(`/api/ideas/${ideaId}/deep-dive`, body);
  return response.data;
};

// Business task triggers for different status transitions
export const triggerIterationTasks = async (ideaId: string) => {
  try {
    console.log('🔍 DEBUG: triggerIterationTasks called for idea:', ideaId);
    // This could trigger multiple tasks in parallel
    const tasks = [
      generateBusinessModelCanvas(ideaId),
      generateDevelopmentRoadmap(ideaId),
      generateSuccessMetrics(ideaId)
    ];
    
    const results = await Promise.allSettled(tasks);
    console.log('🔍 DEBUG: Iteration tasks completed:', results);
    return results;
  } catch (error: unknown) {
    console.error('❌ ERROR: triggerIterationTasks failed:', error);
    throw error;
  }
};

export const triggerConsiderationTasks = async (ideaId: string) => {
  try {
    console.log('🔍 DEBUG: triggerConsiderationTasks called for idea:', ideaId);
    // This could trigger multiple tasks in parallel
    const tasks = [
      generateMarketSnapshot(ideaId),
      generateVCThesisComparison(ideaId),
      generateROIProjections(ideaId)
    ];
    
    const results = await Promise.allSettled(tasks);
    console.log('🔍 DEBUG: Consideration tasks completed:', results);
    return results;
  } catch (error: unknown) {
    console.error('❌ ERROR: triggerConsiderationTasks failed:', error);
    throw error;
  }
};

export const triggerClosureTasks = async (ideaId: string) => {
  try {
    console.log('🔍 DEBUG: triggerClosureTasks called for idea:', ideaId);
    // Generate post-mortem analysis
    const response = await api.post(`/api/ideas/${ideaId}/post-mortem`);
    console.log('🔍 DEBUG: Closure tasks completed:', response.data);
    return response.data;
  } catch (error: unknown) {
    console.error('❌ ERROR: triggerClosureTasks failed:', error);
    throw error;
  }
};

// Helper functions for specific business tasks
export const generateBusinessModelCanvas = async (ideaId: string) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/business-model`);
    return response.data;
  } catch (error) {
    console.error('Error generating business model canvas:', error);
    throw error;
  }
};

export const generateDevelopmentRoadmap = async (ideaId: string) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/roadmap`);
    return response.data;
  } catch (error) {
    console.error('Error generating development roadmap:', error);
    throw error;
  }
};

export const generateSuccessMetrics = async (ideaId: string) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/metrics`);
    return response.data;
  } catch (error) {
    console.error('Error generating success metrics:', error);
    throw error;
  }
};

export const generateROIProjections = async (ideaId: string) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/roi`);
    return response.data;
  } catch (error) {
    console.error('Error generating ROI projections:', error);
    throw error;
  }
};

export const getStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const addToShortlist = async (ideaId: string) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/shortlist`);
    return response.data;
  } catch (error) {
    console.error('Error adding to shortlist:', error);
    throw error;
  }
};

export const removeFromShortlist = async (ideaId: string) => {
  try {
    const response = await api.delete(`/api/ideas/${ideaId}/shortlist`);
    return response.data;
  } catch (error) {
    console.error('Error removing from shortlist:', error);
    throw error;
  }
};

export const getDeepDiveVersions = async (ideaId: string): Promise<DeepDiveVersion[]> => {
  const response = await api.get(`/api/ideas/${ideaId}/deepdive_versions`);
  return response.data;
};

export const createDeepDiveVersion = async (ideaId: string, fields: Record<string, unknown>, llm_raw_response: string, rerun_llm = false) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/deepdive_versions`, { fields, llm_raw_response, rerun_llm });
    return response.data;
  } catch (error: unknown) {
    console.error('Error creating deep dive version:', error);
    throw error;
  }
};

export const deleteDeepDiveVersion = async (ideaId: string, versionNumber: number) => {
  try {
    const response = await api.delete(`/api/ideas/${ideaId}/deepdive_versions/${versionNumber}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting deep dive version:', error);
    throw error;
  }
};

export const getDeepDiveVersion = async (ideaId: string, versionNumber: number) => {
  try {
    const response = await api.get(`/api/ideas/${ideaId}/deepdive_versions/${versionNumber}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching deep dive version:', error);
    throw error;
  }
};

export const restoreDeepDiveVersion = async (ideaId: string, versionNumber: number) => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/deepdive_versions/${versionNumber}/restore`);
    return response.data;
  } catch (error) {
    console.error('Error restoring deep dive version:', error);
    throw error;
  }
};

export const getIdeaById = async (ideaId: string): Promise<Idea> => {
  try {
    const response = await api.get(`/api/ideas/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching idea by id:', error);
    throw error;
  }
};

// Data transformation functions to match frontend expectations
export const transformRepo = (repo: Repo) => ({
  id: repo.id,
  name: repo.name,
  description: repo.summary || '',
  language: repo.language || 'Unknown',
  url: repo.url || '',
  stargazers_count: repo.stargazers_count || 0,
  forks_count: repo.forks_count || 0,
  watchers_count: repo.watchers_count || 0,
  created_at: repo.created_at || new Date().toISOString().split('T')[0],
  trending_period: repo.trending_period || 'daily',
});

export const transformIdea = (idea: Idea) => ({
  id: idea.id,
  repo_id: idea.repo_id,
  title: idea.title || '',
  score: idea.score ?? 5,
  effort: idea.mvp_effort ?? 5,
  hook: idea.hook || '',
  value: idea.value || '',
  evidence: idea.evidence || '',
  differentiator: idea.differentiator || '',
  callToAction: idea.call_to_action || '',
  deepDiveGenerated: !!idea.deep_dive,
  deep_dive: idea.deep_dive,
  deep_dive_requested: idea.deep_dive_requested,
  created_at: idea.created_at,
  llm_raw_response: idea.llm_raw_response,
  deep_dive_raw_response: idea.deep_dive_raw_response,
  isError: idea.title && idea.title.startsWith('[ERROR]'),
  needsNewDeepDive: !(idea.deep_dive && Object.keys(idea.deep_dive).length > 0) && !idea.deep_dive_raw_response,
  status: idea.status,
  type: idea.type || '',
  source_type: idea.source_type,
});

export async function fetchIdeas(repoId: string): Promise<Idea[]> {
  const res = await fetch(`/api/ideas?repo_id=${repoId}`);
  if (!res.ok) throw new Error('Failed to fetch ideas');
  return res.json();
}

export async function fetchLastUpdated() {
  const res = await fetch('/ideas/last-updated');
  const data = await res.json();
  return data.last_updated;
}

export const updateIdeaStatus = async (id: string, status: string): Promise<Idea> => {
  const response = await api.post(`/api/ideas/${id}/status`, status, {
    headers: { 'Content-Type': 'text/plain' }
  });
  return response.data;
};

export const updateIdea = async (ideaId: string, updates: Record<string, any>): Promise<Idea> => {
  try {
    const response = await api.put(`/api/ideas/${ideaId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating idea:', error);
    throw error;
  }
};

export const clearRepoCache = async () => {
  try {
    const response = await api.post('/repos/clear-cache');
    return response.data;
  } catch (error) {
    console.error('Error clearing repo cache:', error);
    throw error;
  }
};

// Advanced Features API Functions
export interface CaseStudy {
  id: string;
  idea_id: string;
  company_name: string;
  industry?: string;
  business_model?: string;
  success_factors?: string;
  challenges?: string;
  lessons_learned?: string;
  market_size?: string;
  funding_raised?: string;
  exit_value?: string;
  llm_raw_response?: string;
  created_at?: string;
}

export interface MarketSnapshot {
  id: string;
  idea_id: string;
  market_size?: string;
  growth_rate?: string;
  key_players: string[];
  market_trends?: string;
  regulatory_environment?: string;
  competitive_landscape?: string;
  entry_barriers?: string;
  llm_raw_response?: string;
  created_at?: string;
}

export interface LensInsight {
  id: string;
  idea_id: string;
  lens_type: string;
  insights?: string;
  opportunities?: string;
  risks?: string;
  recommendations?: string;
  llm_raw_response?: string;
  created_at?: string;
}

export interface VCThesisComparison {
  id: string;
  idea_id: string;
  vc_firm: string;
  thesis_focus?: string;
  alignment_score?: number;
  key_alignment_points?: string;
  potential_concerns?: string;
  investment_likelihood?: string;
  llm_raw_response?: string;
  created_at?: string;
}

export interface DeckSlide {
  slide_number: number;
  slide_type: string;
  title: string;
  content: string;
  key_points: string[];
}

export interface InvestorDeck {
  id: string;
  idea_id: string;
  deck_content: {
    title: string;
    slides: DeckSlide[];
  };
  generated_at?: string;
  llm_raw_response?: string;
}

// Case Study API
export const generateCaseStudy = async (ideaId: string, companyName?: string): Promise<{ case_study: CaseStudy; llm_raw_response: string }> => {
  try {
    const response = await api.post('/advanced/case-study', {
      idea_id: ideaId,
      company_name: companyName
    });
    return response.data;
  } catch (error) {
    console.error('Error generating case study:', error);
    throw error;
  }
};

export const getCaseStudy = async (ideaId: string): Promise<{ case_study: CaseStudy; llm_raw_response: string }> => {
  try {
    const response = await api.get(`/advanced/case-study/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching case study:', error);
    throw error;
  }
};

// Market Snapshot API
export const generateMarketSnapshot = async (ideaId: string): Promise<{ market_snapshot: MarketSnapshot; llm_raw_response: string }> => {
  try {
    const response = await api.post('/advanced/market-snapshot', {
      idea_id: ideaId
    });
    return response.data;
  } catch (error) {
    console.error('Error generating market snapshot:', error);
    throw error;
  }
};

export const getMarketSnapshot = async (ideaId: string): Promise<{ market_snapshot: MarketSnapshot; llm_raw_response: string }> => {
  try {
    const response = await api.get(`/advanced/market-snapshot/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching market snapshot:', error);
    throw error;
  }
};

// Lens Insights API
export const generateLensInsight = async (ideaId: string, lensType: string): Promise<{ lens_insight: LensInsight; llm_raw_response: string }> => {
  try {
    const response = await api.post('/advanced/lens-insight', {
      idea_id: ideaId,
      lens_type: lensType
    });
    return response.data;
  } catch (error) {
    console.error('Error generating lens insight:', error);
    throw error;
  }
};

export const getLensInsights = async (ideaId: string): Promise<{ lens_insights: LensInsight[]; llm_raw_responses: Record<string, string> }> => {
  try {
    const response = await api.get(`/advanced/lens-insights/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching lens insights:', error);
    throw error;
  }
};

// VC Thesis Comparison API
export const generateVCThesisComparison = async (ideaId: string, vcFirm?: string): Promise<{ vc_thesis_comparison: VCThesisComparison; llm_raw_response: string }> => {
  try {
    const response = await api.post('/advanced/vc-thesis-comparison', {
      idea_id: ideaId,
      vc_firm: vcFirm
    });
    return response.data;
  } catch (error) {
    console.error('Error generating VC thesis comparison:', error);
    throw error;
  }
};

export const getVCThesisComparisons = async (ideaId: string): Promise<{ vc_thesis_comparisons: VCThesisComparison[]; llm_raw_responses: Record<string, string> }> => {
  try {
    const response = await api.get(`/advanced/vc-thesis-comparisons/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching VC thesis comparisons:', error);
    throw error;
  }
};

// Investor Deck API
export const generateInvestorDeck = async (
  ideaId: string, 
  includeCaseStudies: boolean = true,
  includeMarketAnalysis: boolean = true,
  includeFinancialProjections: boolean = true,
  focusArea: string = "general"
): Promise<{ investor_deck: InvestorDeck; llm_raw_response: string }> => {
  try {
    const response = await api.post('/advanced/investor-deck', {
      idea_id: ideaId,
      include_case_studies: includeCaseStudies,
      include_market_analysis: includeMarketAnalysis,
      include_financial_projections: includeFinancialProjections,
      focus_area: focusArea
    });
    return response.data;
  } catch (error) {
    console.error('Error generating investor deck:', error);
    throw error;
  }
};

export const getInvestorDeck = async (ideaId: string): Promise<{ investor_deck: InvestorDeck; llm_raw_response: string }> => {
  try {
    const response = await api.get(`/advanced/investor-deck/${ideaId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching investor deck:', error);
    throw error;
  }
};

// Collaboration API

export interface IdeaCollaborator {
  id: string;
  idea_id: string;
  user_id: string;
  role: 'editor' | 'viewer';
  created_at: string;
}

export const addCollaborator = async (ideaId: string, userId: string, role: 'editor' | 'viewer'): Promise<IdeaCollaborator> => {
  const response = await api.post(`/collaboration/ideas/${ideaId}/collaborators`, { user_id: userId, role });
  return response.data;
};

export const getCollaborators = async (ideaId: string): Promise<IdeaCollaborator[]> => {
  const response = await api.get(`/collaboration/ideas/${ideaId}/collaborators`);
  return response.data;
};

export const removeCollaborator = async (ideaId: string, userId: string): Promise<void> => {
  await api.delete(`/collaboration/ideas/${ideaId}/collaborators/${userId}`);
};

// Change Proposal API

export interface IdeaChangeProposal {
  id: string;
  idea_id: string;
  proposer_id: string;
  changes: Partial<Idea>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const submitChangeProposal = async (ideaId: string, changes: Partial<Idea>): Promise<IdeaChangeProposal> => {
  try {
    const response = await api.post(`/api/ideas/${ideaId}/proposals`, { changes });
    return response.data;
  } catch (error: unknown) {
    console.error('❌ ERROR: submitChangeProposal failed:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { data: unknown; status: number } };
      console.error('❌ ERROR: Response data:', axiosError.response.data);
      console.error('❌ ERROR: Response status:', axiosError.response.status);
    }
    throw error;
  }
};

export const getChangeProposals = async (ideaId: string): Promise<IdeaChangeProposal[]> => {
  const response = await api.get(`/collaboration/ideas/${ideaId}/proposals`);
  return response.data;
};

export const approveChangeProposal = async (proposalId: string): Promise<IdeaChangeProposal> => {
  const response = await api.post(`/collaboration/proposals/${proposalId}/approve`);
  return response.data;
};

export const rejectChangeProposal = async (proposalId: string): Promise<IdeaChangeProposal> => {
  const response = await api.post(`/collaboration/proposals/${proposalId}/reject`);
  return response.data;
};

// Comment API

export interface Comment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
}

export const addComment = async (ideaId: string, content: string, parentCommentId?: string): Promise<Comment> => {
  const response = await api.post(`/collaboration/ideas/${ideaId}/comments`, { content, parent_comment_id: parentCommentId });
  return response.data;
};

export const getComments = async (ideaId: string): Promise<Comment[]> => {
  const response = await api.get(`/collaboration/ideas/${ideaId}/comments`);
  return response.data;
};

export const deleteIdea = async (ideaId: string): Promise<void> => {
  await api.delete(`/api/ideas/${ideaId}`);
};

// ... and so on for change proposals and comments 

export const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const processResume = async () => {
  const response = await api.post('/resume/process');
  return response.data;
};

export async function removeResume() {
  return api.delete('/resume');
}

// Team & Invite API
export interface Team {
  id: string;
  owner_id: string;
  name?: string;
  created_at: string;
}

export interface Invite {
  id: string;
  email: string;
  team_id: string;
  inviter_id: string;
  expires_at: string;
  accepted: boolean;
  accepted_at?: string;
  revoked: boolean;
  created_at: string;
}

export const getTeamMembersAndInvites = async (): Promise<{ members: any[]; invites: Invite[] }> => {
  const response = await api.get('/auth/team/members');
  return response.data;
};

export const sendTeamInvite = async (email: string): Promise<Invite> => {
  // This is handled via onboarding or a dedicated endpoint (not shown in backend, but assumed as POST /auth/invite)
  const response = await api.post('/auth/invite', { email });
  return response.data;
};

export const acceptInvite = async (inviteId: string): Promise<any> => {
  const response = await api.post(`/auth/invite/accept?invite_id=${inviteId}`);
  return response.data;
};

export const revokeInvite = async (inviteId: string): Promise<any> => {
  const response = await api.post(`/auth/invite/revoke?invite_id=${inviteId}`);
  return response.data;
};

export const transferTeamOwnership = async (newOwnerId: string): Promise<any> => {
  const response = await api.post(`/auth/team/transfer_ownership?new_owner_id=${newOwnerId}`);
  return response.data;
};

// Notification API (placeholder, backend to implement)
export interface Notification {
  id: string;
  type: 'invite' | 'mention' | 'comment' | 'team' | 'system';
  message: string;
  created_at: string;
  read: boolean;
  // Add more fields as needed
}

export const getNotifications = async (): Promise<Notification[]> => {
  // TODO: Wire to backend when implemented
  return [];
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  // TODO: Wire to backend when implemented
  return;
};

export const clearAllNotifications = async (): Promise<void> => {
  // TODO: Wire to backend when implemented
  return;
};

// Audit Logging API
export interface AuditLogData {
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface AuditHistoryFilters {
  user_id?: string;
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total_actions: number;
  period_days: number;
  action_breakdown: Record<string, number>;
  resource_breakdown: Record<string, number>;
  daily_activity: Array<{date: string; count: number}>;
}

export const logAuditEvent = async (auditData: AuditLogData): Promise<AuditLogEntry> => {
  const response = await api.post('/audit/log', auditData);
  return response.data;
};

export interface GetAuditHistoryParams {
  limit?: number;
  user_id?: string;
  action_type?: string;
  resource_type?: string;
  resource_id?: string;
  start_date?: string;
  end_date?: string;
}

export async function getAuditHistory(params: GetAuditHistoryParams = {}): Promise<AuditLogEntry[]> {
  const search = new URLSearchParams();
  if (params.limit) search.append('limit', String(params.limit));
  if (params.user_id) search.append('user_id', params.user_id);
  if (params.action_type) search.append('action_type', params.action_type);
  if (params.resource_type) search.append('resource_type', params.resource_type);
  if (params.resource_id) search.append('resource_id', params.resource_id);
  if (params.start_date) search.append('start_date', params.start_date);
  if (params.end_date) search.append('end_date', params.end_date);
  const res = await fetch(`/api/audit/history?${search.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch audit history');
  return await res.json();
}

// --- Ask AI: Profile-level QnA ---
export async function createProfileQnA(question: string, contextFields?: string[]): Promise<ProfileQnA> {
  const response = await api.post('/auth/api/profile/qna', { question, context_fields: contextFields });
  return response.data;
}

export async function getProfileQnA(): Promise<ProfileQnA[]> {
  const response = await api.get('/auth/api/profile/qna');
  return response.data;
}

export type ProfileQnA = {
  id: string;
  user_id: string;
  question: string;
  answer?: string;
  llm_raw_response?: string;
  created_at: string;
};

// --- Ask AI: Idea-level QnA ---
export async function createIdeaQnA(ideaId: string, question: string, contextFields?: string[]): Promise<IdeaQnA> {
  const res = await fetch(`/api/ideas/${ideaId}/qna`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context_fields: contextFields })
  });
  if (!res.ok) throw new Error("Failed to create idea QnA");
  return res.json();
}

export async function getIdeaQnA(ideaId: string): Promise<IdeaQnA[]> {
  const res = await fetch(`/api/ideas/${ideaId}/qna`);
  if (!res.ok) throw new Error("Failed to fetch idea QnA");
  return res.json();
}

export type IdeaQnA = {
  id: string;
  idea_id: string;
  question: string;
  answer?: string;
  llm_raw_response?: string;
  created_at: string;
};

// --- Ask AI: Version-level QnA ---
export async function createVersionQnA(ideaId: string, versionNumber: number, question: string, contextFields?: string[]): Promise<VersionQnA> {
  const res = await fetch(`/api/ideas/${ideaId}/versions/${versionNumber}/qna`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context_fields: contextFields })
  });
  if (!res.ok) throw new Error("Failed to create version QnA");
  return res.json();
}

export async function getVersionQnA(ideaId: string, versionNumber: number): Promise<VersionQnA[]> {
  const res = await fetch(`/api/ideas/${ideaId}/versions/${versionNumber}/qna`);
  if (!res.ok) throw new Error("Failed to fetch version QnA");
  return res.json();
}

export type VersionQnA = {
  id: string;
  idea_id: string;
  version_number: number;
  question: string;
  answer?: string;
  llm_raw_response?: string;
  created_at: string;
};

export const scaffoldRepo = async (ideaId: string) => {
  const response = await api.post(`/api/ideas/${ideaId}/scaffold-repo`);
  return response.data;
};

export const updateMvpStepProgress = async (ideaId: string, progress: boolean[]) => {
  const response = await api.post(`/api/ideas/${ideaId}/mvp-progress`, { progress });
  return response.data;
}; 

export interface ExportRecord {
  id: string;
  user_id: string;
  idea_id: string;
  deck_id: string;
  slides: string[];
  focus_area: string;
  style: string;
  file_type: string;
  recipient?: string;
  created_at: string;
}

export interface ExportRecordCreate {
  user_id: string;
  idea_id: string;
  deck_id: string;
  slides: string[];
  focus_area: string;
  style: string;
  file_type: string;
  recipient?: string;
}

export const logExport = async (record: ExportRecordCreate): Promise<ExportRecord> => {
  const response = await api.post('/advanced/exports', record);
  return response.data;
};

export const listExports = async (ideaId?: string, recipient?: string): Promise<ExportRecord[]> => {
  const params: any = {};
  if (ideaId) params.idea_id = ideaId;
  if (recipient) params.recipient = recipient;
  const response = await api.get('/advanced/exports', { params });
  return response.data;
};

export const getExport = async (exportId: string): Promise<ExportRecord> => {
  const response = await api.get(`/advanced/exports/${exportId}`);
  return response.data;
}; 

// Defensive: always use safeArray() for any .length or .map on possibly undefined fields
export function safeArray(val: any) {
  return Array.isArray(val) ? val : [];
} 

export const getIdeasByStatus = async (status: string): Promise<Idea[]> => {
  const response = await api.get(`/api/ideas/list${status ? `?status=${status}` : ''}`);
  return Array.isArray(response.data.ideas) ? response.data.ideas.map(normalizeIdea) : [];
}; 