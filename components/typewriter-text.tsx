"use client"

import { useState, useEffect, useRef } from "react"

interface TypewriterTextProps {
  text: string
  speed?: number
  isStreaming?: boolean
  shouldAnimate?: boolean
  onComplete?: () => void
  className?: string
}

export function TypewriterText({
  text,
  speed = 30,
  isStreaming = false,
  shouldAnimate = true,
  onComplete,
  className = "",
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    // If we shouldn't animate, just show the full text immediately
    if (!shouldAnimate) {
      setDisplayedText(text)
      return
    }

    // Only start animation once
    if (!hasStartedRef.current && text.length > 0) {
      hasStartedRef.current = true
      setIsAnimating(true)
      setDisplayedText("")

      let currentIndex = 0

      intervalRef.current = setInterval(() => {
        currentIndex++
        setDisplayedText(text.slice(0, currentIndex))

        if (currentIndex >= text.length) {
          setIsAnimating(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onComplete?.()
        }
      }, speed)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [text, speed, shouldAnimate, onComplete])

  // If not animating or animation is complete, show full text
  if (!shouldAnimate || (!isAnimating && displayedText.length >= text.length)) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {displayedText}
      {isAnimating && <span className="animate-pulse text-red-500">|</span>}
    </span>
  )
}
