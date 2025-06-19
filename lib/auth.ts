import NextAuth from "next-auth"
import { getServerSession } from "next-auth/next"
import AzureADProvider from "next-auth/providers/azure-ad"
import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import { validateAzureConfig, isDevelopment } from "./auth-utils"

// Mock user data for development
const mockUser = {
  id: "dev-user-001",
  name: "Developer User",
  email: "developer@localhost.dev",
  image: "/placeholder-user.jpg",
}

// Environment variables validation
const azureConfig = {
  clientId: process.env.AUTH_AZURE_AD_CLIENT_ID,
  clientSecret: process.env.AUTH_AZURE_AD_CLIENT_SECRET,
  tenantId: process.env.AUTH_AZURE_AD_TENANT_ID || "common",
}

// Validate Azure configuration in production
const { isValid, missingVars } = validateAzureConfig()
if (!isValid) {
  console.error("❌ Azure AD configuration validation failed:", {
    missingVars,
    environment: process.env.NODE_ENV,
  })
  
  if (!isDevelopment) {
    throw new Error(
      `Azure AD configuration missing. Please set the following environment variables: ${missingVars.join(", ")}`
    )
  }
}

export const authOptions: NextAuthOptions = {
  providers: isDevelopment
    ? [
        // Development provider - bypass SSO
        CredentialsProvider({
          id: "dev-bypass",
          name: "Development Mode",
          credentials: {},
          async authorize() {
            // Always return the mock user in development
            return mockUser
          },
        }),
      ]
    : [
        // Production provider - Azure AD SSO
        AzureADProvider({
          clientId: azureConfig.clientId!,
          clientSecret: azureConfig.clientSecret!,
          tenantId: azureConfig.tenantId,
          authorization: {
            params: {
              scope: "openid profile email User.Read",
            },
          },
        }),
      ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist additional user info in the token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        
        if (isDevelopment) {
          console.log("🔧 Development mode: JWT callback with mock user")
        }
      }
      
      // Add Azure AD specific claims in production
      if (account?.provider === "azure-ad" && account.access_token) {
        token.accessToken = account.access_token
        console.log("✅ Azure AD access token added to JWT")
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.sub) {
        session.user.id = token.sub
      }
      
      if (isDevelopment) {
        console.log("🔧 Development session created:", {
          user: session.user?.name,
        })
      }
      
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      if (isDevelopment) {
        console.log("🔧 Development sign-in bypass")
        return true
      }
      
      if (account?.provider === "azure-ad") {
        console.log("✅ Azure AD sign-in successful:", {
          user: user?.name,
          email: user?.email,
        })
        return true
      }
      
      return false
    },
  },
  session: {
    strategy: "jwt",
    maxAge: isDevelopment ? 24 * 60 * 60 : 8 * 60 * 60, // 24h in dev, 8h in prod
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: isDevelopment,
}

// Helper function for server-side auth
export function getServerAuth() {
  return getServerSession(authOptions)
}
