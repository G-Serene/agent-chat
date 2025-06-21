"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SettingsDialog } from "@/components/settings-dialog"
import { PlusCircle, HelpCircle, MessageSquare, Trash2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

interface TimelineGroup {
  label: string
  sessions: ChatSession[]
  sortOrder: number
}

interface SidebarProps {
  onNewChat: () => void
  timelineGroups: TimelineGroup[]
  currentSessionId: string
  onSessionSelect: (sessionId: string) => void
  onSessionDelete: (sessionId: string) => void
  onClearHistory: () => void
}

export function Sidebar({
  onNewChat,
  timelineGroups,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
  onClearHistory,
}: SidebarProps) {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString()
    }
  }
  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 text-sidebar-foreground">
      {/* Header / New Chat */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-base py-3 px-4 rounded-lg border-0 transition-all duration-200"
        ><div className="w-5 h-5 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {timelineGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          ) : (
            timelineGroups.map((group) => (
              <div key={group.label} className="space-y-2">
                {/* Timeline Group Header */}
                <div className="px-3 py-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </h3>
                </div>
                
                {/* Sessions in this group */}
                <div className="space-y-1">
                  {group.sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "group relative rounded-lg transition-colors duration-150",
                        session.id === currentSessionId ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-muted/80",
                      )}
                    >
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start items-center gap-3 h-auto min-h-[3rem] p-3 pr-16 text-left rounded-lg transition-colors duration-150",
                          session.id === currentSessionId
                            ? "bg-red-50 text-red-900 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-100 dark:hover:bg-red-800/30"
                            : "hover:bg-muted/80",
                        )}
                        onClick={() => onSessionSelect(session.id)}
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback
                            className={cn(session.id === currentSessionId ? "bg-red-100 dark:bg-red-800/40" : "bg-muted")}
                          >
                            <MessageSquare
                              className={cn(
                                "w-4 h-4",
                                session.id === currentSessionId
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground",
                              )}
                            />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden min-w-0">
                          <div
                            className={cn(
                              "font-semibold text-sm break-words overflow-wrap-anywhere word-break-break-word hyphens-auto line-clamp-2",
                              session.id === currentSessionId ? "text-black dark:text-white" : "text-foreground",
                            )}
                            title={session.title}
                          >
                            {session.title}
                          </div>
                        </div>
                      </Button>

                      {/* Metadata positioned in top-right */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
                        <div
                          className={cn(
                            "text-xs font-medium",
                            session.id === currentSessionId
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatTimestamp(session.timestamp)}
                        </div>
                        <div
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full bg-muted min-w-[1.5rem] text-center font-medium",
                            session.id === currentSessionId
                              ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                              : "text-muted-foreground",
                          )}
                        >
                          {session.messageCount}
                        </div>
                      </div>

                      {/* Delete button - only show on hover and not for current session */}
                      {session.id !== currentSessionId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute bottom-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 pointer-events-auto"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSessionDelete(session.id)
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t mt-auto">
        <div className="space-y-1">
          <SettingsDialog 
            onClearHistory={onClearHistory} 
            totalSessions={timelineGroups.reduce((total, group) => total + group.sessions.length, 0)} 
          />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg"
          >
            <HelpCircle className="w-5 h-5 text-red-500" />
            Help & Support
          </Button>
        </div>
      </div>
    </div>
  )
}
