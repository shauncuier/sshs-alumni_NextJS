import type { Metadata } from "next";
import prisma from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { title: true } });
  return { title: event ? `${event.title}: budget` : "Event budget" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
