import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Target, Zap, TrendingUp, Shield, X, Lock } from 'lucide-react';
import { Idea, LIFECYCLE_STAGES, StageDetails, Stage } from '@/types/idea';
import { cn } from '@/lib/utils';
import { getLongTitle, getDeepDiveSectionScores, getTitleAndHookTitle } from '@/lib/ideaUtils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { updateIdeaStatus } from '@/lib/api';
// Remove: import DeepDiveView from './DeepDiveView';
// Remove: import { normalizeDeepDive } from '@/pages/IdeaCards'; // or the correct import path

interface UnifiedIdeaModalProps {
  idea: Idea | null;
  isOpen: boolean;
  onClose: () => void;
  footerExtra?: React.ReactNode;
  setIterationIdea?: (idea: Idea) => void;
  setShowIterationStepper?: (open: boolean) => void;
  updateIterationStep?: (idx: number, value: string) => void;
  onRequestDeepDive?: (ideaId: string) => void;
  defaultStage?: string;
  developerMode?: boolean;
}

const UnifiedIdeaModal: React.FC<UnifiedIdeaModalProps> = ({ 
  idea, 
  isOpen, 
  onClose, 
  footerExtra, 
  setIterationIdea, 
  setShowIterationStepper, 
  updateIterationStep, 
  onRequestDeepDive, 
  defaultStage = 'suggested',
  developerMode = false,
}) => {
  console.log('🔍 DEBUG: UnifiedIdeaModal render:', { isOpen, idea: idea?.title });
  
  const normalizedIdea = idea;
  if (!normalizedIdea) return null;
  
  if (!normalizedIdea.stage) {
    normalizedIdea.stage = normalizedIdea.currentStage || 'suggested';
  }

  const [selectedStage, setSelectedStage] = useState<string>(defaultStage);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const categoryKeys = [
    { key: 'market_opportunity', label: 'Market Opportunity', color: 'text-blue-900', max: 30 },
    { key: 'execution_capability', label: 'Execution Capability', color: 'text-orange-900', max: 30 },
    { key: 'business_viability', label: 'Business Viability', color: 'text-green-900', max: 20 },
    { key: 'strategic_alignment_risks', label: 'Strategic Alignment & Risks', color: 'text-purple-900', max: 20 },
  ];
  const [selectedCategory, setSelectedCategory] = useState('market_opportunity');

  React.useEffect(() => {
    if (normalizedIdea) {
      setSelectedStage(defaultStage);
    }
  }, [normalizedIdea, defaultStage]);

  // Only show the Suggested tab if the idea is not in deep dive stage
  const showSuggestedTab = normalizedIdea.status !== 'deep_dive';

  // Helper functions
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-score-high';
    if (score >= 6) return 'text-score-medium';
    return 'text-score-low';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };

  const getStageColor = (stageKey: Stage) => {
    switch (stageKey) {
      case 'suggested': return 'purple-500';
      case 'deep-dive': return 'blue-500';
      case 'iterating': return 'orange-500';
      case 'considering': return 'green-500';
      case 'closed': return 'gray-400';
      default: return 'slate-400';
    }
  };

  const isStageAvailable = (stageKey: Stage) => {
    if (normalizedIdea.currentStage === 'suggested') {
      if (stageKey === 'deep-dive') return true;
      if (stageKey === 'suggested') return true;
      return false;
    }
    const order = ['suggested', 'deep-dive', 'iterating', 'considering', 'closed'];
    return order.indexOf(stageKey) <= order.indexOf(normalizedIdea.currentStage);
  };

  // Deep Dive section scores
  const deepDiveScores = getDeepDiveSectionScores(normalizedIdea.deep_dive);

  // Utility to linkify URLs in text
  function linkifyText(text: string) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)(?=[\s\]\[\)\.,;!?]|$)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        const match = part.match(/^(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)([)\]\.,;!?]*)$/);
        if (match) {
          const cleanUrl = match[1];
          const trailing = match[2] || '';
          return <React.Fragment key={i}><a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{cleanUrl}</a>{trailing}</React.Fragment>;
        }
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  const handleRequestDeepDive = async (id: string) => {
    setDeepDiveLoading(true);
    try {
      await updateIdeaStatus(id, 'deep_dive');
      toast({
        title: 'Deep Dive Started',
        description: 'Your Deep Dive analysis is running. You can close this window—we\'ll notify you when it\'s ready.',
      });
      if (onRequestDeepDive) {
        await onRequestDeepDive(id);
      }
    } finally {
      setDeepDiveLoading(false);
    }
  };

  // Category Card Component
  interface CategoryCardProps {
    title: string;
    score: number;
    maxScore: number;
    isSelected: boolean;
    onClick: () => void;
  }

  const CategoryCard: React.FC<CategoryCardProps> = ({ title, score, maxScore, isSelected, onClick }) => {
    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-slate-50"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="text-center">
            <div className="font-semibold text-sm text-slate-700 mb-1">{title}</div>
            <Badge variant="outline" className="text-xs">
              {score}/{maxScore}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Category Detail View Component
  interface CategoryDetailViewProps {
    category: string;
    deepDive: any;
  }

  const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({ category, deepDive }) => {
    const getCategoryData = () => {
      if (!deepDive || !deepDive.details) return null;
      
      const categoryMap: { [key: string]: any } = {
        'Market Opportunity': deepDive.details.market_opportunity,
        'Execution Capability': deepDive.details.execution_capability,
        'Business Viability': deepDive.details.business_viability,
        'Strategic Alignment & Risks': deepDive.details.strategic_alignment_risks
      };
      
      return categoryMap[category];
    };

    const data = getCategoryData();
    if (!data) return <div className="text-slate-500 text-sm">No data available for this category.</div>;

    return (
      <Card className="mt-3">
        <CardContent className="p-3 pt-1">
          <div className="flex gap-4">
            {data.details.map((detail: any, index: number) => (
              <div key={index} className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-700 text-xs">{detail.label}:</span>
                  {detail.score !== null && (
                    <Badge variant="outline" className="text-xs">{detail.score}/10</Badge>
                  )}
                </div>
                <div className="text-slate-600 text-xs leading-relaxed">{detail.narrative || '—'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Calculate scores
  const calculateTotalScore = (deepDive: any): number => {
    if (!deepDive || !deepDive.details) return 0;
    const scores = [
      deepDive.details.market_opportunity?.score || 0,
      deepDive.details.execution_capability?.score || 0,
      deepDive.details.business_viability?.score || 0,
      deepDive.details.strategic_alignment_risks?.score || 0
    ];
    return scores.reduce((sum, score) => sum + score, 0);
  };

  const calculateMarketScore = (deepDive: any): number => {
    return deepDive?.details?.market_opportunity?.score || 0;
  };

  const calculateExecutionScore = (deepDive: any): number => {
    return deepDive?.details?.execution_capability?.score || 0;
  };

  const calculateViabilityScore = (deepDive: any): number => {
    return deepDive?.details?.business_viability?.score || 0;
  };

  const calculateRisksScore = (deepDive: any): number => {
    return deepDive?.details?.strategic_alignment_risks?.score || 0;
  };

  // Category Section Component
  interface CategorySectionProps {
    title: string;
    score: number;
    maxScore: number;
    details: Array<{ label: string; score: number | null; narrative: string }>;
  }

  const CategorySection: React.FC<CategorySectionProps> = ({ title, score, maxScore, details }) => {
    return (
      <div className="flex-1">
        <div className="text-center mb-2">
          <div className="font-semibold text-sm text-slate-700">{title}</div>
          <Badge variant="outline" className="text-xs">{score}/{maxScore}</Badge>
        </div>
        <div className="text-xs text-slate-600 text-center">
          {details.map((detail, index) => (
            <div key={index} className="mb-1">
              <span className="font-medium">{detail.label}:</span> {detail.score !== null ? `${detail.score}/10` : '—'}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper to sum all scores for total deep dive score
  const getTotalDeepDiveScore = () => {
    const d = normalizedIdea.deep_dive || {};
    return (
      (d.product_market_fit_score ?? 0) +
      (d.market_size_score ?? 0) +
      (d.market_timing_score ?? 0) +
      (d.founders_execution_score ?? 0) +
      (d.technical_feasibility_score ?? 0) +
      (d.go_to_market_score ?? 0) +
      (d.profitability_potential_score ?? 0) +
      (d.competitive_moat_score ?? 0) +
      (d.strategic_exit_score ?? 0) +
      (d.regulatory_risk_score ?? 0)
    );
  };
  const totalDeepDiveScore = getTotalDeepDiveScore();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] w-[98vw] min-h-[60vh] max-h-[90vh] mx-auto overflow-y-auto p-0 rounded-2xl bg-white shadow-xl z-50 text-[15px]" style={{ minHeight: '600px', maxHeight: '90vh', fontSize: '15px' }}>
        <DialogTitle>
          <div className="sr-only">Idea Details</div>
        </DialogTitle>
        
        <div className="flex flex-col h-full w-full" style={{ minHeight: '600px', maxHeight: '90vh', fontSize: '15px' }}>
          {/* Core idea data always at the top */}
          <DialogHeader className="p-4 pt-0 pb-0 flex-shrink-0">
            <div className="flex items-start justify-between w-full mb-0">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-blue-900 leading-tight mb-0 line-clamp-2">
                  {getTitleAndHookTitle(normalizedIdea)}
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-1 mb-1">
                  <span className="text-[10px] text-gray-400 truncate">Idea #{normalizedIdea.idea_number !== undefined ? normalizedIdea.idea_number : ''}{normalizedIdea.idea_number !== undefined ? ' · ' : ''}{normalizedIdea.id}</span>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">v{normalizedIdea.version ?? 1}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center mb-1">
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Score: {normalizedIdea.score ?? normalizedIdea.overallScore ?? '—'}</span>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">MVP Effort: {normalizedIdea.mvp_effort ?? normalizedIdea.effort ?? '—'}</span>
                  <span
                    className={[
                      normalizedIdea.status === 'suggested'
                        ? 'bg-purple-100 text-purple-700'
                        : normalizedIdea.status === 'deep_dive'
                        ? 'bg-blue-100 text-blue-700'
                        : normalizedIdea.status === 'iterating'
                        ? 'bg-orange-100 text-orange-700'
                        : normalizedIdea.status === 'considering'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700',
                      'rounded px-2 py-0.5 text-xs font-medium capitalize',
                    ].join(' ')}
                  >
                    {normalizedIdea.status.replace('_', ' ')}
                  </span>
                  {['deep_dive', 'iterating', 'considering', 'closed'].includes(normalizedIdea.status) && (
                    <span className={[
                      (normalizedIdea.deep_dive && ((normalizedIdea.deep_dive as any)['go_no_go']) === 'Go')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700',
                      'rounded px-2 py-0.5 text-xs font-medium capitalize',
                    ].join(' ')}>
                      {normalizedIdea.deep_dive && ((normalizedIdea.deep_dive as any)['go_no_go']) || 'No-Go'}
                    </span>
                  )}
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">{normalizedIdea.source_type === 'system' ? 'System Generated' : normalizedIdea.source_type === 'madlib' ? 'AI Generated' : normalizedIdea.source_type === 'byoi' ? 'BYOI' : 'Not Set'}</span>
                  {normalizedIdea.type && (
                    <span className="rounded px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">{normalizedIdea.type.replace('_', ' ')}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 items-center mb-0 mt-1 w-full">
                  <div className="ml-auto flex items-center gap-1">
                    <button className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition">Edit</button>
                    {normalizedIdea.status === 'suggested' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="ml-1"
                        onClick={() => handleRequestDeepDive(normalizedIdea.id)}
                        disabled={deepDiveLoading}
                      >
                        {deepDiveLoading ? 'Requesting...' : 'Request Deep Dive'}
                      </Button>
                    )}
                    {/* Add Iterate button for deep dive stage */}
                    {normalizedIdea.status === 'deep_dive' && setIterationIdea && setShowIterationStepper && (
                      <Button
                        variant="default"
                        size="sm"
                        className="ml-1"
                        onClick={() => {
                          setIterationIdea(normalizedIdea);
                          setShowIterationStepper(true);
                        }}
                        disabled={normalizedIdea.status !== 'deep_dive'}
                      >
                        Begin Iterating
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogClose />
            </div>
          </DialogHeader>

          {/* Content Area */}
          <div className="flex-1 w-full p-4 pt-1 overflow-y-auto">
            {/* Problem Statement and Elevator Pitch always at the top */}
            <div className="rounded p-1 mb-3">
              <div className="grid grid-cols-2 gap-0 relative">
                <div className="pr-4 flex flex-col items-stretch">
                  <h4 className="font-semibold text-slate-700 text-xs mb-0.5">Problem Statement</h4>
                  <p className="text-xs text-slate-600 leading-snug whitespace-pre-line">{normalizedIdea.problem_statement || 'Not defined'}</p>
                </div>
                <div className="pl-4 flex flex-col items-stretch border-l border-slate-200">
                  <h4 className="font-semibold text-slate-700 text-xs mb-0.5">Elevator Pitch</h4>
                  <p className="text-xs text-slate-600 leading-snug whitespace-pre-line">{normalizedIdea.elevator_pitch || normalizedIdea.elevatorPitch || 'Not defined'}</p>
                </div>
              </div>
            </div>

            {/* Stage Navigation Tabs */}
            <Tabs value={selectedStage} onValueChange={setSelectedStage} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {LIFECYCLE_STAGES.map((stage) => {
                  // Lock tabs for future stages the idea has not yet reached
                  const order = ['suggested', 'deep-dive', 'iterating', 'considering', 'closed'];
                  const currentIdx = order.indexOf((normalizedIdea.status || 'suggested').replace('_', '-'));
                  const stageIdx = order.indexOf(stage.key);
                  const isLocked = stageIdx > currentIdx;
                  return (
                    <TabsTrigger
                      key={`stage-${stage.key}`}
                      value={stage.key}
                      disabled={isLocked}
                      className={cn(
                        "text-xs flex items-center gap-1",
                        isLocked && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {stage.label}
                      {isLocked && <Lock className="inline w-4 h-4 text-gray-400 ml-1" aria-label="Locked" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* Suggested Tab: only render if not in deep dive stage */}
              {showSuggestedTab && (
                <TabsContent value="suggested" className="mt-4" forceMount>
                  <div className="space-y-4">
                    {/* Only render MVP Scope, Differentiator, Reference, and Assumptions. Never render deep dive fields here. */}
                    {/* Runtime guard: forcibly do not render deep dive fields for suggested stage */}
                    {normalizedIdea.status === 'suggested' && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h4 className="uppercase text-xs font-bold mb-1 tracking-wide text-green-800">PROPOSED MVP SCOPE</h4>
                            <p className="text-xs text-slate-600">{normalizedIdea.mvp_scope || normalizedIdea.scope_commitment || 'Not defined'}</p>
                          </div>
                          <div>
                            <h4 className="uppercase text-xs font-bold mb-1 tracking-wide text-blue-800">DIFFERENTIATOR</h4>
                            <p className="text-xs text-slate-600">{normalizedIdea.differentiator || 'Not defined'}</p>
                          </div>
                          <div>
                            <h4 className="uppercase text-xs font-bold mb-1 tracking-wide text-purple-800">REFERENCE</h4>
                            <p className="text-xs text-slate-600">{(normalizedIdea.evidence_reference && normalizedIdea.evidence_reference.stat) || normalizedIdea.reference || 'Not defined'}</p>
                            {normalizedIdea.evidence_reference && normalizedIdea.evidence_reference.url && (
                              <a href={normalizedIdea.evidence_reference.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs break-all">{normalizedIdea.evidence_reference.url}</a>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2">General Assumptions</h4>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {(Array.isArray(normalizedIdea.assumptions) && normalizedIdea.assumptions.length > 0)
                                ? normalizedIdea.assumptions.map((assumption: string, index: number) => (
                                    <li key={index}>• {assumption}</li>
                                  ))
                                : <li>No assumptions defined</li>}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Core Assumptions</h4>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {(Array.isArray(normalizedIdea.core_assumptions) && normalizedIdea.core_assumptions.length > 0)
                                ? normalizedIdea.core_assumptions.map((assumption: string, index: number) => (
                                    <li key={index}>• {assumption}</li>
                                  ))
                                : <li>No assumptions defined</li>}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Riskiest Assumptions</h4>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {(Array.isArray(normalizedIdea.riskiest_assumptions) && normalizedIdea.riskiest_assumptions.length > 0)
                                ? normalizedIdea.riskiest_assumptions.map((assumption: string, index: number) => (
                                    <li key={index}>• {assumption}</li>
                                  ))
                                : <li>No assumptions defined</li>}
                            </ul>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Deep Dive Tab */}
              {/* Only render the Deep Dive tab if the idea is at or past the deep dive stage */}
              {(normalizedIdea.status === 'deep_dive' || normalizedIdea.status === 'iterating' || normalizedIdea.status === 'considering' || normalizedIdea.status === 'closed') && (
                <TabsContent value="deep-dive" className="mt-4" forceMount>
                  {/* Summary and Go/No-Go at the top, full width */}
                  <div className="w-full mb-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-xs text-gray-800 mb-1">Summary</div>
                        <div className="text-xs text-slate-600 whitespace-pre-line">{normalizedIdea.deep_dive && (normalizedIdea.deep_dive as any)['summary'] || 'Not defined'}</div>
                      </div>
                      <div className="flex flex-col min-w-[120px] max-w-[180px] md:ml-6">
                        <div className="font-semibold text-xs text-red-800 mb-1">Go/No-Go</div>
                        <div className="text-xs text-slate-600 whitespace-pre-line">{normalizedIdea.deep_dive && (normalizedIdea.deep_dive as any)['go_no_go'] || 'Not defined'}</div>
                      </div>
                    </div>
                  </div>
                  {/* Category submenu tabs */}
                  <div className="flex w-full gap-4 items-start mb-4">
                    <div className="flex-1">
                      <div className="flex bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                        {categoryKeys.map(cat => {
                          // Calculate category score
                          let score = 0;
                          if (cat.key === 'market_opportunity') {
                            score = (normalizedIdea.deep_dive?.product_market_fit_score ?? 0) + (normalizedIdea.deep_dive?.market_size_score ?? 0) + (normalizedIdea.deep_dive?.market_timing_score ?? 0);
                          } else if (cat.key === 'execution_capability') {
                            score = (normalizedIdea.deep_dive?.founders_execution_score ?? 0) + (normalizedIdea.deep_dive?.technical_feasibility_score ?? 0) + (normalizedIdea.deep_dive?.go_to_market_score ?? 0);
                          } else if (cat.key === 'business_viability') {
                            score = (normalizedIdea.deep_dive?.profitability_potential_score ?? 0) + (normalizedIdea.deep_dive?.competitive_moat_score ?? 0);
                          } else if (cat.key === 'strategic_alignment_risks') {
                            score = (normalizedIdea.deep_dive?.strategic_exit_score ?? 0) + (normalizedIdea.deep_dive?.regulatory_risk_score ?? 0);
                          }
                          return (
                            <button
                              key={`category-${cat.key}`}
                              className={`flex-1 px-4 py-2 text-xs font-medium border-r border-slate-200 last:border-r-0 transition-colors focus:outline-none ${selectedCategory === cat.key ? 'bg-white text-blue-900 shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                              onClick={() => setSelectedCategory(cat.key)}
                              type="button"
                              style={{ minWidth: 0 }}
                            >
                              <span>{cat.label}</span>
                              <span className="ml-1 font-bold">{score}/{cat.max}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Category details: only show selected, subcategories in 2-col grid with faint separator */}
                  <div className="flex flex-col gap-4">
                    {selectedCategory === 'market_opportunity' && (
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="font-semibold text-sm text-blue-900 mb-2">Market Opportunity {(normalizedIdea.deep_dive?.product_market_fit_score ?? 0) + (normalizedIdea.deep_dive?.market_size_score ?? 0) + (normalizedIdea.deep_dive?.market_timing_score ?? 0)}/30</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-semibold text-xs mb-1">Product Market Fit <span className="font-bold">{normalizedIdea.deep_dive?.product_market_fit_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.product_market_fit_narrative || '—'}</div>
                          </div>
                          <div className="border-l border-slate-200 pl-4">
                            <div className="font-semibold text-xs mb-1">Market Size <span className="font-bold">{normalizedIdea.deep_dive?.market_size_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.market_size_narrative || '—'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-xs mb-1">Market Timing <span className="font-bold">{normalizedIdea.deep_dive?.market_timing_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.market_timing_narrative || '—'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedCategory === 'execution_capability' && (
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="font-semibold text-sm text-orange-900 mb-2">Execution Capability {(normalizedIdea.deep_dive?.founders_execution_score ?? 0) + (normalizedIdea.deep_dive?.technical_feasibility_score ?? 0) + (normalizedIdea.deep_dive?.go_to_market_score ?? 0)}/30</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-semibold text-xs mb-1">Founders’ Ability <span className="font-bold">{normalizedIdea.deep_dive?.founders_execution_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.founders_execution_narrative || '—'}</div>
                          </div>
                          <div className="border-l border-slate-200 pl-4">
                            <div className="font-semibold text-xs mb-1">Technical Feasibility <span className="font-bold">{normalizedIdea.deep_dive?.technical_feasibility_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.technical_feasibility_narrative || '—'}</div>
                          </div>
                          <div>
                            <div className="font-semibold text-xs mb-1">Go-to-Market <span className="font-bold">{normalizedIdea.deep_dive?.go_to_market_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.go_to_market_narrative || '—'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedCategory === 'business_viability' && (
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="font-semibold text-sm text-green-900 mb-2">Business Viability {(normalizedIdea.deep_dive?.profitability_potential_score ?? 0) + (normalizedIdea.deep_dive?.competitive_moat_score ?? 0)}/20</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-semibold text-xs mb-1">Profitability Potential <span className="font-bold">{normalizedIdea.deep_dive?.profitability_potential_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.profitability_potential_narrative || '—'}</div>
                          </div>
                          <div className="border-l border-slate-200 pl-4">
                            <div className="font-semibold text-xs mb-1">Competitive Moat <span className="font-bold">{normalizedIdea.deep_dive?.competitive_moat_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.competitive_moat_narrative || '—'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedCategory === 'strategic_alignment_risks' && (
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="font-semibold text-sm text-purple-900 mb-2">Strategic Alignment & Risks {(normalizedIdea.deep_dive?.strategic_exit_score ?? 0) + (normalizedIdea.deep_dive?.regulatory_risk_score ?? 0)}/20</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="font-semibold text-xs mb-1">Strategic Exit <span className="font-bold">{normalizedIdea.deep_dive?.strategic_exit_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.strategic_exit_narrative || '—'}</div>
                          </div>
                          <div className="border-l border-slate-200 pl-4">
                            <div className="font-semibold text-xs mb-1">Regulatory & External Risks <span className="font-bold">{normalizedIdea.deep_dive?.regulatory_risk_score ?? '—'}/10</span></div>
                            <div className="text-xs text-slate-700">{normalizedIdea.deep_dive?.regulatory_risk_narrative || '—'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Show all raw LLM fields if present and not already displayed */}
                  {normalizedIdea.deep_dive && (normalizedIdea.deep_dive as any).raw_llm_fields && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-xs text-gray-700 mb-2">All Deep Dive LLM Fields</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries((normalizedIdea.deep_dive as any).raw_llm_fields).filter(([key]) => ![
                          'Signal Score', 'Product-Market Fit Potential', 'Market Size', 'Market Timing',
                          "Founder's Ability to Execute", 'Technical Feasibility', 'Go to Market',
                          'Competitive Moat', 'Profitability Potential', 'Strategic Exit Potential',
                          'Regulatory Risk', 'Overall Investor Attractiveness', 'GoNoGo', 'Summary',
                          'market_opportunity', 'execution_capability', 'business_viability', 'strategic_alignment_risks',
                          'overall_score', 'summary', 'raw_llm_fields'
                        ].includes(key)).map(([key, value]) => (
                          <div key={key} className="break-all">
                            <div className="font-bold text-xs text-gray-600">{key}</div>
                            <div className="text-xs text-gray-800">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              {/* Other tabs can be added here */}
              <TabsContent value="iterating" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-slate-500">Iterating content coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="considering" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-slate-500">Considering content coming soon</p>
                </div>
              </TabsContent>

              <TabsContent value="closed" className="mt-4">
                <div className="text-center py-8">
                  <p className="text-slate-500">Closed content coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
            {developerMode && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-700">
                <div className="font-bold mb-1">Raw Normalized Idea Data</div>
                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(normalizedIdea, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedIdeaModal; 