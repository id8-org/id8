import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a stoplight color class for effort values.
 * Green: effort <= 3
 * Yellow: 4 <= effort <= 6
 * Red: effort >= 7
 */
export function getEffortColor(effort: number): string {
  if (effort <= 3) return 'bg-green-500 text-white';
  if (effort <= 6) return 'bg-yellow-500 text-white';
  return 'bg-red-500 text-white';
}

// Converts a string from camelCase to snake_case
export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
}

// Converts a string from snake_case to camelCase
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Recursively converts all object keys from camelCase to snake_case
export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        camelToSnake(key),
        toSnakeCase(value)
      ])
    );
  }
  return obj;
}

// Recursively converts all object keys from snake_case to camelCase
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        snakeToCamel(key),
        toCamelCase(value)
      ])
    );
  }
  return obj;
}

/**
 * Computes the slope and intercept of a simple linear regression (least squares) for points [{x, y}].
 * Returns { slope, intercept, predict(x) }
 */
export function linearRegression(points: { x: number; y: number | null }[]) {
  const filtered = points.filter(p => typeof p.y === 'number');
  const n = filtered.length;
  if (n < 2) return { slope: 0, intercept: filtered[0]?.y ?? 0, predict: (x: number) => filtered[0]?.y ?? 0 };
  const sumX = filtered.reduce((acc, p) => acc + p.x, 0);
  const sumY = filtered.reduce((acc, p) => acc + (p.y as number), 0);
  const sumXY = filtered.reduce((acc, p) => acc + p.x * (p.y as number), 0);
  const sumXX = filtered.reduce((acc, p) => acc + p.x * p.x, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = meanY - slope * meanX;
  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept
  };
}

/**
 * Computes a simple moving average for a window size (default 3).
 */
export function movingAverage(points: { x: number; y: number | null }[], window = 3) {
  const result: { x: number; y: number | null }[] = [];
  for (let i = 0; i < points.length; i++) {
    const windowPoints = points.slice(Math.max(0, i - window + 1), i + 1).filter(p => typeof p.y === 'number');
    if (windowPoints.length === 0) {
      result.push({ x: points[i].x, y: null });
    } else {
      const avg = windowPoints.reduce((acc, p) => acc + (p.y as number), 0) / windowPoints.length;
      result.push({ x: points[i].x, y: avg });
    }
  }
  return result;
}

/**
 * Computes z-scores for the y values in points. Returns array of { x, y, z }.
 */
export function zScores(points: { x: number; y: number | null }[]) {
  const ys = points.map(p => p.y).filter(y => typeof y === 'number') as number[];
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const std = Math.sqrt(ys.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ys.length);
  return points.map(p => ({ ...p, z: typeof p.y === 'number' && std > 0 ? (p.y - mean) / std : 0 }));
}

/**
 * Returns a trend label: 'Improving', 'Declining', or 'Stable' based on regression slope.
 */
export function getTrendLabel(slope: number, threshold = 0.05) {
  if (slope > threshold) return 'Improving';
  if (slope < -threshold) return 'Declining';
  return 'Stable';
}

/**
 * Safe display value that shows em dash for null/undefined values
 */
export function displayValue(val?: number | null): string | number {
  return val != null ? val : '\u2014';
}

/**
 * Get stage color classes consistently across components
 */
export function getStageColor(stage: string): string {
  switch (stage) {
    case 'suggested': return 'bg-blue-100 text-blue-700';
    case 'deep_dive': return 'bg-purple-100 text-purple-700';
    case 'iterating': return 'bg-orange-100 text-orange-700';
    case 'considering': return 'bg-green-100 text-green-700';
    case 'closed': return 'bg-gray-100 text-gray-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

/**
 * Get stage label consistently across components
 */
export function getStageLabel(stage: string): string {
  switch (stage) {
    case 'suggested': return 'Suggested';
    case 'deep_dive': return 'Deep Dive';
    case 'iterating': return 'Iterating';
    case 'considering': return 'Considering';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
}

/**
 * Clean text by removing trailing ellipsis
 */
export function cleanText(text: string): string {
  return text.replace(/\.\.\.$/, '');
}

/**
 * Get source type label consistently across components
 */
export function getSourceTypeLabel(type?: string | null): string {
  switch (type) {
    case 'byoi': return 'BYOI';
    case 'system': return 'System Generated';
    case 'madlib': return 'AI Generated';
    case 'not_set':
    case undefined:
    case null:
      return 'Not Set';
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Not Set';
  }
}
