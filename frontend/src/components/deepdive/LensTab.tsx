import React from 'react';
import { Zap } from 'lucide-react';
import { LensInsightsPreview } from '../LensInsightsPreview';
import type { TabContentProps } from '@/types/business-intelligence';

interface LensTabProps extends TabContentProps {
  deepDiveData?: unknown;
  deepDiveRawResponse?: unknown;
}

export function LensTab({ idea, deepDiveData, deepDiveRawResponse }: LensTabProps) {
  if (!deepDiveData && !deepDiveRawResponse) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
        <div className="font-semibold mb-1">Multi-Perspective Analysis Unavailable</div>
        <div className="text-sm">Generate a Deep Dive first to unlock multi-lens analysis.</div>
      </div>
    );
  }

  return (
    <LensInsightsPreview 
      ideaId={idea.id} 
      ideaTitle={idea.title}
    />
  );
}