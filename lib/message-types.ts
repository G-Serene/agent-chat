/**
 * Structured Message Types following Chat SDK patterns
 */

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolInvocationPart {
  type: 'tool-invocation';
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
    state: 'call' | 'result';
    result?: any;
  };
}

export interface ArtifactPart {
  type: 'artifact';
  artifact: {
    id: string;
    type: 'code' | 'chart' | 'table' | 'diagram' | 'text';
    title: string;
    content: string;
    format: 'json' | 'markdown' | 'html';
    metadata?: Record<string, any>;
  };
}

export interface ReasoningPart {
  type: 'reasoning';
  reasoning: string;
}

export type MessagePart = TextPart | ToolInvocationPart | ArtifactPart | ReasoningPart;

export interface StructuredMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  attachments?: Array<{
    url: string;
    name: string;
    contentType: string;
  }>;
  createdAt: Date;
}

export interface ToolResponse {
  type: 'text' | 'artifact' | 'error';
  content: string;
  metadata?: {
    artifactType?: 'code' | 'chart' | 'table' | 'diagram' | 'text';
    language?: string;
    title?: string;
    format?: 'markdown' | 'json' | 'html';
  };
}
