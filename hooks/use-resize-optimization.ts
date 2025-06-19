import { useCallback, useRef } from 'react'

/**
 * Custom hook for throttled resizing operations
 * Uses requestAnimationFrame for smooth performance
 */
export function useThrottledResize(callback: (value: number) => void, threshold: number = 2) {
  const lastValueRef = useRef<number>(0)
  const frameIdRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref up to date
  callbackRef.current = callback

  const throttledCallback = useCallback((newValue: number) => {
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current)
    }

    frameIdRef.current = requestAnimationFrame(() => {
      // Only update if the change is significant
      if (Math.abs(lastValueRef.current - newValue) >= threshold) {
        lastValueRef.current = newValue
        callbackRef.current(newValue)
      }
      frameIdRef.current = null
    })
  }, [threshold])

  return throttledCallback
}

/**
 * Custom hook for optimized drag operations
 * Prevents unnecessary renders during drag operations
 */
export function useDragOptimization() {
  const isDraggingRef = useRef(false)

  const startDrag = useCallback(() => {
    isDraggingRef.current = true
    document.body.style.userSelect = 'none'
    document.body.style.pointerEvents = 'none'
    // Disable text selection during drag
    document.documentElement.style.cursor = 'col-resize'
  }, [])

  const endDrag = useCallback(() => {
    isDraggingRef.current = false
    document.body.style.userSelect = ''
    document.body.style.pointerEvents = ''
    document.documentElement.style.cursor = ''
  }, [])

  return {
    isDragging: isDraggingRef.current,
    startDrag,
    endDrag,
  }
}

/**
 * Utility to prevent layout thrashing during resize operations
 */
export function optimizeResizePerformance() {
  // Temporarily disable transitions on body to prevent layout issues
  const body = document.body
  const originalTransition = body.style.transition
  body.style.transition = 'none'
  
  return () => {
    // Restore original transition after a frame
    requestAnimationFrame(() => {
      body.style.transition = originalTransition
    })
  }
}
