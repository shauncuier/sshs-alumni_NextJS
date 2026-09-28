import bcrypt from "bcryptjs";
import type { Event, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
  // $transaction pins these to a single pooled connection, so the session-scoped
  // FOREIGN_KEY_CHECKS=0 actually applies to the TRUNCATEs that follow it —
  // separate $executeRawUnsafe calls can otherwise land on different
  // connections and fail with MySQL error 1701.
  await prisma.$transaction([
    prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0"),
    ...tables.map(({ t }) => prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``)),
    prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1"),
  ]);
}

let counter = 0;

export async function makeMember(
  opts: { status?: "PENDING" | "VERIFIED" | "REJECTED"; role?: "ALUMNI" | "ADMIN" | "MODERATOR"; email?: string } = {}
): Promise<{ id: string; email: string }> {
  counter += 1;
  const status = opts.status ?? "VERIFIED";
  const user = await prisma.user.create({
    data: {
      email: opts.email ?? `member${counter}@example.test`,
      passwordHash: await bcrypt.hash("Member-Pw-1234", 4),
      role: opts.role ?? "ALUMNI",
      status,
      profile: {
        create: {
          fullName: `Member ${counter}`,
          sscBatch: 2000,
          graduationYear: 2000,
          profession: "Engineer",
          locationCity: "Chattogram",
          locationCountry: "Bangladesh",
          verificationStatus: status,
        },
      },
    },
  });
  return { id: user.id, email: user.email };
}

export async function makeEvent(data: Partial<Prisma.EventUncheckedCreateInput> = {}): Promise<Event> {
  counter += 1;
  return prisma.event.create({
    data: {
      slug: `event-${counter}`,
      title: `Event ${counter}`,
      description: "Test event",
      date: new Date("2030-01-01T09:00:00+06:00"),
      venue: "School Auditorium",
      maxAttendees: 100,
      ...data,
    },
  });
}
