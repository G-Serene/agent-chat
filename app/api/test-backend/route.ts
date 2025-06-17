export async function GET() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8501"

  try {
    console.log("🧪 Testing backend connection to:", backendUrl)

    // Test basic connectivity
    const response = await fetch(`${backendUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const isHealthy = response.ok
    const responseText = await response.text()

    return Response.json({
      backendUrl,
      status: response.status,
      statusText: response.statusText,
      healthy: isHealthy,
      response: responseText,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Backend test failed:", error)

    return Response.json(
      {
        backendUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        healthy: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
