import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  BarChart3, 
  Target, 
  Zap, 
  DollarSign, 
  Shield, 
  CheckCircle, 
  XCircle,
  FileText 
} from 'lucide-react';
import { ScoreDisplay } from './ScoreDisplay';
import { parseSignalScore, extractGoNoGo, extractSummary, determineGoNoGo } from '@/lib/deepdive-utils';
import type { TabContentProps } from '@/types/business-intelligence';
import type { DeepDiveSection } from '@/types/api';

interface DeepDiveTabProps extends TabContentProps {
  deepDiveData?: {
    sections?: DeepDiveSection[];
    market_opportunity?: {
      scores: Record<string, number>;
      narratives: Record<string, string>;
      customer_validation_plan?: string;
    };
    execution_capability?: {
      scores: Record<string, number>;
      narratives: Record<string, string>;
      customer_validation_plan?: string;
    };
    business_viability?: {
      scores: Record<string, number>;
      narratives: Record<string, string>;
      customer_validation_plan?: string;
    };
    strategic_alignment_risks?: {
      scores: Record<string, number>;
      narratives: Record<string, string>;
      customer_validation_plan?: string;
    };
    summary?: string;
    overall_score?: number;
  };
}

export function DeepDiveTab({ deepDiveData }: DeepDiveTabProps) {
  if (!deepDiveData) {
    return (
      <div className="text-center text-gray-500 py-8">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <div className="font-semibold mb-1">No Deep Dive Data Available</div>
        <div className="text-sm">Generate a deep dive analysis to see detailed insights.</div>
      </div>
    );
  }

  let signalScores: Record<string, number> | null = null;
  let summary: string | null = null;
  let goNoGo: string | null = null;

  // Check if it's the new structured format
  if (deepDiveData.market_opportunity || deepDiveData.execution_capability) {
    // Extract scores from the new structure
    const scores: Record<string, number> = {};
    
    // Market Opportunity scores
    if (deepDiveData.market_opportunity?.scores) {
      scores['Product Market Fit'] = deepDiveData.market_opportunity.scores.product_market_fit || 0;
      scores['Market Size'] = deepDiveData.market_opportunity.scores.market_size || 0;
      scores['Market Timing'] = deepDiveData.market_opportunity.scores.market_timing || 0;
    }
    
    // Execution Capability scores
    if (deepDiveData.execution_capability?.scores) {
      scores['Founders Ability'] = deepDiveData.execution_capability.scores.founders_ability || 0;
      scores['Technical Feasibility'] = deepDiveData.execution_capability.scores.technical_feasibility || 0;
      scores['Go to Market'] = deepDiveData.execution_capability.scores.go_to_market || 0;
    }
    
    // Business Viability scores
    if (deepDiveData.business_viability?.scores) {
      scores['Profitability Potential'] = deepDiveData.business_viability.scores.profitability_potential || 0;
      scores['Competitive Moat'] = deepDiveData.business_viability.scores.competitive_moat || 0;
    }
    
    // Strategic Alignment scores
    if (deepDiveData.strategic_alignment_risks?.scores) {
      scores['Strategic Exit'] = deepDiveData.strategic_alignment_risks.scores.strategic_exit || 0;
      scores['Regulatory Risks'] = deepDiveData.strategic_alignment_risks.scores.regulatory_risks || 0;
      scores['Overall Investor Score'] = deepDiveData.strategic_alignment_risks.scores.overall_investor_score || 0;
    }
    
    signalScores = scores;
    summary = deepDiveData.summary || null;
    
    // Determine Go/No-Go based on overall score
    const overallScore = deepDiveData.overall_score || 0;
    goNoGo = determineGoNoGo(overallScore);
  } else if (deepDiveData.sections) {
    // Fallback to old sections format
    const deepDiveSections = deepDiveData.sections || [];
    const signalScoreSection = deepDiveSections.find(s => /signal score/i.test(s.title));
    if (signalScoreSection) {
      try {
        const parsed = JSON.parse(signalScoreSection.content);
        if (typeof parsed === 'object' && parsed !== null) {
          signalScores = parsed;
        } else {
          signalScores = parseSignalScore(signalScoreSection.content);
        }
      } catch {
        signalScores = parseSignalScore(signalScoreSection.content);
      }
    }
    const goNoGoSection = deepDiveSections.find(s => /go\s*\/\s*no-go/i.test(s.title));
    goNoGo = goNoGoSection ? goNoGoSection.content : extractGoNoGo(deepDiveSections);
    const summarySection = deepDiveSections.find(s => /summary/i.test(s.title));
    summary = summarySection ? summarySection.content : extractSummary(deepDiveSections);
  }

  return (
    <div className="space-y-6">
      {summary && (
        <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow border-green-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-green-500" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-800">{summary}</div>
          </CardContent>
        </Card>
      )}

      {signalScores && (
        <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Investor Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(signalScores).map(([k, v]) => (
                <ScoreDisplay key={k} label={k} score={v} size="md" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {goNoGo && (
        <div className="flex items-center gap-2">
          <Badge variant={goNoGo === 'GO' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
            {goNoGo === 'GO' ? (
              <CheckCircle className="w-5 h-5 mr-1 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 mr-1 text-red-600" />
            )}
            {goNoGo}
          </Badge>
          <span className="text-gray-700 font-medium">Investor Decision</span>
        </div>
      )}

      {/* Display structured deep dive data if available */}
      {deepDiveData && (deepDiveData.market_opportunity || deepDiveData.execution_capability) && (
        <>
          {deepDiveData.market_opportunity && (
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  Market Opportunity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(deepDiveData.market_opportunity.scores).map(([key, score]) => (
                      <ScoreDisplay 
                        key={key} 
                        label={key.replace(/_/g, ' ')} 
                        score={score} 
                        size="md"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(deepDiveData.market_opportunity.narratives).map(([key, narrative]) => (
                      <div key={key}>
                        <div className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600">{narrative}</div>
                      </div>
                    ))}
                  </div>
                  {deepDiveData.market_opportunity.customer_validation_plan && (
                    <div>
                      <div className="font-semibold text-gray-700">Customer Validation Plan</div>
                      <div className="text-sm text-gray-600">{deepDiveData.market_opportunity.customer_validation_plan}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {deepDiveData.execution_capability && (
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-500" />
                  Execution Capability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(deepDiveData.execution_capability.scores).map(([key, score]) => (
                      <ScoreDisplay 
                        key={key} 
                        label={key.replace(/_/g, ' ')} 
                        score={score} 
                        size="md"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(deepDiveData.execution_capability.narratives).map(([key, narrative]) => (
                      <div key={key}>
                        <div className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600">{narrative}</div>
                      </div>
                    ))}
                  </div>
                  {deepDiveData.execution_capability.customer_validation_plan && (
                    <div>
                      <div className="font-semibold text-gray-700">Customer Validation Plan</div>
                      <div className="text-sm text-gray-600">{deepDiveData.execution_capability.customer_validation_plan}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {deepDiveData.business_viability && (
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  Business Viability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(deepDiveData.business_viability.scores).map(([key, score]) => (
                      <ScoreDisplay 
                        key={key} 
                        label={key.replace(/_/g, ' ')} 
                        score={score} 
                        size="md"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(deepDiveData.business_viability.narratives).map(([key, narrative]) => (
                      <div key={key}>
                        <div className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600">{narrative}</div>
                      </div>
                    ))}
                  </div>
                  {deepDiveData.business_viability.customer_validation_plan && (
                    <div>
                      <div className="font-semibold text-gray-700">Customer Validation Plan</div>
                      <div className="text-sm text-gray-600">{deepDiveData.business_viability.customer_validation_plan}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {deepDiveData.strategic_alignment_risks && (
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  Strategic Alignment & Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(deepDiveData.strategic_alignment_risks.scores).map(([key, score]) => (
                      <ScoreDisplay 
                        key={key} 
                        label={key.replace(/_/g, ' ')} 
                        score={score} 
                        size="md"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(deepDiveData.strategic_alignment_risks.narratives).map(([key, narrative]) => (
                      <div key={key}>
                        <div className="font-semibold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600">{narrative}</div>
                      </div>
                    ))}
                  </div>
                  {deepDiveData.strategic_alignment_risks.customer_validation_plan && (
                    <div>
                      <div className="font-semibold text-gray-700">Customer Validation Plan</div>
                      <div className="text-sm text-gray-600">{deepDiveData.strategic_alignment_risks.customer_validation_plan}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Fallback to old sections format */}
      {deepDiveData?.sections && deepDiveData.sections.filter(s => !/signal score|summary|go\s*\/\s*no-?go/i.test(s.title)).map((section, index) => (
        <Card key={index} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {section.content.split('\n').map((paragraph, pIndex) => (
                <p key={pIndex} className="mb-3 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}