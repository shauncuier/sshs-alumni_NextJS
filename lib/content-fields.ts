import { AppError } from "@/lib/app-error";
import { contentImageId } from "@/lib/media/content-images";
import { documentId } from "@/lib/media/documents";

/**
 * Field readers shared by the association content libs (committee, honor board,
 * constitution, notices). Each takes the raw JSON value and either returns a clean
 * value or throws a 400 AppError with `code` and a message for the admin.
 */

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function fieldReader(code: string) {
  const bad = (message: string) => new AppError(code, 400, message);

  return {
    bad,
    /** Required text between min and max characters. */
    text(v: unknown, label: string, min: number, max: number): string {
      const s = str(v);
      if (s.length < min) throw bad(min <= 1 ? `Please enter the ${label}.` : `The ${label} must be at least ${min} characters.`);
      if (s.length > max) throw bad(`The ${label} must be ${max} characters or fewer.`);
      return s;
    },
    /** Optional text; blank becomes null. */
    optText(v: unknown, label: string, max: number): string | null {
      const s = str(v);
      if (s.length > max) throw bad(`The ${label} must be ${max} characters or fewer.`);
      return s || null;
    },
    /** Optional whole number in [min, max]; blank becomes null. */
    optInt(v: unknown, label: string, min: number, max: number): number | null {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "number" ? v : Number(str(v));
      if (!Number.isInteger(n) || n < min || n > max) throw bad(`The ${label} must be a whole number from ${min} to ${max}.`);
      return n;
    },
    int(v: unknown, label: string, min: number, max: number): number {
      const n = this.optInt(v, label, min, max);
      if (n === null) throw bad(`Please enter the ${label}.`);
      return n;
    },
    /** Optional image uploaded through /api/admin/media; links to elsewhere are refused. */
    optImage(v: unknown): string | null {
      const url = str(v);
      if (url && !contentImageId(url)) throw bad("Please upload the image instead of linking to it.");
      return url || null;
    },
    /** Optional PDF uploaded through /api/admin/documents. */
    optDocument(v: unknown): string | null {
      const url = str(v);
      if (url && !documentId(url)) throw bad("Please upload the PDF instead of linking to it.");
      return url || null;
    },
    /** Optional Bangladeshi or international phone number as shown on the site. */
    optPhone(v: unknown): string | null {
      const s = str(v);
      if (!s) return null;
      if (!/^\+?[0-9][0-9 -]{5,18}[0-9]$/.test(s)) throw bad("The phone number may only contain digits, spaces, dashes and a leading +.");
      return s;
    },
    /** Optional Facebook profile or page link. */
    optFacebook(v: unknown): string | null {
      const s = str(v);
      if (!s) return null;
      if (s.length > 500 || !/^https:\/\/(www\.|m\.|web\.)?(facebook|fb)\.com\/\S+$/i.test(s)) {
        throw bad("The Facebook link must start with https://facebook.com/.");
      }
      return s;
    },
  };
}
