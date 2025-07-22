import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Eye, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle,
  Star,
  Zap
} from 'lucide-react';
import { getLensInsights, LensInsight } from '../lib/api';

interface LensInsightsPreviewProps {
  ideaId: string;
  ideaTitle: string;
  onOpenLensSwitcher?: () => void;
}

const lensConfig = {
  founder: {
    title: "Founder's Lens",
    icon: Brain,
    color: "bg-blue-500",
    bgColor: "bg-gradient-to-r from-blue-50 to-indigo-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800"
  },
  investor: {
    title: "Investor's Lens",
    icon: TrendingUp,
    color: "bg-green-500",
    bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
    borderColor: "border-green-200",
    textColor: "text-green-800"
  },
  customer: {
    title: "Customer's Lens",
    icon: Users,
    color: "bg-purple-500",
    bgColor: "bg-gradient-to-r from-purple-50 to-pink-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800"
  }
};

export const LensInsightsPreview: React.FC<LensInsightsPreviewProps> = ({ 
  ideaId, 
  ideaTitle, 
  onOpenLensSwitcher 
}) => {
  const [insights, setInsights] = useState<Record<string, LensInsight>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadLensInsights();
  }, [ideaId]);

  const loadLensInsights = async () => {
    try {
      setLoading(true);
      const response = await getLensInsights(ideaId);
      
      const insightsMap: Record<string, LensInsight> = {};
      response.lens_insights.forEach(insight => {
        insightsMap[insight.lens_type] = insight;
      });
      
      setInsights(insightsMap);
    } catch (error) {
      console.error('Failed to load lens insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightPreview = (insight: LensInsight) => {
    const sections = [];
    if (insight.insights) sections.push('Insights');
    if (insight.opportunities) sections.push('Opportunities');
    if (insight.risks) sections.push('Risks');
    if (insight.recommendations) sections.push('Recommendations');
    return sections.join(', ');
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'insights': return <Lightbulb className="w-3 h-3 text-blue-600" />;
      case 'opportunities': return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'risks': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'recommendations': return <CheckCircle className="w-3 h-3 text-purple-600" />;
      default: return <Star className="w-3 h-3 text-gray-600" />;
    }
  };

  const hasAnyInsights = Object.keys(insights).length > 0;

  if (loading) {
    return (
      <div className="border-t border-slate-100 pt-2 mt-2">
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-xs text-blue-600 ml-2">Loading lens insights...</span>
        </div>
      </div>
    );
  }

  if (!hasAnyInsights) {
    return (
      <div className="border-t border-slate-100 pt-2 mt-2">
        <button
          className="w-full text-left text-slate-700 text-sm font-medium flex items-center gap-2 py-1 hover:underline"
          onClick={e => {
            e.stopPropagation();
            onOpenLensSwitcher?.();
          }}
        >
          <span className="mr-1">👁️</span> Multi-Perspective Analysis
          <Badge variant="outline" className="ml-auto text-xs">Generate</Badge>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 pt-2 mt-2">
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="lens-insights">
          <button
            className="w-full text-left text-purple-700 text-sm font-bold flex items-center gap-2 py-1 hover:underline"
            onClick={e => e.stopPropagation()}
            type="button"
          >
            <span className="mr-1">👁️</span> Multi-Perspective Analysis
            <Badge variant="secondary" className="ml-auto text-xs">
              {Object.keys(insights).length}/3
            </Badge>
          </button>
          <AccordionContent>
            <div className="space-y-3 mt-2">
              {/* Lens Insights Summary */}
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(insights).map(([lensType, insight]) => {
                  const config = lensConfig[lensType as keyof typeof lensConfig];
                  if (!config) return null;

                  return (
                    <div key={lensType} className={`${config.bgColor} rounded-lg p-3 border ${config.borderColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} text-white`}>
                          <config.icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-semibold ${config.textColor}">{config.title}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {insight.insights && (
                          <div className="flex items-center gap-1 text-xs">
                            {getInsightIcon('insights')}
                            <span className="text-slate-600 line-clamp-1">
                              {insight.insights.substring(0, 60)}...
                            </span>
                          </div>
                        )}
                        {insight.opportunities && (
                          <div className="flex items-center gap-1 text-xs">
                            {getInsightIcon('opportunities')}
                            <span className="text-slate-600 line-clamp-1">
                              {insight.opportunities.substring(0, 60)}...
                            </span>
                          </div>
                        )}
                        {insight.risks && (
                          <div className="flex items-center gap-1 text-xs">
                            {getInsightIcon('risks')}
                            <span className="text-slate-600 line-clamp-1">
                              {insight.risks.substring(0, 60)}...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onOpenLensSwitcher?.();
                  }}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Full Analysis
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}; 