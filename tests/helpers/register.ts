import { registerForEvent as register } from "@/lib/events/registrations";
import { makeImage } from "./images";

let screenshot: Promise<Buffer> | null = null;

/**
 * registerForEvent with a payment screenshot attached, as the join form sends it
 * (paid registrations need one, except cash). Pass `paymentScreenshot: undefined`
 * to test a registration without one. A joining account without a gender gets "MALE";
 * pass `gender: null` to test one without.
 */
export async function registerForEvent(args: Parameters<typeof register>[0]): ReturnType<typeof register> {
  screenshot ??= makeImage(64, 64);
  const account = args.account && !("gender" in args.account) ? { ...args.account, gender: "MALE" } : args.account;
  return register({ paymentScreenshot: await screenshot, ...args, account });
}
