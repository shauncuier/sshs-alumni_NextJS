import { createManualDonation as create } from "@/lib/donations";
import { makePdf } from "./images";

/**
 * createManualDonation with a payment screenshot attached, as the donate form sends it
 * (every method except cash needs one). Pass `null` as the screenshot to test without.
 */
export function createManualDonation(input: Parameters<typeof create>[0], userId: string | null, screenshot: Buffer | null = makePdf()) {
  return create(input, userId, screenshot ?? undefined);
}
