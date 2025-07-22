import React from 'react';
import { Considering } from '@/types/considering';

interface ConsideringSummaryProps {
  considering: Considering;
}

const ConsideringSummary: React.FC<ConsideringSummaryProps> = ({ considering }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg text-blue-900">Considering Summary</h2>
        <span className="text-xs text-gray-500">v{considering.version}</span>
      </div>
      <div className="text-xs text-gray-400 mb-2">
        Created: {new Date(considering.created_at).toLocaleString()}<br />
        Updated: {new Date(considering.updated_at).toLocaleString()}
      </div>
      <div className="space-y-2">
        {Object.entries(considering.data).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-semibold text-slate-700 w-48 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="text-slate-600">{String(value)}</span>
          </div>
        ))}
      </div>
      {considering.llm_raw_response && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-blue-600">Show Raw LLM Output</summary>
          <pre className="bg-slate-100 p-2 rounded text-xs mt-2 overflow-x-auto">{considering.llm_raw_response}</pre>
        </details>
      )}
    </div>
  );
};

export default ConsideringSummary; 