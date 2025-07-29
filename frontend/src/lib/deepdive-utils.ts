import type { DeepDiveSection } from '@/types/api';

/**
 * Utility functions for deep dive data processing and visualization
 */

/**
 * Parse signal scores from content string
 */
export function parseSignalScore(content: string): Record<string, number> | null {
  // Try to parse JSON from the content
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (typeof obj === 'object') return obj;
    }
  } catch {
    // Ignore JSON parsing errors
  }
  
  // Try to parse as key: value lines
  const lines = content.split('\n');
  const scores: Record<string, number> = {};
  let found = false;
  
  for (const line of lines) {
    const m = line.match(/([\w\s]+):\s*(\d+)/);
    if (m) {
      scores[m[1].trim()] = parseInt(m[2], 10);
      found = true;
    }
  }
  
  return found ? scores : null;
}

/**
 * Extract Go/No-Go decision from deep dive sections
 */
export function extractGoNoGo(sections: DeepDiveSection[]): string | null {
  for (const s of sections) {
    if (/go\s*\/\s*no-go/i.test(s.title) || /go\s*\/\s*no-go/i.test(s.content)) {
      const match = s.content.match(/go\s*\/\s*no-go\s*[:-]?\s*(go|no-go)/i);
      if (match) return match[1].toUpperCase();
    }
    if (/go\s*\/\s*no-go/i.test(s.content)) {
      if (/no-go/i.test(s.content)) return 'NO-GO';
      if (/go/i.test(s.content)) return 'GO';
    }
  }
  return null;
}

/**
 * Extract summary from deep dive sections
 */
export function extractSummary(sections: DeepDiveSection[]): string | null {
  for (const s of sections) {
    if (/summary/i.test(s.title)) return s.content;
    if (/executive summary/i.test(s.content)) return s.content;
  }
  return null;
}

/**
 * Get appropriate color class for score values
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Format trend values consistently
 */
export function formatTrend(trend: string): string {
  return trend === 'up' ? 'positive' : 'negative';
}

/**
 * Determine Go/No-Go decision based on overall score
 */
export function determineGoNoGo(overallScore: number): string {
  if (overallScore >= 7) return 'GO';
  if (overallScore >= 5) return 'MAYBE';
  return 'NO-GO';
}

/**
 * Parse numeric values from market size strings
 */
export function parseMarketValue(val: string | null): number {
  if (!val) return 0;
  const n = parseFloat(val.replace(/[^\d.]/g, ''));
  if (/B/i.test(val)) return n * 1e9;
  if (/M/i.test(val)) return n * 1e6;
  return n;
}

/**
 * Extract field value from object safely
 */
export function getFieldValue(obj: unknown, key: string): string | null {
  if (obj && typeof obj === 'object' && key in obj) {
    const val = (obj as Record<string, unknown>)[key];
    return typeof val === 'string' ? val : null;
  }
  return null;
}