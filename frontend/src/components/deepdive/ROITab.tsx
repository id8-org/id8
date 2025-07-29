import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from 'lucide-react';
import { SimpleChart } from '../SimpleChart';
import type { TabContentProps } from '@/types/business-intelligence';

export function ROITab({ businessIntelligence }: TabContentProps) {
  const roiProjections = businessIntelligence?.roi_projections || {
    year_1: { revenue: 50000, costs: 30000, roi: 67 },
    year_2: { revenue: 200000, costs: 80000, roi: 150 },
    year_3: { revenue: 500000, costs: 150000, roi: 233 }
  };

  return (
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
  );
}