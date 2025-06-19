import { Loader2 } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-500" />
        <p className="text-black dark:text-white font-medium">Loading your AI assistant...</p>
      </div>
    </div>
  )
}
