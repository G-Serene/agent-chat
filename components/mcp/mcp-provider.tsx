/**
 * MCP Context Provider
 * Manages MCP client state and operations across the application
 */

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { MCPTool, MCPResource, MCPPrompt, MCPClientStatus } from '@/lib/mcp/types'

interface MCPContextType {
  // State
  isInitialized: boolean
  isConnected: boolean
  connectedCount: number
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  serverStatuses: Record<string, MCPClientStatus>
  selectedTools: string[]
  selectedResources: string[]
  isLoading: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  refreshConnections: () => Promise<void>
  executeTool: (toolName: string, args: Record<string, any>) => Promise<any>
  setSelectedTools: (tools: string[]) => void
  setSelectedResources: (resources: string[]) => void
  getStatus: () => Promise<void>
}

const MCPContext = createContext<MCPContextType | null>(null)

export function useMCP() {
  const context = useContext(MCPContext)
  if (!context) {
    throw new Error('useMCP must be used within MCPProvider')
  }
  return context
}

interface MCPProviderProps {
  children: React.ReactNode
}

export function MCPProvider({ children }: MCPProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedCount, setConnectedCount] = useState(0)
  const [tools, setTools] = useState<MCPTool[]>([])
  const [resources, setResources] = useState<MCPResource[]>([])
  const [prompts, setPrompts] = useState<MCPPrompt[]>([])
  const [serverStatuses, setServerStatuses] = useState<Record<string, MCPClientStatus>>({})
  const [selectedTools, setSelectedToolsState] = useState<string[]>([])
  const [selectedResources, setSelectedResourcesState] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load persisted selections from localStorage
  useEffect(() => {
    const savedTools = localStorage.getItem('mcp-selected-tools')
    const savedResources = localStorage.getItem('mcp-selected-resources')
    
    if (savedTools) {
      try {
        setSelectedToolsState(JSON.parse(savedTools))
      } catch (e) {
        console.warn('Failed to parse saved tools:', e)
      }
    }
    
    if (savedResources) {
      try {
        setSelectedResourcesState(JSON.parse(savedResources))
      } catch (e) {
        console.warn('Failed to parse saved resources:', e)
      }
    }
  }, [])

  // Save selections to localStorage
  const setSelectedTools = useCallback((tools: string[]) => {
    setSelectedToolsState(tools)
    localStorage.setItem('mcp-selected-tools', JSON.stringify(tools))
  }, [])

  const setSelectedResources = useCallback((resources: string[]) => {
    setSelectedResourcesState(resources)
    localStorage.setItem('mcp-selected-resources', JSON.stringify(resources))
  }, [])

  // Get MCP status from API
  const getStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setTools(data.data.tools || [])
        setResources(data.data.resources || [])
        setPrompts(data.data.prompts || [])
        setServerStatuses(data.data.serverStatuses || {})
        setIsConnected(data.data.connected || false)
        setConnectedCount(data.data.connectedCount || 0)
        setError(null)
      } else {
        throw new Error(data.error || 'Failed to get MCP status')
      }
    } catch (err) {
      console.error('Failed to get MCP status:', err)
      setError(err instanceof Error ? err.message : 'Failed to get MCP status')
      setIsConnected(false)
      setConnectedCount(0)
    }
  }, [])

  // Initialize MCP client
  const initialize = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'initialize'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setIsInitialized(true)
        await getStatus() // Refresh status after initialization
        console.log('✅ MCP client initialized successfully')
      } else {
        throw new Error(data.error || 'Failed to initialize MCP client')
      }
    } catch (err) {
      console.error('Failed to initialize MCP client:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize MCP client')
      setIsInitialized(false)
    } finally {
      setIsLoading(false)
    }
  }, [getStatus])

  // Refresh MCP connections
  const refreshConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'refreshConnections'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        await getStatus() // Refresh status after reconnection
        console.log('✅ MCP connections refreshed successfully')
      } else {
        throw new Error(data.error || 'Failed to refresh connections')
      }
    } catch (err) {
      console.error('Failed to refresh MCP connections:', err)
      setError(err instanceof Error ? err.message : 'Failed to refresh connections')
    } finally {
      setIsLoading(false)
    }
  }, [getStatus])

  // Execute MCP tool
  const executeTool = useCallback(async (toolName: string, args: Record<string, any>) => {
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'executeTool',
          toolName,
          arguments: args
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        return data.result
      } else {
        throw new Error(data.error || 'Tool execution failed')
      }
    } catch (err) {
      console.error(`Failed to execute tool ${toolName}:`, err)
      throw err
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    const initializeMCP = async () => {
      try {
        await getStatus()
        
        // Auto-initialize if not already initialized and we have servers configured
        if (!isInitialized && Object.keys(serverStatuses).length > 0) {
          await initialize()
        }
      } catch (err) {
        console.warn('Failed to auto-initialize MCP:', err)
      }
    }

    initializeMCP()
  }, []) // Empty dependency array for mount-only effect

  // Auto-select all tools when they become available
  useEffect(() => {
    if (tools.length > 0 && selectedTools.length === 0) {
      const allToolNames = tools.map(tool => tool.name)
      setSelectedTools(allToolNames)
    }
  }, [tools, selectedTools.length, setSelectedTools])

  const value: MCPContextType = {
    // State
    isInitialized,
    isConnected,
    connectedCount,
    tools,
    resources,
    prompts,
    serverStatuses,
    selectedTools,
    selectedResources,
    isLoading,
    error,

    // Actions
    initialize,
    refreshConnections,
    executeTool,
    setSelectedTools,
    setSelectedResources,
    getStatus
  }

  return (
    <MCPContext.Provider value={value}>
      {children}
    </MCPContext.Provider>
  )
}
