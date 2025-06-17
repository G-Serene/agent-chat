export async function POST(req: Request) {
  const { messages, session_id } = await req.json()

  // Get backend URL from environment variables
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8501"

  console.log("🔍 Debug Info:")
  console.log("Backend URL:", backendUrl)
  console.log("Session ID:", session_id)
  console.log("Total messages received:", messages.length)
  console.log("Messages received:", JSON.stringify(messages, null, 2))

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
    console.log("🧹 Cleaned messages:", JSON.stringify(cleanMessages, null, 2))

    // Forward the FULL conversation history to your Python backend
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: cleanMessages, // This should contain ALL messages, not just the latest
        session_id,
      }),
    })

    console.log("🌐 Backend Response Status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Backend Error Response:", errorText)
      throw new Error(`Backend error: ${response.status} - ${response.statusText}`)
    }

    // Create a transform stream to convert SSE to AI SDK format with word-by-word streaming
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
                // Send proper finish message format for AI SDK
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

              // Handle finish reason (alternative completion signal)
              if (data.choices && data.choices[0] && data.choices[0].finish_reason && !streamFinished) {
                console.log("✅ Stream finished with reason:", data.choices[0].finish_reason)
                streamFinished = true
                // Send proper finish message format for AI SDK
                const finishChunk = `e:{"finishReason":"${data.choices[0].finish_reason}","usage":{"promptTokens":0,"completionTokens":0}}\n`
                try {
                  controller.enqueue(new TextEncoder().encode(finishChunk))
                } catch (error) {
                  console.warn("Controller already closed:", error)
                }
              }
            } catch (parseError) {
              console.error("❌ Failed to parse SSE data:", parseError, "Raw line:", line)
              // Don't throw here, just continue processing other chunks
            }
          }
        }
      },

      flush(controller) {
        console.log("🏁 Stream transform completed")
        // Send final finish message if not already sent
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

    // Pipe the response through our transform stream
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

    // Return error in AI SDK streaming format
    const errorStream = new ReadableStream({
      start(controller) {
        const escapedError = errorMessage.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        const chunk = `0:"❌ Error: ${escapedError}"\n`
        controller.enqueue(new TextEncoder().encode(chunk))
        // Send proper finish message
        const finishChunk = `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
        controller.enqueue(new TextEncoder().encode(finishChunk))
        controller.close()
      },
    })

    return new Response(errorStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }
}
