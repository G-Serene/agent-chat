/**
 * MCP Status Component
 * Shows connection status and available tools from MCP servers
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Wrench,
  FileText,
  MessageSquare,
  Wifi,
  WifiOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MCPClientStatus } from '@/lib/mcp/types'
import { useMCP } from './mcp-provider'

interface MCPStatusProps {
  onRefresh?: () => void
  onToolSelect?: (toolName: string) => void
  className?: string
}

export function MCPStatus({ onRefresh, onToolSelect, className }: MCPStatusProps) {
  const { serverStatuses, isLoading, refreshConnections } = useMCP()
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set())

  const handleRefresh = async () => {
    try {
      await refreshConnections()
      await onRefresh?.()
    } catch (error) {
      console.error('Failed to refresh MCP status:', error)
    }
  }

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers)
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName)
    } else {
      newExpanded.add(serverName)
    }
    setExpandedServers(newExpanded)
  }

  const statusValues = Object.values(serverStatuses)
  const connectedCount = statusValues.filter(s => s.connected).length
  const totalCount = statusValues.length

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connectedCount > 0 ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <CardTitle className="text-sm">MCP Servers</CardTitle>
            <Badge variant={connectedCount > 0 ? "default" : "destructive"} className="text-xs">
              {connectedCount}/{totalCount}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Model Context Protocol server connections
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {totalCount === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No MCP servers configured
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(serverStatuses).map(([serverName, status]) => (
              <Collapsible
                key={serverName}
                open={expandedServers.has(serverName)}
                onOpenChange={() => toggleServer(serverName)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-2 justify-start"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {status.connected ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{serverName}</span>
                        {status.error && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {status.connected && (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {status.tools.length} tools
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {status.resources.length} resources
                            </Badge>
                          </>
                        )}
                        {expandedServers.has(serverName) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="px-2 pb-2">
                  {status.error ? (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                      {status.error}
                    </div>
                  ) : status.connected ? (
                    <div className="space-y-3">
                      {/* Tools */}
                      {status.tools.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <Wrench className="h-3 w-3 text-accent" />
                            <span className="text-xs font-medium">Tools</span>
                          </div>
                          <div className="space-y-1">
                            {status.tools.map((tool) => (
                              <Button
                                key={tool.name}
                                variant="ghost"
                                size="sm"
                                className="w-full h-auto p-1 justify-start text-xs"
                                onClick={() => onToolSelect?.(tool.name)}
                              >
                                <div className="text-left">
                                  <div className="font-medium">{tool.name}</div>
                                  <div className="text-muted-foreground text-xs truncate">
                                    {tool.description}
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resources */}
                      {status.resources.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <FileText className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium">Resources</span>
                          </div>
                          <div className="space-y-1">
                            {status.resources.map((resource) => (
                              <div
                                key={resource.uri}
                                className="p-1 text-xs bg-muted/50 rounded"
                              >
                                <div className="font-medium">{resource.name}</div>
                                {resource.description && (
                                  <div className="text-muted-foreground">
                                    {resource.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prompts */}
                      {status.prompts.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <MessageSquare className="h-3 w-3 text-purple-500" />
                            <span className="text-xs font-medium">Prompts</span>
                          </div>
                          <div className="space-y-1">
                            {status.prompts.map((prompt) => (
                              <div
                                key={prompt.name}
                                className="p-1 text-xs bg-muted/50 rounded"
                              >
                                <div className="font-medium">{prompt.name}</div>
                                {prompt.description && (
                                  <div className="text-muted-foreground">
                                    {prompt.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground p-2">
                      Server not connected
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
