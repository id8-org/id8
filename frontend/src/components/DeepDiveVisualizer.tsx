import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain,
  Eye,
  Briefcase,
  Map,
  BarChart3,
  DollarSign,
  Globe,
  Zap,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { Idea, LensInsight } from '../lib/api';
import { getIdeaById } from '../lib/api';
import type { BusinessIntelligence } from '@/types/business-intelligence';

// Import modular tab components
import { OverviewTab } from './deepdive/OverviewTab';
import { DeepDiveTab } from './deepdive/DeepDiveTab';
import { BusinessModelTab } from './deepdive/BusinessModelTab';
import { RoadmapTab } from './deepdive/RoadmapTab';
import { MetricsTab } from './deepdive/MetricsTab';
import { ROITab } from './deepdive/ROITab';
import { MarketTab } from './deepdive/MarketTab';
import { LensTab } from './deepdive/LensTab';

interface DeepDiveVisualizerProps {
  idea: Idea;
  lensInsights?: LensInsight[];
}

export function DeepDiveVisualizer({ idea, lensInsights = [] }: DeepDiveVisualizerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [businessIntelligence, setBusinessIntelligence] = useState<BusinessIntelligence | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBusinessIntelligence = useCallback(async () => {
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
  }, [idea.id]);

  useEffect(() => {
    loadBusinessIntelligence();
  }, [loadBusinessIntelligence]);

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
          <OverviewTab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        <TabsContent value="deepdive" className="space-y-6">
          <DeepDiveTab 
            businessIntelligence={businessIntelligence} 
            idea={idea} 
            deepDiveData={idea.deep_dive}
          />
        </TabsContent>

        <TabsContent value="business-model" className="space-y-6">
          <BusinessModelTab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <RoadmapTab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <MetricsTab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        <TabsContent value="roi" className="space-y-6">
          <ROITab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <MarketTab businessIntelligence={businessIntelligence} idea={idea} />
        </TabsContent>

        { (idea.deep_dive || idea.deep_dive_raw_response) ? (
          <TabsContent value="lens" className="space-y-6">
            <LensTab 
              businessIntelligence={businessIntelligence} 
              idea={idea}
              deepDiveData={idea.deep_dive}
              deepDiveRawResponse={idea.deep_dive_raw_response}
            />
          </TabsContent>
        ) : (
          <TabsContent value="lens" className="space-y-6">
            <LensTab 
              businessIntelligence={businessIntelligence} 
              idea={idea}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 