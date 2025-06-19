/**
 * Pure Azure OpenAI LLM Client
 * Handles only LLM interactions without MCP coupling
 */

import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAIConfig } from '../mcp/types';
import { z } from 'zod';

// Zod schemas for validation
const llmMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
});

const llmToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional()
  })
});

const llmToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.any())
});

const llmChatOptionsSchema = z.object({
  messages: z.array(llmMessageSchema).min(1),
  tools: z.array(llmToolSchema).optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional()
});

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMChatOptions {
  messages: LLMMessage[];
  tools?: LLMTool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMChatResponse {
  content?: string;
  toolCalls?: LLMToolCall[];
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class LLMValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'LLMValidationError'
  }
}

export class AzureOpenAIClient {
  private client: AzureOpenAI | null = null;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
  }

  /**
   * Initialize Azure OpenAI client with appropriate authentication
   */
  async initialize(): Promise<void> {
    try {
      if (this.config.useAzureAD) {
        // Use Azure AD authentication (managed identity or service principal)
        const credential = new DefaultAzureCredential();
        const scope = "https://cognitiveservices.azure.com/.default";
        const azureADTokenProvider = getBearerTokenProvider(credential, scope);
        
        this.client = new AzureOpenAI({
          azureADTokenProvider,
          deployment: this.config.deploymentName,
          apiVersion: this.config.apiVersion || '2025-01-01-preview'
        });
      } else if (this.config.apiKey) {
        // Use API key authentication
        this.client = new AzureOpenAI({
          apiKey: this.config.apiKey,
          endpoint: this.config.endpoint,
          deployment: this.config.deploymentName,
          apiVersion: this.config.apiVersion || '2025-01-01-preview'
        });
      } else {
        throw new Error('Either Azure AD authentication or API key must be configured');
      }

      console.log('✅ Azure OpenAI LLM client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI LLM client:', error);
      throw new Error(`Azure OpenAI LLM client initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create chat completion with optional tool calling
   */
  async createChatCompletion(options: LLMChatOptions): Promise<LLMChatResponse> {
    if (!this.client) {
      throw new LLMValidationError('Azure OpenAI client not initialized');
    }

    try {
      // Validate options with Zod
      const validatedOptions = llmChatOptionsSchema.parse(options);
      
      const messages = this.formatMessages(validatedOptions.messages);
      const tools = validatedOptions.tools ? this.formatTools(validatedOptions.tools) : undefined;

      const response = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages,
        tools,
        tool_choice: tools ? 'auto' : undefined,
        max_tokens: validatedOptions.maxTokens || 2000,
        temperature: validatedOptions.temperature || 0.7,
        stream: false
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response choice received from Azure OpenAI');
      }

      return {
        content: choice.message?.content || undefined,
        toolCalls: this.parseToolCalls(choice.message?.tool_calls || []),
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      console.error('❌ Azure OpenAI API error:', error);
      throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create streaming chat completion
   */
  async *createStreamingChatCompletion(options: LLMChatOptions): AsyncGenerator<LLMChatResponse, void, unknown> {
    if (!this.client) {
      throw new LLMValidationError('Azure OpenAI client not initialized');
    }

    try {
      // Validate options with Zod
      const validatedOptions = llmChatOptionsSchema.parse(options);
      
      const messages = this.formatMessages(validatedOptions.messages);
      const tools = validatedOptions.tools ? this.formatTools(validatedOptions.tools) : undefined;

      const stream = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages,
        tools,
        tool_choice: tools ? 'auto' : undefined,
        max_tokens: validatedOptions.maxTokens || 2000,
        temperature: validatedOptions.temperature || 0.7,
        stream: true
      });

      // Accumulator for tool calls across chunks
      const accumulatedToolCalls: { [index: number]: { id: string; function: { name: string; arguments: string } } } = {};

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (!delta) continue;

        // Handle content chunks
        if (delta.content) {
          yield {
            content: delta.content
          } as LLMChatResponse;
        }

        // Handle tool calls - accumulate them as they stream in
        if (delta.tool_calls && delta.tool_calls.length > 0) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.index !== undefined) {
              const index = toolCall.index;
              
              // Initialize tool call accumulator if needed
              if (!accumulatedToolCalls[index]) {
                accumulatedToolCalls[index] = {
                  id: '',
                  function: { name: '', arguments: '' }
                };
              }
              
              // Accumulate the tool call data
              if (toolCall.id) {
                accumulatedToolCalls[index].id = toolCall.id;
              }
              if (toolCall.function?.name) {
                accumulatedToolCalls[index].function.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                accumulatedToolCalls[index].function.arguments += toolCall.function.arguments;
              }
            }
          }
        }

        // Handle finish reason
        if (choice.finish_reason) {
          // If we have accumulated tool calls, yield them before finish reason
          if (Object.keys(accumulatedToolCalls).length > 0) {
            const toolCallsArray = Object.values(accumulatedToolCalls);
            const parsedToolCalls = this.parseToolCalls(toolCallsArray);
            if (parsedToolCalls.length > 0) {
              yield {
                toolCalls: parsedToolCalls
              } as LLMChatResponse;
            }
          }
          
          yield {
            finishReason: this.mapFinishReason(choice.finish_reason)
          } as LLMChatResponse;
          break;
        }
      }
    } catch (error) {
      console.error('❌ Azure OpenAI streaming error:', error);
      throw new Error(`Streaming chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Format messages for Azure OpenAI API
   */
  private formatMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Format tools for Azure OpenAI API
   */
  private formatTools(tools: LLMTool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  /**
   * Parse tool calls from Azure OpenAI response with validation
   */
  private parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    return toolCalls.map(tc => {
      try {
        // Parse arguments - with 2025-01-01-preview, arguments are more reliable
        const parsedArguments = tc.function?.arguments 
          ? (typeof tc.function.arguments === 'string' 
             ? JSON.parse(tc.function.arguments) 
             : tc.function.arguments)
          : {};
        
        const toolCall = {
          id: tc.id || '',
          name: tc.function?.name || '',
          arguments: parsedArguments
        };
        
        // Validate with Zod
        return llmToolCallSchema.parse(toolCall);
      } catch (error) {
        console.error('❌ Invalid tool call data:', error, tc);
        // Return a safe fallback
        return {
          id: tc.id || 'unknown',
          name: tc.function?.name || 'unknown',
          arguments: {}
        };
      }
    }).filter(tc => tc.name && tc.name !== 'unknown'); // Filter out invalid tool calls
  }

  /**
   * Map Azure OpenAI finish reason to our format
   */
  private mapFinishReason(reason: string | null): 'stop' | 'tool_calls' | 'length' | 'content_filter' {
    switch (reason) {
      case 'stop': return 'stop';
      case 'tool_calls': return 'tool_calls';
      case 'length': return 'length';
      case 'content_filter': return 'content_filter';
      default: return 'stop';
    }
  }
}
