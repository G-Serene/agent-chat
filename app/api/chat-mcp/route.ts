/**
 * Enhanced Chat API with MCP Tool Integration
 * Integrates with Azure OpenAI and MCP tools for enhanced AI capabilities
 */

import { NextRequest } from 'next/server'
import { mcpClientManager } from '@/lib/mcp/client'

export async function POST(req: NextRequest) {
  const { messages, session_id, mcp_enabled = false, selected_tools = [] } = await req.json()

  // Get backend URL from environment variables
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8501"

  console.log("🔍 Debug Info:")
  console.log("Backend URL:", backendUrl)
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

    // If MCP is enabled and we have an initialized client, try MCP-enhanced chat
    if (mcp_enabled && mcpClientManager.hasConnectedServers()) {
      try {
        console.log("🔧 Using MCP-enhanced chat")
        return await handleMCPChat(cleanMessages, session_id, selected_tools)
      } catch (mcpError) {
        console.warn("⚠️ MCP chat failed, falling back to regular chat:", mcpError)
        // Fall through to regular backend chat
      }
    }

    // Forward to regular backend
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: cleanMessages,
        session_id,
      }),
    })

    console.log("🌐 Backend Response Status:", response.status)

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} - ${response.statusText}`)
    }

    // Create a transform stream to convert SSE to AI SDK format
    let streamFinished = false
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        if (streamFinished) return
        
        const text = new TextDecoder().decode(chunk)
        console.log("📥 Raw chunk:", text)

        // Split by lines and process each SSE event
        const lines = text.split("\n")

        for (const line of lines) {
          if (streamFinished) break
          
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim() // Remove 'data: ' prefix and trim

            // Handle the [DONE] signal
            if (jsonStr === "[DONE]") {
              console.log("✅ Stream completed with [DONE] signal")
              if (!streamFinished) {
                streamFinished = true
                const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
                try {
                  controller.enqueue(new TextEncoder().encode(finishChunk))
                } catch (error) {
                  console.warn("Controller already closed:", error)
                }
              }
              return
            }

            try {
              const data = JSON.parse(jsonStr)

              // Extract content from OpenAI format
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                const content = data.choices[0].delta.content
                console.log("📤 Extracted content:", content)

                // Pass through content as-is, chunk by chunk
                if (content.length > 0 && !streamFinished) {
                  const aiSdkChunk = `0:${JSON.stringify(content)}\n`
                  try {
                    controller.enqueue(new TextEncoder().encode(aiSdkChunk))
                  } catch (error) {
                    console.warn("Controller already closed while enqueueing content:", error)
                    streamFinished = true
                  }
                }
              }

              // Handle finish reason
              if (data.choices && data.choices[0] && data.choices[0].finish_reason && !streamFinished) {
                console.log("✅ Stream finished with reason:", data.choices[0].finish_reason)
                streamFinished = true
                const finishChunk = `e:{"finishReason":"${data.choices[0].finish_reason}","usage":{"promptTokens":0,"completionTokens":0}}\n`
                try {
                  controller.enqueue(new TextEncoder().encode(finishChunk))
                } catch (error) {
                  console.warn("Controller already closed:", error)
                }
              }
            } catch (parseError) {
              console.error("❌ Failed to parse SSE data:", parseError, "Raw line:", line)
            }
          }
        }
      },

      flush(controller) {
        console.log("🏁 Stream transform completed")
        if (!streamFinished) {
          const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
          try {
            controller.enqueue(new TextEncoder().encode(finishChunk))
          } catch (error) {
            console.warn("Controller already closed in flush:", error)
          }
        }
      },
    })

    const transformedStream = response.body?.pipeThrough(transformStream)

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("💥 Chat API error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStream = new ReadableStream({
      start(controller) {
        const escapedError = errorMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        const chunk = `0:"❌ Error: ${escapedError}"\n`
        controller.enqueue(new TextEncoder().encode(chunk))
        const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
        controller.enqueue(new TextEncoder().encode(finishChunk))
        controller.close()
      },
    })

    return new Response(errorStream, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }
}

/**
 * Handle MCP-enhanced chat with tool calling
 */
async function handleMCPChat(messages: any[], sessionId: string, selectedTools: string[]) {
  console.log("🔧 Starting MCP-enhanced chat")

  // Filter available tools to only selected ones
  const availableTools = mcpClientManager.getAllTools().filter(tool => 
    selectedTools.length === 0 || selectedTools.includes(tool.name)
  )

  console.log(`🛠️ Available tools: ${availableTools.map(t => t.name).join(', ')}`)

  // Use streaming chat with tools
  const chatOptions = {
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    tools: availableTools,
    maxTokens: 2000,
    temperature: 0.7,
    stream: true
  }

  // Create a streaming response that handles both AI responses and tool calls
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let accumulatedContent = ''
        let pendingToolCalls: any[] = []

        // Stream from MCP client
        const chatStream = mcpClientManager.streamChatWithTools(chatOptions)

        for await (const chunk of chatStream) {
          console.log("📦 MCP chunk:", chunk)

          // Handle content chunks
          if (chunk.content) {
            accumulatedContent += chunk.content
            const aiSdkChunk = `0:${JSON.stringify(chunk.content)}\n`
            controller.enqueue(new TextEncoder().encode(aiSdkChunk))
          }

          // Handle tool calls
          if (chunk.toolCalls) {
            pendingToolCalls = chunk.toolCalls
            console.log("🔧 Tool calls detected:", pendingToolCalls.map((tc: any) => tc.name))
          }

          // Handle tool results
          if (chunk.toolResults) {
            console.log("✅ Tool results received")
            
            // Send tool results as content
            for (const result of chunk.toolResults) {
              if (result.content) {
                for (const content of result.content) {
                  if (content.type === 'text' && content.text) {
                    const toolChunk = `0:${JSON.stringify('\n\n' + content.text)}\n`
                    controller.enqueue(new TextEncoder().encode(toolChunk))
                  }
                }
              }
            }
          }

          // Handle completion
          if (chunk.finishReason === 'stop' || chunk.finishReason === 'tool_calls') {
            console.log("🏁 MCP chat completed:", chunk.finishReason)
            const finishChunk = `e:{"finishReason":"${chunk.finishReason}","usage":{"promptTokens":0,"completionTokens":0}}\n`
            controller.enqueue(new TextEncoder().encode(finishChunk))
            break
          }
        }

        controller.close()
      } catch (error) {
        console.error("❌ MCP streaming error:", error)
        const errorChunk = `0:"❌ MCP Error: ${error instanceof Error ? error.message : 'Unknown error'}"\n`
        controller.enqueue(new TextEncoder().encode(errorChunk))
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
