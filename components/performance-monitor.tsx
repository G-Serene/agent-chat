"use client"

import { useEffect, useRef } from 'react'

interface PerformanceMonitorProps {
  isStreaming: boolean
  messageCount: number
}

export function PerformanceMonitor({ isStreaming, messageCount }: PerformanceMonitorProps) {
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const fpsRef = useRef(0)

  useEffect(() => {
    if (!isStreaming) return

    let animationId: number

    const measureFPS = () => {
      frameCountRef.current++
      const now = performance.now()
      const delta = now - lastTimeRef.current

      if (delta >= 1000) { // Measure every second
        fpsRef.current = Math.round((frameCountRef.current * 1000) / delta)
        frameCountRef.current = 0
        lastTimeRef.current = now

        // Log performance metrics during streaming
        console.log(`🎯 Performance metrics:`, {
          fps: fpsRef.current,
          messageCount,
          isStreaming,
          memory: (performance as any).memory ? {
            used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
            total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
          } : 'N/A'
        })

        // Warn if performance is poor
        if (fpsRef.current < 30) {
          console.warn(`⚠️ Low FPS detected: ${fpsRef.current}fps during streaming`)
        }
      }

      animationId = requestAnimationFrame(measureFPS)
    }

    animationId = requestAnimationFrame(measureFPS)

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isStreaming, messageCount])

  // This component doesn't render anything
  return null
}

// Hook for monitoring React render performance
export function useRenderPerformance(componentName: string, deps: any[] = []) {
  const renderStartRef = useRef<number | undefined>(undefined)
  const renderCountRef = useRef(0)

  useEffect(() => {
    renderStartRef.current = performance.now()
  })

  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current
      renderCountRef.current++
      
      if (renderTime > 16) { // More than one frame (60fps = 16.67ms per frame)
        console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`)
      }
    }
  }, deps)
}
