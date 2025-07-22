import React from 'react';
import { Suggested } from '@/types/suggested';

interface SuggestedSummaryProps {
  suggested: Suggested;
}

const SuggestedSummary: React.FC<SuggestedSummaryProps> = ({ suggested }) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      {suggested.data.title && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Title</h3>
          <p className="text-gray-700">{suggested.data.title}</p>
        </div>
      )}
      
      {/* Hook */}
      {suggested.data.hook && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hook</h3>
          <p className="text-gray-700">{suggested.data.hook}</p>
        </div>
      )}
      
      {/* Value */}
      {suggested.data.value && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Value</h3>
          <p className="text-gray-700">{suggested.data.value}</p>
        </div>
      )}
      
      {/* Evidence */}
      {suggested.data.evidence && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Evidence</h3>
          <p className="text-gray-700">{suggested.data.evidence}</p>
        </div>
      )}
      
      {/* Differentiator */}
      {suggested.data.differentiator && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Differentiator</h3>
          <p className="text-gray-700">{suggested.data.differentiator}</p>
        </div>
      )}
      
      {/* Problem Statement */}
      {suggested.data.problem_statement && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Problem Statement</h3>
          <p className="text-gray-700">{suggested.data.problem_statement}</p>
        </div>
      )}
      
      {/* Elevator Pitch */}
      {suggested.data.elevator_pitch && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Elevator Pitch</h3>
          <p className="text-gray-700">{suggested.data.elevator_pitch}</p>
        </div>
      )}
      
      {/* Scope Commitment */}
      {suggested.data.scope_commitment && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Scope Commitment</h3>
          <p className="text-gray-700">{suggested.data.scope_commitment}</p>
        </div>
      )}

      {/* Core Assumptions */}
      {suggested.data.core_assumptions && suggested.data.core_assumptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Core Assumptions</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {suggested.data.core_assumptions.map((assumption, index) => (
              <li key={index}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Riskiest Assumptions */}
      {suggested.data.riskiest_assumptions && suggested.data.riskiest_assumptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Riskiest Assumptions</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {suggested.data.riskiest_assumptions.map((assumption, index) => (
              <li key={index}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Audience */}
      {suggested.data.target_audience && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Target Audience</h3>
          <p className="text-gray-700">{suggested.data.target_audience}</p>
        </div>
      )}

      {/* Generation Notes */}
      {suggested.data.generation_notes && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Notes</h3>
          <p className="text-gray-700">{suggested.data.generation_notes}</p>
        </div>
      )}
    </div>
  );
};

export default SuggestedSummary; 