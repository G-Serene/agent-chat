/**
 * MCP Tool Selector Component
 * Allows users to select and configure MCP tools for chat
 */

"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Wrench, 
  Search, 
  Settings,
  CheckCircle2,
  Circle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MCPTool } from '@/lib/mcp/types'
import { useMCP } from './mcp-provider'

interface MCPToolSelectorProps {
  selectedTools: string[]
  onSelectionChange: (selectedTools: string[]) => void
  children?: React.ReactNode
  className?: string
}

interface ToolWithServer extends MCPTool {
  serverName: string
}

export function MCPToolSelector({
  selectedTools,
  onSelectionChange,
  children,
  className
}: MCPToolSelectorProps) {
  const { tools: availableTools, serverStatuses } = useMCP()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [localSelection, setLocalSelection] = useState<string[]>(selectedTools)

  // Create tool to server mapping from serverStatuses
  const toolToServerMap = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(serverStatuses).forEach(([serverName, status]) => {
      status.tools.forEach(tool => {
        map[tool.name] = serverName
      })
    })
    return map
  }, [serverStatuses])

  // Group tools by server
  const toolsWithServer: ToolWithServer[] = availableTools.map(tool => ({
    ...tool,
    serverName: toolToServerMap[tool.name] || 'unknown'
  }))

  const filteredTools = toolsWithServer.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const groupedTools = filteredTools.reduce((groups, tool) => {
    const server = tool.serverName
    if (!groups[server]) {
      groups[server] = []
    }
    groups[server].push(tool)
    return groups
  }, {} as Record<string, ToolWithServer[]>)

  useEffect(() => {
    setLocalSelection(selectedTools)
  }, [selectedTools])

  const handleToolToggle = (toolName: string) => {
    const newSelection = localSelection.includes(toolName)
      ? localSelection.filter(name => name !== toolName)
      : [...localSelection, toolName]
    
    setLocalSelection(newSelection)
  }

  const handleSelectAll = () => {
    const allToolNames = filteredTools.map(tool => tool.name)
    setLocalSelection(allToolNames)
  }

  const handleSelectNone = () => {
    setLocalSelection([])
  }

  const handleApply = () => {
    onSelectionChange(localSelection)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalSelection(selectedTools)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className={className}>
            <Wrench className="h-4 w-4 mr-2" />
            Tools ({selectedTools.length})
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select MCP Tools
          </DialogTitle>
          <DialogDescription>
            Choose which tools are available for the AI assistant to use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredTools.length === 0}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectNone}
                disabled={localSelection.length === 0}
              >
                Select None
              </Button>
            </div>
            <Badge variant="secondary">
              {localSelection.length} of {availableTools.length} selected
            </Badge>
          </div>

          {/* Tools List */}
          <ScrollArea className="h-[400px] w-full border rounded-md">
            <div className="p-4">
              {Object.keys(groupedTools).length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No tools match your search' : 'No tools available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTools).map(([serverName, tools]) => (
                    <div key={serverName}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {serverName}
                        </Badge>
                        <Separator className="flex-1" />
                      </div>
                      
                      <div className="space-y-2">
                        {tools.map((tool) => {
                          const isSelected = localSelection.includes(tool.name)
                          
                          return (
                            <div
                              key={tool.name}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                isSelected 
                                  ? "bg-primary/5 border-primary/20" 
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => handleToolToggle(tool.name)}
                            >
                              <div className="flex items-center pt-0.5">
                                {isSelected ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{tool.name}</span>
                                  <Wrench className="h-3 w-3 text-muted-foreground" />
                                </div>
                                
                                <p className="text-xs text-muted-foreground mb-2">
                                  {tool.description}
                                </p>
                                
                                {/* Input Schema Info */}
                                {tool.inputSchema?.properties && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Info className="h-3 w-3" />
                                    <span>
                                      Parameters: {Object.keys(tool.inputSchema.properties).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
