/**
 * MCP Configuration Management
 * Handles loading and validation of MCP server configurations
 */

import { MCPConfig, MCPServerConfig, MCPInput } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class MCPConfigManager {
  private config: MCPConfig | null = null;
  private inputValues: Map<string, string> = new Map();

  /**
   * Load MCP configuration from mcp.json file
   */
  async loadConfig(): Promise<MCPConfig> {
    try {
      let configData: string;

      // Check if we're running in a server environment (Node.js)
      if (typeof window === 'undefined') {
        // Server-side: read from file system
        const configPath = path.join(process.cwd(), 'mcp.json');
        configData = fs.readFileSync(configPath, 'utf8');
      } else {
        // Client-side: use fetch
        const response = await fetch('/mcp.json');
        if (!response.ok) {
          throw new Error(`Failed to load MCP config: ${response.statusText}`);
        }
        configData = await response.text();
      }
      
      this.config = JSON.parse(configData);
      if (!this.config) {
        throw new Error('MCP config is null or undefined');
      }
      
      await this.validateConfig(this.config);
      
      return this.config;
    } catch (error) {
      console.error('Error loading MCP config:', error);
      throw new Error(`Failed to load MCP configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate MCP configuration structure
   */
  private async validateConfig(config: MCPConfig): Promise<void> {
    if (!config.servers || Object.keys(config.servers).length === 0) {
      throw new Error('MCP config must define at least one server');
    }

    for (const [name, serverConfig] of Object.entries(config.servers)) {
      this.validateServerConfig(name, serverConfig);
    }

    // Validate input references
    if (config.inputs) {
      for (const input of config.inputs) {
        this.validateInput(input);
      }
    }
  }

  /**
   * Validate individual server configuration
   */
  private validateServerConfig(name: string, config: MCPServerConfig): void {
    if (!config.type) {
      throw new Error(`Server ${name} must specify a type`);
    }

    if (!['stdio', 'http'].includes(config.type)) {
      throw new Error(`Server ${name} has invalid type: ${config.type}`);
    }

    if (config.type === 'http' && !config.url) {
      throw new Error(`Server ${name} with type ${config.type} must specify a URL`);
    }

    if (config.type === 'stdio' && !config.command) {
      throw new Error(`Server ${name} with type stdio must specify a command`);
    }
  }

  /**
   * Validate input configuration
   */
  private validateInput(input: MCPInput): void {
    if (!input.id || !input.description) {
      throw new Error('Input must have id and description');
    }

    if (!['promptString', 'promptChoice'].includes(input.type)) {
      throw new Error(`Invalid input type: ${input.type}`);
    }

    if (input.type === 'promptChoice' && (!input.choices || input.choices.length === 0)) {
      throw new Error('promptChoice input must specify choices');
    }
  }

  /**
   * Resolve environment variables and input placeholders in configuration
   */
  resolveConfigValues(config: MCPServerConfig): MCPServerConfig {
    const resolved = { ...config };

    // Resolve URL
    if (resolved.url) {
      resolved.url = this.resolveValue(resolved.url);
    }

    // Resolve headers
    if (resolved.headers) {
      resolved.headers = Object.fromEntries(
        Object.entries(resolved.headers).map(([key, value]) => [
          key,
          this.resolveValue(value)
        ])
      );
    }

    // Resolve environment variables
    if (resolved.env) {
      resolved.env = Object.fromEntries(
        Object.entries(resolved.env).map(([key, value]) => [
          key,
          this.resolveValue(value)
        ])
      );
    }

    // Resolve command args
    if (resolved.args) {
      resolved.args = resolved.args.map(arg => this.resolveValue(arg));
    }

    return resolved;
  }

  /**
   * Resolve a single value with environment variables and input placeholders
   */
  private resolveValue(value: string): string {
    let resolved = value;

    // Resolve environment variables: ${env:VAR_NAME}
    resolved = resolved.replace(/\$\{env:([^}]+)\}/g, (match, varName) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        console.warn(`Environment variable ${varName} is not defined`);
        return match;
      }
      return envValue;
    });

    // Resolve input placeholders: ${input:input-id}
    resolved = resolved.replace(/\$\{input:([^}]+)\}/g, (match, inputId) => {
      const inputValue = this.inputValues.get(inputId);
      if (inputValue === undefined) {
        console.warn(`Input value ${inputId} is not defined`);
        return match;
      }
      return inputValue;
    });

    return resolved;
  }

  /**
   * Set input value for placeholder resolution
   */
  setInputValue(inputId: string, value: string): void {
    this.inputValues.set(inputId, value);
  }

  /**
   * Get required inputs that need to be prompted
   */
  getRequiredInputs(): MCPInput[] {
    if (!this.config?.inputs) {
      return [];
    }

    return this.config.inputs.filter(input => 
      !this.inputValues.has(input.id)
    );
  }

  /**
   * Get server configuration by name
   */
  getServerConfig(name: string): MCPServerConfig | null {
    if (!this.config?.servers[name]) {
      return null;
    }

    return this.resolveConfigValues(this.config.servers[name]);
  }

  /**
   * Get all server names
   */
  getServerNames(): string[] {
    return this.config ? Object.keys(this.config.servers) : [];
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }
}

// Singleton instance
export const mcpConfigManager = new MCPConfigManager();
