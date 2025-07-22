"use client";
import React, { useEffect, useState } from "react";
// Use Card, Alert from shadcn/ui or fallback to simple divs if not available

const BACKEND_URL = "http://localhost:8000"; // TODO: Use env/config for prod

export interface StageInputOutput {
  label: string;
  field: string;
  prompt_var?: string;
}

export interface OrchestrationStep {
  function: string;
  prompt: string;
  output: string;
}

export interface Stage {
  stage: string;
  inputs: StageInputOutput[];
  outputs: StageInputOutput[];
  prompt?: string;
  description?: string;
  api_route?: string;
  db_tables?: string[];
  ui_trigger?: string;
  actions?: string[];
  orchestration?: OrchestrationStep[];
}

export const fetchLifecycleMap = async (): Promise<Stage[]> => {
  const res = await fetch(`${BACKEND_URL}/lifecycle-map`);
  if (!res.ok) throw new Error("Failed to fetch lifecycle map");
  const data = await res.json();
  return data.lifecycle || data;
};

// Prompt text mapping for each main prompt (for demo; in production, fetch from backend or keep in sync)
const PROMPT_TEXTS: Record<string, string> = {
  IDEA_PROMPT: `You are an experienced entrepreneur and technologist with expertise in:\n- Product development and MVP creation\n- Business strategy and market analysis\n- Technology implementation and scaling\n- User research and product-market fit\n- Startup operations and growth\n- A preference for practical, fundable business ideas\n\nYour mission: generate 1–2 extremely highly-tailored, non-obvious elevator pitches for how trending GitHub technologies could be applied to solve real-world problems.\n...\n(see backend/prompts.py for full text)`,
  DEEP_DIVE_PROMPT: `You are a founder-operator and strategic investor combined — part hacker, part realist. I'm giving you one idea from a previous brainstorm. Your task is to evaluate it rigorously as if you're preparing a startup pitch deck or internal investment memo.\n...\n(see backend/prompts.py for full text)`,
  MARKET_SNAPSHOT_PROMPT: `Analyze this startup idea and provide a comprehensive market snapshot:\n...\n(see backend/prompts.py for full text)`,
  LENS_INSIGHT_PROMPT_FOUNDER: `You are a brutally honest founder and operator. Here is all the data so far about this idea:\n...\n(see backend/prompts.py for full text)`,
  LENS_INSIGHT_PROMPT_INVESTOR: `You are a top-tier, serious investor. Here is all the data so far about this idea:\n...\n(see backend/prompts.py for full text)`,
  LENS_INSIGHT_PROMPT_CUSTOMER: `You are a demanding, honest customer. Here is all the data so far about this idea:\n...\n(see backend/prompts.py for full text)`,
  VC_THESIS_COMPARISON_PROMPT: `Compare this startup idea to {vc_firm}'s investment thesis:\n...\n(see backend/prompts.py for full text)`,
  INVESTOR_DECK_PROMPT: `You are a world-class founder and pitch deck strategist. Your task is to generate a complete, investor-grade pitch deck for the following startup idea.\n...\n(see backend/prompts.py for full text)`
};

// Sample data for modeling/demo only
const SAMPLE_STAGE_DATA: Record<string, Record<string, unknown>> = {
  suggested: {
    title: 'AI-powered Resume Builder',
    description: 'A tool that uses AI to help users create and optimize resumes.',
    user_id: 'user_123',
    vertical: 'Career',
    horizontal: 'Productivity',
  },
  deep_dive: {
    market_size: 'Large',
    competitors: 'Resume.io, Novoresume',
    unique_value: 'Real-time AI feedback',
    risks: 'Data privacy, market saturation',
  },
  iterating: {
    iteration_notes: 'Added LinkedIn import feature',
    feedback: 'Users want more templates',
    next_steps: 'Test with 20 users',
  },
  considering: {
    go_no_go: 'Go',
    rationale: 'Strong user interest, low dev cost',
    blockers: 'None',
  },
  closed: {
    outcome: 'Launched MVP',
    learnings: 'AI suggestions increased completion rate by 30%',
    next_project: 'AI-powered cover letter tool',
  },
};

