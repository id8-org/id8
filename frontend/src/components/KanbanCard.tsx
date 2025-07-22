import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import UnifiedIdeaCard from './UnifiedIdeaCard';
import type { Idea } from '../types/idea';
import { Loader2 } from 'lucide-react';

interface KanbanCardProps {
  idea: Idea;
  index: number;
  onClick: (idea: Idea) => void;
  loading?: boolean;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ idea, index, onClick, loading }) => (
  <Draggable draggableId={idea.id} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-400 relative' : 'relative'}
        style={{ position: 'relative' }}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg cursor-not-allowed">
            <Loader2 className="animate-spin w-10 h-10 text-blue-600 mb-2" />
            <span className="text-blue-900 font-semibold text-sm">Deep Dive in Progress...</span>
          </div>
        )}
        <div className={loading ? 'pointer-events-none opacity-60' : ''} aria-hidden={loading}>
          <UnifiedIdeaCard
            idea={idea}
            onClick={() => onClick(idea)}
          />
        </div>
      </div>
    )}
  </Draggable>
);

export default KanbanCard; 