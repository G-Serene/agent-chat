/**
 * MCP Client Implementation
 * Main client for managing MCP servers and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { 
  MCPConfig, 
  MCPServerConfig, 
  MCPTool, 
  MCPResource, 
  MCPPrompt, 
  MCPClientStatus,
  MCPToolCall,
  MCPToolResult
} from './types';
import { mcpConfigManager } from './config';
import { createStreamableHTTPTransport } from './transport';
import { AzureOpenAIService, ChatCompletionOptions } from './azure-openai';
import { loadAzureOpenAIConfig } from './azure-config';

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private statuses: Map<string, MCPClientStatus> = new Map();
  private azureOpenAI: AzureOpenAIService | null = null;
  private config: MCPConfig | null = null;

  /**
   * Initialize MCP client manager
   */
  async initialize(): Promise<void> {
    try {
      // Load MCP configuration
      this.config = await mcpConfigManager.loadConfig();
      console.log('📄 MCP configuration loaded');

      // Initialize Azure OpenAI from environment variables
      const azureConfig = loadAzureOpenAIConfig();
      if (azureConfig) {
        this.azureOpenAI = new AzureOpenAIService(azureConfig);
        await this.azureOpenAI.initialize();
        console.log('🔧 Azure OpenAI service initialized from environment variables');
      } else {
        console.log('ℹ️ Azure OpenAI not configured - skipping initialization');
      }

      // Initialize MCP servers
      await this.initializeServers();
      
      console.log('✅ MCP Client Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MCP Client Manager:', error);
      throw new Error(`MCP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize all configured MCP servers
   */
  private async initializeServers(): Promise<void> {
    if (!this.config) {
      throw new Error('MCP configuration not loaded');
    }

    const serverNames = Object.keys(this.config.servers);
    console.log(`🔗 Initializing ${serverNames.length} MCP servers...`);

    for (const serverName of serverNames) {
      try {
        await this.connectToServer(serverName);
      } catch (error) {
        console.error(`Failed to connect to server ${serverName}:`, error);
        // Continue with other servers even if one fails
        this.statuses.set(serverName, {
          connected: false,
          serverName,
          tools: [],
          resources: [],
          prompts: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Connect to a specific MCP server
   */
  async connectToServer(serverName: string): Promise<void> {
    const serverConfig = mcpConfigManager.getServerConfig(serverName);
    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverName}`);
    }

    try {
      // Create transport based on server type
      let transport;
      
      switch (serverConfig.type) {
        case 'sse':
        case 'http':
          transport = createStreamableHTTPTransport(serverConfig);
          break;
        case 'stdio':
          throw new Error('STDIO transport not yet implemented');
        default:
          throw new Error(`Unsupported transport type: ${serverConfig.type}`);
      }

      // Create and connect client
      const client = new Client(
        {
          name: `agent-chat-${serverName}`,
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          }
        }
      );

      // Connect to server
      await client.connect(transport);
      this.clients.set(serverName, client);

      // Fetch server capabilities
      const status = await this.fetchServerCapabilities(serverName, client);
      this.statuses.set(serverName, status);

      console.log(`✅ Connected to MCP server: ${serverName}`);
      console.log(`   Tools: ${status.tools.length}`);
      console.log(`   Resources: ${status.resources.length}`);
      console.log(`   Prompts: ${status.prompts.length}`);

    } catch (error) {
      console.error(`❌ Failed to connect to server ${serverName}:`, error);
      throw error;
    }
  }

  /**
   * Fetch capabilities from a connected server
   */
  private async fetchServerCapabilities(serverName: string, client: Client): Promise<MCPClientStatus> {
    try {
      const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
        client.listTools(),
        client.listResources(),
        client.listPrompts()
      ]);

      const tools: MCPTool[] = toolsResult.status === 'fulfilled' 
        ? (toolsResult.value.tools || []).map((tool: any) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: {
              type: 'object' as const,
              properties: tool.inputSchema?.properties || {},
              required: tool.inputSchema?.required
            }
          }))
        : [];

      const resources: MCPResource[] = resourcesResult.status === 'fulfilled'
        ? resourcesResult.value.resources || []
        : [];

      const prompts: MCPPrompt[] = promptsResult.status === 'fulfilled'
        ? (promptsResult.value.prompts || []).map((prompt: any) => ({
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments?.map((arg: any) => ({
              name: arg.name,
              description: arg.description,
              required: arg.required
            }))
          }))
        : [];

      return {
        connected: true,
        serverName,
        tools,
        resources,
        prompts
      };
    } catch (error) {
      throw new Error(`Failed to fetch server capabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a tool call on the appropriate MCP server
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    try {
      // Find server that has this tool
      const serverName = this.findServerWithTool(toolName);
      if (!serverName) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      const client = this.clients.get(serverName);
      if (!client) {
        throw new Error(`Client not connected for server: ${serverName}`);
      }

      console.log(`🔧 Executing tool: ${toolName} on server: ${serverName}`);
      console.log(`   Arguments:`, args);

      // Execute the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      console.log(`✅ Tool execution completed: ${toolName}`);
      
      return {
        content: Array.isArray(result.content) ? result.content : [{ type: 'text', text: JSON.stringify(result.content) }],
        isError: Boolean(result.isError)
      };

    } catch (error) {
      console.error(`❌ Tool execution failed: ${toolName}`, error);
      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Find which server provides a specific tool
   */
  private findServerWithTool(toolName: string): string | null {
    for (const [serverName, status] of this.statuses.entries()) {
      if (status.connected && status.tools.some(tool => tool.name === toolName)) {
        return serverName;
      }
    }
    return null;
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    
    for (const status of this.statuses.values()) {
      if (status.connected) {
        allTools.push(...status.tools);
      }
    }

    return allTools;
  }

  /**
   * Get all available resources from all connected servers
   */
  getAllResources(): MCPResource[] {
    const allResources: MCPResource[] = [];
    
    for (const status of this.statuses.values()) {
      if (status.connected) {
        allResources.push(...status.resources);
      }
    }

    return allResources;
  }

  /**
   * Get all available prompts from all connected servers
   */
  getAllPrompts(): MCPPrompt[] {
    const allPrompts: MCPPrompt[] = [];
    
    for (const status of this.statuses.values()) {
      if (status.connected) {
        allPrompts.push(...status.prompts);
      }
    }

    return allPrompts;
  }

  /**
   * Get status of all servers
   */
  getServerStatuses(): Map<string, MCPClientStatus> {
    return new Map(this.statuses);
  }

  /**
   * Get status of a specific server
   */
  getServerStatus(serverName: string): MCPClientStatus | null {
    return this.statuses.get(serverName) || null;
  }

  /**
   * Chat with Azure OpenAI using available MCP tools
   */
  async chatWithTools(options: ChatCompletionOptions): Promise<any> {
    if (!this.azureOpenAI) {
      throw new Error('Azure OpenAI service not initialized');
    }

    // Add available tools to the chat options
    const availableTools = this.getAllTools();
    options.tools = availableTools;

    try {
      const response = await this.azureOpenAI.createChatCompletion(options);
      
      // If the response includes tool calls, execute them
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolResults = await Promise.all(
          response.toolCalls.map(toolCall => 
            this.executeTool(toolCall.name, toolCall.arguments)
          )
        );

        return {
          ...response,
          toolResults
        };
      }

      return response;
    } catch (error) {
      console.error('❌ Chat with tools failed:', error);
      throw error;
    }
  }

  /**
   * Streaming chat with Azure OpenAI using available MCP tools
   */
  async *streamChatWithTools(options: ChatCompletionOptions): AsyncGenerator<any, void, unknown> {
    if (!this.azureOpenAI) {
      throw new Error('Azure OpenAI service not initialized');
    }

    // Add available tools to the chat options
    const availableTools = this.getAllTools();
    options.tools = availableTools;

    try {
      const stream = this.azureOpenAI.createStreamingChatCompletion(options);
      
      for await (const chunk of stream) {
        yield chunk;
        
        // If we get tool calls in the final chunk, execute them
        if (chunk.toolCalls && chunk.toolCalls.length > 0) {
          const toolResults = await Promise.all(
            chunk.toolCalls.map(toolCall => 
              this.executeTool(toolCall.name, toolCall.arguments)
            )
          );

          yield {
            toolResults,
            finishReason: 'tool_calls'
          };
        }
      }
    } catch (error) {
      console.error('❌ Streaming chat with tools failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from all MCP servers...');
    
    const disconnectPromises = Array.from(this.clients.entries()).map(
      async ([serverName, client]) => {
        try {
          await client.close();
          console.log(`✅ Disconnected from ${serverName}`);
        } catch (error) {
          console.error(`❌ Error disconnecting from ${serverName}:`, error);
        }
      }
    );

    await Promise.allSettled(disconnectPromises);
    
    this.clients.clear();
    this.statuses.clear();
    
    console.log('🔌 All MCP connections closed');
  }

  /**
   * Check if any servers are connected
   */
  hasConnectedServers(): boolean {
    return Array.from(this.statuses.values()).some(status => status.connected);
  }

  /**
   * Get connected server count
   */
  getConnectedServerCount(): number {
    return Array.from(this.statuses.values()).filter(status => status.connected).length;
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager();
