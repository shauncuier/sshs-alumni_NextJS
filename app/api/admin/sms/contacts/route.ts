import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/session-user";
import { normalizeBdPhoneNumber, isValidBdMobile } from "@/lib/bulksmsbd";
import prisma from "@/lib/prisma";
import { sampleAlumni, sampleBatches } from "@/lib/data";
import { getVolunteers } from "@/lib/volunteers";

export interface SmsContactItem {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  batch?: number | null;
  role?: string;
  category: "ALUMNI" | "BATCH_REP" | "VOLUNTEER" | "DONOR";
  categoryLabel: string;
  status: string;
  detail?: string;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const contactsMap = new Map<string, SmsContactItem>();

    // Helper to insert contact
    const addContact = (item: SmsContactItem) => {
      const normalized = normalizeBdPhoneNumber(item.phone);
      if (normalized && isValidBdMobile(normalized)) {
        // If phone already exists, retain or upgrade metadata
        if (!contactsMap.has(normalized)) {
          contactsMap.set(normalized, {
            ...item,
            normalizedPhone: normalized,
          });
        }
      }
    };

    // 1. Fetch from Database if available
    try {
      const dbUsers = await prisma.user.findMany({
        where: {
          profile: {
            phone: { not: null },
          },
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: {
            select: {
              fullName: true,
              phone: true,
              sscBatch: true,
              profession: true,
            },
          },
        },
      });

      for (const u of dbUsers) {
        if (u.profile?.phone) {
          addContact({
            id: `usr-${u.id}`,
            name: u.profile.fullName || u.email.split("@")[0],
            phone: u.profile.phone,
            normalizedPhone: "",
            email: u.email,
            batch: u.profile.sscBatch,
            role: u.role,
            category: "ALUMNI",
            categoryLabel: "Registered Alumni",
            status: u.status,
            detail: u.profile.profession || undefined,
          });
        }
      }

      // Check DB batches
      const dbBatches = await prisma.batch.findMany({
        where: {
          representativePhone: { not: null },
        },
        select: {
          id: true,
          year: true,
          classRepresentative: true,
          representativePhone: true,
        },
      });

      for (const b of dbBatches) {
        if (b.representativePhone && b.classRepresentative) {
          addContact({
            id: `batch-${b.id}`,
            name: b.classRepresentative,
            phone: b.representativePhone,
            normalizedPhone: "",
            batch: b.year,
            category: "BATCH_REP",
            categoryLabel: "Class Representative",
            status: "VERIFIED",
            detail: `SSC Batch ${b.year} Representative`,
          });
        }
      }
    } catch {
      // Database not ready or offline; proceed to fallback sources
    }

    // 2. Add Sample Alumni directory (if not already added)
    for (const alm of sampleAlumni) {
      if (alm.phone) {
        addContact({
          id: alm.id,
          name: alm.fullName,
          phone: alm.phone,
          normalizedPhone: "",
          email: alm.email,
          batch: alm.sscBatch,
          category: "ALUMNI",
          categoryLabel: alm.isVerified ? "Verified Alumni" : "Alumni Member",
          status: alm.isVerified ? "VERIFIED" : "PENDING",
          detail: alm.profession,
        });
      }
    }

    // 3. Add Sample Batches (Class Representatives)
    for (const b of sampleBatches) {
      if (b.representativePhone && b.classRepresentative) {
        addContact({
          id: `rep-${b.year}`,
          name: b.classRepresentative,
          phone: b.representativePhone,
          normalizedPhone: "",
          batch: b.year,
          category: "BATCH_REP",
          categoryLabel: "Batch Representative",
          status: "VERIFIED",
          detail: `SSC Batch ${b.year} Representative`,
        });
      }
    }

    // 4. Add Committee Volunteers
    try {
      const volunteers = await getVolunteers();
      for (const vol of volunteers) {
        if (vol.phone) {
          addContact({
            id: vol.id,
            name: vol.fullName,
            phone: vol.phone,
            normalizedPhone: "",
            email: vol.email,
            batch: vol.sscBatch,
            category: "VOLUNTEER",
            categoryLabel: "Committee Volunteer",
            status: vol.status,
            detail: vol.subcommitteeLabel,
          });
        }
      }
    } catch (e) {
      console.warn("Could not load volunteers for SMS:", e);
    }

    const contacts = Array.from(contactsMap.values()).sort((a, b) => {
      // Sort by batch descending, then by name
      if (a.batch && b.batch && a.batch !== b.batch) {
        return b.batch - a.batch;
      }
      return a.name.localeCompare(b.name);
    });

    // Unique batch list for filtering
    const batches = Array.from(
      new Set(contacts.map((c) => c.batch).filter((b): b is number => typeof b === "number"))
    ).sort((a, b) => b - a);

    return NextResponse.json({
      success: true,
      totalCount: contacts.length,
      batches,
      contacts,
    });
  } catch (error) {
    console.error("[API/Admin/SMS/Contacts] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve contacts list" },
      { status: 500 }
    );
  }
}
