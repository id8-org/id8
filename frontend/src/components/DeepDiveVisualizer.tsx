import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Star,
  Lightbulb,
  Briefcase,
  Map,
  Zap,
  Brain,
  Eye,
  FileText,
  Building2,
  Globe,
  Rocket,
  Shield,
  Award,
  Loader2,
  XCircle
} from 'lucide-react';
import { SimpleChart } from './SimpleChart';
import { LensInsightsPreview } from './LensInsightsPreview';
import type { Idea, LensInsight, DeepDiveSection } from '../lib/api';
import { getIdeaById } from '../lib/api';
import { BarChart } from 'recharts';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, Tooltip, LabelList } from 'recharts';

interface DeepDiveVisualizerProps {
  idea: Idea;
  lensInsights?: LensInsight[];
}

interface BusinessIntelligence {
  business_model?: {
    key_partners: string;
    key_activities: string;
    key_resources: string;
    value_propositions: string;
    customer_relationships: string;
    channels: string;
    customer_segments: string;
    cost_structure: string;
    revenue_streams: string;
  };
  roadmap?: {
    phase_1: { title: string; duration: string; tasks: string[]; progress: number };
    phase_2: { title: string; duration: string; tasks: string[]; progress: number };
    phase_3: { title: string; duration: string; tasks: string[]; progress: number };
  };
  metrics?: {
    user_metrics: Array<{ name: string; target: number; current: number; trend: string }>;
    business_metrics: Array<{ name: string; target: number; current: number; trend: string }>;
    product_metrics: Array<{ name: string; target: number; current: number; trend: string }>;
  };
  roi_projections?: {
    year_1: { revenue: number; costs: number; roi: number };
    year_2: { revenue: number; costs: number; roi: number };
    year_3: { revenue: number; costs: number; roi: number };
  };
  market_snapshot?: {
    market_size: string;
    growth_rate: string;
    key_players: string[];
    market_trends: string;
    regulatory_environment: string;
    competitive_landscape: string;
    entry_barriers: string;
  };
  vc_comparisons?: Array<{
    vc_firm: string;
    thesis_focus: string;
    alignment_score: number;
    key_alignment_points: string;
    potential_concerns: string;
    investment_likelihood: string;
  }>;
}

function parseSignalScore(content: string): Record<string, number> | null {
  // Try to parse JSON from the content
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (typeof obj === 'object') return obj;
    }
  } catch {}
  // Try to parse as key: value lines
  const lines = content.split('\n');
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

function extractGoNoGo(sections: DeepDiveSection[]): string | null {
  for (const s of sections) {
    if (/go\s*\/\s*no-go/i.test(s.title) || /go\s*\/\s*no-go/i.test(s.content)) {
      const match = s.content.match(/go\s*\/\s*no-go\s*[:-]?\s*(go|no-go)/i);
      if (match) return match[1].toUpperCase();
    }
    if (/go\s*\/\s*no-go/i.test(s.content)) {
      if (/no-go/i.test(s.content)) return 'NO-GO';
      if (/go/i.test(s.content)) return 'GO';
    }
  }
  return null;
}

function extractSummary(sections: DeepDiveSection[]): string | null {
  for (const s of sections) {
    if (/summary/i.test(s.title)) return s.content;
    if (/executive summary/i.test(s.content)) return s.content;
  }
  return null;
}

// Define a type for props with dataIndex
interface TooltipPropsWithDataIndex {
  dataIndex: number;
  [key: string]: unknown;
}

