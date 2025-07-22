import React from 'react';

interface FlexSectionProps {
  children: React.ReactNode;
  className?: string;
  align?: string;
  justify?: string;
  gap?: string;
}

export const FlexSection: React.FC<FlexSectionProps> = ({ children, className, align = 'center', justify = 'between', gap = '4' }) => (
  <div className={`flex items-${align} justify-${justify} gap-${gap} ${className || ''}`}>
    {children}
  </div>
); 