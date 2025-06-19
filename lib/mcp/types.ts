/**
 * MCP (Model Context Protocol) type definitions
 */

export interface MCPConfig {
  inputs?: MCPInput[];
  servers: Record<string, MCPServerConfig>;
}

export interface MCPInput {
  type: 'promptString' | 'promptChoice';
  id: string;
  description: string;
  password?: boolean;
  choices?: string[];
}

export interface MCPServerConfig {
  type: 'stdio' | 'http';
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  description?: string;
  timeout?: number; // Timeout in milliseconds
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPClientStatus {
  connected: boolean;
  serverName: string;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  error?: string;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey?: string;
  deploymentName: string;
  apiVersion?: string;
  useAzureAD?: boolean;
}

export interface MCPChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: MCPToolCall[];
  toolResults?: MCPToolResult[];
}
