import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createMemberAccount, hashMemberPassword } from "@/lib/members/create-member";
import { makeMember, resetDatabase } from "../helpers/db";

beforeEach(resetDatabase);

const input = {
  fullName: "  Farhana Akter ",
  email: " Farhana@Example.TEST ",
  phone: "+880 1711-000111",
  password: "Member-Pw-2026",
  sscBatch: "1995",
  rollNumber: " 1044 ",
  section: "B",
};

it("creates a pending member with profile and verification request", async () => {
  const hash = await hashMemberPassword(input.password);
  const created = await prisma.$transaction((tx) => createMemberAccount(tx, input, hash));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: created.id },
    include: { profile: true, verificationRequests: true },
  });
  expect(user).toMatchObject({ email: "farhana@example.test", status: "PENDING", role: "ALUMNI" });
  expect(user.profile).toMatchObject({ fullName: "Farhana Akter", sscBatch: 1995, rollNumber: "1044", section: "B", verificationStatus: "PENDING" });
  expect(user.verificationRequests[0]).toMatchObject({ sscBatch: 1995, rollNumber: "1044", status: "PENDING" });
  expect(await bcrypt.compare(input.password, user.passwordHash)).toBe(true);
});

it("hashes only passwords long enough to accept", async () => {
  expect(await hashMemberPassword("short")).toBeNull();
  expect(await hashMemberPassword(undefined)).toBeNull();
  expect(await hashMemberPassword("Member-Pw-2026")).toMatch(/^\$2[aby]\$12\$/);
});

it("refuses an email that already has an account", async () => {
  await makeMember({ email: "taken@example.test" });
  await expect(
    prisma.$transaction((tx) => createMemberAccount(tx, { ...input, email: "TAKEN@example.test" }, "unused-hash"))
  ).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
});

it("validates required fields, batch and password length", async () => {
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, fullName: " " }, "unused-hash"))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, sscBatch: "1900" }, "unused-hash"))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, password: "short" }, null))).rejects.toMatchObject({ status: 400 });
});
