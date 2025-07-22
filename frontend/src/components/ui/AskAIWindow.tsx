import React, { useState, useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import {
  createProfileQnA, getProfileQnA, ProfileQnA,
  createIdeaQnA, getIdeaQnA, IdeaQnA,
  createVersionQnA, getVersionQnA, VersionQnA,
  Idea
} from "../../lib/api";
import { X, Sparkles, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AskAIWindowProps = {
  open: boolean;
  onClose: () => void;
  idea?: { id: string } | string;
  version?: number;
  anchorRef?: React.RefObject<HTMLElement>;
};

export default function AskAIWindow({ open, onClose, idea, version, anchorRef }: AskAIWindowProps) {
  const [question, setQuestion] = useState("");
  const [contextFields, setContextFields] = useState<string[]>(["profile"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [history, setHistory] = useState<(ProfileQnA | IdeaQnA | VersionQnA)[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Determine context type
  const contextType = version !== undefined && idea ? "version" : idea ? "idea" : "profile";
  const ideaId = typeof idea === "string" ? idea : idea?.id;

  // Dynamically build available context options for idea
  const availableIdeaSections = useMemo(() => {
    // Type guard: check if idea is an object with more than just id
    const isIdeaObj = (val: any): val is Idea => val && typeof val === 'object' && 'title' in val;
    if (!idea || !isIdeaObj(idea)) return [];
    const i = idea;
    const sections = [];
    // Core fields
    if (i.title) sections.push({ label: 'Title', value: 'title' });
    if (i.hook) sections.push({ label: 'Hook', value: 'hook' });
    if (i.value) sections.push({ label: 'Value Proposition', value: 'value' });
    if (i.evidence) sections.push({ label: 'Evidence', value: 'evidence' });
    if (i.differentiator) sections.push({ label: 'Differentiator', value: 'differentiator' });
    
    // Iteration/business fields
    if (i.business_model) sections.push({ label: 'Business Model', value: 'business_model' });
    if (i.market_positioning) sections.push({ label: 'Market Positioning', value: 'market_positioning' });
    if (i.revenue_streams) sections.push({ label: 'Revenue Streams', value: 'revenue_streams' });
    if (i.target_audience) sections.push({ label: 'Target Audience', value: 'target_audience' });
    if (i.competitive_advantage) sections.push({ label: 'Competitive Advantage', value: 'competitive_advantage' });
    if (i.go_to_market_strategy) sections.push({ label: 'Go-to-Market Strategy', value: 'go_to_market_strategy' });
    if (i.success_metrics) sections.push({ label: 'Success Metrics', value: 'success_metrics' });
    if (i.risk_factors) sections.push({ label: 'Risk Factors', value: 'risk_factors' });
    if (i.iteration_notes) sections.push({ label: 'Iteration Notes', value: 'iteration_notes' });
    // Deep dive sections
    if (i.deep_dive && Array.isArray(i.deep_dive.sections)) {
      i.deep_dive.sections.forEach((s: any, idx: number) => {
        if (s && s.title && s.content) {
          sections.push({ label: `Deep Dive: ${s.title}`, value: `deep_dive_section_${idx}` });
        }
      });
    }
    // Business intelligence fields (if present)
    if (i.business_intelligence && typeof i.business_intelligence === 'object') {
      const bi = i.business_intelligence as Record<string, any>;
      if (bi.business_model) sections.push({ label: 'Business Model Canvas', value: 'business_model_canvas' });
      if (bi.roadmap) sections.push({ label: 'Roadmap', value: 'roadmap' });
      if (bi.metrics) sections.push({ label: 'Metrics', value: 'metrics' });
      if (bi.roi_projections) sections.push({ label: 'ROI Projections', value: 'roi_projections' });
      if (bi.market_snapshot) sections.push({ label: 'Market Snapshot', value: 'market_snapshot' });
      if (Array.isArray(bi.vc_comparisons) && bi.vc_comparisons.length > 0) sections.push({ label: 'VC Thesis Comparisons', value: 'vc_thesis_comparisons' });
    }
    return sections;
  }, [idea]);

  // Context options for selector
  const CONTEXT_OPTIONS = useMemo(() => {
    if (contextType === "idea" && availableIdeaSections.length > 0) {
      // Always allow profile as a context option
      return [
        ...availableIdeaSections,
        { label: "Profile", value: "profile" },
      ];
    }
    return [
      ...(contextType === "profile" ? [
        { label: "Profile", value: "profile" },
        { label: "Resume", value: "resume" },
      ] : []),
      ...(contextType === "version" ? [
        { label: "Version", value: "version" },
        { label: "Idea", value: "idea" },
        { label: "Profile", value: "profile" },
      ] : []),
    ];
  }, [contextType, availableIdeaSections]);

  // Fetch QnA history for the current context
  useEffect(() => {
    if (!open) return;
    if (contextType === "profile") {
      getProfileQnA().then(setHistory).catch(() => setHistory([]));
    } else if (contextType === "idea" && ideaId) {
      getIdeaQnA(ideaId).then(setHistory).catch(() => setHistory([]));
    } else if (contextType === "version" && ideaId && version !== undefined) {
      getVersionQnA(ideaId, version).then(setHistory).catch(() => setHistory([]));
    }
  }, [open, contextType, ideaId, version]);

  const handleContextChange = (value: string) => {
    setContextFields((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleAsk = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      let qna;
      if (contextType === "profile") {
        qna = await createProfileQnA(question, contextFields);
      } else if (contextType === "idea" && ideaId) {
        qna = await createIdeaQnA(ideaId, question, contextFields);
      } else if (contextType === "version" && ideaId && version !== undefined) {
        qna = await createVersionQnA(ideaId, version, question, contextFields);
      }
      setResponse(qna?.answer || "No answer returned.");
      setHistory((prev) => [...prev, qna]);
      setQuestion("");
    } catch (e: any) {
      setError(e.message || "Failed to get answer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && popoverRef.current) {
      setPopoverStyle({
        position: 'fixed',
        bottom: 0,
        right: 0,
        height: '50vh',
        width: '100%',
        maxWidth: 400,
        zIndex: 9999,
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        backgroundColor: 'white',
        borderTopLeftRadius: '16px',
        borderBottomLeftRadius: '16px',
        borderLeft: '1px solid rgba(0,0,0,0.07)',
        transition: 'transform 0.2s cubic-bezier(.4,0,.2,1)',
      });
    }
  }, [open]);

  if (!open) return null;

  // Determine context summary
  const contextSummary = CONTEXT_OPTIONS.filter(opt => contextFields.includes(opt.value)).map(opt => opt.label).join(', ') || 'No context selected';

  return (
    <div style={popoverStyle} ref={popoverRef} className="bg-gradient-to-br from-white via-blue-50 to-blue-100 shadow-2xl border border-blue-200 transition-transform duration-300 ease-in-out pointer-events-auto flex flex-col rounded-2xl animate-fade-in">
      <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-2 bg-white/80 sticky top-0 z-10 border-b border-blue-100 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-bold tracking-tight text-blue-900">Ask AI</h2>
        </div>
        <button
          className="text-gray-400 hover:text-blue-600 text-xl font-bold ml-4 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white/80 shadow"
          onClick={onClose}
          aria-label="Close Ask AI"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="px-2 pb-2 pt-1 flex flex-col gap-1 flex-1 overflow-y-auto max-h-[60vh]">
        <div className="text-xs text-muted-foreground mb-1">Context: <span className="font-medium">{contextSummary}</span></div>
        <div className="mb-2 flex gap-2 flex-wrap">
          {CONTEXT_OPTIONS.map((opt) => (
            <label key={opt.value} className={`flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer border ${contextFields.includes(opt.value) ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <input
                type="checkbox"
                checked={contextFields.includes(opt.value)}
                onChange={() => handleContextChange(opt.value)}
                className="accent-blue-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <textarea
          className="w-full border rounded-lg p-2 mb-2 resize-none min-h-[48px] text-sm bg-white/80 focus:ring-2 focus:ring-blue-200 transition"
          rows={2}
          placeholder="Ask anything..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          style={{ borderColor: '#c7d2fe' }}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-full disabled:opacity-50 w-full mb-2 shadow-sm hover:bg-blue-700 transition"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
        >
          {loading ? "Asking..." : "Ask"}
        </button>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {response && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg prose prose-sm max-w-none shadow-sm animate-fade-in">
            <span className="font-semibold text-blue-700">AI:</span> <span dangerouslySetInnerHTML={{ __html: marked(response) }} />
          </div>
        )}
        <h3 className="mt-4 mb-2 font-semibold text-xs text-blue-900 uppercase tracking-wider">Previous Q&A</h3>
        <div className="flex-1 overflow-y-auto border rounded-lg p-2 bg-white/70 min-h-[40px] max-h-40 shadow-inner">
          {history.length === 0 && <div className="text-gray-400 text-xs">No previous questions.</div>}
          {history.map((qna) => (
            <div key={qna.id} className="mb-3">
              <div className="text-[10px] text-gray-400">{new Date(qna.created_at).toLocaleString()}</div>
              <div className="font-medium text-xs">Q: {qna.question}</div>
              <div className="prose prose-xs max-w-none text-blue-900" dangerouslySetInnerHTML={{ __html: marked(qna.answer || "") }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Note: You need to install 'marked' for Markdown rendering: npm install marked 