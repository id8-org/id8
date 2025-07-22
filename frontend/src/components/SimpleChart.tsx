import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'progress';
  maxValue?: number;
  height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ 
  data, 
  title, 
  type, 
  maxValue, 
  height = 200 
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value));

  const getColor = (index: number, defaultColor?: string) => {
    if (defaultColor) return defaultColor;
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500'
    ];
    return colors[index % colors.length];
  };

  if (type === 'bar') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="space-y-2" style={{ height }}>
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="text-xs text-gray-600 w-16 truncate" title={item.label}>
                {item.label}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getColor(index, item.color)}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
              <div className="text-xs font-semibold text-gray-700 w-8 text-right">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'progress') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">{item.label}</span>
                <span className="text-xs font-semibold text-gray-700">{item.value}/{max}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getColor(index, item.color)}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}; 