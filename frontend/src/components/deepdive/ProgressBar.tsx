import React from 'react';

interface ProgressBarProps {
  progress: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showPercentage?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  progress, 
  max = 100, 
  className = "",
  barClassName = "bg-blue-600",
  showPercentage = false,
  height = 'md'
}: ProgressBarProps) {
  const percentage = Math.min((progress / max) * 100, 100);
  
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClasses[height]}`}>
        <div 
          className={`${barClassName} ${heightClasses[height]} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}