"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowLeft, Home } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Configuration Error",
    description: "There is a problem with the server configuration. Please contact support.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to access this application.",
  },
  Verification: {
    title: "Verification Error",
    description: "The verification token is invalid or has expired.",
  },
  Default: {
    title: "Authentication Error",
    description: "An error occurred during authentication. Please try again.",
  },
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get("error") || "Default"
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  const handleRetry = () => {
    router.push("/auth/signin")
  }

  const handleHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-700 dark:text-red-400">
            Authentication Failed
          </CardTitle>
          <CardDescription>
            We encountered an issue while trying to sign you in
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{errorInfo.title}</AlertTitle>
            <AlertDescription>{errorInfo.description}</AlertDescription>
          </Alert>

          {error !== "Default" && (
            <div className="text-sm text-muted-foreground">
              <strong>Error Code:</strong> {error}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button onClick={handleRetry} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={handleHome} variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            If this problem persists, please contact support
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
