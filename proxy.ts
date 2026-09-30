import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { accountAccessBlock } from "@/lib/account-access";

// Next.js 16 "proxy" (formerly middleware): runs before routes to require sign-in
// on member pages. Role checks happen on the server in the pages themselves.
export default withAuth(
  function proxy(req) {
    // A session issued while the member was pending or rejected is no longer valid here.
    const token = req.nextauth.token;
    const block = token ? accountAccessBlock({ role: token.role as string, status: token.status as string }) : null;
    if (block) {
      const url = new URL("/login", req.url);
      url.searchParams.set("blocked", block.code === "PENDING_APPROVAL" ? "pending" : "rejected");
      return NextResponse.redirect(url);
    }
    // Admin role checks live in app/admin/layout.tsx, which shows a 403 page
    // (app/forbidden.tsx) instead of silently redirecting members elsewhere.
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
          pathname.startsWith("/api/alumni/card/verify") ||
          pathname.startsWith("/careers") ||
          pathname.startsWith("/mentorship") ||
          pathname.startsWith("/api/jobs") ||
          pathname.startsWith("/api/mentorship")
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
    "/gate/:path*",
    "/feed/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/network/:path*",
    "/settings/:path*",
    "/card/:path*",
  ],
};
