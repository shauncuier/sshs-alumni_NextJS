import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE_URL = "http://localhost:3000";

interface TestResult {
  step: string;
  status: "PASS" | "FAIL";
  httpStatus: number;
  details: string;
}

const results: TestResult[] = [];

async function logResult(step: string, res: Response, check: (body: string, json: any) => boolean, extraNote = "") {
  const httpStatus = res.status;
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  let passed = false;
  let detailMsg = "";
  try {
    passed = check(text, json);
  } catch (e: any) {
    detailMsg = `Check error: ${e.message}`;
  }

  results.push({
    step,
    status: passed ? "PASS" : "FAIL",
    httpStatus,
    details: passed ? (extraNote || "OK") : (detailMsg || text.slice(0, 150)),
  });

  console.log(`[${passed ? "✓ PASS" : "✗ FAIL"}] ${step} (${httpStatus}) - ${passed ? extraNote || "OK" : detailMsg || text.slice(0, 80)}`);
  return { res, text, json };
}

async function run() {
  console.log("=================================================================");
  console.log("  SSGHS Alumni Platform — Real User Admin Functionality Test Suite");
  console.log("=================================================================\n");

  // 1. Fetch CSRF Token from NextAuth
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const csrfCookies = (csrfRes.headers as any).getSetCookie 
    ? (csrfRes.headers as any).getSetCookie() 
    : [csrfRes.headers.get("set-cookie") || ""];
  const rawCookies = csrfCookies.map((c: string) => c.split(";")[0]).join("; ");
  console.log("1. CSRF Token obtained:", csrfToken ? "Yes" : "No");

  // 2. Perform Real Sign-in as Administrator
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@sabujsghs.edu.bd";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "XumRiIMWDvk8hH4J7qnfwpZhVYVLAxvG";

  console.log(`2. Attempting sign-in as: ${adminEmail}...`);
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: rawCookies,
    },
    body: new URLSearchParams({
      csrfToken,
      email: adminEmail,
      password: adminPassword,
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });

  const loginCookies = (loginRes.headers as any).getSetCookie 
    ? (loginRes.headers as any).getSetCookie() 
    : [loginRes.headers.get("set-cookie") || ""];
  const sessionTokenCookie = loginCookies.map((c: string) => c.split(";")[0]).join("; ");
  const allCookies = [rawCookies, sessionTokenCookie].filter(Boolean).join("; ");

  const hasSessionCookie = sessionTokenCookie.includes("next-auth.session-token");
  console.log("3. Session Cookie received:", hasSessionCookie ? "Yes" : "No");

  const authHeaders = {
    Cookie: allCookies,
  };

  // 3. Test GET /admin (Admin Dashboard)
  const adminPageRes = await fetch(`${BASE_URL}/admin`, { headers: authHeaders });
  await logResult(
    "UI: /admin (Dashboard)",
    adminPageRes,
    (text) => adminPageRes.status === 200 && (text.includes("Admin Console") || text.includes("Executive") || text.includes("Verification") || text.includes("Total")),
    "Renders Admin Dashboard shell"
  );

  // 4. Test GET /api/admin/stats
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, { headers: authHeaders });
  await logResult(
    "API: /api/admin/stats",
    statsRes,
    (_, json) => statsRes.status === 200 && json?.stats && typeof json.stats.totalFunds === "number",
    `Total Registered: ${statsRes.status === 200 ? JSON.parse(await statsRes.clone().text())?.stats?.totalRegistered : "N/A"}, Funds: ${statsRes.status === 200 ? JSON.parse(await statsRes.clone().text())?.stats?.fundsFormatted : "N/A"}`
  );

  // 5. Test UI: /admin/verifications
  const verifPageRes = await fetch(`${BASE_URL}/admin/verifications`, { headers: authHeaders });
  await logResult(
    "UI: /admin/verifications (Queue)",
    verifPageRes,
    (text) => verifPageRes.status === 200 && (text.includes("Verification") || text.includes("Queue")),
    "Verification management page rendered"
  );

  // 6. Test API: /api/admin/verifications
  const verifApiRes = await fetch(`${BASE_URL}/api/admin/verifications?status=all`, { headers: authHeaders });
  const verifData = await logResult(
    "API: /api/admin/verifications?status=all",
    verifApiRes,
    (_, json) => verifApiRes.status === 200 && Array.isArray(json?.requests),
    "Verification requests listed"
  );

  // 7. Test UI: /admin/alumni
  const alumniAdminPageRes = await fetch(`${BASE_URL}/admin/alumni`, { headers: authHeaders });
  await logResult(
    "UI: /admin/alumni (Directory Management)",
    alumniAdminPageRes,
    (text) => alumniAdminPageRes.status === 200 && (text.includes("Alumni") || text.includes("Directory")),
    "Alumni roster loaded"
  );

  // 8. Test API: /api/alumni
  const alumniApiRes = await fetch(`${BASE_URL}/api/alumni?limit=20`, { headers: authHeaders });
  const { json: alumniJson } = await logResult(
    "API: /api/alumni",
    alumniApiRes,
    (_, json) => alumniApiRes.status === 200 && Array.isArray(json?.alumni),
    "Verified members returned"
  );

  // 9. Test UI: /admin/events
  const eventsAdminPageRes = await fetch(`${BASE_URL}/admin/events`, { headers: authHeaders });
  await logResult(
    "UI: /admin/events",
    eventsAdminPageRes,
    (text) => eventsAdminPageRes.status === 200 && text.includes("Event"),
    "Events management page loaded"
  );

  // 10. Test API: /api/admin/events
  const eventsApiRes = await fetch(`${BASE_URL}/api/admin/events`, { headers: authHeaders });
  const { json: eventsJson } = await logResult(
    "API: /api/admin/events",
    eventsApiRes,
    (_, json) => eventsApiRes.status === 200 && Array.isArray(json?.events),
    "Events listed"
  );

  // If there's an event, test event detail and attendee list
  // If there's an event, test event detail and attendee list
  if (Array.isArray(eventsJson?.events) && eventsJson.events.length > 0) {
    const firstEventId = eventsJson.events[0].id;
    const eventDetailRes = await fetch(`${BASE_URL}/api/admin/events/${firstEventId}`, { headers: authHeaders });
    await logResult(
      `API: /api/admin/events/${firstEventId} (Detail & Roster)`,
      eventDetailRes,
      (_, json) => eventDetailRes.status === 200 && json?.event && (Array.isArray(json.registrations) || Array.isArray(json.attendees)),
      `Event "${eventsJson.events[0].title}" attendee list loaded`
    );
  }

  // 11. Test UI: /admin/donations
  const donationsPageRes = await fetch(`${BASE_URL}/admin/donations`, { headers: authHeaders });
  await logResult(
    "UI: /admin/donations",
    donationsPageRes,
    (text) => donationsPageRes.status === 200 && (text.includes("Donation") || text.includes("Campaign")),
    "Donations ledger loaded"
  );

  // 12. Test UI: /admin/volunteers
  const volunteersPageRes = await fetch(`${BASE_URL}/admin/volunteers`, { headers: authHeaders });
  await logResult(
    "UI: /admin/volunteers",
    volunteersPageRes,
    (text) => volunteersPageRes.status === 200 && text.includes("Volunteer"),
    "Volunteers console loaded"
  );

  // 13. Test API: /api/volunteers
  const volunteersApiRes = await fetch(`${BASE_URL}/api/volunteers`, { headers: authHeaders });
  await logResult(
    "API: /api/volunteers",
    volunteersApiRes,
    (_, json) => volunteersApiRes.status === 200 && Array.isArray(json?.volunteers),
    "Volunteers list returned"
  );

  // 14. Test UI: /admin/users
  const usersPageRes = await fetch(`${BASE_URL}/admin/users`, { headers: authHeaders });
  await logResult(
    "UI: /admin/users",
    usersPageRes,
    (text) => usersPageRes.status === 200 && (text.includes("Administrator") || text.includes("Roles") || text.includes("Permissions")),
    "Users role management loaded"
  );

  // 15. Test UI: /admin/batches
  const batchesPageRes = await fetch(`${BASE_URL}/admin/batches`, { headers: authHeaders });
  await logResult(
    "UI: /admin/batches",
    batchesPageRes,
    (text) => batchesPageRes.status === 200 && text.includes("Batch"),
    "Batch analytics loaded"
  );

  // 16. Test UI: /gate (Gate Check-in Scanner for Volunteers/Staff)
  const gatePageRes = await fetch(`${BASE_URL}/gate`, { headers: authHeaders });
  await logResult(
    "UI: /gate (Gate QR Scanner)",
    gatePageRes,
    (text) => gatePageRes.status === 200 && text.includes("Gate Scanner"),
    "Gate verification scanner active"
  );

  // 17. Test Gate Verification with invalid token (verifies cryptographic check)
  const invalidCardRes = await fetch(`${BASE_URL}/api/alumni/card/verify`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: "invalid.forged.token" }),
  });
  await logResult(
    "API: /api/alumni/card/verify (Negative test - forged token)",
    invalidCardRes,
    (_, json) => invalidCardRes.status === 401 && json?.valid === false,
    "Correctly rejected forged/invalid QR token"
  );

  console.log("\n=================================================================");
  console.log("  Test Suite Summary Report");
  console.log("=================================================================");
  const passedCount = results.filter((r) => r.status === "PASS").length;
  const failedCount = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Checks: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
  if (failedCount === 0) {
    console.log("🎉 ALL ADMIN ROLES, PAGES & APIS OPERATING WITH 100% SUCCESS!");
  } else {
    console.error("⚠️ Some tests failed. Review output above.");
  }
}

run().catch(console.error);
