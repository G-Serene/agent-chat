/**
 * MCP Tool Execution Monitor
 * Tracks performance and provides debugging capabilities
 */

export interface ToolExecutionMetrics {
  toolName: string
  executionTime: number
  success: boolean
  timestamp: Date
  errorMessage?: string
  inputSize: number
  outputSize: number
}

export class MCPExecutionMonitor {
  private metrics: ToolExecutionMetrics[] = []
  private readonly maxMetrics = 1000

  recordExecution(metric: ToolExecutionMetrics): void {
    this.metrics.push(metric)
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getMetrics(toolName?: string): ToolExecutionMetrics[] {
    return toolName 
      ? this.metrics.filter(m => m.toolName === toolName)
      : this.metrics
  }

  getAverageExecutionTime(toolName: string): number {
    const toolMetrics = this.getMetrics(toolName)
    if (toolMetrics.length === 0) return 0
    
    const totalTime = toolMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    return totalTime / toolMetrics.length
  }

  getSuccessRate(toolName: string): number {
    const toolMetrics = this.getMetrics(toolName)
    if (toolMetrics.length === 0) return 0
    
    const successCount = toolMetrics.filter(m => m.success).length
    return successCount / toolMetrics.length
  }
}

export const mcpExecutionMonitor = new MCPExecutionMonitor()
