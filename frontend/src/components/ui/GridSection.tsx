import React from 'react';

interface GridSectionProps {
  children: React.ReactNode;
  cols?: number;
  className?: string;
}

export const GridSection: React.FC<GridSectionProps> = ({ children, cols = 2, className }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4 ${className || ''}`}>
    {children}
  </div>
); 