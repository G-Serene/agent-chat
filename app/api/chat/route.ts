/**
 * Enhanced Chat API with Direct Azure OpenAI and MCP Integration
 * Handles LLM interactions and tool execution directly without orchestrator layer
 */

import { NextRequest } from 'next/server'
import { AzureOpenAIClient, LLMChatOptions } from '@/lib/llm/azure-openai-client'
import { mcpClientManager } from '@/lib/mcp/client'
import { loadAzureOpenAIConfig } from '@/lib/llm/azure-openai-config'

// Global clients - initialized once
let azureOpenAIClient: AzureOpenAIClient | null = null
let isInitialized = false

/**
 * Initialize Azure OpenAI and MCP clients
 */
async function initializeClients(): Promise<void> {
  if (isInitialized) return

  try {
    console.log('🔄 Initializing Azure OpenAI and MCP clients...')

    // Initialize Azure OpenAI client
    const azureConfig = loadAzureOpenAIConfig()
    if (!azureConfig) {
      throw new Error('Azure OpenAI configuration not found')
    }
    
    azureOpenAIClient = new AzureOpenAIClient(azureConfig)
    await azureOpenAIClient.initialize()
    console.log('✅ Azure OpenAI client initialized')

    // Initialize MCP client
    if (!mcpClientManager.isReady()) {
      await mcpClientManager.initialize()
      console.log('✅ MCP client initialized')
    }

    isInitialized = true
    console.log('✅ All clients initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize clients:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  const { messages, session_id, mcp_enabled = false, selected_tools = [] } = await req.json()

  console.log("🔍 Debug Info:")
  console.log("Session ID:", session_id)
  console.log("MCP Enabled:", mcp_enabled)
  console.log("Selected Tools:", selected_tools)
  console.log("Total messages received:", messages.length)

  try {
    // Clean up messages - extract content from parts if needed
    const cleanMessages = messages.map((msg: any, index: number) => {
      let content = msg.content

      // If content is empty but parts exist, extract from parts
      if (!content && msg.parts && msg.parts.length > 0) {
        content = msg.parts
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text)
          .join("")
      }

      console.log(`Message ${index + 1} (${msg.role}):`, content?.substring(0, 100) + "...")

      return {
        role: msg.role,
        content: content || "",
      }
    })

    console.log("🧹 Cleaned messages count:", cleanMessages.length)

    // Initialize clients if needed
    await initializeClients()

    // Only proceed if MCP is enabled and clients are ready
    if (mcp_enabled && isInitialized && azureOpenAIClient?.isReady() && mcpClientManager.isReady()) {
      console.log("🔧 Using direct Azure OpenAI with MCP integration")
      return await handleDirectChat(cleanMessages, session_id, selected_tools)
    } else {
      // Return error if not properly configured
      const errorMessage = mcp_enabled 
        ? "Chat services are not ready. Please check MCP server connections and Azure OpenAI configuration."
        : "MCP integration is required for chat functionality. Please enable MCP."
      
      console.warn("⚠️ " + errorMessage)
      
      return createErrorStream(errorMessage)
    }
  } catch (error) {
    console.error("💥 Chat API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return createErrorStream(`Error: ${errorMessage}`, 500)
  }
}

/**
 * Create error stream response
 */
function createErrorStream(message: string, status: number = 400): Response {
  const errorStream = new ReadableStream({
    start(controller) {
      const escapedError = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
      const chunk = `0:"❌ ${escapedError}"\n`
      controller.enqueue(new TextEncoder().encode(chunk))
      const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
      controller.enqueue(new TextEncoder().encode(finishChunk))
      controller.close()
    },
  })

  return new Response(errorStream, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

/**
 * Handle chat using direct Azure OpenAI and MCP integration
 */
async function handleDirectChat(messages: any[], sessionId: string, selectedTools: string[]) {
  console.log("🔧 Starting direct chat processing")
  console.log(`🛠️ Selected tools: ${selectedTools.join(', ')}`)

  // Get available MCP tools and filter by selection
  const allTools = mcpClientManager.getAllTools()
  const availableTools = selectedTools.length > 0 
    ? allTools.filter(tool => selectedTools.includes(tool.name))
    : allTools
  
  console.log(`🛠️ Available tools: ${availableTools.map(t => t.name).join(', ')}`)

  // Convert MCP tools to LLM format
  const llmTools = availableTools.map(tool => ({
    name: tool.name,
    description: tool.description || '',
    parameters: {
      type: 'object' as const,
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required || []
    }
  }))

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create LLM chat options
        const llmOptions: LLMChatOptions = {
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          tools: llmTools,
          maxTokens: 2000,
          temperature: 0.7,
          stream: true
        }

        // Stream from Azure OpenAI
        const llmStream = azureOpenAIClient!.createStreamingChatCompletion(llmOptions)
        let accumulatedToolCalls: Array<{
          id: string;
          name: string;
          arguments: Record<string, any>;
        }> = []

        for await (const chunk of llmStream) {
          console.log("📦 LLM chunk:", chunk)

          // Handle content chunks
          if (chunk.content) {
            const aiSdkChunk = `0:${JSON.stringify(chunk.content)}\n`
            controller.enqueue(new TextEncoder().encode(aiSdkChunk))
          }

          // Accumulate tool calls
          if (chunk.toolCalls) {
            accumulatedToolCalls.push(...chunk.toolCalls)
            console.log("🔧 Tool calls detected:", chunk.toolCalls.map(tc => tc.name))
          }

          // Handle completion with tool execution
          if (chunk.finishReason === 'tool_calls' && accumulatedToolCalls.length > 0) {
            console.log(`🔧 Executing ${accumulatedToolCalls.length} tool calls...`)
            
            const toolResults = await Promise.all(
              accumulatedToolCalls.map(toolCall =>
                mcpClientManager.executeTool(toolCall.name, toolCall.arguments)
              )
            )

            // Send tool results as content
            for (const result of toolResults) {
              if (result.content) {
                for (const content of result.content) {
                  if (content.type === 'text' && content.text) {
                    const toolChunk = `0:${JSON.stringify('\n\n' + content.text)}\n`
                    controller.enqueue(new TextEncoder().encode(toolChunk))
                  }
                }
              }
            }

            console.log("🏁 Chat completed: tool_calls")
            const finishChunk = `e:{"finishReason":"tool_calls","usage":{"promptTokens":0,"completionTokens":0}}\n`
            controller.enqueue(new TextEncoder().encode(finishChunk))
            controller.close()
            return
          }

          // Handle other completion reasons
          if (chunk.finishReason && chunk.finishReason !== 'stop') {
            console.log("🏁 Chat completed:", chunk.finishReason)
            const finishChunk = `e:{"finishReason":"${chunk.finishReason}","usage":{"promptTokens":0,"completionTokens":0}}\n`
            controller.enqueue(new TextEncoder().encode(finishChunk))
            controller.close()
            return
          }

          // Handle normal completion
          if (chunk.finishReason === 'stop') {
            console.log("🏁 Chat completed: stop")
            const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
            controller.enqueue(new TextEncoder().encode(finishChunk))
            controller.close()
            return
          }
        }

        // Fallback completion
        console.log("🏁 Chat stream ended without explicit finish")
        const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
        controller.enqueue(new TextEncoder().encode(finishChunk))
        controller.close()

      } catch (error) {
        console.error("❌ Direct chat error:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        const escapedError = errorMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        const chunk = `0:"❌ ${escapedError}"\n`
        controller.enqueue(new TextEncoder().encode(chunk))
        const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
        controller.enqueue(new TextEncoder().encode(finishChunk))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
