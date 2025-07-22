import React from 'react';
import { DeepDive } from '@/types/deepDive';

interface DeepDiveSummaryProps {
  deepDive: DeepDive;
}

const DeepDiveSummary: React.FC<DeepDiveSummaryProps> = ({ deepDive }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg text-blue-900">Deep Dive Summary</h2>
        <span className="text-xs text-gray-500">v{deepDive.version}</span>
      </div>
      <div className="text-xs text-gray-400 mb-2">
        Created: {new Date(deepDive.created_at).toLocaleString()}<br />
        Updated: {new Date(deepDive.updated_at).toLocaleString()}
      </div>
      <div className="space-y-2">
        {Object.entries(deepDive.data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-semibold text-slate-700 w-48 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="text-slate-600">{String(value)}</span>
          </div>
        ))}
      </div>
      {deepDive.llm_raw_response && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-blue-600">Show Raw LLM Output</summary>
          <pre className="bg-slate-100 p-2 rounded text-xs mt-2 overflow-x-auto">{deepDive.llm_raw_response}</pre>
        </details>
      )}
    </div>
  );
};

export default DeepDiveSummary; 