// Define types for stage and injected vars
interface InjectedVar {
  label: string;
  promptVar: string;
  value: string;
}

// Add this type at the top (after imports):
interface RichField {
  value?: unknown;
  unit?: string;
  evidence?: string;
  reference?: string;
}

// Helper: get injected variables for each stage
function getInjectedVars(stage: Stage, example: Record<string, unknown>): InjectedVar[] {
  if (!Array.isArray(stage.inputs)) return [];
  return stage.inputs.map((input) => ({
    label: input.label,
    promptVar: input.prompt_var || '-',
    value: example && input.field in example ? String(example[input.field]) : '-'
  }));
}

// Add documentation for idea creation flows
const IDEA_CREATION_FLOWS = [
  {
    key: 'system',
    label: 'System Generated Ideas',
    description: 'Ideas generated automatically by the system based on trending GitHub repositories and pre-defined criteria. Inputs are repo metadata and system context. Outputs are high-quality, tailored idea objects.'
  },
  {
    key: 'ai',
    label: 'AI Generated Ideas',
    description: 'Ideas generated by the AI (LLM) using user context, repo summaries, and injected variables. Inputs include user profile, repo description, and context. Outputs are JSON idea objects with all required fields.'
  },
  {
    key: 'byoi',
    label: 'Bring Your Own Ideas',
    description: 'Ideas submitted directly by users. Inputs are user-typed idea details. Outputs are user-owned idea objects, which can be further analyzed or deep-dived by the AI.'
  }
];

// Helper: determine which flow applies for a given stage (for demo, use stage key)
function getFlowForStage(stageKey: string): string {
  if (stageKey === 'suggested') return 'system';
  if (stageKey === 'deep_dive' || stageKey === 'iterating' || stageKey === 'considering') return 'ai';
  if (stageKey === 'byoi') return 'byoi';
  return 'ai';
}

const fetchActualDataForStage = async (stage: string): Promise<Record<string, unknown>> => {
  try {
    const res = await fetch(`${BACKEND_URL}/ideas/api/lifecycle-data/${stage}`);
    if (!res.ok) throw new Error(`Failed to fetch backend data for stage: ${stage}`);
    return await res.json() as Record<string, unknown>;
  } catch (e) {
    if (e instanceof Error) {
      return { error: e.message };
    }
    return { error: "Unknown error" };
  }
};

