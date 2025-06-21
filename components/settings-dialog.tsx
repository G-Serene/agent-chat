"use client"

import type React from "react"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Download,
  Upload,
  Palette,
  Database,
  MessageSquare,
  Shield,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { ChatStorage } from "@/lib/chat-storage"
import { useMCP } from "@/components/mcp/mcp-provider"
import { MCPStatus } from "@/components/mcp/mcp-status"
import { MCPToolSelector } from "@/components/mcp/tool-selector"
import { MCPResourceBrowser } from "@/components/mcp/resource-browser"

interface SettingsDialogProps {
  onClearHistory: () => void
  totalSessions: number
}

export function SettingsDialog({ onClearHistory, totalSessions }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const mcp = useMCP()
  const [open, setOpen] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  const handleClearHistory = () => {
    try {
      // Clear all chat sessions
      localStorage.removeItem("agent-chat-sessions")
      localStorage.removeItem("agent-chat-current-session")

      onClearHistory()
      toast.success("Chat history cleared successfully")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to clear chat history")
    }
  }

  const handleExportData = () => {
    try {
      const sessions = ChatStorage.getAllSessions()
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        sessions: sessions,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `agent-chat-backup-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Chat history exported successfully")
    } catch (error) {
      toast.error("Failed to export chat history")
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)

        if (importData.sessions && Array.isArray(importData.sessions)) {
          // Merge with existing sessions
          const existingSessions = ChatStorage.getAllSessions()
          const mergedSessions = [...existingSessions, ...importData.sessions]

          localStorage.setItem("agent-chat-sessions", JSON.stringify(mergedSessions))
          toast.success(`Imported ${importData.sessions.length} chat sessions`)

          // Refresh the page to reload sessions
          window.location.reload()
        } else {
          throw new Error("Invalid backup file format")
        }
      } catch (error) {
        toast.error("Failed to import chat history. Please check the file format.")
      }
    }
    reader.readAsText(file)

    // Reset the input
    event.target.value = ""
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="w-4 h-4" />
      case "light":
        return <Sun className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
        >
          <Settings className="w-5 h-5 text-slate-500" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>Customize your Agent Chat experience and manage your data.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-red-500" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-red-500" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="mcp" className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-red-500" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="w-4 h-4 text-red-500" />
              Data
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="theme">Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {getThemeIcon()}
                          <span className="capitalize">{theme}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="compact-mode">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                  </div>
                  <Switch id="compact-mode" checked={compactMode} onCheckedChange={setCompactMode} />
                </div>
              </div>
            </TabsContent>

            {/* Chat Settings Tab */}
            <TabsContent value="chat" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-save">Auto-save Conversations</Label>
                    <p className="text-sm text-muted-foreground">Automatically save chat sessions</p>
                  </div>
                  <Switch id="auto-save" checked={autoSave} onCheckedChange={setAutoSave} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications">Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show system notifications</p>
                  </div>
                  <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
                </div>
              </div>
            </TabsContent>

            {/* MCP Settings Tab */}
            <TabsContent value="mcp" className="space-y-6 mt-0">
              <div className="space-y-6">
                {/* MCP Connection Status */}
                <div className="space-y-2">
                  <Label>Connection Status</Label>
                  <MCPStatus
                    onRefresh={() => {
                      mcp.refreshConnections()
                      toast.success("MCP connections refreshed")
                    }}
                    className="w-full"
                  />
                </div>

                {/* Tool Selection */}
                <div className="space-y-2">
                  <Label>Available Tools</Label>
                  <p className="text-sm text-muted-foreground">
                    Select which MCP tools to make available in your chat
                  </p>
                  <MCPToolSelector
                    selectedTools={mcp.selectedTools}
                    onSelectionChange={mcp.setSelectedTools}
                  >
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Wrench className="h-4 w-4 mr-2" />
                      Configure Tools ({mcp.selectedTools.length} selected)
                    </Button>
                  </MCPToolSelector>
                </div>

                {/* Resource Selection */}
                <div className="space-y-2">
                  <Label>Resource Browser</Label>
                  <p className="text-sm text-muted-foreground">
                    Browse and select MCP resources to include in your chat context
                  </p>
                  <MCPResourceBrowser
                    selectedResources={mcp.selectedResources}
                    onSelectionChange={mcp.setSelectedResources}
                  >
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Database className="h-4 w-4 mr-2" />
                      Browse Resources ({mcp.selectedResources.length} selected)
                    </Button>
                  </MCPResourceBrowser>
                </div>

                {/* MCP Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-lg font-semibold text-accent">{mcp.connectedCount}</div>
                    <div className="text-xs text-muted-foreground">Connected Servers</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <div className="text-lg font-semibold text-green-600">{mcp.tools.length}</div>
                    <div className="text-xs text-muted-foreground">Available Tools</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Management Tab */}
            <TabsContent value="data" className="space-y-6 mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Chat History</Label>
                    <p className="text-sm text-muted-foreground">
                      You have {totalSessions} saved conversation{totalSessions !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {totalSessions} sessions
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportData} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("import-file")?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import Data
                  </Button>
                  <input id="import-file" type="file" accept=".json" onChange={handleImportData} className="hidden" />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="w-5 h-5 text-destructive" />
                          Clear Chat History
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all your saved conversations ({totalSessions} sessions). This
                          action cannot be undone. Consider exporting your data first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearHistory}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Clear All History
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>

            {/* Privacy & Security Tab */}
            <TabsContent value="privacy" className="space-y-6 mt-0">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Chat data is stored locally in your browser</p>
                <p>• No data is sent to third parties without your consent</p>
                <p>• You can export or delete your data at any time</p>
                <p>• Backend communication is encrypted (HTTPS)</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              toast.success("Settings saved successfully")
              setOpen(false)
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
