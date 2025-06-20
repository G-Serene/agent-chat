/**
 * Chat API Route with structured tool response handling
 * Following Chat SDK patterns for consistent artifact and text output
 * Using AI SDK v4 stable APIs
 */

import { NextRequest } from 'next/server';
import { StreamData, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { mcpClientManager } from '@/lib/mcp/client';
import { ToolResponseProcessor } from '@/lib/tool-response-processor';
import { StructuredMessage, MessagePart } from '@/lib/message-types';
import { loadAzureOpenAIConfig } from '@/lib/llm/azure-openai-config';

export async function POST(req: NextRequest) {
  try {
    const { messages, session_id, selected_tools }: {
      messages: StructuredMessage[];
      session_id: string;
      selected_tools: string[];
    } = await req.json();

    // Initialize MCP client if needed
    if (!mcpClientManager.isReady()) {
      await mcpClientManager.initialize();
    }

    // Convert structured messages to core messages format
    const coreMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.parts
        .filter(part => part.type === 'text')
        .map(part => (part as any).text)
        .join('\n')
    }));

    // Get available tools
    const allTools = mcpClientManager.getAllTools();
    const selectedToolNames = selected_tools.map(toolId => 
      toolId.includes('::') ? toolId.split('::', 2)[1] : toolId
    );
    const availableTools = selected_tools.length > 0 
      ? allTools.filter(tool => selectedToolNames.includes(tool.name))
      : allTools;

    // Convert MCP tools to AI SDK format
    const tools = availableTools.reduce((acc, tool) => {
      acc[tool.name] = {
        description: tool.description || '',
        parameters: {
          type: 'object' as const,
          properties: tool.inputSchema.properties || {},
          required: tool.inputSchema.required || []
        },
        execute: async (args: Record<string, any>) => {
          try {
            const result = await mcpClientManager.executeTool(tool.name, args);
            
            // Process the tool result to determine if it's an artifact or text
            const messageParts = ToolResponseProcessor.processToolResult(
              `tool-${Date.now()}`,
              tool.name,
              result
            );

            // For now, return the first text content or the raw result
            const textPart = messageParts.find(part => 
              part.type === 'tool-invocation' && part.toolInvocation.result
            );
            
            if (textPart && textPart.type === 'tool-invocation') {
              return textPart.toolInvocation.result;
            }
            
            // If it's an artifact, return structured data
            const artifactPart = messageParts.find(part => part.type === 'artifact');
            if (artifactPart && artifactPart.type === 'artifact') {
              return {
                artifactType: 'structured_data',
                ...artifactPart.artifact
              };
            }
            
            // Fallback to raw content
            return result.content.map(c => c.text).join('\n');
          } catch (error) {
            throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      };
      return acc;
    }, {} as Record<string, any>);

    // Create stream data for additional information
    const data = new StreamData();

    // Stream the text with tools
    const result = streamText({
      model: openai('gpt-4o'),
      messages: coreMessages,
      tools,
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // Process tool results for artifacts
        if (toolResults) {
          for (const toolResult of toolResults) {
            if (typeof toolResult.result === 'object' && toolResult.result?.artifactType === 'structured_data') {
              data.append({
                type: 'artifact',
                toolCallId: toolResult.toolCallId,
                artifact: toolResult.result
              });
            }
          }
        }
        
        data.close();
      }
    });

    return result.toDataStreamResponse({ data });

  } catch (error) {
    console.error('Chat API error:', error);
    
    const data = new StreamData();
    data.append({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    data.close();
    
    return new Response('Error occurred', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
