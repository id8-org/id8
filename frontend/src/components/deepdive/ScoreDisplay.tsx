import React from 'react';
import { getScoreColor } from '@/lib/deepdive-utils';

interface ScoreDisplayProps {
  label: string;
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreDisplay({ 
  label, 
  score, 
  maxScore = 10, 
  size = 'md',
  className = ""
}: ScoreDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const scoreSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl', 
    lg: 'text-3xl'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className={`font-semibold text-gray-700 ${sizeClasses[size]}`}>
        {label}
      </span>
      <span className={`font-bold ${getScoreColor((score / maxScore) * 100)} ${scoreSizeClasses[size]}`}>
        {score}/{maxScore}
      </span>
    </div>
  );
}