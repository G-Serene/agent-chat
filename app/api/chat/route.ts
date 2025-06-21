/**
 * Chat API Route with structured tool response handling
 * Following Chat SDK patterns for consistent artifact and text output
 * Using AI SDK v4 stable APIs
 */

import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { createAzure } from '@ai-sdk/azure';
import { z } from 'zod';
import { mcpClientManager } from '@/lib/mcp/client';
import { getContextAwarePrompt } from '@/lib/system-prompt';
import { loadAzureOpenAIConfig } from '@/lib/llm/azure-openai-config';

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();
    console.log('📥 Received request body:', requestBody);
    
    const { messages, session_id, selected_tools }: {
      messages: any[];
      session_id?: string;
      selected_tools?: string[];
    } = requestBody;

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid messages:', messages);
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    // Convert messages to core format and add system prompt
    const coreMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content || ''
    }));

    // Get the last user message to provide context for the system prompt
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Add system prompt if there are no system messages yet
    const hasSystemMessage = coreMessages.some(msg => msg.role === 'system');
    if (!hasSystemMessage) {
      coreMessages.unshift({
        role: 'system',
        content: getContextAwarePrompt(lastUserMessage)
      });
    }

    // Get available tools
    const allTools = mcpClientManager.getAllTools();
    const selectedToolNames = (selected_tools || []).map(toolId => 
      toolId.includes('::') ? toolId.split('::', 2)[1] : toolId
    );
    const availableTools = (selected_tools && selected_tools.length > 0)
      ? allTools.filter(tool => selectedToolNames.includes(tool.name))
      : allTools;

    // Convert MCP tools to AI SDK format using proper tool() function
    const tools: Record<string, any> = {};
    
    for (const mcpTool of availableTools) {
      try {
        console.log(`🔨 Converting tool: ${mcpTool.name}`, mcpTool);
        
        // Convert MCP schema to Zod schema
        const createZodSchema = (properties: any = {}, required: string[] = []) => {
          const zodObject: Record<string, any> = {};
          
          for (const [key, prop] of Object.entries(properties)) {
            const propDef = prop as any;
            let zodType;
            
            switch (propDef.type) {
              case 'string':
                zodType = z.string();
                break;
              case 'number':
                zodType = z.number();
                break;
              case 'boolean':
                zodType = z.boolean();
                break;
              case 'array':
                zodType = z.array(z.any());
                break;
              default:
                zodType = z.any();
            }
            
            if (propDef.description) {
              zodType = zodType.describe(propDef.description);
            }
            
            if (!required.includes(key)) {
              zodType = zodType.optional();
            }
            
            zodObject[key] = zodType;
          }
          
          return Object.keys(zodObject).length > 0 ? z.object(zodObject) : z.object({});
        };
        
        const schema = createZodSchema(
          mcpTool.inputSchema?.properties || {}, 
          mcpTool.inputSchema?.required || []
        );
        
        tools[mcpTool.name] = tool({
          description: mcpTool.description || `Execute ${mcpTool.name}`,
          parameters: schema,
          execute: async (args: Record<string, any>) => {
            try {
              console.log(`🔧 AI SDK calling tool: ${mcpTool.name} with args:`, args);
              
              const result = await mcpClientManager.executeTool(mcpTool.name, args);
              
              // Validate result structure
              if (!result || !Array.isArray(result.content)) {
                console.warn(`Tool ${mcpTool.name} returned invalid result structure:`, result);
                return 'Tool execution completed but returned invalid result structure';
              }
              
              console.log(`✅ Tool ${mcpTool.name} result:`, result);
              
              // Simple: just extract and return the text content
              const textContent = result.content
                .filter(c => c.text && c.text.trim()) 
                .map(c => c.text)
                .join('\n');
                
              return textContent || 'Tool execution completed';
            } catch (error) {
              console.error(`Tool execution error for ${mcpTool.name}:`, error);
              console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack');
              throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        });
      } catch (toolConversionError) {
        console.error(`Error converting tool ${mcpTool.name}:`, toolConversionError);
      }
    }

    // Stream the text with tools
    try {
      console.log('🚀 Starting streamText with tools enabled...');
      console.log(`📋 Available tools: ${Object.keys(tools).join(', ')}`);
      console.log(`🔍 Tool objects:`, Object.entries(tools).map(([name, tool]) => ({ name, hasExecute: typeof tool.execute === 'function' })));
      
      // Additional safety check for tools format
      const validTools = Object.keys(tools).length > 0 ? tools : undefined;
      
      if (!validTools) {
        console.log('⚠️ No valid tools available, proceeding without tools');
      }
      
      const result = streamText({
        model: azure(azureConfig.deploymentName),
        messages: coreMessages,
        tools: validTools,
        maxSteps: 5, // Allow multiple steps for tool calling and follow-up
        onStepFinish: async ({ text, toolCalls, toolResults, finishReason, isContinued }: any) => {
          console.log('📝 Step finished:', { 
            textLength: text?.length || 0, 
            toolCallsCount: toolCalls?.length || 0, 
            toolResultsCount: toolResults?.length || 0,
            finishReason,
            isContinued
          });
        },
        onFinish: async ({ text, toolCalls, toolResults, finishReason }: any) => {
          console.log('🏁 Stream finished:', { 
            textLength: text?.length || 0, 
            toolCallsCount: toolCalls?.length || 0, 
            toolResultsCount: toolResults?.length || 0,
            finishReason 
          });
        },
        onError: (error) => {
          console.error('Stream error:', error);
        }
      });

      return result.toDataStreamResponse();
    } catch (streamError) {
      console.error('StreamText creation error:', streamError);
      
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
    
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}
