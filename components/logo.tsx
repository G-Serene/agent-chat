"use client"

import { SVGProps } from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends SVGProps<SVGSVGElement> {
  /** Path to the SVG logo file in the public directory (light theme) */
  src?: string
  /** Path to the SVG logo file for dark theme (optional) */
  srcDark?: string
  /** Alternative text for the logo */
  alt?: string
  /** Logo width */
  width?: number
  /** Logo height */
  height?: number
  /** Maximum width for responsive sizing */
  maxWidth?: number
  /** Fallback text to display if logo is not available */
  fallbackText?: string
  /** Show fallback text alongside logo */
  showText?: boolean
}

export function Logo({ 
  src,
  srcDark,
  alt = "Logo",
  width = 200,
  height = 40,
  maxWidth = 250,
  fallbackText = "Agent Chat",
  showText = false,
  className,
  ...props 
}: LogoProps) {
  // If no src is provided, show fallback text
  if (!src) {
    return (
      <div className={cn("flex items-center", className)}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {fallbackText}
        </h1>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Light theme logo - hidden in dark mode */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ maxWidth: `${maxWidth}px` }}
        className="h-auto object-contain block dark:hidden"
        onError={(e) => {
          // If image fails to load, hide it and show fallback text
          e.currentTarget.style.display = 'none'
          const fallback = e.currentTarget.parentElement?.querySelector('h1') as HTMLElement
          if (fallback) {
            fallback.style.display = 'block'
          }
        }}
      />
      
      {/* Dark theme logo - hidden in light mode */}
      {srcDark && (
        <img
          src={srcDark}
          alt={alt}
          width={width}
          height={height}
          style={{ maxWidth: `${maxWidth}px` }}
          className="h-auto object-contain hidden dark:block"
          onError={(e) => {
            // If image fails to load, hide it and show fallback text
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.parentElement?.querySelector('h1') as HTMLElement
            if (fallback) {
              fallback.style.display = 'block'
            }
          }}
        />
      )}
      
      <h1 
        className={cn(
          "text-3xl font-bold tracking-tight text-foreground",
          !showText && "hidden"
        )}
        style={{ display: showText ? 'block' : 'none' }}
      >
        {fallbackText}
      </h1>
    </div>
  )
}
