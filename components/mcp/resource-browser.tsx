/**
 * MCP Resource Browser Component
 * Browse and select MCP resources for chat context
 */

"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Search, 
  Plus,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Database,
  Image,
  File
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MCPResource } from '@/lib/mcp/types'
import { useMCP } from './mcp-provider'

interface MCPResourceBrowserProps {
  selectedResources: string[]
  onSelectionChange: (selectedResources: string[]) => void
  onResourceAdd?: (resource: MCPResource) => void
  children?: React.ReactNode
  className?: string
}

interface ResourceWithServer extends MCPResource {
  serverName: string
}

export function MCPResourceBrowser({
  selectedResources,
  onSelectionChange,
  onResourceAdd,
  children,
  className
}: MCPResourceBrowserProps) {
  const { resources: availableResources, serverStatuses } = useMCP()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [localSelection, setLocalSelection] = useState<string[]>(selectedResources)

  // Create resource to server mapping from serverStatuses
  const resourceToServerMap = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(serverStatuses).forEach(([serverName, status]) => {
      status.resources.forEach(resource => {
        map[resource.uri] = serverName
      })
    })
    return map
  }, [serverStatuses])

  // Group resources by server
  const resourcesWithServer: ResourceWithServer[] = availableResources.map(resource => ({
    ...resource,
    serverName: resourceToServerMap[resource.uri] || 'unknown'
  }))

  const filteredResources = resourcesWithServer.filter(resource =>
    resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    resource.uri.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedResources = filteredResources.reduce((groups, resource) => {
    const server = resource.serverName
    if (!groups[server]) {
      groups[server] = []
    }
    groups[server].push(resource)
    return groups
  }, {} as Record<string, ResourceWithServer[]>)

  useEffect(() => {
    setLocalSelection(selectedResources)
  }, [selectedResources])

  const handleResourceToggle = (resourceUri: string) => {
    const newSelection = localSelection.includes(resourceUri)
      ? localSelection.filter(uri => uri !== resourceUri)
      : [...localSelection, resourceUri]
    
    setLocalSelection(newSelection)
  }

  const handleSelectAll = () => {
    const allResourceUris = filteredResources.map(resource => resource.uri)
    setLocalSelection(allResourceUris)
  }

  const handleSelectNone = () => {
    setLocalSelection([])
  }

  const handleApply = () => {
    onSelectionChange(localSelection)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalSelection(selectedResources)
    setIsOpen(false)
  }

  const handleAddToChat = (resource: ResourceWithServer) => {
    onResourceAdd?.(resource)
    // Also select the resource
    if (!localSelection.includes(resource.uri)) {
      setLocalSelection([...localSelection, resource.uri])
    }
  }

  const getResourceIcon = (resource: MCPResource) => {
    if (resource.mimeType) {
      if (resource.mimeType.startsWith('image/')) {
        return <Image className="h-4 w-4 text-accent" />
      }
      if (resource.mimeType.includes('json') || resource.mimeType.includes('application/')) {
        return <Database className="h-4 w-4 text-green-500" />
      }
    }
    
    if (resource.uri.startsWith('file://')) {
      return <File className="h-4 w-4 text-orange-500" />
    }
    
    return <FileText className="h-4 w-4 text-gray-500" />
  }

  const formatResourceType = (resource: MCPResource) => {
    if (resource.mimeType) {
      return resource.mimeType
    }
    
    if (resource.uri.startsWith('file://')) {
      return 'File'
    }
    
    if (resource.uri.startsWith('http://') || resource.uri.startsWith('https://')) {
      return 'Web Resource'
    }
    
    return 'Resource'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className={className}>
            <FileText className="h-4 w-4 mr-2" />
            Resources ({selectedResources.length})
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Browse MCP Resources
          </DialogTitle>
          <DialogDescription>
            Select resources to add as context for the AI assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search resources..."
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
                disabled={filteredResources.length === 0}
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
              {localSelection.length} of {availableResources.length} selected
            </Badge>
          </div>

          {/* Resources List */}
          <ScrollArea className="h-[400px] w-full border rounded-md">
            <div className="p-4">
              {Object.keys(groupedResources).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="text-sm text-muted-foreground">
                    {searchQuery ? 'No resources match your search' : 'No resources available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedResources).map(([serverName, resources]) => (
                    <div key={serverName}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {serverName}
                        </Badge>
                        <Separator className="flex-1" />
                      </div>
                      
                      <div className="space-y-2">
                        {resources.map((resource) => {
                          const isSelected = localSelection.includes(resource.uri)
                          
                          return (
                            <div
                              key={resource.uri}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                isSelected 
                                  ? "bg-primary/5 border-primary/20" 
                                  : "hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center pt-0.5">
                                <button
                                  onClick={() => handleResourceToggle(resource.uri)}
                                  className="p-0 border-0 bg-transparent"
                                >
                                  {isSelected ? (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                              
                              <div className="flex items-center pt-0.5">
                                {getResourceIcon(resource)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm truncate">{resource.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {formatResourceType(resource)}
                                  </Badge>
                                </div>
                                
                                {resource.description && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {resource.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <code className="bg-muted px-1 rounded text-xs truncate max-w-[200px]">
                                    {resource.uri}
                                  </code>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddToChat(resource)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                
                                {resource.uri.startsWith('http') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(resource.uri, '_blank')}
                                    className="h-8 w-8 p-0"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
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