export function DeepDiveVisualizer({ idea, lensInsights = [] }: DeepDiveVisualizerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [businessIntelligence, setBusinessIntelligence] = useState<BusinessIntelligence | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBusinessIntelligence();
  }, [idea.id]);

  const loadBusinessIntelligence = async () => {
    try {
      setLoading(true);
      // Fetch the latest idea data which should include business intelligence
      const updatedIdea = await getIdeaById(idea.id);
      
      // Extract business intelligence from the idea data
      if (updatedIdea.business_intelligence) {
        setBusinessIntelligence(prev => ({ ...prev, ...updatedIdea.business_intelligence }));
      }
    } catch (error) {
      console.error('Failed to load business intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fallback to mock data if no real data is available
  const businessModel = businessIntelligence?.business_model || {
    key_partners: "Technology vendors, Marketing agencies, Payment processors",
    key_activities: "Product development, Customer support, Marketing campaigns",
    key_resources: "Development team, Cloud infrastructure, Customer data",
    value_propositions: idea.value || "Innovative solution that addresses market needs",
    customer_relationships: "Personal assistance, Self-service, Community",
    channels: "Direct sales, Online platform, Partner networks",
    customer_segments: "Small businesses, Freelancers, Enterprise clients",
    cost_structure: "Development costs, Marketing expenses, Operational overhead",
    revenue_streams: "Subscription fees, Transaction fees, Premium features"
  };

  const roadmap = businessIntelligence?.roadmap || {
    phase_1: {
      title: "MVP Development",
      duration: "2-3 months",
      tasks: ["Core feature development", "Basic UI/UX", "Initial testing"],
      progress: 75
    },
    phase_2: {
      title: "Beta Launch",
      duration: "1-2 months",
      tasks: ["User feedback collection", "Bug fixes", "Performance optimization"],
      progress: 25
    },
    phase_3: {
      title: "Full Launch",
      duration: "Ongoing",
      tasks: ["Marketing campaign", "User acquisition", "Feature expansion"],
      progress: 0
    }
  };

  const metrics = businessIntelligence?.metrics || {
    user_metrics: [
      { name: "Daily Active Users", target: 1000, current: 750, trend: "up" },
      { name: "User Retention Rate", target: 80, current: 72, trend: "up" },
      { name: "User Acquisition Cost", target: 50, current: 65, trend: "down" }
    ],
    business_metrics: [
      { name: "Monthly Recurring Revenue", target: 50000, current: 35000, trend: "up" },
      { name: "Customer Lifetime Value", target: 500, current: 420, trend: "up" },
      { name: "Churn Rate", target: 5, current: 7, trend: "down" }
    ],
    product_metrics: [
      { name: "Feature Adoption Rate", target: 85, current: 78, trend: "up" },
      { name: "User Satisfaction Score", target: 4.5, current: 4.2, trend: "up" },
      { name: "Time to Value", target: 2, current: 3, trend: "down" }
    ]
  };

  const roiProjections = businessIntelligence?.roi_projections || {
    year_1: { revenue: 50000, costs: 30000, roi: 67 },
    year_2: { revenue: 200000, costs: 80000, roi: 150 },
    year_3: { revenue: 500000, costs: 150000, roi: 233 }
  };

  const marketSnapshot = businessIntelligence?.market_snapshot || {
    market_size: "$2.5B",
    growth_rate: "15% annually",
    key_players: ["Competitor A", "Competitor B", "Competitor C"],
    market_trends: "Increasing demand for automation, AI integration, Mobile-first approach",
    regulatory_environment: "Favorable, Minimal restrictions",
    competitive_landscape: "Moderate competition, Differentiation opportunities",
    entry_barriers: "Medium - Technical expertise required, Network effects"
  };

  const vcComparisons = businessIntelligence?.vc_comparisons || [
    {
      vc_firm: "Sequoia Capital",
      thesis_focus: "AI/ML, Enterprise SaaS",
      alignment_score: 85,
      key_alignment_points: "Strong technical team, Large market opportunity",
      potential_concerns: "Early stage, Limited traction",
      investment_likelihood: "High"
    },
    {
      vc_firm: "Andreessen Horowitz",
      thesis_focus: "Developer tools, Infrastructure",
      alignment_score: 78,
      key_alignment_points: "Developer-focused product, Scalable architecture",
      potential_concerns: "Competitive landscape",
      investment_likelihood: "Medium"
    }
  ];

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Handle new structured deep dive data
  const deepDiveData = idea.deep_dive;
  let signalScores: Record<string, number> | null = null;
  let summary: string | null = null;
  let goNoGo: string | null = null;

  if (deepDiveData) {
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
      goNoGo = overallScore >= 7 ? 'GO' : overallScore >= 5 ? 'MAYBE' : 'NO-GO';
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
        } catch (e) {
          signalScores = parseSignalScore(signalScoreSection.content);
        }
      }
      const goNoGoSection = deepDiveSections.find(s => /go\s*\/\s*no-go/i.test(s.title));
      goNoGo = goNoGoSection ? goNoGoSection.content : extractGoNoGo(deepDiveSections);
      const summarySection = deepDiveSections.find(s => /summary/i.test(s.title));
      summary = summarySection ? summarySection.content : extractSummary(deepDiveSections);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
        <span className="text-gray-600">Loading business intelligence...</span>
      </div>
    );
  }

  if (!['deep_dive', 'iterating', 'considering', 'closed'].includes(idea.status)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Intelligence Dashboard</h2>
          <p className="text-gray-600">Comprehensive analysis and insights for {idea.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {businessIntelligence && (
            <Badge variant="default" className="text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Real Data
            </Badge>
          )}
          <Badge variant="secondary" className="text-sm">
            <Brain className="w-4 h-4 mr-1" />
            AI-Powered Analysis
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="deepdive" className="flex items-center gap-1">
            <Brain className="w-4 h-4" />
            Deep Dive
          </TabsTrigger>
          <TabsTrigger value="business-model" className="flex items-center gap-1">
            <Briefcase className="w-4 h-4" />
            Business Model
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-1">
            <Map className="w-4 h-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            ROI
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            Market
          </TabsTrigger>
          { (idea.deep_dive || idea.deep_dive_raw_response) && (
            <TabsTrigger value="lens" className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Lens
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Score</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{idea.score || 7}/10</div>
                <p className="text-xs text-muted-foreground">Overall assessment</p>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Effort</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{idea.mvp_effort || 5}/10</div>
                <p className="text-xs text-muted-foreground">Implementation complexity</p>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Size</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketSnapshot.market_size}</div>
                <p className="text-xs text-muted-foreground">Addressable market</p>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketSnapshot.growth_rate}</div>
                <p className="text-xs text-muted-foreground">Annual growth</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Strong Product-Market Fit</p>
                    <p className="text-sm text-gray-600">High user satisfaction and retention rates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Growing Market Opportunity</p>
                    <p className="text-sm text-gray-600">15% annual growth in target market</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Competitive Advantage</p>
                    <p className="text-sm text-gray-600">Unique differentiation in key areas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  VC Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vcComparisons.slice(0, 2).map((vc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{vc.vc_firm}</p>
                        <p className="text-sm text-gray-600">{vc.thesis_focus}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${getScoreColor(vc.alignment_score)}`}>
                          {vc.alignment_score}%
                        </p>
                        <p className="text-xs text-gray-600">{vc.investment_likelihood}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-6">
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
                    <div key={k} className="flex flex-col items-center">
                      <span className="font-semibold text-gray-700">{k}</span>
                      <span className={`text-lg font-bold ${v >= 8 ? 'text-green-600' : v >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>{v}/10</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {goNoGo && (
            <div className="flex items-center gap-2">
              <Badge variant={goNoGo === 'GO' ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                {goNoGo === 'GO' ? <CheckCircle className="w-5 h-5 mr-1 text-green-600" /> : <XCircle className="w-5 h-5 mr-1 text-red-600" />}
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
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{score}/10</div>
                            <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                          </div>
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
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-green-600">{score}/10</div>
                            <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                          </div>
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
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{score}/10</div>
                            <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                          </div>
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
                          <div key={key} className="text-center">
                            <div className="text-2xl font-bold text-red-600">{score}/10</div>
                            <div className="text-sm text-gray-600 capitalize">{key.replace(/_/g, ' ')}</div>
                          </div>
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
        </TabsContent>

        <TabsContent value="business-model" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(businessModel).map(([key, value]) => (
              <Card key={key} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
                <CardHeader>
                  <CardTitle className="text-sm font-medium capitalize">
                    {key.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <div className="space-y-6">
            {Object.entries(roadmap).map(([phase, data]) => (
              <Card key={phase} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {data.title}
                      </CardTitle>
                      <CardDescription>{data.duration}</CardDescription>
                    </div>
                    <Badge variant={data.progress === 100 ? "default" : "secondary"}>
                      {data.progress}% Complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${data.progress}%` }}
                      ></div>
                    </div>
                    <div className="space-y-2">
                      {data.tasks.map((task, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(metrics).map(([category, metricList]) => (
              <Card key={category} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
                <CardHeader>
                  <CardTitle className="text-sm font-medium capitalize">
                    {category.replace(/_/g, ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metricList.map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{metric.name}</span>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>Current: {metric.current}</span>
                          <span>Target: {metric.target}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full" 
                            style={{ width: `${(metric.current / metric.target) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(roiProjections).map(([year, data]) => (
              <Card key={year} className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Year {year.split('_')[1]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Revenue</p>
                      <p className="font-bold text-green-600">${data.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Costs</p>
                      <p className="font-bold text-red-600">${data.costs.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm">ROI</p>
                    <p className="text-2xl font-bold text-blue-600">{data.roi}%</p>
                  </div>
                  <SimpleChart
                    data={[
                      { label: 'Revenue', value: data.revenue, color: '#10b981' },
                      { label: 'Costs', value: data.costs, color: '#ef4444' }
                    ]}
                    title="Revenue vs Costs"
                    type="bar"
                    height={100}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          {businessIntelligence?.market_snapshot && (() => {
            // Use Record<string, unknown> for ms type
            const ms: Record<string, unknown> = businessIntelligence.market_snapshot as Record<string, unknown>;
            function getField(obj: unknown, key: string): string | null {
              if (obj && typeof obj === 'object' && key in obj) {
                const val = (obj as Record<string, unknown>)[key];
                return typeof val === 'string' ? val : null;
              }
              return null;
            }
            const tam = ms.total_market ? getField(ms.total_market, 'value') : (typeof ms.market_size === 'string' ? ms.market_size : null);
            const tamExp = ms.total_market ? getField(ms.total_market, 'explanation') : '';
            const sam = ms.addressable_market ? getField(ms.addressable_market, 'value') : null;
            const samExp = ms.addressable_market ? getField(ms.addressable_market, 'explanation') : '';
            const som = ms.obtainable_market ? getField(ms.obtainable_market, 'value') : null;
            const somExp = ms.obtainable_market ? getField(ms.obtainable_market, 'explanation') : '';
            function parseNum(val: string | null): number {
              if (!val) return 0;
              const n = parseFloat(val.replace(/[^\d.]/g, ''));
              if (/B/i.test(val)) return n * 1e9;
              if (/M/i.test(val)) return n * 1e6;
              return n;
            }
            const tamNum = parseNum(tam);
            const samNum = parseNum(sam);
            const somNum = parseNum(som);
            const data: { name: string; value: number; label: string | null; color: string; explanation: string | null }[] = [
              { name: 'TAM', value: tamNum, label: tam, color: '#3b82f6', explanation: tamExp },
              { name: 'SAM', value: samNum, label: sam, color: '#10b981', explanation: samExp },
              { name: 'SOM', value: somNum, label: som, color: '#a21caf', explanation: somExp },
            ].filter(d => d.value > 0);
            if (data.length === 0) return null;
            return (
              <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Market Size Layers (TAM / SAM / SOM)
                  </CardTitle>
                  <CardDescription>Visualizes the total, addressable, and obtainable market for this idea.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={60}>
                    <ReBarChart data={data} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <XAxis type="number" hide domain={[0, Math.max(...data.map(d => d.value)) * 1.1]} />
                      <Tooltip formatter={(value: number, name: string, props: unknown) => {
                        // Type guard for props
                        if (
                          props &&
                          typeof props === 'object' &&
                          'dataIndex' in props &&
                          typeof (props as TooltipPropsWithDataIndex).dataIndex === 'number'
                        ) {
                          const idx = (props as TooltipPropsWithDataIndex).dataIndex;
                          return [data[idx]?.label ?? '', data[idx]?.name ?? ''];
                        }
                        // Fallback: match by value and name
                        const idx = data.findIndex(d => d.value === value && d.name === name);
                        return [data[idx]?.label ?? '', data[idx]?.name ?? ''];
                      }} />
                      {data.map((d, i) => (
                        <Bar key={d.name} dataKey="value" data={[d]} fill={d.color} barSize={20} isAnimationActive={false}>
                          <LabelList dataKey="label" position="right" />
                        </Bar>
                      ))}
                    </ReBarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {data.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }}></span>
                        <span className="font-semibold">{d.name}</span>
                        <span className="text-gray-700">{d.label}</span>
                        {d.explanation && <span className="text-xs text-gray-500 ml-2">{d.explanation}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Market Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Market Size</p>
                    <p className="font-bold text-lg">{marketSnapshot.market_size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Growth Rate</p>
                    <p className="font-bold text-lg">{marketSnapshot.growth_rate}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-2">Key Players</p>
                  <div className="flex flex-wrap gap-2">
                    {marketSnapshot.key_players.map((player, index) => (
                      <Badge key={index} variant="outline">{player}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Market Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-4">{marketSnapshot.market_trends}</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Regulatory Environment</p>
                    <p className="text-sm text-gray-600">{marketSnapshot.regulatory_environment}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Entry Barriers</p>
                    <p className="text-sm text-gray-600">{marketSnapshot.entry_barriers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-white/70 backdrop-blur-xl border border-slate-100 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                VC Thesis Comparisons
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vcComparisons.map((vc, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{vc.vc_firm}</h4>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getScoreColor(vc.alignment_score)}`}>
                          {vc.alignment_score}%
                        </p>
                        <p className="text-sm text-gray-600">Alignment</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Focus Area</p>
                        <p className="text-gray-600">{vc.thesis_focus}</p>
                      </div>
                      <div>
                        <p className="font-medium">Investment Likelihood</p>
                        <Badge variant={vc.investment_likelihood === 'High' ? 'default' : 'secondary'}>
                          {vc.investment_likelihood}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium">Key Alignment Points</p>
                        <p className="text-sm text-gray-600">{vc.key_alignment_points}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Potential Concerns</p>
                        <p className="text-sm text-gray-600">{vc.potential_concerns}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        { (idea.deep_dive || idea.deep_dive_raw_response) ? (
          <TabsContent value="lens" className="space-y-6">
            <LensInsightsPreview 
              ideaId={idea.id} 
              ideaTitle={idea.title}
            />
          </TabsContent>
        ) : (
          <TabsContent value="lens" className="space-y-6">
            <div className="text-center text-gray-500 py-8">
              <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <div className="font-semibold mb-1">Multi-Perspective Analysis Unavailable</div>
              <div className="text-sm">Generate a Deep Dive first to unlock multi-lens analysis.</div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 