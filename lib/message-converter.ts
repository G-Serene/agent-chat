/**
 * Message conversion utilities between AI SDK Message and StructuredMessage
 */

import { Message } from '@ai-sdk/react';
import { StructuredMessage, MessagePart, TextPart } from './message-types';

/**
 * Convert AI SDK Message to StructuredMessage
 */
export function convertToStructuredMessage(message: Message): StructuredMessage {
  const parts: MessagePart[] = [];
  
  // Convert content to text part
  if (typeof message.content === 'string' && message.content.trim()) {
    const textPart: TextPart = {
      type: 'text',
      text: message.content
    };
    parts.push(textPart);
  }
  
  // Handle tool invocations if present
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    for (const toolInvocation of message.toolInvocations) {
      parts.push({
        type: 'tool-invocation',
        toolInvocation: {
          toolCallId: toolInvocation.toolCallId,
          toolName: toolInvocation.toolName,
          args: toolInvocation.args,
          state: toolInvocation.state === 'partial-call' ? 'call' : toolInvocation.state,
          result: (toolInvocation as any).result || undefined
        }
      });
    }
  }

  return {
    id: message.id,
    role: message.role === 'system' ? 'assistant' : message.role as 'user' | 'assistant',
    parts: parts,
    createdAt: message.createdAt || new Date()
  };
}

/**
 * Convert StructuredMessage to AI SDK Message
 */
export function convertToAISDKMessage(message: StructuredMessage): Message {
  // Combine all text parts into content
  const textParts = message.parts.filter(part => part.type === 'text') as TextPart[];
  const content = textParts.map(part => part.text).join('\n');
  
  // Extract tool invocations
  const toolInvocations = message.parts
    .filter(part => part.type === 'tool-invocation')
    .map(part => (part as any).toolInvocation);

  return {
    id: message.id,
    role: message.role,
    content: content,
    createdAt: message.createdAt,
    ...(toolInvocations.length > 0 && { toolInvocations })
  };
}

/**
 * Convert array of AI SDK Messages to StructuredMessages
 */
export function convertMessagesToStructured(messages: Message[]): StructuredMessage[] {
  return messages.map(convertToStructuredMessage);
}

/**
 * Convert array of StructuredMessages to AI SDK Messages
 */
export function convertMessagesToAISDK(messages: StructuredMessage[]): Message[] {
  return messages.map(convertToAISDKMessage);
}
