"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, User, Globe, Clock, CheckCircle, XCircle } from "lucide-react"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default function AuthStatusPage() {
  const { data: session, status } = useSession()
  const [currentEnv, setCurrentEnv] = useState<string>("unknown")

  useEffect(() => {
    setCurrentEnv(process.env.NODE_ENV || "unknown")
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p>Loading authentication status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-secondary dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Authentication Status</h1>
          <p className="text-muted-foreground mt-2">NextAuth.js + Azure Entra ID Integration</p>
        </div>

        {/* Authentication Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {session ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Authentication Status
            </CardTitle>
            <CardDescription>
              Current authentication state and session information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={session ? "default" : "destructive"}>
                {session ? "Authenticated" : "Not Authenticated"}
              </Badge>
            </div>


          </CardContent>
        </Card>

        {/* User Information Card */}
        {session && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>
                Information from the authentication provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{session.user?.name || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{session.user?.email || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {session.user?.id || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Environment Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Current environment and authentication configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Environment</label>
                <p className="text-lg">{currentEnv}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">NextAuth URL</label>
                <p className="text-sm font-mono">{process.env.NEXTAUTH_URL || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button asChild>
            <a href="/">← Back to Chat</a>
          </Button>
          {session && <SignOutButton />}
        </div>
      </div>
    </div>
  )
}
