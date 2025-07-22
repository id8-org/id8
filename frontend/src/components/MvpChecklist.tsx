import React, { useState } from 'react';
import Confetti from 'react-confetti';
import { CheckCircle } from 'lucide-react';
import type { Idea } from '@/types/idea';

interface MvpChecklistProps {
  idea: Idea;
  onCheckStep?: (ideaId: string, idx: number) => void;
  onReorderSteps?: (ideaId: string, fromIdx: number, toIdx: number) => void;
}

export const MvpChecklist: React.FC<MvpChecklistProps> = ({ idea, onCheckStep, onReorderSteps }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);

  const steps = idea.mvp_steps || [];
  const progress = idea.mvp_steps_progress || [];
  const completed = progress.filter(Boolean).length;
  const percent = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

  function handleCheck(idx: number) {
    if (onCheckStep) onCheckStep(idea.id, idx);
    if (completed + 1 === steps.length) setShowConfetti(true);
  }

  function handleDragStart(idx: number) {
    setDraggedStep(idx);
  }
  function handleDrop(idx: number) {
    if (onReorderSteps && draggedStep !== null && draggedStep !== idx) {
      onReorderSteps(idea.id, draggedStep, idx);
    }
    setDraggedStep(null);
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-blue-900">MVP Progress</span>
        <span className="text-xs text-gray-500">{completed} of {steps.length} steps</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden ml-2">
          <div className="h-2 rounded-full transition-all duration-700 ease-in-out bg-green-400" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
      <ul className="space-y-2">
        {steps.map((step, idx) => (
          <li
            key={idx}
            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${draggedStep === idx ? 'bg-blue-100' : 'bg-gray-50'}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDrop={() => handleDrop(idx)}
            onDragOver={e => e.preventDefault()}
          >
            <input
              type="checkbox"
              checked={!!progress[idx]}
              onChange={() => handleCheck(idx)}
              className="accent-green-500 w-5 h-5"
              aria-label={`Mark step ${step} as complete`}
            />
            <span className={`flex-1 ${progress[idx] ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step}</span>
            <span className="text-xs text-gray-400">Step {idx + 1}</span>
          </li>
        ))}
      </ul>
      {showConfetti && <Confetti numberOfPieces={200} recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
      {percent === 100 && (
        <div className="mt-2 text-green-700 font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5" /> MVP Complete! Ready for next steps.
        </div>
      )}
    </div>
  );
}; 