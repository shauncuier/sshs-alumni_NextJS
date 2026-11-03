import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { logActivity } from "@/lib/activity-log";
import { createSchoolPerson, listSchoolPeople } from "@/lib/teachers";
import { readJsonBody, requireSameOrigin } from "@/lib/request-security";
import { requireArea } from "@/lib/admin/require-admin";

const requireAdmin = () => requireArea("teachers", "You cannot manage the teachers.");

// GET /api/admin/teachers — every founder, head teacher, teacher and staff member, shown or not.
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ people: await listSchoolPeople() });
  } catch (err) {
    return errorResponse(err, "GET /api/admin/teachers");
  }
}

// POST /api/admin/teachers — add a person.
export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const me = await requireAdmin();
    const person = await createSchoolPerson(await readJsonBody(req));
    await logActivity({
      category: "CONTENT",
      action: "teacher.added",
      summary: `Added ${person.nameEn || person.nameBn} to the teachers`,
      actor: me,
      targetType: "SchoolPerson",
      targetId: person.id,
      req,
    });
    return NextResponse.json({ person }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "POST /api/admin/teachers");
  }
}
