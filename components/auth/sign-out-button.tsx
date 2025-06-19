"use client"

import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useState } from "react"

interface SignOutButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg"
}

export function SignOutButton({ className, variant = "outline", size = "default" }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut({
        callbackUrl: "/auth/signin",
      })
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isLoading ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
