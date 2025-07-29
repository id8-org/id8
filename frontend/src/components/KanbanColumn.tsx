import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Idea } from '../types/idea';

interface KanbanColumnProps {
  stage: { key: string; label: string };
  ideas: Idea[];
  analytics?: { count: number; avgScore: number; nextTip: string };
  onCardClick: (idea: Idea) => void;
  droppableId: string;
  isClosed?: boolean;
  isCollapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  ideas,
  analytics,
  onCardClick,
  droppableId,
  isClosed = false,
  isCollapsed = false,
  onCollapse,
  onExpand,
}) => {
  if (isClosed && isCollapsed) {
    return (
      <Droppable droppableId={droppableId} key={droppableId}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-col w-12 min-w-[3rem] max-w-[3rem] bg-slate-50 rounded-xl border border-slate-200 p-0 mr-2 items-center justify-center transition-all duration-300"
            onDragOver={onExpand}
          >
            <div className="flex flex-col items-center justify-center h-full py-2">
              <span className="font-semibold text-slate-700 text-xs rotate-90 whitespace-nowrap">{stage.label} ({ideas.length})</span>
              <button
                className="p-1 rounded hover:bg-slate-200 mt-2"
                onClick={onExpand}
                aria-label="Expand Closed Column"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  }

  return (
    <div key={stage.key} className="flex flex-col flex-1 min-w-[18rem] max-w-[22rem] bg-slate-50 rounded-xl border border-slate-200 p-2 mr-2">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-700">{stage.label} ({ideas.length})</span>
        {isClosed && (
          <button
            className="p-1 rounded hover:bg-slate-200"
            onClick={onCollapse}
            aria-label="Collapse Closed Column"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
      </div>
      {/* Only render cards if not collapsed */}
      {(!isClosed || !isCollapsed) ? (
        <Droppable droppableId={droppableId} key={droppableId}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex flex-col gap-3 min-h-[200px] rounded-xl p-2 transition-all duration-200 ${snapshot.isDraggingOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
            >
              {ideas.map((idea, idx) => (
                <KanbanCard
                  key={idea.id}
                  idea={idea}
                  index={idx}
                  onClick={onCardClick}
                  loading={stage.key === 'deep_dive' && idea.deep_dive_requested && !idea.deep_dive}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : null}
    </div>
  );
};

export default KanbanColumn; 