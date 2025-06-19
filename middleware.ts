import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // In development mode, always allow access
        if (process.env.NODE_ENV === "development") {
          return true
        }

        // In production, require valid token
        return !!token
      },
    },
  }
)

// Configure which routes require authentication
export const config = {
  matcher: [
    // Protect all routes except auth routes, API auth routes, and public assets
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
