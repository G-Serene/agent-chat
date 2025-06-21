/**
 * MCP Client Implementation
 * Main client for managing MCP servers and tool execution
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
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

// Client-safe transport configuration
const mcpTransportConfig = {
  retryAttempts: 3,
  retryDelay: 1000,
  connectionTimeout: 30000, // Increased from 10s to 30s
  requestTimeout: 60000,    // Increased from 30s to 60s
  keepAliveInterval: 30000
} as const;

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StreamableHTTPClientTransport> = new Map();
  private statuses: Map<string, MCPClientStatus> = new Map();
  private config: MCPConfig | null = null;
  private connectionRetries: Map<string, number> = new Map();
  private isInitialized = false;
  private isShuttingDown = false;

  constructor() {
    // Set up graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  /**
   * Set up graceful shutdown handlers to close streams properly
   */
  private setupShutdownHandlers() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      console.log(`🔄 Received ${signal}, closing MCP connections...`);
      try {
        await this.disconnect();
        console.log('✅ MCP connections closed successfully');
      } catch (error) {
        console.error('❌ Error during MCP shutdown:', error);
      }
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('beforeExit', () => {
      if (!this.isShuttingDown) {
        shutdown('beforeExit');
      }
    });
  }

  /**
   * Initialize MCP client manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ℹ️ MCP Client Manager is already initialized');
      return;
    }

    try {
      console.log('🔄 Initializing MCP Client Manager...');
      
      // Load MCP configuration
      this.config = await mcpConfigManager.loadConfig();
      console.log('📄 MCP configuration loaded');

      // Initialize MCP servers
      await this.initializeServers();
      
      this.isInitialized = true;
      
      const connectedCount = this.getConnectedServerCount();
      const totalServers = Object.keys(this.config.servers).length;
      console.log(`✅ MCP Client Manager initialized successfully. Connected servers: ${connectedCount}/${totalServers}, Total tools: ${this.getAllTools().length}`);
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

    console.log(`🔗 Connecting to MCP server: ${serverName} (${serverConfig.url || serverConfig.command})`);

    // Retry logic for connection
    const maxRetries = mcpTransportConfig.retryAttempts;
    let attempt = this.connectionRetries.get(serverName) || 0;

    while (attempt < maxRetries) {
      try {
        // Create transport based on server type
        let transport;
        
        switch (serverConfig.type) {
          case 'http':
            if (!serverConfig.url) {
              throw new Error(`URL is required for HTTP transport: ${serverName}`);
            }
            transport = new StreamableHTTPClientTransport(new URL(serverConfig.url), {
              requestInit: {
                headers: serverConfig.headers || {}
              }
            });
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

        // Set up error handling
        transport.onerror = (error: Error) => {
          console.error(`❌ Transport error for ${serverName}:`, error);
        };

        transport.onclose = () => {
          console.log(`🔌 Transport closed for ${serverName}`);
          this.statuses.set(serverName, {
            connected: false,
            serverName,
            tools: [],
            resources: [],
            prompts: [],
            error: 'Connection closed'
          });
        };

        // Connect to server with timeout
        const connectionTimeout = serverConfig.timeout || mcpTransportConfig.connectionTimeout;
        await Promise.race([
          client.connect(transport),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Connection timeout after ${connectionTimeout}ms`)), connectionTimeout)
          )
        ]);
        
        this.clients.set(serverName, client);
        this.transports.set(serverName, transport);
        console.log(`🔌 Successfully connected to ${serverName}`);

        // Fetch server capabilities with timeout
        const status = await Promise.race([
          this.fetchServerCapabilities(serverName, client),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Capability fetch timeout after ${connectionTimeout}ms`)), connectionTimeout)
          )
        ]);
        
        this.statuses.set(serverName, status);

        console.log(`✅ Connected to MCP server: ${serverName}`);
        console.log(`   Tools: ${status.tools.length}`);
        console.log(`   Resources: ${status.resources.length}`);
        console.log(`   Prompts: ${status.prompts.length}`);

        // Reset retry count on successful connection
        this.connectionRetries.set(serverName, 0);
        return; // Exit the function on successful connection

      } catch (error) {
        attempt++;
        this.connectionRetries.set(serverName, attempt);

        console.error(`❌ Failed to connect to server ${serverName} (attempt ${attempt} of ${maxRetries}):`, error);
        
        // If max retries reached, set error status and throw
        if (attempt >= maxRetries) {
          this.statuses.set(serverName, {
            connected: false,
            serverName,
            tools: [],
            resources: [],
            prompts: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          throw new Error(`Max retries reached. Failed to connect to server ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, mcpTransportConfig.retryDelay));
      }
    }
  }

  /**
   * Enhanced error recovery with exponential backoff
   */
  private async connectWithRetry(serverName: string, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.connectToServer(serverName)
        return // Success
      } catch (error) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Exponential backoff, max 10s
        console.warn(`Connection attempt ${attempt}/${maxRetries} failed for ${serverName}, retrying in ${delay}ms...`)
        
        if (attempt === maxRetries) {
          throw error // Final attempt failed
        }
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
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
        ? (resourcesResult.value.resources || []).map((resource: any) => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType
          }))
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
   * Now supports unique tool IDs in format "serverName::toolName"
   */
  async executeTool(toolIdentifier: string, args: Record<string, any>): Promise<MCPToolResult> {
    try {
      let serverName: string;
      let toolName: string;
      
      // Parse tool identifier - check if it's in new format (serverName::toolName) or old format (just toolName)
      if (toolIdentifier.includes('::')) {
        [serverName, toolName] = toolIdentifier.split('::', 2);
      } else {
        // Legacy format - find server that has this tool
        const foundServer = this.findServerWithTool(toolIdentifier);
        if (!foundServer) {
          throw new Error(`Tool not found: ${toolIdentifier}`);
        }
        serverName = foundServer;
        toolName = toolIdentifier;
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
      console.error(`❌ Tool execution failed: ${toolIdentifier}`, error);
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
    for (const [serverName, status] of Array.from(this.statuses.entries())) {
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
    
    for (const status of Array.from(this.statuses.values())) {
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
    
    for (const status of Array.from(this.statuses.values())) {
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
    
    for (const status of Array.from(this.statuses.values())) {
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
   * Add a new MCP server dynamically
   */
  async addServer(serverConfig: {
    id: string;
    name: string;
    description: string;
    url: string;
    type: 'http' | 'stdio';
  }): Promise<MCPClientStatus> {
    try {
      // Update the config manager with the new server
      if (!this.config) {
        throw new Error('MCP configuration not loaded');
      }

      // Add server to config
      this.config.servers[serverConfig.id] = {
        type: serverConfig.type,
        url: serverConfig.url,
        description: serverConfig.description
      };

      // Connect to the new server
      await this.connectToServer(serverConfig.id);
      
      const status = this.statuses.get(serverConfig.id);
      if (!status) {
        throw new Error(`Failed to get status for server ${serverConfig.id}`);
      }

      return status;
    } catch (error) {
      throw new Error(`Failed to add server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverId: string): Promise<void> {
    const serverIndex = Array.from(this.statuses.keys()).indexOf(serverId);
    if (serverIndex === -1) {
      throw new Error(`Server ${serverId} not found`);
    }

    // Disconnect if connected
    const client = this.clients.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (client) {
      try {
        await client.close();
        console.log(`✅ Disconnected client from ${serverId}`);
      } catch (error) {
        console.error(`❌ Error disconnecting client from ${serverId}:`, error);
      }
    }

    if (transport) {
      try {
        await transport.close();
        console.log(`✅ Disconnected transport from ${serverId}`);
      } catch (error) {
        console.error(`❌ Error disconnecting transport from ${serverId}:`, error);
      }
    }

    // Remove from maps
    this.clients.delete(serverId);
    this.transports.delete(serverId);
    this.statuses.delete(serverId);
    this.connectionRetries.delete(serverId);
    
    // Remove from config if it exists
    if (this.config && this.config.servers[serverId]) {
      delete this.config.servers[serverId];
    }

    console.log(`🗑️ Removed server: ${serverId}`);
  }

  /**
   * Refresh connections for all servers
   */
  async refreshConnections(): Promise<void> {
    console.log('🔄 Refreshing all MCP connections...');
    
    if (!this.config) {
      console.log('⚠️ No config loaded, performing full initialization instead...');
      await this.initialize();
      return;
    }

    const serverNames = Object.keys(this.config.servers);
    const connectionPromises = serverNames.map(async serverName => {
      try {
        // Check if server is already connected and healthy
        const currentStatus = this.statuses.get(serverName);
        if (currentStatus?.connected) {
          console.log(`ℹ️ Server ${serverName} already connected, skipping refresh`);
          return;
        }

        // Only reconnect if not already connected
        await this.connectToServer(serverName);
      } catch (error) {
        console.warn(`Failed to refresh connection to server ${serverName}:`, error);
        // Set error status but don't fail the entire refresh
        this.statuses.set(serverName, {
          connected: false,
          serverName,
          tools: [],
          resources: [],
          prompts: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(connectionPromises);
    
    const connectedCount = this.getConnectedServerCount();
    console.log(`🔄 Connection refresh completed. Connected servers: ${connectedCount}/${serverNames.length}`);
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    if (this.isShuttingDown && this.clients.size === 0 && this.transports.size === 0) {
      console.log('ℹ️ MCP connections already closed');
      return;
    }
    
    console.log('🔌 Disconnecting from all MCP servers...');
    
    const disconnectPromises = Array.from(this.clients.entries()).map(
      async ([serverName, client]) => {
        try {
          await client.close();
          console.log(`✅ Disconnected client from ${serverName}`);
        } catch (error) {
          console.error(`❌ Error disconnecting client from ${serverName}:`, error);
        }
      }
    );

    const transportDisconnectPromises = Array.from(this.transports.entries()).map(
      async ([serverName, transport]) => {
        try {
          await transport.close();
          console.log(`✅ Disconnected transport from ${serverName}`);
        } catch (error) {
          console.error(`❌ Error disconnecting transport from ${serverName}:`, error);
        }
      }
    );

    await Promise.allSettled([...disconnectPromises, ...transportDisconnectPromises]);
    
    this.clients.clear();
    this.transports.clear();
    this.statuses.clear();
    this.connectionRetries.clear();
    
    // Reset initialization flag to allow clean re-initialization
    this.isInitialized = false;
    
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

  /**
   * Check if client is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if a specific server is healthy and connected
   */
  isServerHealthy(serverName: string): boolean {
    const status = this.statuses.get(serverName);
    return status?.connected === true;
  }

  /**
   * Get health status of all servers
   */
  getConnectionHealth(): { healthy: number; total: number; details: Record<string, boolean> } {
    const total = this.statuses.size;
    let healthy = 0;
    const details: Record<string, boolean> = {};

    for (const [serverName, status] of this.statuses.entries()) {
      const isHealthy = status.connected;
      details[serverName] = isHealthy;
      if (isHealthy) healthy++;
    }

    return { healthy, total, details };
  }

  /**
   * Get all available servers (connected and disconnected)
   */
  getAvailableServers(): Array<{
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
    toolCount: number;
    resourceCount: number;
    promptCount: number;
  }> {
    return Array.from(this.statuses.entries()).map(([id, status]) => ({
      id,
      name: status.serverName,
      status: status.connected ? 'connected' : status.error ? 'error' : 'disconnected',
      error: status.error,
      toolCount: status.tools.length,
      resourceCount: status.resources.length,
      promptCount: status.prompts.length
    }));
  }

  /**
   * Get connected servers only
   */
  getConnectedServers(): Array<{
    id: string;
    name: string;
    toolCount: number;
    resourceCount: number;
    promptCount: number;
  }> {
    return Array.from(this.statuses.entries())
      .filter(([_, status]) => status.connected)
      .map(([id, status]) => ({
        id,
        name: status.serverName,
        toolCount: status.tools.length,
        resourceCount: status.resources.length,
        promptCount: status.prompts.length
      }));
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManager();
