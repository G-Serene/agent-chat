/**
 * Chat API Route with structured tool response handling
 * Following Chat SDK patterns for consistent artifact and text output
 * Using AI SDK v4 stable APIs
 */

import { NextRequest } from 'next/server';
import { StreamData, streamText } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { mcpClientManager } from '@/lib/mcp/client';
import { loadAzureOpenAIConfig } from '@/lib/llm/azure-openai-config';

export async function POST(req: NextRequest) {
  // Create stream data for additional information - moved outside try/catch to ensure cleanup
  const data = new StreamData();
  
  try {
    const { messages, session_id, selected_tools }: {
      messages: any[];
      session_id: string;
      selected_tools: string[];
    } = await req.json();

    // Load Azure OpenAI configuration
    const azureConfig = loadAzureOpenAIConfig();
    if (!azureConfig) {
      throw new Error('Azure OpenAI configuration not found. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT_NAME environment variables.');
    }

    // Create Azure client
    const resourceName = azureConfig.endpoint
      .replace('https://', '')
      .replace('.openai.azure.com', '')
      .replace('.cognitiveservices.azure.com', '');
    
    console.log('🔧 Creating Azure OpenAI client with config:', {
      resourceName,
      deploymentName: azureConfig.deploymentName,
      apiVersion: azureConfig.apiVersion,
      hasApiKey: !!azureConfig.apiKey,
      useAzureAD: azureConfig.useAzureAD
    });
    
    const azure = createAzure({
      apiKey: azureConfig.apiKey, // This should be set since we have it in .env.local
      resourceName: resourceName,
      apiVersion: azureConfig.apiVersion
    });

    // Initialize MCP client if needed
    if (!mcpClientManager.isReady()) {
      await mcpClientManager.initialize();
    }

    // Convert messages to core format - they should already be in standard format
    const coreMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content || ''
    }));

    // Get available tools
    const allTools = mcpClientManager.getAllTools();
    const selectedToolNames = selected_tools.map(toolId => 
      toolId.includes('::') ? toolId.split('::', 2)[1] : toolId
    );
    const availableTools = selected_tools.length > 0 
      ? allTools.filter(tool => selectedToolNames.includes(tool.name))
      : allTools;

    // Convert MCP tools to AI SDK format with enhanced safety
    const tools = availableTools.reduce((acc, tool) => {
      try {
        console.log(`🔨 Converting tool: ${tool.name}`, tool);
        
        acc[tool.name] = {
          description: tool.description || '',
          parameters: {
            type: 'object' as const,
            properties: tool.inputSchema?.properties || {},
            required: tool.inputSchema?.required || []
          },
          execute: async (args: Record<string, any>) => {
            try {
              console.log(`🔧 AI SDK calling tool: ${tool.name} with args:`, args);
              
              const result = await mcpClientManager.executeTool(tool.name, args);
              
              // Validate result structure
              if (!result || !Array.isArray(result.content)) {
                console.warn(`Tool ${tool.name} returned invalid result structure:`, result);
                return 'Tool execution completed but returned invalid result structure';
              }
              
              console.log(`✅ Tool ${tool.name} result:`, result);
              
              // Simple: just extract and return the text content
              const textContent = result.content
                .filter(c => c.text && c.text.trim()) 
                .map(c => c.text)
                .join('\n');
                
              return textContent || 'Tool execution completed';
            } catch (error) {
              console.error(`Tool execution error for ${tool.name}:`, error);
              console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack');
              throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        };
      } catch (toolConversionError) {
        console.error(`Error converting tool ${tool.name}:`, toolConversionError);
      }
      return acc;
    }, {} as Record<string, any>);

    // Stream the text with tools
    try {
      console.log('🚀 Starting streamText with tools enabled...');
      console.log(`📋 Available tools: ${Object.keys(tools).join(', ')}`);
      
      const result = streamText({
        model: azure(azureConfig.deploymentName),
        messages: coreMessages,
        tools: tools,
        onFinish: async ({ text, toolCalls, toolResults }: any) => {
          try {
            console.log('onFinish called with tools enabled');
            console.log('onFinish parameters:', { 
              text: text?.length, 
              toolCalls: toolCalls?.length, 
              toolResults: toolResults?.length 
            });
          } catch (error) {
            console.error('Error in onFinish:', error);
          } finally {
            // Always close the stream data, even if there was an error
            data.close();
          }
        },
        onError: (error) => {
          console.error('Stream error:', error);
          data.append({
            type: 'error',
            error: error instanceof Error ? error.message : 'Streaming error occurred'
          });
          data.close();
        }
      });

      return result.toDataStreamResponse({ data });
    } catch (streamError) {
      console.error('StreamText creation error:', streamError);
      data.append({
        type: 'error',
        error: `Stream creation failed: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`
      });
      data.close();
      
      return new Response(JSON.stringify({ error: 'Stream creation failed' }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Append error and close the stream data
    data.append({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    data.close();
    
    // Return a proper streaming response even for errors
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}
