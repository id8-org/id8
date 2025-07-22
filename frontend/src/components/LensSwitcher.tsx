import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Loader2, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Brain, 
  Target, 
  Users, 
  Zap,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { generateLensInsight, getLensInsights, LensInsight } from '../lib/api';
import { SimpleChart } from './SimpleChart';

interface LensSwitcherProps {
  ideaId: string;
  ideaTitle: string;
  onClose?: () => void;
}

const lensConfig = {
  founder: {
    title: "Founder's Lens",
    description: "Execution challenges, team needs, resource requirements",
    icon: Brain,
    color: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
    accentColor: "text-blue-600",
    bgColor: "bg-blue-500"
  },
  investor: {
    title: "Investor's Lens",
    description: "Market opportunity, competitive moats, scalability",
    icon: TrendingUp,
    color: "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200",
    accentColor: "text-green-600",
    bgColor: "bg-green-500"
  },
  customer: {
    title: "Customer's Lens",
    description: "Pain points, value proposition, user experience",
    icon: Users,
    color: "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
    accentColor: "text-purple-600",
    bgColor: "bg-purple-500"
  }
};

export const LensSwitcher: React.FC<LensSwitcherProps> = ({ ideaId, ideaTitle }) => {
  const [activeLens, setActiveLens] = useState<string>('founder');
  const [insights, setInsights] = useState<Record<string, LensInsight>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [rawResponses, setRawResponses] = useState<Record<string, string>>({});
  const [parsingFailed, setParsingFailed] = useState<Record<string, boolean>>({});
  const [generationProgress, setGenerationProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadExistingInsights();
  }, [ideaId]);

  const validateInsightStructure = (insight: LensInsight): boolean => {
    try {
      return !!(insight.insights || insight.opportunities || insight.risks || insight.recommendations);
    } catch (error) {
      console.error('Error validating insight structure:', error);
      return false;
    }
  };

  const loadExistingInsights = async () => {
    try {
      const response = await getLensInsights(ideaId);
      console.log('🔍 DEBUG: Existing lens insights response:', response);
      
      const insightsMap: Record<string, LensInsight> = {};
      const rawResponsesMap: Record<string, string> = {};
      const parsingFailedMap: Record<string, boolean> = {};
      
      response.lens_insights.forEach(insight => {
        insightsMap[insight.lens_type] = insight;
        if (response.llm_raw_responses && response.llm_raw_responses[insight.id]) {
          rawResponsesMap[insight.lens_type] = response.llm_raw_responses[insight.id];
        }
        
        if (!validateInsightStructure(insight)) {
          parsingFailedMap[insight.lens_type] = true;
        }
      });
      
      setInsights(insightsMap);
      setRawResponses(rawResponsesMap);
      setParsingFailed(parsingFailedMap);
    } catch (error) {
      console.error('❌ ERROR: Failed to load existing insights:', error);
    }
  };

  const generateInsight = async (lensType: string) => {
    setLoading(prev => ({ ...prev, [lensType]: true }));
    setError(null);
    setParsingFailed(prev => ({ ...prev, [lensType]: false }));
    setGenerationProgress(prev => ({ ...prev, [lensType]: 0 }));

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        const current = prev[lensType] || 0;
        if (current < 90) {
          return { ...prev, [lensType]: current + 10 };
        }
        return prev;
      });
    }, 200);

    try {
      const response = await generateLensInsight(ideaId, lensType);
      console.log('🔍 DEBUG: Lens insight generation response:', response);
      
      const { lens_insight, llm_raw_response } = response;
      setRawResponses(prev => ({ ...prev, [lensType]: llm_raw_response }));
      
      if (validateInsightStructure(lens_insight)) {
        setInsights(prev => ({ ...prev, [lensType]: lens_insight }));
        setGenerationProgress(prev => ({ ...prev, [lensType]: 100 }));
      } else {
        setParsingFailed(prev => ({ ...prev, [lensType]: true }));
        console.warn('⚠️ WARNING: Failed to parse lens insight structure, showing raw response');
      }
    } catch (error) {
      console.error(`❌ ERROR: Failed to generate ${lensType} insight:`, error);
      setError(error instanceof Error ? error.message : `Failed to generate ${lensType} insight. Please try again.`);
    } finally {
      clearInterval(progressInterval);
      setLoading(prev => ({ ...prev, [lensType]: false }));
      setTimeout(() => {
        setGenerationProgress(prev => ({ ...prev, [lensType]: 0 }));
      }, 1000);
    }
  };

  const getInsightMetrics = (insight: LensInsight) => {
    const metrics = [];
    
    if (insight.insights) {
      metrics.push({ label: 'Key Insights', value: insight.insights.length, color: 'bg-blue-500' });
    }
    if (insight.opportunities) {
      metrics.push({ label: 'Opportunities', value: insight.opportunities.length, color: 'bg-green-500' });
    }
    if (insight.risks) {
      metrics.push({ label: 'Risks', value: insight.risks.length, color: 'bg-red-500' });
    }
    if (insight.recommendations) {
      metrics.push({ label: 'Recommendations', value: insight.recommendations.length, color: 'bg-purple-500' });
    }
    
    return metrics;
  };

  const renderInsightContent = (lensType: string) => {
    const insight = insights[lensType];
    const config = lensConfig[lensType as keyof typeof lensConfig];
    const isLoading = loading[lensType];
    const hasParsingFailed = parsingFailed[lensType];
    const rawResponse = rawResponses[lensType];
    const progress = generationProgress[lensType] || 0;

    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${config.bgColor} text-white mb-4`}>
              <config.icon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{config.title}</h3>
            <p className="text-gray-600 mb-6">{config.description}</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Analyzing from {config.title.toLowerCase()} perspective...</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Generating insights...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>
      );
    }

    if (!insight && !hasParsingFailed) {
      return (
        <div className="text-center space-y-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config.bgColor} text-white mb-4`}>
            <config.icon className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{config.title}</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{config.description}</p>
          </div>
          <Button 
            onClick={() => generateInsight(lensType)}
            className={`${config.bgColor} hover:opacity-90 text-white px-8 py-3`}
            size="lg"
          >
            <Eye className="w-4 h-4 mr-2" />
            Generate {config.title}
          </Button>
        </div>
      );
    }

    if (hasParsingFailed && rawResponse) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} text-white`}>
              <config.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">{config.title}</h3>
              <Badge variant="secondary" className="mt-1">AI Generated</Badge>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The AI response couldn't be parsed into structured sections. Showing the raw response below.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Raw AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{rawResponse}</pre>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateInsight(lensType)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} text-white`}>
            <config.icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{config.title}</h3>
            <Badge variant="secondary" className="mt-1">AI Generated</Badge>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid gap-4">
          {insight?.insights && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed">{insight.insights}</p>
              </CardContent>
            </Card>
          )}

          {insight?.opportunities && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700 whitespace-pre-wrap leading-relaxed">{insight.opportunities}</p>
              </CardContent>
            </Card>
          )}

          {insight?.risks && (
            <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risks & Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 whitespace-pre-wrap leading-relaxed">{insight.risks}</p>
              </CardContent>
            </Card>
          )}

          {insight?.recommendations && (
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-700 whitespace-pre-wrap leading-relaxed">{insight.recommendations}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => generateInsight(lensType)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeLens} onValueChange={setActiveLens} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-16">
          {Object.entries(lensConfig).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-3 text-base font-medium">
              <config.icon className="h-5 w-5" />
              {config.title}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeLens}>
          <Card className={`${lensConfig[activeLens as keyof typeof lensConfig].color} border-2`}>
            <CardContent className="p-8">
              {renderInsightContent(activeLens)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 