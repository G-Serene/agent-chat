"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn, User } from "lucide-react"
import { useState, useEffect } from "react"

interface SignInButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

export function SignInButton({ className, variant = "default", size = "default" }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDevelopment, setIsDevelopment] = useState(false)

  // Check environment on client side
  useEffect(() => {
    setIsDevelopment(process.env.NODE_ENV === "development")
  }, [])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn(isDevelopment ? "dev-bypass" : "azure-ad", {
        callbackUrl: "/",
      })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isDevelopment ? (
        <User className="mr-2 h-4 w-4" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      {isLoading 
        ? "Signing in..." 
        : isDevelopment 
          ? "Continue as Developer" 
          : "Sign In"
      }
    </Button>
  )
}
