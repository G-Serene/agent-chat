/**
 * Enhanced Chat API with Direct Azure OpenAI and MCP Integration
 * Handles LLM interactions and tool execution directly without orchestrator layer
 */

import { NextRequest } from 'next/server'
import { AzureOpenAIClient, LLMChatOptions } from '@/lib/llm/azure-openai-client'
import { mcpClientManager } from '@/lib/mcp/client'
import { loadAzureOpenAIConfig } from '@/lib/llm/azure-openai-config'
import { CONTEXT_AWARE_SYSTEM_PROMPT } from '@/lib/system-prompt'

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
  const { messages, session_id, selected_tools = [] } = await req.json()

  console.log("🔍 Debug Info:")
  console.log("Session ID:", session_id)
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

    // Initialize Azure OpenAI and MCP clients
    await initializeClients()

    // Ensure clients are ready
    if (!isInitialized || !azureOpenAIClient?.isReady() || !mcpClientManager.isReady()) {
      throw new Error("Azure OpenAI or MCP client not ready")
    }

    console.log("🔧 Using direct Azure OpenAI with MCP integration")
    return await handleDirectChat(cleanMessages, session_id, selected_tools)
    
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
      const encoder = new TextEncoder()
      const errorChunk = `0:"❌ ${message}"\n`
      controller.enqueue(encoder.encode(errorChunk))
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

  console.log('🔧 LLM Tools being passed to Azure OpenAI:', JSON.stringify(llmTools, null, 2))

  // Validate that ask_database tool has proper schema
  const askDbTool = llmTools.find(t => t.name === 'ask_database');
  if (askDbTool) {
    console.log('🔍 ask_database tool validation:', {
      hasQuestionProperty: askDbTool.parameters.properties.question !== undefined,
      questionRequired: askDbTool.parameters.required.includes('question'),
      questionType: askDbTool.parameters.properties.question?.type
    });
  }

  // Create streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      // Streaming state and buffer management
      let streamFinished = false
      let textBuffer = ""
      
      // Helper functions for streaming
      const enqueueContent = (content: string) => {
        if (streamFinished) return false
        
        try {
          // Add to buffer for smooth streaming
          textBuffer += content

          // Stream word by word for smoother experience
          const words = textBuffer.split(/(\s+)/)
          
          // Keep the last incomplete word in buffer
          if (words.length > 1) {
            const wordsToSend = words.slice(0, -1).join('')
            textBuffer = words[words.length - 1] || ''
            
            if (wordsToSend.length > 0) {
              const safeContent = JSON.stringify(wordsToSend)
              const chunk = `0:${safeContent}\n`
              controller.enqueue(encoder.encode(chunk))
            }
          }
          return true
        } catch (error) {
          console.error('❌ Error enqueuing content:', error)
          streamFinished = true
          return false
        }
      }

      const flushBuffer = () => {
        if (textBuffer.trim() && !streamFinished) {
          try {
            const safeContent = JSON.stringify(textBuffer)
            const chunk = `0:${safeContent}\n`
            controller.enqueue(encoder.encode(chunk))
            textBuffer = ""
            return true
          } catch (error) {
            console.error('❌ Error flushing buffer:', error)
            return false
          }
        }
        return true
      }

      const enqueueError = (errorMessage: string) => {
        try {
          const safeError = JSON.stringify(`❌ ${errorMessage}`)
          const chunk = `0:${safeError}\n`
          controller.enqueue(encoder.encode(chunk))
          return true
        } catch (error) {
          console.error('❌ Error enqueuing error:', error)
          return false
        }
      }

      const finishStream = () => {
        try {
          // Flush any remaining buffer content before finishing
          flushBuffer()
          
          const finishJson = JSON.stringify({
            finishReason: 'stop',
            usage: { promptTokens: 0, completionTokens: 0 }
          })
          const chunk = `e:${finishJson}\n`
          controller.enqueue(encoder.encode(chunk))
          controller.close()
          return true
        } catch (error) {
          console.error('❌ Error finishing stream:', error)
          try {
            controller.close()
          } catch (closeError) {
            console.error('❌ Error closing stream:', closeError)
          }
          return false
        }
      }
      
      try {
        // Get the latest user message for context-aware prompting
        const latestUserMessage = messages
          .filter((m: any) => m.role === 'user')
          .pop()?.content || ''

        // Create LLM chat options
        const llmOptions: LLMChatOptions = {
          messages: [
            // Add context-aware system message for better artifact generation
            {
              role: 'system',
              content: CONTEXT_AWARE_SYSTEM_PROMPT(latestUserMessage)
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          ],
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
            if (!enqueueContent(chunk.content)) {
              console.error("❌ Failed to enqueue content chunk")
              break
            }
          }

          // Accumulate tool calls with basic validation
          if (chunk.toolCalls) {
            for (const toolCall of chunk.toolCalls) {
              // Basic validation - ensure required fields exist
              if (toolCall && typeof toolCall === 'object' && 
                  toolCall.id && toolCall.name && toolCall.arguments) {
                accumulatedToolCalls.push({
                  id: toolCall.id,
                  name: toolCall.name,
                  arguments: toolCall.arguments
                })
                console.log("🔧 Tool call added:", toolCall.name)
              } else {
                console.warn("⚠️ Invalid tool call data, skipping:", toolCall)
              }
            }
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
                    if (!enqueueContent('\n\n' + content.text)) {
                      console.error("❌ Failed to enqueue tool result")
                      break
                    }
                  }
                }
              }
            }

            console.log("🏁 Chat completed: tool_calls")
            finishStream()
            return
          }

          // Handle other completion reasons
          if (chunk.finishReason && chunk.finishReason !== 'stop') {
            console.log("🏁 Chat completed:", chunk.finishReason)
            finishStream()
            return
          }

          // Handle normal completion
          if (chunk.finishReason === 'stop') {
            console.log("🏁 Chat completed: stop")
            finishStream()
            return
          }
        }

        // Fallback completion
        console.log("🏁 Chat stream ended without explicit finish")
        finishStream()

      } catch (error) {
        console.error("❌ Direct chat error:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        enqueueError(errorMessage)
        finishStream()
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
