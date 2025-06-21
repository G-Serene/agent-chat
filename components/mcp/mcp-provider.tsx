/**
 * MCP Context Provider
 * Manages MCP client state and operations across the application
 */

"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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
  
  // Use ref for lastStatusUpdate to avoid it being a dependency
  const lastStatusUpdateRef = useRef<number>(0)

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
    // Debounce rapid successive calls (minimum 1 second between calls)
    const now = Date.now();
    if (now - lastStatusUpdateRef.current < 1000) {
      console.log('ℹ️ Debouncing MCP status check (too frequent)');
      return;
    }

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
        lastStatusUpdateRef.current = now
      } else {
        throw new Error(data.error || 'Failed to get MCP status')
      }
    } catch (err) {
      console.error('Failed to get MCP status:', err)
      setError(err instanceof Error ? err.message : 'Failed to get MCP status')
      setIsConnected(false)
      setConnectedCount(0)
    }
  }, []) // Stable - no dependencies

  // Initialize MCP client
  const initialize = useCallback(async () => {
    // Use a ref to check current loading state to avoid dependency on isLoading
    if (isLoading) {
      console.log('ℹ️ MCP initialization already in progress, skipping...');
      return;
    }

    if (isInitialized) {
      console.log('ℹ️ MCP already initialized, skipping...');
      return;
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Sending initialization request to MCP API...');
      
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
        console.log('✅ MCP client initialized successfully')
        
        // Refresh status after successful initialization
        await getStatus()
      } else {
        throw new Error(data.error || 'Failed to initialize MCP client')
      }
    } catch (err) {
      console.error('❌ Failed to initialize MCP client:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MCP client'
      setError(errorMessage)
      setIsInitialized(false)
      
      // Don't throw here to prevent breaking the component
      // The error state will be displayed in the UI
    } finally {
      setIsLoading(false)
    }
  }, [getStatus]) // Only depend on getStatus which is now stable

  // Refresh MCP connections
  const refreshConnections = useCallback(async () => {
    // Check current loading state without dependency
    if (isLoading) {
      console.log('ℹ️ MCP operation already in progress, skipping refresh...');
      return;
    }

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
  }, [getStatus]) // Only depend on getStatus which is now stable

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

  // Health check for MCP server availability
  const checkMCPServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      // First check if the backend MCP server is running by making a simple request
      const healthResponse = await fetch('http://localhost:8080/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: 'ping'
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return healthResponse.ok;
    } catch (err) {
      console.warn('⚠️ MCP server health check failed:', err);
      return false;
    }
  }, [])

  // Initialize on mount - connect to MCP server during startup
  useEffect(() => {
    let isComponentMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    let retryTimeout: NodeJS.Timeout | null = null;

    const initializeMCP = async (): Promise<void> => {
      try {
        console.log(`🚀 Starting MCP initialization attempt ${retryCount + 1}/${maxRetries}...`);
        
        // First, check if the MCP server is available
        console.log('🔍 Checking MCP server health...');
        const serverHealthy = await checkMCPServerHealth();
        
        if (!serverHealthy) {
          throw new Error('MCP server is not available at http://localhost:8080/mcp');
        }
        
        console.log('✅ MCP server health check passed');
        
        // Then attempt to initialize the MCP client manager
        if (isComponentMounted && !isInitialized) {
          console.log('🔄 Initializing MCP client manager...');
          await initialize();
        }
        
        // Finally get the current status
        if (isComponentMounted) {
          await getStatus();
        }
        
        console.log('✅ MCP startup initialization completed successfully');
      } catch (err) {
        console.error(`❌ MCP initialization attempt ${retryCount + 1} failed:`, err);
        
        retryCount++;
        if (retryCount < maxRetries && isComponentMounted) {
          console.log(`🔄 Retrying MCP initialization in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
          retryTimeout = setTimeout(() => {
            if (isComponentMounted) {
              initializeMCP();
            }
          }, retryDelay);
        } else {
          console.error('❌ All MCP initialization attempts failed');
          setError(err instanceof Error ? err.message : 'Failed to initialize MCP during startup');
        }
      }
    };

    // Only run on mount, not when dependencies change
    if (!isInitialized) {
      initializeMCP();
    }

    return () => {
      isComponentMounted = false;
      // Clear any pending retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []) // Empty dependency array to run only on mount

  // Auto-select all tools when they become available
  useEffect(() => {
    if (tools.length > 0 && selectedTools.length === 0) {
      // Generate unique tool IDs from server statuses for auto-selection
      const allToolIds: string[] = []
      Object.entries(serverStatuses).forEach(([serverName, status]) => {
        status.tools.forEach(tool => {
          allToolIds.push(`${serverName}::${tool.name}`)
        })
      })
      setSelectedTools(allToolIds)
    }
  }, [tools, selectedTools.length, setSelectedTools, serverStatuses])

  // Auto-reconnection mechanism - periodically check and reconnect if needed
  useEffect(() => {
    if (!isInitialized || isConnected) {
      return; // Don't start reconnection if not initialized or already connected
    }

    console.log('🔄 Starting auto-reconnection monitoring...');
    
    const reconnectInterval = setInterval(async () => {
      try {
        console.log('🔍 Checking for MCP server availability...');
        const serverHealthy = await checkMCPServerHealth();
        
        if (serverHealthy && !isConnected && !isLoading) {
          console.log('✅ MCP server is back online, attempting to reconnect...');
          await refreshConnections();
        }
      } catch (err) {
        console.warn('⚠️ Auto-reconnection check failed:', err);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(reconnectInterval);
    };
  }, [isInitialized, isConnected, isLoading, checkMCPServerHealth, refreshConnections]) // Add stable functions back

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