export default function LifecycleVisualizer() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actualData, setActualData] = useState<Record<string, Record<string, unknown>>>({});
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAllActualData = async (stageList: Stage[]): Promise<void> => {
    const data: Record<string, Record<string, unknown>> = {};
    for (const stage of stageList) {
      data[stage.stage] = await fetchActualDataForStage(stage.stage);
    }
    setActualData(data);
  };

  const refresh = async (): Promise<void> => {
    setRefreshing(true);
    setLoading(true);
    setError(null);
    try {
      const map = await fetchLifecycleMap();
      setStages(map);
      await fetchAllActualData(map);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div className="p-8 text-center">Loading lifecycle map...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="w-full overflow-x-auto p-4">
      {/* Documentation Section */}
      <div className="max-w-5xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Idea Creation Flows</h2>
        <ul className="space-y-2">
          {IDEA_CREATION_FLOWS.map(flow => (
            <li key={flow.key} className="bg-gray-50 border-l-4 border-blue-700 p-4 rounded">
              <div className="font-bold text-blue-800">{flow.label}</div>
              <div className="text-gray-700 text-sm mt-1">{flow.description}</div>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-xs text-gray-500">
          <span className="font-bold">Legend:</span> Each stage below is annotated with its idea creation flow. Inputs, outputs, and process may differ by flow.
        </div>
      </div>
      <div className="flex items-center justify-between mb-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Lifecycle Flow</h1>
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded shadow hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {/* Visual LLM Orchestration Flow */}
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-4">
          {stages.map((stage, idx) => (
            <React.Fragment key={stage.stage}>
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-blue-700 text-white w-10 h-10 flex items-center justify-center font-bold mb-1">
                  {idx + 1}
                </div>
                <div className="text-xs font-semibold text-blue-900 text-center max-w-[120px]">{stage.stage}</div>
                <div className="text-[10px] text-purple-700 text-center max-w-[120px] mt-1">{(stage.prompt || '').split(',')[0]}</div>
              </div>
              {idx < stages.length - 1 && (
                <svg width="40" height="24" className="mx-2" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 12h36m0 0l-6-6m6 6l-6 6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-2">LLM orchestration: left to right</div>
      </div>
      {/* Horizontal flow of stages */}
      <div className="flex flex-col gap-6 min-w-[1400px] max-w-fit mx-auto">
        {/* Row 0: Flow Type Annotation */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const flowKey = getFlowForStage(stage.stage);
            const flow = IDEA_CREATION_FLOWS.find(f => f.key === flowKey);
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className={`rounded-xl px-3 py-2 mb-2 text-xs font-bold ${flowKey === 'system' ? 'bg-blue-100 text-blue-800' : flowKey === 'ai' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>Flow: {flow?.label}</div>
              </div>
            );
          })}
        </div>
        {/* Row 1: Inputs */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const example = (actualData[stage.stage]?.example ?? {}) as Record<string, unknown>;
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className="bg-blue-50 border border-blue-300 rounded-xl p-2">
                  <h3 className="font-bold text-blue-800 mb-1 text-sm">Inputs</h3>
                  <table className="w-full mb-2 text-xs border border-blue-400 rounded-lg">
                    <thead>
                      <tr className="bg-blue-200">
                        <th className="text-left px-2 py-1 font-bold text-blue-900">Input Name</th>
                        <th className="text-left px-2 py-1 font-bold text-blue-900">Prompt Var</th>
                        <th className="text-left px-2 py-1 font-bold text-blue-900">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(stage.inputs) && stage.inputs.map((input: {label: string, field: string, prompt_var?: string}, i: number) => (
                        <tr key={i} className="border-t border-blue-100">
                          <td className="px-2 py-1 text-blue-900 font-medium">{input.label}</td>
                          <td className="px-2 py-1 text-blue-900">{input.prompt_var || '-'}</td>
                          <td className="px-2 py-1 text-blue-900">{example && input.field in example ? String(example[input.field]) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        {/* Row 2: Prompt Verbiage */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const mainPromptKey = (stage.prompt || '').split(',')[0].trim();
            const promptText = PROMPT_TEXTS[mainPromptKey] || '(Prompt text not found)';
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className="mb-2">
                  <h4 className="font-bold text-purple-800 mb-1 text-base">Prompt Verbiage</h4>
                  <pre className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-900 whitespace-pre-wrap overflow-x-auto max-w-full" style={{maxHeight: 320, minHeight: 120}}>
                    {promptText}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
        {/* Row 3: Injected Variables */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const example = (actualData[stage.stage]?.example ?? {}) as Record<string, unknown>;
            const injectedVars = getInjectedVars(stage, example);
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className="bg-indigo-50 border border-indigo-400 rounded-xl p-2">
                  <h3 className="font-bold text-indigo-800 mb-1 text-sm">Injected Variables</h3>
                  <table className="w-full mb-2 text-xs border border-indigo-400 rounded-lg">
                    <thead>
                      <tr className="bg-indigo-200">
                        <th className="text-left px-2 py-1 font-bold text-indigo-900">Prompt Var</th>
                        <th className="text-left px-2 py-1 font-bold text-indigo-900">Value Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {injectedVars.map((v: {promptVar: string, value: string}, i: number) => (
                        <tr key={i} className="border-t border-indigo-100">
                          <td className="px-2 py-1 text-indigo-900 font-medium">{v.promptVar}</td>
                          <td className="px-2 py-1 text-indigo-900">{v.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        {/* Row 4: Outputs */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const example = (actualData[stage.stage]?.example ?? {}) as Record<string, unknown>;
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className="bg-green-50 border border-green-400 rounded-xl p-2">
                  <h3 className="font-bold text-green-800 mb-1 text-sm">Outputs</h3>
                  <table className="w-full mb-2 text-xs border border-green-500 rounded-lg">
                    <thead>
                      <tr className="bg-green-200">
                        <th className="text-left px-2 py-1 font-bold text-green-900">Output Name</th>
                        <th className="text-left px-2 py-1 font-bold text-green-900">Prompt Var</th>
                        <th className="text-left px-2 py-1 font-bold text-green-900">Sample Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(stage.outputs) && stage.outputs.map((output: {label: string, field: string, prompt_var?: string}, i: number) => (
                        <tr key={i} className="border-t border-green-100">
                          <td className="px-2 py-1 text-green-900 font-medium">{output.label}</td>
                          <td className="px-2 py-1 text-green-900">{output.prompt_var || '-'}</td>
                          <td className="px-2 py-1 text-green-900">{example && output.field in example ? String(example[output.field]) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        {/* Row 5: Sample Output (Rich, Phase-Appropriate) */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => {
            const example = (actualData[stage.stage]?.example ?? {}) as Record<string, unknown>;
            return (
              <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
                <div className="bg-white border border-yellow-400 rounded-xl p-2 mb-2">
                  <h3 className="font-bold text-yellow-800 mb-1 text-sm">Sample Output (Phase-Appropriate)</h3>
                  <table className="w-full mb-2 text-xs border border-yellow-400 rounded-lg">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className="text-left px-2 py-1 font-bold text-yellow-900">Field</th>
                        <th className="text-left px-2 py-1 font-bold text-yellow-900">Value</th>
                        <th className="text-left px-2 py-1 font-bold text-yellow-900">Unit</th>
                        <th className="text-left px-2 py-1 font-bold text-yellow-900">Evidence</th>
                        <th className="text-left px-2 py-1 font-bold text-yellow-900">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(stage.outputs) && stage.outputs.map((output: {label: string, field: string}, i: number) => {
                        const val = example && output.field in example ? example[output.field] : undefined;
                        // In the Sample Output row, replace the type guard and mapping:
                        const isRich = (v: unknown): v is RichField =>
                          v !== null && typeof v === 'object' && (
                            'value' in v || 'unit' in v || 'evidence' in v || 'reference' in v
                          );
                        if (isRich(val)) {
                          return (
                            <tr key={i} className="border-t border-yellow-100">
                              <td className="px-2 py-1 text-yellow-900 font-medium">{output.label}</td>
                              <td className="px-2 py-1 text-yellow-900">{val.value !== undefined ? String(val.value) : '-'}</td>
                              <td className="px-2 py-1 text-yellow-900">{val.unit || '-'}</td>
                              <td className="px-2 py-1 text-yellow-900">
                                {val.evidence ? (
                                  <span title={val.evidence} className="underline decoration-dotted cursor-help">Evidence</span>
                                ) : '-'}
                              </td>
                              <td className="px-2 py-1 text-yellow-900">
                                {val.reference ? (
                                  <a href={val.reference} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">Ref</a>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        } else {
                          // Primitive fallback
                          return (
                            <tr key={i} className="border-t border-yellow-100">
                              <td className="px-2 py-1 text-yellow-900 font-medium">{output.label}</td>
                              <td className="px-2 py-1 text-yellow-900" colSpan={4}>{val !== undefined ? String(val) : '-'}</td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        {/* Row 6: Sample Data (for Modeling Only) */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => (
            <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
              <div className="bg-yellow-50 border border-yellow-400 rounded-xl p-2 mb-2">
                <h3 className="font-bold text-yellow-800 mb-1 text-sm">Sample Data (for Modeling Only)</h3>
                <pre className="bg-yellow-100 rounded p-2 text-xs text-yellow-900 overflow-x-auto">
                  {JSON.stringify(SAMPLE_STAGE_DATA[stage.stage] || {}, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
        {/* Row 7: Backend Data */}
        <div className="flex flex-row gap-8 items-start">
          {stages.map((stage) => (
            <div key={stage.stage} className="min-w-[520px] max-w-[520px]">
              <div className="bg-gray-50 border border-gray-300 rounded-xl p-2">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">Actual (Backend Data)</h3>
                {actualData[stage.stage] ? (
                  <pre className="bg-gray-100 rounded p-2 text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(actualData[stage.stage], null, 2)}
                  </pre>
                ) : (
                  <div className="text-gray-400 text-xs">No data loaded.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/*
        In production, use a proxy or env variable for the backend URL.
        If you see CORS errors, ensure FastAPI has CORS enabled for your website domain.
      */}
    </div>
  );
} 