import { beforeEach, expect, it } from "vitest";
import type { JWT } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { makeMember, resetDatabase } from "./helpers/db";

beforeEach(async () => {
  await resetDatabase();
});

// What NextAuth calls on every session read after sign-in (no `user`).
type JwtParams = Parameters<NonNullable<NonNullable<typeof authOptions.callbacks>["jwt"]>>[0];
const refresh = (token: JWT) => authOptions.callbacks!.jwt!({ token } as JwtParams);

it("a session is either fully valid or gone: stale, disabled and deleted accounts are signed out", async () => {
  const m = await makeMember();
  const token = { sub: m.id, id: m.id, email: m.email, role: "ALUMNI", status: "VERIFIED", sessionVersion: 0 } as JWT;

  // Valid: kept, with role and status read fresh from the database.
  await prisma.user.update({ where: { id: m.id }, data: { role: "MODERATOR" } });
  await expect(refresh({ ...token })).resolves.toMatchObject({ role: "MODERATOR", status: "VERIFIED" });

  // Password changed or signed out elsewhere (sessionVersion bumped): revoked.
  await prisma.user.update({ where: { id: m.id }, data: { sessionVersion: 1 } });
  await expect(refresh({ ...token })).resolves.toEqual({ revoked: true });

  // Disabled account: revoked.
  await prisma.user.update({ where: { id: m.id }, data: { sessionVersion: 0, disabledAt: new Date() } });
  await expect(refresh({ ...token })).resolves.toEqual({ revoked: true });

  // Deleted account: revoked.
  await prisma.user.delete({ where: { id: m.id } });
  await expect(refresh({ ...token })).resolves.toEqual({ revoked: true });

  // A revoked session reads as signed out (an empty session), and stays revoked.
  const revoked = { revoked: true } as JWT;
  await expect(refresh(revoked)).resolves.toEqual({ revoked: true });
  const session = await authOptions.callbacks!.session!({ session: { user: { email: m.email }, expires: "" }, token: revoked } as never);
  expect(session).toEqual({});
});
