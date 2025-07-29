/**
 * Centralized validation utilities for ideas
 * Provides consistent validation logic across components
 */

import { z } from 'zod';
import { ideaSchema } from '@/types/schemas';
import type { Idea } from '@/lib/api';

export interface ValidationResult {
  validIdeas: Idea[];
  invalidIdeas: unknown[];
  errors: z.ZodError[];
  hasErrors: boolean;
}

/**
 * Validates an array of ideas against the schema
 * Returns separated valid/invalid ideas with error details
 */
export function validateIdeas(ideas: unknown[]): ValidationResult {
  const validIdeas: Idea[] = [];
  const invalidIdeas: unknown[] = [];
  const errors: z.ZodError[] = [];

  if (!Array.isArray(ideas)) {
    return {
      validIdeas: [],
      invalidIdeas: [ideas],
      errors: [new z.ZodError([{
        code: 'custom',
        message: 'Expected array of ideas',
        path: [],
      }])],
      hasErrors: true,
    };
  }

  for (const idea of ideas) {
    const result = ideaSchema.safeParse(idea);
    if (result.success) {
      validIdeas.push(result.data as unknown as Idea);
    } else {
      invalidIdeas.push(idea);
      errors.push(result.error);
    }
  }

  return {
    validIdeas,
    invalidIdeas,
    errors,
    hasErrors: errors.length > 0,
  };
}

/**
 * Validates a single idea
 */
export function validateIdea(idea: unknown): { idea: Idea | null; error: z.ZodError | null } {
  const result = ideaSchema.safeParse(idea);
  if (result.success) {
    return { idea: result.data as unknown as Idea, error: null };
  }
  return { idea: null, error: result.error };
}

/**
 * Defensive array helper - ensures value is always an array
 */
export function safeArray<T>(val: T[] | undefined | null): T[] {
  return Array.isArray(val) ? val : [];
}