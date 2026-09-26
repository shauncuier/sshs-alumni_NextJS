import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes protection
    if (pathname.startsWith("/admin")) {
      const role = token?.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Public pages don't require login
        if (
          pathname === "/" ||
          pathname.startsWith("/alumni") ||
          pathname.startsWith("/batches") ||
          pathname.startsWith("/events") ||
          pathname.startsWith("/stories") ||
          pathname.startsWith("/achievements") ||
          pathname.startsWith("/gallery") ||
          pathname.startsWith("/donate") ||
          pathname.startsWith("/about") ||
          pathname.startsWith("/school") ||
          pathname.startsWith("/news") ||
          pathname.startsWith("/contact") ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/payments") ||
          pathname.startsWith("/api/realtime") ||
          pathname.startsWith("/verify") ||
          pathname.startsWith("/api/alumni/card/verify")
        ) {
          return true;
        }

        // Authenticated routes require token
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/feed/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/network/:path*",
    "/settings/:path*",
    "/card/:path*",
  ],
};
