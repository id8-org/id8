import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, className = "", ...props }, ref) => (
    <div className={`w-full bg-gray-200 rounded h-2 ${className}`} ref={ref} {...props}>
      <div
        className="bg-blue-600 h-2 rounded"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
);
Progress.displayName = "Progress"; 