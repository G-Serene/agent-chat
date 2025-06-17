"use client"

import { cn } from "@/lib/utils"

interface DatabaseSearchIconProps {
  className?: string
  size?: number
}

export function DatabaseSearchIcon({ className, size = 20 }: DatabaseSearchIconProps) {
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
        {/* Single Database */}
        <ellipse cx="9" cy="6" rx="5" ry="2" fill="currentColor" stroke="currentColor" strokeWidth="1" />
        <path d="M4 6v8c0 1.1 2.2 2 5 2s5-0.9 5-2V6" fill="currentColor" stroke="currentColor" strokeWidth="1" />
        <path d="M4 10v4c0 1.1 2.2 2 5 2s5-0.9 5-2v-4" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M4 14v2c0 1.1 2.2 2 5 2s5-0.9 5-2v-2" fill="none" stroke="currentColor" strokeWidth="1" />

        {/* Data indicators */}
        <rect x="7" y="8" width="1.5" height="0.8" rx="0.4" fill="white" opacity="0.9" />
        <rect x="9" y="8" width="1.5" height="0.8" rx="0.4" fill="white" opacity="0.9" />
        <rect x="7" y="12" width="1.5" height="0.8" rx="0.4" fill="white" opacity="0.9" />
        <rect x="9" y="12" width="1.5" height="0.8" rx="0.4" fill="white" opacity="0.9" />

        {/* Magnifying Glass */}
        <g className="animate-pulse">
          <circle cx="17" cy="17" r="3" fill="#60A5FA" fillOpacity="0.9" stroke="#1E40AF" strokeWidth="1.5" />
          <circle cx="17" cy="17" r="2" fill="#DBEAFE" fillOpacity="0.7" />
          <path d="M19.5 19.5l2.5 2.5" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}
