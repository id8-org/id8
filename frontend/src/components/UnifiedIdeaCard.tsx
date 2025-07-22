import React, { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Idea, Stage } from "@/types/idea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { GlobalActionsDropdown } from "./GlobalActionsDropDown";

export interface UnifiedIdeaCardProps {
  idea: Idea;
  onClick?: () => void;
  className?: string;
}

export interface DeepDiveStage {
  overall_score?: number;
  market_opportunity?: {
    scores?: { product_market_fit?: number };
  };
  execution_capability?: {
    scores?: { technical_feasibility?: number };
  };
  business_viability?: {
    scores?: { profitability_potential?: number };
  };
  strategic_alignment_risks?: {
    scores?: { regulatory_and_external_risks?: number };
  };
}


const getSourceTypeLabel = (type?: string | null) => {
  switch (type) {
    case 'byoi': return 'BYOI';
    case 'system': return 'System Generated';
    case 'madlib': return 'AI Generated';
    case 'not_set':
    case undefined:
    case null:
      return 'Not Set';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Not Set';
  }
};

const displayValue = (val?: number | null) =>
  val != null ? val : '\u2014';

const getStageColor = (stage: Stage) => {
  switch (stage) {
    case 'suggested': return 'bg-blue-100 text-blue-700';
    case 'deep-dive': return 'bg-purple-100 text-purple-700';
    case 'iterating': return 'bg-orange-100 text-orange-700';
    case 'considering': return 'bg-green-100 text-green-700';
    case 'closed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getStageLabel = (stage: Stage) => {
  switch (stage) {
    case 'suggested': return 'Suggested';
    case 'deep-dive': return 'Deep Dive';
    case 'iterating': return 'Iterating';
    case 'considering': return 'Considering';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
};

const mapStatusToStage = (status: string): Stage => {
  switch (status) {
    case 'deep_dive':
      return 'deep-dive';
    case 'iterating':
      return 'iterating';
    case 'considering':
      return 'considering';
    case 'closed':
      return 'closed';
    default:
      return 'suggested';
  }
};

const cleanText = (text: string) => text.replace(/\.\.\.$/, '');

const UnifiedIdeaCard: React.FC<UnifiedIdeaCardProps> = ({
  idea,
  onClick,
  className,
}) => {
  const [showSuggestedModal, setShowSuggestedModal] = useState(false);
  // Always use status if present, fallback to currentStage
  const currentStage: Stage = mapStatusToStage(idea.status || idea.currentStage || 'suggested');

  // Helper: Render suggested data for modal/popover
  const renderSuggestedData = () => (
    <div className="space-y-1">
      {idea.problem_statement && (
        <div className="text-xs text-gray-600 mb-1 line-clamp-2">
          <span className="font-medium">Problem:</span> {idea.problem_statement}
        </div>
      )}
      {(idea.elevatorPitch || idea.elevator_pitch) && (
        <div className="text-xs text-gray-600 mb-1 line-clamp-2">
          <span className="font-medium">Elevator Pitch:</span> {idea.elevatorPitch || idea.elevator_pitch}
        </div>
      )}
      {idea.scope_commitment && (
        <div className="text-xs text-gray-600 mb-1 line-clamp-2">
          <span className="font-medium">MVP Scope:</span> {idea.scope_commitment}
        </div>
      )}
      {idea.differentiator && (
        <div className="text-xs text-gray-600 mb-1 line-clamp-2">
          <span className="font-medium">Differentiator:</span> {idea.differentiator}
        </div>
      )}
      {idea.evidence && (
        <div className="text-xs text-gray-600 mb-1 line-clamp-2">
          <span className="font-medium">Evidence:</span> {idea.evidence}
        </div>
      )}
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <>
      <Card
        className={`relative rounded-xl shadow bg-white pb-3 pl-3 pr-3 mb-2 flex flex-col min-h-[180px] w-full max-w-[360px] border border-slate-200 hover:shadow-lg transition-all group cursor-pointer ${className || ''}`}
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-label="Open idea modal"
      >
        {/* Header - Always visible */}
        <div className="flex items-center justify-between mb-0 mt-0 pt-0">
        <div className="font-bold text-base text-blue-900 leading-tight line-clamp-2 hover:underline mt-2 max-w-[220px]">
            {idea.hook
              ? `${cleanText(idea.title)}: ${cleanText(idea.hook)}`
              : cleanText(idea.title)}
          </div>
          {idea.idea_number && (
            <span className="bg-yellow-100 text-yellow-800 rounded-full px-1.5 py-0.5 text-xs font-bold ml-2">#{idea.idea_number}</span>
          )}
        </div>

        {/* Global Actions Dropdown */}
        <div className="absolute top-2 right-2 z-10">
          <GlobalActionsDropdown onAction={(key) => {
            // handle action here (e.g., open edit modal, export, etc.)
            console.log("Action:", key);
          }} />
        </div>

        {/* Stage badge - Always visible */}
        <div className="flex flex-wrap gap-1 mb-1 mt-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStageColor(currentStage)}`}>
            {getStageLabel(currentStage)}
          </span>
        </div>

        {/* Core metrics - Always visible */}
        <div className="flex flex-wrap gap-1 mb-1">
          <span className="bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Score: {displayValue(idea.score ?? idea.overallScore)}</span>
          <span className="bg-green-100 text-green-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Effort: {displayValue(idea.mvp_effort ?? idea.effort)}</span>
          <span className="bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[10px] font-medium">{getSourceTypeLabel(idea.source_type)}</span>
          {idea.type && (
            <span className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize">{idea.type.replace('_', ' ')}</span>
          )}
        </div>

        {/* Baseline info for all stages */}
        {idea.problem_statement && (
          <div className="text-xs text-gray-600 mb-1 line-clamp-2">
            <span className="font-medium">Problem:</span> {idea.problem_statement}
          </div>
        )}
        {(idea.elevatorPitch || idea.elevator_pitch) && (
          <div className="text-xs text-gray-600 mb-1 line-clamp-2">
            <span className="font-medium">Elevator Pitch:</span> {idea.elevatorPitch || idea.elevator_pitch}
          </div>
        )}

        {/* Deep Dive summary for Deep Dive stage */}
        {currentStage === 'deep-dive' && (
          idea.deep_dive && Object.keys(idea.deep_dive).length > 0 ? (
            <div className="mt-2">
              {idea.deep_dive?.overall_score !== undefined && (
                <div className="text-xs font-semibold text-blue-700 mt-1 mb-1">
                  Deep Dive Score: <span className="text-blue-900">{idea.deep_dive.overall_score}/100</span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {idea.deep_dive['market_opportunity']?.scores && (
                  <span className="bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Market: {idea.deep_dive['market_opportunity'].scores.product_market_fit ?? '—'}</span>
                )}
                {idea.deep_dive['execution_capability']?.scores && (
                  <span className="bg-orange-50 text-orange-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Execution: {idea.deep_dive['execution_capability'].scores.technical_feasibility ?? '—'}</span>
                )}
                {idea.deep_dive['business_viability']?.scores && (
                  <span className="bg-green-50 text-green-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Viability: {idea.deep_dive['business_viability'].scores.profitability_potential ?? '—'}</span>
                )}
                {idea.deep_dive['strategic_alignment_risks']?.scores && (
                  <span className="bg-purple-50 text-purple-700 rounded px-1.5 py-0.5 text-[10px] font-medium">Risk: {idea.deep_dive['strategic_alignment_risks'].scores.regulatory_and_external_risks ?? '—'}</span>
                )}
              </div>
            </div>
          ) : idea.deep_dive_requested ? (
            <div className="flex items-center gap-2 text-xs text-blue-600 mt-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" /> Deep Dive in progress...</div>
          ) : (
            <div className="text-xs text-red-600 mt-2">No deep dive data available.</div>
          )
        )}

        {/* Timestamp - Always visible */}
        {idea.created_at && (
          <div className="text-[8px] text-gray-400 mt-auto pt-1">
            {new Date(idea.created_at).toLocaleDateString()}
          </div>
        )}
      </Card>
      {/* Modal for viewing suggested data from deep-dive or later stages */}
      <Dialog open={showSuggestedModal} onOpenChange={setShowSuggestedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggested Stage Data</DialogTitle>
          </DialogHeader>
          {renderSuggestedData()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UnifiedIdeaCard;