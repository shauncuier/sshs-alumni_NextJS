import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/app-error";
import type { AccountInput } from "@/lib/events/types";

const FIRST_SSC_BATCH = 1985;
const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_COST = 12;

/**
 * Hashes a new member's password, or returns null when it is too short to accept
 * (createMemberAccount then reports why). bcrypt at cost 12 takes ~250 ms, so call
 * this BEFORE opening a transaction that holds row locks, never inside one.
 */
export async function hashMemberPassword(password: unknown): Promise<string | null> {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) return null;
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Creates a PENDING member account with profile and verification request.
 * Shared by the combined membership registration form now, and by a separate
 * sign-up flow later, so separating membership from the Jubilee stays cheap.
 * `passwordHash` comes from hashMemberPassword(input.password), computed before
 * the caller's transaction so the slow hash never runs while locks are held.
 */
export async function createMemberAccount(
  db: Prisma.TransactionClient,
  input: AccountInput,
  passwordHash: string | null
): Promise<{ id: string; email: string }> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const batch = Number(input.sscBatch);
  if (!fullName || !email || !input.password) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please fill in your name, email and password.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please enter a valid email address.");
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("INVALID_ACCOUNT", 400, `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!Number.isInteger(batch) || batch < FIRST_SSC_BATCH || batch > new Date().getFullYear()) {
    throw new AppError("INVALID_ACCOUNT", 400, "Please choose your SSC batch year.");
  }
  if (!passwordHash) {
    // The password passed the checks above, so the caller forgot to hash it.
    throw new Error("createMemberAccount needs the hash of input.password from hashMemberPassword().");
  }

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw new AppError("EMAIL_EXISTS", 409, "You already have an account — sign in to register.");
  }

  const rollNumber = input.rollNumber?.trim() || null;
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      role: "ALUMNI",
      status: "PENDING",
      profile: {
        create: {
          fullName,
          sscBatch: batch,
          graduationYear: batch,
          profession: input.profession?.trim() || "Alumnus",
          company: input.company?.trim() || null,
          locationCity: input.locationCity?.trim() || "Chattogram",
          locationCountry: "Bangladesh",
          phone: input.phone?.trim() || null,
          rollNumber,
          section: input.section?.trim() || null,
          bio: `Alumnus of SSGHS Batch ${batch}`,
          verificationStatus: "PENDING",
          avatarUrl: input.avatarUrl || "/logo.png",
          avatarOriginalUrl: input.avatarOriginalUrl || null,
        },
      },
      verificationRequests: {
        create: {
          sscBatch: batch,
          rollNumber,
          status: "PENDING",
          proofType: input.proofType || null,
          proofNote: input.proofNote || null,
          proofFileUrl: input.proofFileUrl || null,
          proofMime: input.proofMime || null,
        },
      },
    },
    select: { id: true, email: true },
  });
  return user;
}
