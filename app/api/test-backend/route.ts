export async function GET() {
  // This endpoint is deprecated since backend URL integration has been removed
  // The application now uses MCP client integration instead
  
  return Response.json(
    {
      message: "Backend URL testing is no longer available. The application now uses MCP client integration.",
      healthy: false,
      deprecated: true,
      timestamp: new Date().toISOString(),
    },
    { status: 410 } // 410 Gone - indicates this resource is no longer available
  )
}
