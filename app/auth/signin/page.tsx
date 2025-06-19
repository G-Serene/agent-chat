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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isDevelopment ? "Development Access" : "Sign In"}
          </CardTitle>
          <CardDescription>
            {isDevelopment
              ? "You're in development mode. Authentication is bypassed for easier development."
              : "Sign in with your Azure account to continue"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDevelopment && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Development Mode:</strong> SSO is disabled. Click below to continue as a developer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {isDevelopment ? (
              <Button
                onClick={() => handleSignIn("dev-bypass")}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                <User className="mr-2 h-4 w-4" />
                {isLoading ? "Signing in..." : "Continue as Developer"}
              </Button>
            ) : (
              <Button
                onClick={() => handleSignIn("azure-ad")}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                size="lg"
              >
                <MicrosoftLogo className="mr-3" size={24} />
                {isLoading ? "Signing in..." : "Sign in with Microsoft"}
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {isDevelopment ? (
              <>
                Environment: <span className="font-semibold text-orange-600">Development</span>
                <br />
                SSO Status: <span className="font-semibold text-red-600">Disabled</span>
              </>
            ) : (
              <>
                Environment: <span className="font-semibold text-green-600">Production</span>
                <br />
                SSO Status: <span className="font-semibold text-green-600">Enabled</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
