"use client"

import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface AIAssistantIconProps {
  className?: string
  size?: number
}

export function AIAssistantIcon({ className, size = 20 }: AIAssistantIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-110 hover:rotate-3 group", className)}>
      <Sparkles 
        size={size} 
        className="text-blue-500 transition-all duration-300 hover:text-blue-600 hover:drop-shadow-lg" 
      />
    </div>
  )
}
