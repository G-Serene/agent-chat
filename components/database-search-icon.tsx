"use client"

import { cn } from "@/lib/utils"

interface DatabaseSearchIconProps {
  className?: string
  size?: number
}

export function DatabaseSearchIcon({ className, size = 20 }: DatabaseSearchIconProps) {
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
        {/* Minimalist Database */}
        <ellipse 
          cx="9" 
          cy="6" 
          rx="5" 
          ry="2" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.5"
          className="dark:stroke-white transition-colors duration-200"
        />
        <path 
          d="M4 6v8c0 1.1 2.2 2 5 2s5-0.9 5-2V6" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.5"
          className="dark:stroke-white transition-colors duration-200"
        />
        <path 
          d="M4 10v4c0 1.1 2.2 2 5 2s5-0.9 5-2v-4" 
          fill="none" 
          stroke="#000000" 
          strokeWidth="1.5"
          className="dark:stroke-white transition-colors duration-200"
        />

        {/* Search Icon */}
        <circle 
          cx="17" 
          cy="17" 
          r="3" 
          fill="none" 
          stroke="#ef4444" 
          strokeWidth="1.5"
          className="transition-colors duration-200 hover:stroke-red-600"
        />
        <path 
          d="M19.5 19.5l2.5 2.5" 
          stroke="#ef4444" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          className="transition-colors duration-200 hover:stroke-red-600"
        />
      </svg>
    </div>
  )
}
