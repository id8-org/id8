import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TabContentProps } from '@/types/business-intelligence';

export function BusinessModelTab({ businessIntelligence, idea }: TabContentProps) {
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

  return (
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
  );
}