import { Loader2 } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-slate-600" />
        <p className="text-slate-600">Loading your AI assistant...</p>
      </div>
    </div>
  )
}
