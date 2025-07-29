import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import type { TabContentProps } from '@/types/business-intelligence';

export function MetricsTab({ businessIntelligence }: TabContentProps) {
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

  const getTrendIcon = (trend: string) => {
    return trend === 'up' 
      ? <TrendingUp className="w-4 h-4 text-green-500" /> 
      : <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
  };

  return (
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
                  <ProgressBar 
                    progress={metric.current}
                    max={metric.target}
                    height="sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}