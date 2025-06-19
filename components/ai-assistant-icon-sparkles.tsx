"use client"

import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface AIAssistantIconProps {
  className?: string
  size?: number
}

export function AIAssistantIcon({ className, size = 20 }: AIAssistantIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105 group", className)}>
      <Sparkles 
        size={size} 
        className="text-red-500 transition-all duration-200 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" 
      />
    </div>
  )
}
