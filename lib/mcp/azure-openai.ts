/**
 * Azure OpenAI Service Integration for MCP
 * Handles Azure OpenAI API calls with tool calling support
 */

import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAIConfig, MCPTool, MCPToolCall, MCPChatMessage } from './types';

export interface ChatCompletionOptions {
  messages: MCPChatMessage[];
  tools?: MCPTool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content?: string;
  toolCalls?: MCPToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

export class AzureOpenAIService {
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

      console.log('✅ Azure OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI client:', error);
      throw new Error(`Azure OpenAI initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create chat completion with optional tool calling
   */
  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
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
        finishReason: this.mapFinishReason(choice.finish_reason)
      };
    } catch (error) {
      console.error('❌ Azure OpenAI API error:', error);
      throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create streaming chat completion
   */
  async *createStreamingChatCompletion(options: ChatCompletionOptions): AsyncGenerator<ChatCompletionResponse, void, unknown> {
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

      let accumulatedToolCalls: MCPToolCall[] = [];
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
            content: delta.content,
            finishReason: 'stop'
          };
        }

        // Handle tool call chunks
        if (delta.tool_calls) {
          const newToolCalls = this.parseToolCalls(delta.tool_calls);
          accumulatedToolCalls.push(...newToolCalls);
        }

        // Handle finish reason
        if (choice.finish_reason) {
          const response: ChatCompletionResponse = {
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
   * Format messages for Azure OpenAI API
   */
  private formatMessages(messages: MCPChatMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls ? msg.toolCalls.map(tc => ({
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments)
        }
      })) : undefined,
      tool_call_id: msg.toolResults ? `call_${Date.now()}` : undefined
    }));
  }

  /**
   * Format MCP tools for Azure OpenAI API
   */
  private formatTools(tools: MCPTool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }));
  }

  /**
   * Parse tool calls from Azure OpenAI response
   */
  private parseToolCalls(toolCalls: any[]): MCPToolCall[] {
    if (!toolCalls) return [];

    return toolCalls.map(tc => ({
      name: tc.function?.name || tc.name,
      arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : tc.arguments || {}
    }));
  }

  /**
   * Map Azure OpenAI finish reason to our type
   */
  private mapFinishReason(reason: string | null | undefined): 'stop' | 'tool_calls' | 'length' | 'content_filter' {
    switch (reason) {
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): AzureOpenAIConfig {
    return { ...this.config };
  }
}
