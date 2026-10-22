import React from "react";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/AppSidebar";
import AppHeader from "@/components/layout/AppHeader";
import MobileNav from "@/components/layout/MobileNav";
import MessagesClient from "@/components/messages/MessagesClient";
import { getSessionUser } from "@/lib/session-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages | Praktan Sabujian Parishad" };

type Props = { searchParams: Promise<{ to?: string }> };

// Direct messages between members. /messages?to=<userId> opens or starts a conversation.
export default async function MessagesPage({ searchParams }: Props) {
  const me = await getSessionUser();
  if (!me) redirect("/login?callbackUrl=/messages");
  const { to } = await searchParams;
  const initialTo = typeof to === "string" && /^[A-Za-z0-9-]{1,64}$/.test(to) && to !== me.id ? to : null;

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <AppHeader title="Direct Messages" />
        <div className="max-w-7xl w-full mx-auto p-3 sm:p-6">
          <MessagesClient currentUserId={me.id} initialTo={initialTo} />
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
