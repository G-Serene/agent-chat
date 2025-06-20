/**
 * Modern Chat API with Vercel AI SDK v5 Alpha and Enhanced Artifact Support
 * Uses streamText with tool call streaming for optimal performance
 */

import { NextRequest } from 'next/server'
import { convertToCoreMessages, streamText } from 'ai'
import { createAzure } from '@ai-sdk/azure'
import { mcpClientManager } from '@/lib/mcp/client'
import { getContextAwarePrompt } from '@/lib/context-aware-system-prompt'

// Azure OpenAI configuration
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { messages, session_id, selected_tools = [] } = await req.json()

    console.log("🔍 Modern Chat API Debug:")
    console.log("Session ID:", session_id)
    console.log("Selected Tools:", selected_tools)
    console.log("Messages count:", messages.length)

    // Initialize MCP client if needed
    if (!mcpClientManager.isReady()) {
      await mcpClientManager.initialize()
    }

    // Get available MCP tools
    const mcpTools = await mcpClientManager.getAvailableTools()
    console.log("🔧 Available MCP tools:", mcpTools.map(t => t.name))

    // Filter tools based on selection
    const enabledTools = selected_tools.length > 0 
      ? mcpTools.filter(tool => selected_tools.includes(tool.name))
      : mcpTools

    // Convert MCP tools to AI SDK format
    const tools: Record<string, any> = {}
    for (const tool of enabledTools) {
      tools[tool.name] = {
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          console.log(`🛠️ Executing tool: ${tool.name}`, args)
          try {
            const result = await mcpClientManager.callTool(tool.name, args)
            console.log(`✅ Tool ${tool.name} result:`, result)
            return result
          } catch (error: any) {
            console.error(`❌ Tool ${tool.name} error:`, error)
            throw error
          }
        }
      }
    }

    // Get the latest user message to understand intent
    const latestUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || ''

    console.log("💭 Latest user message for context:", latestUserMessage)

    // Convert messages to core format
    const coreMessages = convertToCoreMessages(messages)

    // Use context-aware system prompt that adapts to user intent
    const contextualSystemPrompt = getContextAwarePrompt(latestUserMessage)

    // Use modern streamText with enhanced features
    const result = streamText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'),
      system: contextualSystemPrompt,
      messages: coreMessages,
      tools,
      maxSteps: 5, // Allow multi-step tool execution
      toolCallStreaming: true, // Enable tool call streaming
      experimental_transform: undefined, // Can add smoothStream later
      onChunk: ({ chunk }) => {
        // Optional: Log streaming chunks for debugging
        if (chunk.type === 'tool-call') {
          console.log(`🔧 Streaming tool call: ${chunk.toolName}`)
        }
      },
      onFinish: ({ text, toolCalls, finishReason, usage }) => {
        console.log("✅ Stream finished:", {
          textLength: text.length,
          toolCallsCount: toolCalls?.length || 0,
          finishReason,
          usage,
          userIntent: latestUserMessage.substring(0, 100) + '...'
        })
      }
    })

    // Return the data stream response
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error("💥 Stream error:", error)
        if (error.name === 'AI_ToolExecutionError') {
          return `Tool execution failed: ${error.message}`
        }
        return `An error occurred: ${error.message}`
      }
    })

  } catch (error: any) {
    console.error("💥 Modern Chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

export const runtime = 'nodejs'
export const maxDuration = 60
