import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** "Add Offline Form" in the admin menu: opens paper-form entry for the membership (Golden Jubilee) event. */
export default async function OfflineFormShortcut() {
  const event = await prisma.event.findFirst({ where: { isMembershipEvent: true }, select: { id: true } });
  if (!event) notFound();
  redirect(`/admin/events/${event.id}/offline`);
}
