/**
 * Simple message types - using AI SDK standard types mostly
 */

// Re-export AI SDK types for consistency
export type { Message } from '@ai-sdk/react';

// Simple interfaces for any custom needs
export interface SimpleAttachment {
  url: string;
  name: string;
  contentType: string;
}
