import React from 'react';

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, className, labelClassName, valueClassName }) => (
  <div className={`flex items-center justify-between py-1 ${className || ''}`}>
    <span className={`text-xs text-gray-500 ${labelClassName || ''}`}>{label}</span>
    <span className={`text-sm font-medium text-gray-900 ${valueClassName || ''}`}>{value}</span>
  </div>
); 