"use client"

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Shield, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MicrosoftLogo } from "@/components/microsoft-logo"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDevelopment, setIsDevelopment] = useState(false)

  useEffect(() => {
    // Check if we're in development mode
    setIsDevelopment(process.env.NODE_ENV === "development")
    
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push("/")
      }
    })
  }, [router])

  const handleSignIn = async (provider: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: "/",
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error("Sign in error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-secondary dark:from-slate-900 dark:via-background dark:to-slate-950 p-4">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-md border shadow-lg">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            {isDevelopment ? "Development Access" : "Welcome to Agent Chat"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isDevelopment
              ? "You're in development mode. Authentication is bypassed for easier development."
              : "Sign in with your Azure account to continue"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">{/* clean spacing */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDevelopment && (
            <Alert className="border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Development Mode:</strong> SSO is disabled. Click below to continue as a developer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {isDevelopment ? (
              <Button
                onClick={() => handleSignIn("dev-bypass")}
                disabled={isLoading}
                className="w-full h-11 font-medium transition-all"
                size="lg"
              >
                <User className="mr-2 h-4 w-4" />
                {isLoading ? "Signing in..." : "Continue as Developer"}
              </Button>
            ) : (
              <Button
                onClick={() => handleSignIn("azure-ad")}
                disabled={isLoading}
                className="w-full h-11 font-medium transition-all"
                size="lg"
              >
                <MicrosoftLogo className="mr-3" size={18} />
                {isLoading ? "Signing in..." : "Sign in with Microsoft"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
