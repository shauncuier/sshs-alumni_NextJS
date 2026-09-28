import type { Metadata } from "next";
import ErrorScreen, { errorActionSecondary } from "@/components/shared/ErrorScreen";
import { WifiOff, IdCard } from "lucide-react";
import RetryButton from "./RetryButton";

export const metadata: Metadata = {
  title: "You're Offline",
  robots: { index: false },
};

// The service worker (public/sw.js) caches this page and shows it when a page
// that is not saved for offline use is opened without a connection. It has no
// Navbar so it renders fully from the cache.
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
      <ErrorScreen
        code="Offline"
        tone="slate"
        title="You're Offline"
        icon={<WifiOff className="w-12 h-12" />}
        message="This page isn't saved on your device. Check your internet connection and try again. Pages you've opened before, like your digital card and the alumni directory, still work offline."
      >
        <RetryButton />
        {/* Plain links: the card page is served from the offline cache by the service worker. */}
        <a href="/card" className={errorActionSecondary}>
          <IdCard className="w-4 h-4 text-slate-400" /> My Digital Card
        </a>
      </ErrorScreen>
    </div>
  );
}
