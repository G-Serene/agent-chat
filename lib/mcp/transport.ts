/**
 * StreamableHTTP Transport for MCP
 * Implements MCP protocol over HTTP with Server-Sent Events
 */

import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { MCPServerConfig } from './types';

export interface StreamableHTTPOptions {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class StreamableHTTPTransport implements Transport {
  private url: string;
  private headers: Record<string, string>;
  private timeout: number;
  private abortController: AbortController | null = null;
  private eventSource: EventSource | null = null;
  private onMessage?: (message: any) => void;
  private onError?: (error: Error) => void;
  private onClose?: () => void;

  constructor(options: StreamableHTTPOptions) {
    this.url = options.url;
    this.headers = options.headers || {};
    this.timeout = options.timeout || 30000;
  }

  /**
   * Start the transport connection
   */
  async start(): Promise<void> {
    try {
      this.abortController = new AbortController();
      
      // For SSE connections, we use EventSource
      if (this.url.includes('/events') || this.headers['Accept'] === 'text/event-stream') {
        await this.startSSE();
      } else {
        await this.startHTTP();
      }

      console.log('✅ StreamableHTTP transport started successfully');
    } catch (error) {
      console.error('❌ Failed to start StreamableHTTP transport:', error);
      throw new Error(`Transport start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start Server-Sent Events connection
   */
  private async startSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create EventSource with headers (if supported)
        const eventSourceUrl = new URL(this.url);
        
        // Add headers as query parameters for EventSource compatibility
        Object.entries(this.headers).forEach(([key, value]) => {
          eventSourceUrl.searchParams.set(`header_${key}`, value);
        });

        this.eventSource = new EventSource(eventSourceUrl.toString());

        this.eventSource.onopen = () => {
          console.log('🔗 SSE connection opened');
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.onMessage?.(message);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
            this.onError?.(new Error(`Invalid SSE message format: ${error}`));
          }
        };

        this.eventSource.onerror = (event) => {
          console.error('SSE connection error:', event);
          const error = new Error('SSE connection failed');
          this.onError?.(error);
          reject(error);
        };

        // Set timeout
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            this.eventSource?.close();
            reject(new Error('SSE connection timeout'));
          }
        }, this.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start regular HTTP connection for request/response
   */
  private async startHTTP(): Promise<void> {
    // HTTP transport doesn't maintain persistent connection
    // Connection is established per request
    console.log('📡 HTTP transport ready for requests');
  }

  /**
   * Send a message through the transport
   */
  async send(message: any): Promise<any> {
    if (!this.abortController) {
      throw new Error('Transport not started');
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(message),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return this.handleStreamingResponse(response);
      }

      // Handle regular JSON response
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Transport send error:', error);
      throw new Error(`Send failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle streaming response from server
   */
  private async handleStreamingResponse(response: Response): Promise<any> {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return result;
            }

            try {
              const message = JSON.parse(data);
              this.onMessage?.(message);
              result = message; // Keep last message as result
            } catch (error) {
              console.warn('Failed to parse streaming data:', error);
            }
          }
        }
      }

      return result;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Close the transport connection
   */
  async close(): Promise<void> {
    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }

      this.onClose?.();
      console.log('🔌 StreamableHTTP transport closed');
    } catch (error) {
      console.error('Error closing transport:', error);
    }
  }

  /**
   * Set message handler
   */
  setMessageHandler(handler: (message: any) => void): void {
    this.onMessage = handler;
  }

  /**
   * Set error handler
   */
  setErrorHandler(handler: (error: Error) => void): void {
    this.onError = handler;
  }

  /**
   * Set close handler
   */
  setCloseHandler(handler: () => void): void {
    this.onClose = handler;
  }

  /**
   * Check if transport is connected
   */
  isConnected(): boolean {
    if (this.eventSource) {
      return this.eventSource.readyState === EventSource.OPEN;
    }
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}

/**
 * Create StreamableHTTP transport from MCP server config
 */
export function createStreamableHTTPTransport(config: MCPServerConfig): StreamableHTTPTransport {
  if (!config.url) {
    throw new Error('URL is required for StreamableHTTP transport');
  }

  return new StreamableHTTPTransport({
    url: config.url,
    headers: config.headers,
    timeout: 30000
  });
}
