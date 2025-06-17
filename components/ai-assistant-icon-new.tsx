"use client"

import { cn } from "@/lib/utils"

interface AIAssistantIconProps {
  className?: string
  size?: number
}

export function AIAssistantIcon({ className, size = 20 }: AIAssistantIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white"
      >
        {/* Large Star */}
        <path
          d="M12 1L15.09 8.26L22 9L17 14.74L18.18 21.02L12 17L5.82 21.02L7 14.74L2 9L8.91 8.26L12 1Z"
          fill="#FF8C00"
        />
        
        {/* Small Star */}
        <path
          d="M18 6L19.5 9L22 9.5L20 11.5L20.5 14L18 12.5L15.5 14L16 11.5L14 9.5L16.5 9L18 6Z"
          fill="#FF8C00"
        />
      </svg>
    </div>
  )
}
