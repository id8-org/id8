import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  TrendingUp, 
  BarChart3, 
  Building2 
} from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, Tooltip, LabelList } from 'recharts';
import { getScoreColor, parseMarketValue, getFieldValue } from '@/lib/deepdive-utils';
import type { TabContentProps, MarketLayerData } from '@/types/business-intelligence';

interface TooltipPropsWithDataIndex {
  dataIndex: number;
  [key: string]: unknown;
}

export function MarketTab({ businessIntelligence }: TabContentProps) {
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

  // TAM/SAM/SOM Analysis
  const renderMarketSizeLayers = () => {
    if (!businessIntelligence?.market_snapshot) return null;

    const ms: Record<string, unknown> = businessIntelligence.market_snapshot as Record<string, unknown>;
    const tam = ms.total_market ? getFieldValue(ms.total_market, 'value') : (typeof ms.market_size === 'string' ? ms.market_size : null);
    const tamExp = ms.total_market ? getFieldValue(ms.total_market, 'explanation') : '';
    const sam = ms.addressable_market ? getFieldValue(ms.addressable_market, 'value') : null;
    const samExp = ms.addressable_market ? getFieldValue(ms.addressable_market, 'explanation') : '';
    const som = ms.obtainable_market ? getFieldValue(ms.obtainable_market, 'value') : null;
    const somExp = ms.obtainable_market ? getFieldValue(ms.obtainable_market, 'explanation') : '';

    const tamNum = parseMarketValue(tam);
    const samNum = parseMarketValue(sam);
    const somNum = parseMarketValue(som);

    const data: MarketLayerData[] = [
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
              {data.map((d) => (
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
  };

  return (
    <div className="space-y-6">
      {renderMarketSizeLayers()}
      
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
    </div>
  );
}