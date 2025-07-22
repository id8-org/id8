"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { fetchLifecycleMap, Stage, StageInputOutput } from '../LifecycleVisualizer';
import type { OrchestrationStep } from '../LifecycleVisualizer';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

function PhaseDetails({ phase }: { phase: Stage }) {
  const [promptTexts, setPromptTexts] = useState<{ key: string, text: string | null, error?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Split prompt string into keys, memoized
  const promptKeys = useMemo(() => (
    phase.prompt ? phase.prompt.split(',').map(k => k.trim()).filter(Boolean) : []
  ), [phase.prompt]);

  useEffect(() => {
    let ignore = false;
    if (promptKeys.length > 0) {
      setLoading(true);
      Promise.all(
        promptKeys.map(async (key) => {
          try {
            const res = await fetch(`${BACKEND_URL}/api/prompts/${key}`);
            const json = await res.json();
            if (json.prompt) {
              return { key, text: json.prompt };
            } else {
              return { key, text: null, error: json.error || 'Prompt not found' };
            }
          } catch {
            return { key, text: null, error: 'Failed to load prompt' };
          }
        })
      ).then(results => {
        if (!ignore) setPromptTexts(results);
        setLoading(false);
      });
    } else {
      setPromptTexts([]);
    }
    return () => { ignore = true; };
  }, [phase.prompt, promptKeys]);

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow" aria-label={`Phase details for ${phase.stage}`}>
      <div className="text-lg font-bold mb-1 text-gray-900">Phase: {phase.stage}</div>
      <div className="text-xs text-gray-900 mb-2">Prompt Keys: {promptKeys.length > 0 ? promptKeys.map((k) => <span key={k} className="font-mono bg-gray-200 text-gray-900 px-2 py-0.5 rounded mr-1 border border-gray-400">{k}</span>) : <span className="font-mono bg-gray-200 text-gray-900 px-2 py-0.5 rounded border border-gray-400">None</span>}</div>
      <div className="mb-2">
        <h4 className="font-bold text-purple-900 mb-1 text-base">Prompts</h4>
        {loading && <div className="text-xs text-gray-700">Loading prompt{promptKeys.length > 1 ? 's' : ''}...</div>}
        {!loading && promptTexts.length === 0 && <div className="text-xs text-gray-700">No prompt used for this phase.</div>}
        {!loading && promptTexts.length > 0 && (
          <div className="space-y-2">
            {promptTexts.map(({ key, text, error }) => (
              <div key={key}>
                <div className="text-xs font-mono text-purple-900 mb-1 font-bold">{key}</div>
                {error && <div className="text-xs text-red-700 font-bold">{error}</div>}
                {text && <pre className="bg-white border border-purple-700 rounded p-3 font-mono text-base text-black max-h-64 overflow-y-auto focus:outline-blue-500" tabIndex={0}>{text}</pre>}
                {!text && !error && <div className="text-xs text-gray-700">No prompt found for this key.</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mb-2">
        <h4 className="font-bold text-blue-900 mb-1 text-base">Inputs</h4>
        <table className="w-full text-xs border-2 border-blue-700 rounded mb-2 bg-white">
          <thead>
            <tr className="bg-blue-200">
              <th className="text-left px-2 py-1 font-bold text-blue-900">UI Label</th>
              <th className="text-left px-2 py-1 font-bold text-blue-900">Backend Field</th>
              <th className="text-left px-2 py-1 font-bold text-blue-900">Prompt Var</th>
            </tr>
          </thead>
          <tbody>
            {phase.inputs.map((input: StageInputOutput, i: number) => (
              <tr key={i} className="border-t border-blue-200">
                <td className="px-2 py-1 text-blue-900 font-medium">{input.label}</td>
                <td className="px-2 py-1 text-blue-900">{input.field}</td>
                <td className="px-2 py-1 text-blue-900">{input.prompt_var || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-2">
        <h4 className="font-bold text-green-900 mb-1 text-base">Outputs</h4>
        <table className="w-full text-xs border-2 border-green-700 rounded mb-2 bg-white">
          <thead>
            <tr className="bg-green-200">
              <th className="text-left px-2 py-1 font-bold text-green-900">UI Label</th>
              <th className="text-left px-2 py-1 font-bold text-green-900">Backend Field</th>
              <th className="text-left px-2 py-1 font-bold text-green-900">Prompt Var</th>
            </tr>
          </thead>
          <tbody>
            {phase.outputs.map((output: StageInputOutput, i: number) => (
              <tr key={i} className="border-t border-green-200">
                <td className="px-2 py-1 text-green-900 font-medium">{output.label}</td>
                <td className="px-2 py-1 text-green-900">{output.field}</td>
                <td className="px-2 py-1 text-green-900">{output.prompt_var || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-2">
        <h4 className="font-bold text-blue-900 mb-1 text-base">User Actions</h4>
        <ul className="list-disc ml-6 text-xs text-gray-900">
          {(phase.actions ?? []).map((action, i) => <li key={i}>{action}</li>)}
        </ul>
      </div>
      <div className="mb-2">
        <h4 className="font-bold text-orange-900 mb-1 text-base">LLM Orchestration Flow</h4>
        {Array.isArray(phase.orchestration) && phase.orchestration.length > 0 ? (
          <ol className="list-decimal ml-6 text-xs space-y-1 text-gray-900">
            {phase.orchestration.map((step: OrchestrationStep, i: number) => (
              <li key={i}>
                <span className="font-mono bg-orange-200 text-orange-900 px-2 py-0.5 rounded mr-1 border border-orange-700 font-bold">{step.function}</span>
                <span className="font-mono bg-purple-200 text-purple-900 px-2 py-0.5 rounded mr-1 border border-purple-700 font-bold">{step.prompt}</span>
                <span className="font-mono bg-green-200 text-green-900 px-2 py-0.5 rounded border border-green-700 font-bold">→ {step.output}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-xs text-gray-900">No orchestration for this phase.</div>
        )}
      </div>
    </div>
  );
}

export default function LifecyclePageClient() {
  const [lifecycle, setLifecycle] = useState<Stage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchLifecycleMap()
      .then(setLifecycle)
      .catch(() => setError('Failed to load lifecycle map'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading lifecycle map...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!lifecycle) return <div className="p-8 text-center text-gray-400">No lifecycle data found.</div>;

  // Show BYOI as entry point
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Lifecycle Visualizer (Static)</h1>
      <div className="mb-6">
        <div className="flex flex-row items-center gap-4 mb-2">
          <div className="bg-blue-100 text-blue-900 px-3 py-1 rounded font-bold">System Generated</div>
          <div className="bg-green-100 text-green-900 px-3 py-1 rounded font-bold">AI Generated</div>
          <div className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded font-bold">BYOI (Bring Your Own Idea)</div>
          <span className="text-lg">→</span>
          <div className="bg-purple-100 text-purple-900 px-3 py-1 rounded font-bold">Deep Dive</div>
        </div>
        <div className="text-xs text-gray-500 mb-2">All entry points converge at Deep Dive. Each phase below shows its full prompt, input/output mapping, and user actions.</div>
      </div>
      {lifecycle.map((phase: Stage, idx: number) => (
        <PhaseDetails key={phase.stage || idx} phase={phase} />
      ))}
    </div>
  );
} 