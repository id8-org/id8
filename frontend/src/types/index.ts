/**
 * Central type definitions for the id8 application
 * 
 * This file consolidates all types to prevent duplication and ensure consistency
 * across the entire frontend application. All type definitions are aligned with
 * the backend schema for seamless data flow.
 * 
 * @fileoverview Centralized type system for type safety and consistency
 */

// Re-export all types from individual modules for easy importing
export * from './idea';
export * from './user';
export * from './repo';
export * from './api';

/**
 * Core enums and constants used throughout the application
 */
export type Stage = 'suggested' | 'deep_dive' | 'iterating' | 'considering' | 'closed';
export type SourceType = 'byoi' | 'system' | 'madlib' | 'user' | 'seed';
export type IdeaType = 'side_hustle' | 'full_scale';

/**
 * Common utility types for API responses and error handling
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Form validation and error handling types
 */
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}