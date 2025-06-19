import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthSessionProvider } from "@/components/auth/session-provider"
import { MCPProvider } from "@/components/mcp/mcp-provider"
import { Toaster } from "sonner"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Agent Chat",
  description: "AI-powered chat interface with artifacts support",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} antialiased font-sans`}>
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <MCPProvider>
              <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white transition-colors">{children}</div>
              <Toaster />
            </MCPProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
