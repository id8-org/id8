import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Target, 
  Globe, 
  TrendingUp, 
  Rocket, 
  CheckCircle, 
  Shield, 
  Award 
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { getScoreColor } from '@/lib/deepdive-utils';
import type { TabContentProps } from '@/types/business-intelligence';

export function OverviewTab({ businessIntelligence, idea }: TabContentProps) {
  const marketSnapshot = businessIntelligence?.market_snapshot || {
    market_size: "$2.5B",
    growth_rate: "15% annually"
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Score"
          value={`${idea.score || 7}/10`}
          subtitle="Overall assessment"
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Effort"
          value={`${idea.mvp_effort || 5}/10`}
          subtitle="Implementation complexity"
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Market Size"
          value={marketSnapshot.market_size}
          subtitle="Addressable market"
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Growth Rate"
          value={marketSnapshot.growth_rate}
          subtitle="Annual growth"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
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
    </div>
  );
}