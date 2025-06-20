/**
 * MCP API Routes for Frontend
 * Handles MCP client operations and tool execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { mcpClientManager } from '@/lib/mcp/client'

export async function GET() {
  try {
    // Get all available tools, resources, and server statuses
    const tools = mcpClientManager.getAllTools()
    const resources = mcpClientManager.getAllResources()
    const prompts = mcpClientManager.getAllPrompts()
    const serverStatuses = Object.fromEntries(mcpClientManager.getServerStatuses())
    const health = mcpClientManager.getConnectionHealth()

    return NextResponse.json({
      success: true,
      data: {
        tools,
        resources,
        prompts,
        serverStatuses,
        connected: mcpClientManager.hasConnectedServers(),
        connectedCount: mcpClientManager.getConnectedServerCount(),
        health
      }
    })
  } catch (error) {
    console.error('Failed to get MCP status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'initialize':
        // Azure OpenAI config now comes from environment variables
        await mcpClientManager.initialize()
        return NextResponse.json({ success: true, message: 'MCP client initialized' })

      case 'executeTool':
        const { toolName, arguments: toolArgs } = params
        const result = await mcpClientManager.executeTool(toolName, toolArgs)
        return NextResponse.json({ success: true, result })

      case 'refreshConnections':
        // Use intelligent refresh instead of aggressive disconnect/reconnect
        await mcpClientManager.refreshConnections()
        return NextResponse.json({ success: true, message: 'Connections refreshed' })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('MCP API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
