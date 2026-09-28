import { beforeEach, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createMemberAccount } from "@/lib/members/create-member";
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
  const created = await prisma.$transaction((tx) => createMemberAccount(tx, input));
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: created.id },
    include: { profile: true, verificationRequests: true },
  });
  expect(user).toMatchObject({ email: "farhana@example.test", status: "PENDING", role: "ALUMNI" });
  expect(user.profile).toMatchObject({ fullName: "Farhana Akter", sscBatch: 1995, rollNumber: "1044", section: "B", verificationStatus: "PENDING" });
  expect(user.verificationRequests[0]).toMatchObject({ sscBatch: 1995, rollNumber: "1044", status: "PENDING" });
});

it("refuses an email that already has an account", async () => {
  await makeMember({ email: "taken@example.test" });
  await expect(
    prisma.$transaction((tx) => createMemberAccount(tx, { ...input, email: "TAKEN@example.test" }))
  ).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
});

it("validates required fields, batch and password length", async () => {
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, fullName: " " }))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, sscBatch: "1900" }))).rejects.toMatchObject({ status: 400 });
  await expect(prisma.$transaction((tx) => createMemberAccount(tx, { ...input, password: "short" }))).rejects.toMatchObject({ status: 400 });
});
