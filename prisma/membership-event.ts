import type { EventItem } from "../lib/data";
import type { GuestTypeDef } from "../lib/events/types";

/**
 * The membership event: joining the association is its paid registration. Seeded
 * in every environment (npm run db:seed and npm run db:seed:prod) only when no
 * membership event exists; admins edit the details, prices and payment instructions
 * in /admin/events afterwards. Only facts here: the programme, guests and souvenir
 * are for the committee to add.
 */
export const MEMBERSHIP_EVENT_ID = "evt-golden-jubilee-50";

export const membershipEvent: EventItem = {
  id: MEMBERSHIP_EVENT_ID,
  title: "Golden Jubilee: 50 Years of Sabuj Shikshayatan (সুবর্ণ জয়ন্তী)",
  subtitle: "50 years of Sabuj Shikshayatan Government High School (1976–2026)",
  category: "REUNION",
  date: "2026-12-26",
  time: "",
  venue: "Sabuj Shikshayatan Government High School campus, Sitakunda",
  locationCity: "Chattogram",
  organizer: "SSGHS Alumni Association",
  bannerImage: "/golden-jubilee.jpg",
  maxAttendees: 5000,
  attendeesCount: 0,
  isRegistrationOpen: true,
  isMegaEvent: true,
  registrationFee: "৳1,500",
  registrationDeadline: "2026-12-15",
  description:
    "Sabuj Shikshayatan Government High School turns 50. Former students of every batch since 1977, with their families, are invited to celebrate the school's golden jubilee on campus.\n\nRegistering for the jubilee also makes you a member of the SSGHS Alumni Association: the committee checks each registration and payment before confirming it. The programme will be published here.",
  agenda: [],
  packages: [],
  highlights: [],
};

/** What a member pays for each guest; the member's own fee is registrationFee above. */
export const membershipGuestTypes: GuestTypeDef[] = [
  { name: "Spouse", price: 700, max: 1 },
  { name: "Child", price: 500, max: 5 },
];
