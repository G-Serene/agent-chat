/**
 * Tool Response Processor following Chat SDK patterns
 */

import { ToolResponse, ArtifactPart, MessagePart } from './message-types';
import { MCPToolResult } from './mcp/types';

export class ToolResponseProcessor {
  /**
   * Process MCP tool result into structured message parts
   */
  static processToolResult(
    toolCallId: string,
    toolName: string,
    result: MCPToolResult
  ): MessagePart[] {
    const parts: MessagePart[] = [];
    
    for (const content of result.content) {
      if (content.type === 'text' && content.text) {
        const processed = this.analyzeContent(content.text);
        
        if (processed.type === 'artifact') {
          parts.push({
            type: 'artifact',
            artifact: {
              id: `${toolCallId}-artifact-${Date.now()}`,
              type: processed.metadata?.artifactType || 'text',
              title: processed.metadata?.title || `${toolName} Result`,
              content: processed.content,
              format: processed.metadata?.format || 'markdown',
              metadata: processed.metadata
            }
          });
        } else {
          // Add as tool result within tool invocation
          parts.push({
            type: 'tool-invocation',
            toolInvocation: {
              toolCallId,
              toolName,
              args: {}, // Would be filled from original call
              state: 'result',
              result: processed.content
            }
          });
        }
      }
    }
    
    return parts;
  }

  /**
   * Analyze content to determine if it's an artifact or regular text
   */
  private static analyzeContent(text: string): ToolResponse {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(text);
      
      // Chart detection
      if (this.isChartData(parsed)) {
        return {
          type: 'artifact',
          content: text,
          metadata: {
            artifactType: 'chart',
            format: 'json',
            title: parsed.title || 'Data Visualization'
          }
        };
      }
      
      // Table detection
      if (this.isTableData(parsed)) {
        return {
          type: 'artifact',
          content: text,
          metadata: {
            artifactType: 'table',
            format: 'json',
            title: parsed.title || 'Data Table'
          }
        };
      }
      
      // Generic JSON artifact
      return {
        type: 'artifact',
        content: text,
        metadata: {
          artifactType: 'text',
          format: 'json',
          title: 'Structured Data'
        }
      };
    } catch {
      // Not JSON, analyze as text
    }
    
    // Check for code blocks
    if (this.containsCodeBlocks(text)) {
      const language = this.extractCodeLanguage(text);
      return {
        type: 'artifact',
        content: text,
        metadata: {
          artifactType: 'code',
          language,
          format: 'markdown',
          title: `${language} Code`
        }
      };
    }
    
    // Check for Mermaid diagrams
    if (this.containsMermaid(text)) {
      return {
        type: 'artifact',
        content: text,
        metadata: {
          artifactType: 'diagram',
          language: 'mermaid',
          format: 'markdown',
          title: 'Diagram'
        }
      };
    }
    
    // Default to text
    return {
      type: 'text',
      content: text,
      metadata: {
        format: 'markdown'
      }
    };
  }

  private static isChartData(data: any): boolean {
    return !!(
      data.chartType ||
      data.type === 'chart' ||
      data.data?.datasets ||
      data.datasets ||
      data.labels ||
      data.series ||
      (data.data && Array.isArray(data.data) && data.data.length > 0 &&
       typeof data.data[0] === 'object' && this.hasNumericFields(data.data[0]))
    );
  }

  private static isTableData(data: any): boolean {
    return !!(
      data.type === 'table' ||
      data.columns ||
      data.rows ||
      (Array.isArray(data) && data.length > 0 && 
       typeof data[0] === 'object' && !this.isChartData({ data }))
    );
  }

  private static hasNumericFields(obj: any): boolean {
    const keys = Object.keys(obj);
    const numericKeys = keys.filter(key => 
      key !== 'name' && key !== 'label' && key !== 'category' && 
      typeof obj[key] === 'number'
    );
    return numericKeys.length >= 1;
  }

  private static containsCodeBlocks(text: string): boolean {
    return /```[\w]*\s*\n[\s\S]*?\n```/.test(text);
  }

  private static extractCodeLanguage(text: string): string {
    const match = text.match(/```(\w+)/);
    return match ? match[1] : 'text';
  }

  private static containsMermaid(text: string): boolean {
    return /```mermaid\s*\n[\s\S]*?\n```/.test(text) || 
           text.includes('graph') || 
           text.includes('flowchart') ||
           text.includes('sequenceDiagram');
  }
}
