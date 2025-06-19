"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SettingsDialog } from "@/components/settings-dialog"
import { PlusCircle, HelpCircle, MessageSquare, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatSession {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  messageCount: number
}

interface SidebarProps {
  onNewChat: () => void
  chatSessions: ChatSession[]
  currentSessionId: string
  onSessionSelect: (sessionId: string) => void
  onSessionDelete: (sessionId: string) => void
  onClearHistory: () => void
}

export function Sidebar({
  onNewChat,
  chatSessions,
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
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header / New Chat */}
      <div className="p-4 border-b">
        <Button
          onClick={onNewChat}
          className="w-full justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-base py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 dark:bg-slate-600 dark:hover:bg-slate-700"
        >
          <PlusCircle className="w-5 h-5 text-red-500" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {chatSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group relative rounded-lg transition-colors duration-150",
                  session.id === currentSessionId ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-muted/80",
                )}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto p-3 text-left rounded-lg transition-colors duration-150",
                    session.id === currentSessionId
                      ? "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      : "hover:bg-muted/80",
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(session.id === currentSessionId ? "bg-slate-200 dark:bg-slate-700" : "bg-muted")}
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
                        "font-semibold text-sm truncate",
                        session.id === currentSessionId ? "text-slate-900 dark:text-slate-100" : "text-foreground",
                      )}
                    >
                      {session.title}
                    </div>
                    <div
                      className={cn(
                        "text-xs truncate",
                        session.id === currentSessionId
                          ? "text-slate-600 dark:text-slate-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {session.lastMessage}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={cn(
                          "text-xs",
                          session.id === currentSessionId
                            ? "text-slate-500 dark:text-slate-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatTimestamp(session.timestamp)}
                      </div>
                      <div
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full bg-muted",
                          session.id === currentSessionId
                            ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            : "text-muted-foreground",
                        )}
                      >
                        {session.messageCount}
                      </div>
                    </div>
                  </div>
                </Button>

                {/* Delete button - only show on hover and not for current session */}
                {session.id !== currentSessionId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSessionDelete(session.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t mt-auto">
        <div className="space-y-1">
          <SettingsDialog onClearHistory={onClearHistory} totalSessions={chatSessions.length} />
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
