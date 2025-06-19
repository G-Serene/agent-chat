"use client"

import { cn } from "@/lib/utils"

interface AIAssistantIconProps {
  className?: string
  size?: number
}

export function AIAssistantIcon({ className, size = 20 }: AIAssistantIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center transition-transform duration-200 hover:scale-105", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-colors duration-200"
      >
        {/* Minimalist AI Symbol - Simple geometric shapes */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="#ef4444"
          className="transition-colors duration-200 hover:fill-red-600"
        />
        
        {/* Connecting lines for AI network representation */}
        <path
          d="M12 2L12 6M12 18L12 22M22 12L18 12M6 12L2 12M19.07 4.93L16.95 7.05M7.05 16.95L4.93 19.07M19.07 19.07L16.95 16.95M7.05 7.05L4.93 4.93"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="dark:stroke-white transition-colors duration-200"
        />
      </svg>
    </div>
  )
}
