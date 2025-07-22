import React from 'react';
import { Tooltip } from './tooltip';

interface FieldWithPlaceholderProps {
  value?: string;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const FieldWithPlaceholder: React.FC<FieldWithPlaceholderProps> = ({
  value,
  placeholder = '—',
  maxLength = 80,
  className = '',
}) => {
  const displayValue = value && value.trim() ? value.trim() : placeholder;
  const isTruncated = displayValue.length > maxLength;
  const shown = isTruncated ? displayValue.slice(0, maxLength).trimEnd() + '…' : displayValue;

  return isTruncated ? (
    <Tooltip content={displayValue}>
      <span className={className} tabIndex={0} style={{ cursor: 'pointer', outline: 'none' }}>{shown}</span>
    </Tooltip>
  ) : (
    <span className={className}>{shown}</span>
  );
}; 