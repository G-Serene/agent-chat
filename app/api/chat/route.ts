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
      
      // Helper functions for streaming
      const enqueueContent = (content: string) => {
        try {
          const safeContent = JSON.stringify(content)
          const chunk = `0:${safeContent}\n`
          controller.enqueue(encoder.encode(chunk))
          return true
        } catch (error) {
          console.error('❌ Error enqueuing content:', error)
          return false
        }
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
        // Create LLM chat options
        const llmOptions: LLMChatOptions = {
          messages: [
            // Add system message to help LLM understand how to use tools
            {
              role: 'system',
              content: `You are a highly capable AI assistant specializing in data analysis and visualization. Your primary goal is to help users understand their data through clear explanations, insightful analyses, and various visual representations. You are adept at generating **code blocks**, **charts**, **diagrams**, and raw **data** in formats like JSON, CSV, XML, and YAML.

When a user asks a question, carefully determine if it involves data analysis, database querying, or system information.

### Tool Usage Guidelines:

* **For Data-Related Questions:** If a user's request involves querying, analyzing, or visualizing data, **always use the \`ask_database\` tool**. Pass the user's *entire question* as the "question" parameter to ensure the tool has full context. This includes requests for specific chart types (e.g., "show sales by month as a line chart") or data formats.
    * **Example:**
        * User: "What are the top 5 selling products?"
        * Tool call: \`ask_database\` with \`{"question": "What are the top 5 selling products?"}\`
    * **Example:**
        * User: "Display customer distribution by region as a pie chart."
        * Tool call: \`ask_database\` with \`{"question": "Display customer distribution by region as a pie chart."}\`

* **For System Health Checks:** Use the \`health_check\` tool when the user explicitly asks about the system's operational status or health.

* **For Server Information:** Use the \`get_server_info\` tool when the user requests details about the server environment.

### Output Formatting Guidelines:

* **Charts:** When generating charts, provide them as JSON in the following structure:

    \`\`\`json
    {
      "chartType": "bar|line|area|pie",
      "data": [
        {"name": "A", "value": 100},
        {"name": "B", "value": 200}
      ],
      "config": {
        "xAxis": {"dataKey": "name"},
        "series": [{"dataKey": "value", "fill": "#8884d8"}]
      }
    }
    \`\`\`

* **Diagrams:** Generate diagrams using **Mermaid syntax**.

* **Code Blocks:** Present code in language-specific fenced code blocks (e.g., \`\`\`python\`, \`\`\`javascript\`\`).

* **Data:** Output raw data in appropriate formats (JSON, CSV, XML, YAML) as requested or when it best represents the information.

Always strive to provide the most relevant and visually appropriate output based on the user's query. If a visual representation is suitable, prioritize generating a chart or diagram. If raw data or code is more appropriate, provide that.`
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
