import React, { useEffect, useState } from 'react';
import { Iterating, IteratingExperiment } from '@/types/iterating';
import IteratingExperimentForm from './IteratingExperimentForm';
import { Button } from '../ui/button';

const LIFECYCLE_STAGES = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'deep_dive', label: 'Deep Dive' },
  { key: 'iterating', label: 'Iterating' },
  { key: 'considering', label: 'Considering' },
  { key: 'closed', label: 'Closed' },
];

interface IteratingSummaryProps {
  iterating: Iterating;
  ideaId: string;
  stage: string; // Current stage
  stageData: Record<string, any>; // { suggested: {...}, deep_dive: {...}, ... }
}

const IteratingSummary: React.FC<IteratingSummaryProps> = ({ iterating, ideaId, stage, stageData }) => {
  const [experiments, setExperiments] = useState<Iterating[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeStage, setActiveStage] = useState(stage);

  useEffect(() => {
    setActiveStage(stage);
  }, [stage]);

  useEffect(() => {
    // Fetch all iteration loops (experiments) for this idea
    const fetchExperiments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/iterations/idea/${ideaId}`);
        if (res.ok) {
          const data = await res.json();
          setExperiments(data);
        }
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchExperiments();
  }, [ideaId, submitted]);

  const latestExperiment = experiments.length > 0 ? experiments[experiments.length - 1] : null;
  const isLatest = (idx: number) => idx === experiments.length - 1;

  const handleSubmit = async (data: IteratingExperiment) => {
    setLoading(true);
    try {
      await fetch('/api/iterations/submit-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_id: ideaId, experiment: data }),
      });
      setSubmitted(true);
    } catch (e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
  };

  if (submitted) {
    return <div className="p-4 bg-green-50 border border-green-200 rounded">Experiment submitted successfully!</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
      {/* Lifecycle navigation */}
      <div className="flex gap-2 mb-4">
        {LIFECYCLE_STAGES.map((s) => (
          <Button
            key={s.key}
            variant={activeStage === s.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveStage(s.key)}
            disabled={s.key === stage}
          >
            {s.label}
          </Button>
        ))}
      </div>
      {/* Show only the active stage's data */}
      {activeStage === 'suggested' && stageData.suggested && (
        <div>{/* Render suggested stage data here */}
          {/* ... */}
        </div>
      )}
      {activeStage === 'deep_dive' && stageData.deep_dive && (
        <div>{/* Render deep dive data here */}
          {/* ... */}
        </div>
      )}
      {activeStage === 'iterating' && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg text-blue-900">Iteration Experiments</h2>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">Total: {experiments.length}</span>
            </div>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {experiments.map((exp, idx) => (
              <Button
                key={exp.id}
                variant={activeIndex === idx ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveIndex(idx)}
              >
                Iteration v{exp.version}
              </Button>
            ))}
            {experiments.length === 0 && <span className="text-xs text-gray-400">No experiments yet</span>}
          </div>
          {experiments[activeIndex] && (
            <div className="mb-4">
              {isLatest(activeIndex) ? (
                <IteratingExperimentForm
                  experiment={experiments[activeIndex].data as IteratingExperiment}
                  onSubmit={handleSubmit}
                  loading={loading}
                />
              ) : (
                <div className="space-y-2">
                  {Object.entries(experiments[activeIndex].data as IteratingExperiment).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-semibold text-slate-700 w-48 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-600">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {latestExperiment && isLatest(activeIndex) && !skipped && (
            <Button variant="outline" className="mt-2" onClick={handleSkip} disabled={loading}>
              Skip LLM Proposal & Do My Own
            </Button>
          )}
          {experiments[activeIndex]?.llm_raw_response && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-blue-600">Show Raw LLM Output</summary>
              <pre className="bg-slate-100 p-2 rounded text-xs mt-2 overflow-x-auto">{experiments[activeIndex].llm_raw_response}</pre>
            </details>
          )}
        </>
      )}
      {/* Add similar blocks for considering, closed, etc. */}
    </div>
  );
};

export default IteratingSummary; 