# NextAuth.js Azure Entra ID SSO Integration

This implementation provides SSO authentication using NextAuth.js with Azure Entra ID, with environment-based configuration for development and production environments.

## Features

- **Environment-based Authentication**: 
  - Development: SSO disabled, bypass authentication for easier development
  - Production: Full Azure Entra ID SSO integration
- **Custom Auth Pages**: Branded signin and error pages
- **Session Management**: Persistent sessions with JWT tokens
- **Route Protection**: Middleware-based route protection
- **TypeScript Support**: Full type safety for auth objects

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure the variables:

```bash
cp .env.example .env.local
```

#### Required Variables:

- `NEXTAUTH_URL`: Your application URL (http://localhost:3000 for development)
- `NEXTAUTH_SECRET`: Secret key for JWT encryption (generate a secure random string)
- `NODE_ENV`: Set to "development" or "production"

#### Production Only Variables:

- `AUTH_AZURE_AD_CLIENT_ID`: Azure App Registration Client ID
- `AUTH_AZURE_AD_CLIENT_SECRET`: Azure App Registration Client Secret
- `AUTH_AZURE_AD_TENANT_ID`: Azure Tenant ID (or "common" for multi-tenant)

### 2. Azure App Registration (Production Only)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: Your application name
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: `https://yourdomain.com/api/auth/callback/azure-ad`
5. After creation, note the **Application (client) ID**
6. Go to **Certificates & secrets** > **New client secret**
7. Copy the secret value immediately
8. Go to **API permissions** and add:
   - Microsoft Graph > Delegated > User.Read
   - Microsoft Graph > Delegated > profile
   - Microsoft Graph > Delegated > email
   - Microsoft Graph > Delegated > openid

### 3. Environment Behavior

#### Development Mode (NODE_ENV=development)
- SSO is **disabled**
- Users can bypass authentication with a "Continue as Developer" button
- Mock user session is created automatically
- No Azure configuration required

#### Production Mode (NODE_ENV=production)
- SSO is **enabled**
- Full Azure Entra ID authentication flow
- Real user sessions from Azure AD
- Requires all Azure environment variables

## Usage

### Components

```tsx
import { UserMenu } from "@/components/auth/user-menu"
import { SignInButton } from "@/components/auth/sign-in-button"
import { SignOutButton } from "@/components/auth/sign-out-button"

// User menu with avatar and session info
<UserMenu />

// Sign in button
<SignInButton variant="outline" />

// Sign out button
<SignOutButton variant="ghost" />
```

### Hooks

```tsx
import { useSession } from "next-auth/react"

function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>
  
  return (
    <div>
      <p>Welcome, {session.user?.name}!</p>
      <p>Environment: {session.environment}</p>
      <p>SSO Enabled: {session.ssoEnabled ? "Yes" : "No"}</p>
    </div>
  )
}
```

### Server-side Auth

```tsx
import { auth } from "@/lib/auth"

export default async function ProtectedPage() {
  const session = await auth()
  
  if (!session) {
    return <div>Access denied</div>
  }
  
  return <div>Protected content</div>
}
```

## File Structure

```
├── lib/
│   └── auth.ts                      # NextAuth configuration
├── app/
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts                 # NextAuth API routes
│   ├── auth/
│   │   ├── signin/page.tsx          # Custom signin page
│   │   └── error/page.tsx           # Auth error page
│   └── layout.tsx                   # SessionProvider wrapper
├── components/auth/
│   ├── session-provider.tsx         # Session provider component
│   ├── sign-in-button.tsx          # Sign in button
│   ├── sign-out-button.tsx         # Sign out button
│   └── user-menu.tsx               # User menu dropdown
├── middleware.ts                    # Route protection
├── types/
│   └── next-auth.d.ts              # TypeScript definitions
└── .env.example                     # Environment variables template
```

## Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **NEXTAUTH_SECRET**: Use a cryptographically secure random string in production
- **Route Protection**: Middleware automatically protects routes in production
- **Session Management**: JWT tokens with secure settings
- **CSRF Protection**: Built into NextAuth.js

## Deployment

### Development
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### Production

1. Set `NODE_ENV=production`
2. Configure all Azure AD environment variables
3. Set a secure `NEXTAUTH_SECRET`
4. Update `NEXTAUTH_URL` to your production domain
5. Update Azure App Registration redirect URI

## Troubleshooting

### Common Issues

1. **"Configuration Error"**: Check that all required environment variables are set
2. **"Access Denied"**: Verify Azure App Registration permissions and tenant settings
3. **Redirect URI Mismatch**: Ensure Azure App Registration redirect URI matches your domain
4. **Development Auth Not Working**: Verify `NODE_ENV=development` is set

### Debug Mode

In development, NextAuth debug mode is enabled. Check browser console and server logs for detailed error information.

## Support

For issues related to:
- NextAuth.js: [NextAuth.js Documentation](https://next-auth.js.org/)
- Azure AD: [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- Azure App Registration: [App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
