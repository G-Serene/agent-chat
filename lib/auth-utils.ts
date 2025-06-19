/**
 * Environment utility functions for auth configuration
 */

export const isDevelopment = process.env.NODE_ENV === "development"
export const isProduction = process.env.NODE_ENV === "production"

/**
 * Get the authentication mode based on environment
 */
export function getAuthMode(): "development" | "production" {
  return isDevelopment ? "development" : "production"
}

/**
 * Check if SSO should be enabled
 */
export function isSSOEnabled(): boolean {
  return isProduction
}

/**
 * Get environment display name
 */
export function getEnvironmentDisplayName(): string {
  return isDevelopment ? "Development" : "Production"
}

/**
 * Validate Azure AD configuration in production
 */
export function validateAzureConfig(): {
  isValid: boolean
  missingVars: string[]
} {
  if (isDevelopment) {
    return { isValid: true, missingVars: [] }
  }

  const requiredVars = [
    "AUTH_AZURE_AD_CLIENT_ID",
    "AUTH_AZURE_AD_CLIENT_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
  ]

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  )

  return {
    isValid: missingVars.length === 0,
    missingVars,
  }
}

/**
 * Get authentication provider name for display
 */
export function getAuthProviderName(): string {
  return isDevelopment ? "Development Mode" : "Azure Entra ID"
}

/**
 * Get callback URL for the current environment
 */
export function getCallbackUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${baseUrl}/api/auth/callback/azure-ad`
}
