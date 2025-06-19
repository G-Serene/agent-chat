/**
 * Pure Azure OpenAI LLM Client
 * Handles only LLM interactions without MCP coupling
 */

import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAIConfig } from '../mcp/types';

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
          apiVersion: this.config.apiVersion || '2024-10-21'
        });
      } else if (this.config.apiKey) {
        // Use API key authentication
        this.client = new AzureOpenAI({
          apiKey: this.config.apiKey,
          endpoint: this.config.endpoint,
          deployment: this.config.deploymentName,
          apiVersion: this.config.apiVersion || '2024-10-21'
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
      throw new Error('Azure OpenAI client not initialized');
    }

    try {
      const messages = this.formatMessages(options.messages);
      const tools = options.tools ? this.formatTools(options.tools) : undefined;

      const response = await this.client.chat.completions.create({
        model: '', // Model is specified by deployment
        messages,
        tools,
        tool_choice: tools ? 'auto' : undefined,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
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
      throw new Error('Azure OpenAI client not initialized');
    }

    try {
      const messages = this.formatMessages(options.messages);
      const tools = options.tools ? this.formatTools(options.tools) : undefined;

      const stream = await this.client.chat.completions.create({
        model: '', // Model is specified by deployment
        messages,
        tools,
        tool_choice: tools ? 'auto' : undefined,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true
      });

      let accumulatedToolCalls: LLMToolCall[] = [];
      let accumulatedContent = '';

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (!delta) continue;

        // Handle content chunks
        if (delta.content) {
          accumulatedContent += delta.content;
          yield {
            content: delta.content
          } as LLMChatResponse;
        }

        // Handle tool call chunks
        if (delta.tool_calls) {
          const newToolCalls = this.parseToolCalls(delta.tool_calls);
          accumulatedToolCalls.push(...newToolCalls);
        }

        // Handle finish reason
        if (choice.finish_reason) {
          const response: LLMChatResponse = {
            finishReason: this.mapFinishReason(choice.finish_reason)
          };

          if (accumulatedToolCalls.length > 0) {
            response.toolCalls = accumulatedToolCalls;
          }

          yield response;
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
   * Parse tool calls from Azure OpenAI response
   */
  private parseToolCalls(toolCalls: any[]): LLMToolCall[] {
    return toolCalls.map(tc => ({
      id: tc.id,
      name: tc.function?.name || '',
      arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
    }));
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
