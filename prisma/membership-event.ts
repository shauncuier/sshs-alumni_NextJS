import type { EventItem } from "../lib/data";
import type { BatchFeeDef, GuestTypeDef } from "../lib/events/types";

/**
 * The membership event: joining the association is its paid registration. Seeded
 * in every environment (npm run db:seed and npm run db:seed:prod) only when no
 * membership event exists; admins edit the details, prices, programme and guests
 * in /admin/events afterwards. Programme times are the committee's plan and can
 * change; guests of honour are added once confirmed.
 */
export const MEMBERSHIP_EVENT_ID = "evt-golden-jubilee-50";

export const membershipEvent: EventItem = {
  id: MEMBERSHIP_EVENT_ID,
  title: "Golden Jubilee: 50 Years of Sabuj Shikshayatan (সুবর্ণ জয়ন্তী)",
  subtitle: "50 years of Sabuj Shikshayatan Government High School (1976–2026)",
  category: "REUNION",
  date: "2026-12-26",
  time: "8:00 AM – 9:00 PM",
  venue: "Sabuj Shikshayatan Government High School campus, Sitakunda",
  locationCity: "Chattogram",
  organizer: "SSGHS Alumni Association",
  bannerImage: "/golden-jubilee-art.jpg",
  maxAttendees: 5000,
  attendeesCount: 0,
  isRegistrationOpen: true,
  isMegaEvent: true,
  registrationFee: "৳1,500",
  registrationDeadline: "2026-11-30",
  description: [
    "Sabuj Shikshayatan Government High School turns 50. Around 26 December 2026 (the exact date is still to be confirmed) former students of every batch since 1977 come back to the campus, with their families, for one day of celebration: a jubilee rally, flag hoisting, honours for our teachers, batch reunions and a cultural evening.",
    "সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়ের ৫০ বছর পূর্তি (সুবর্ণ জয়ন্তী) উৎসবে সকল প্রাক্তন শিক্ষার্থীকে সপরিবারে আমন্ত্রণ।",
    "Registration includes breakfast, lunch and a biryani dinner, the Golden Jubilee T-shirt, the souvenir book and a commemorative gift. Registering for the jubilee also makes you a member of the SSGHS Alumni Association: the committee checks each registration and payment before confirming it, and your ticket QR code is then ready on your dashboard.",
  ].join("\n\n"),
  agenda: [
    { time: "08:00 AM", activity: "Registration desk opens: collect your badge, T-shirt and gift; breakfast" },
    { time: "09:00 AM", activity: "Golden Jubilee rally" },
    { time: "10:00 AM", activity: "National anthem, flag hoisting and release of balloons" },
    { time: "10:30 AM", activity: "Opening ceremony: welcome and speeches by the headmaster and guests" },
    { time: "11:30 AM", activity: "Honouring our former and current teachers" },
    { time: "01:00 PM", activity: "Lunch" },
    { time: "02:00 PM", activity: "Batch reunions and photo sessions" },
    { time: "04:00 PM", activity: "Cultural programme by alumni and students" },
    { time: "06:30 PM", activity: "Raffle draw" },
    { time: "07:30 PM", activity: "Biryani dinner and closing" },
  ],
  packages: [],
  highlights: [
    "Alumni of every batch since 1977, with their families",
    "Jubilee rally and flag hoisting on campus",
    "Honours for our former and current teachers",
    "Batch reunions and photo sessions",
    "Cultural programme and raffle draw",
    "Breakfast, lunch and biryani dinner",
    "Golden Jubilee T-shirt, souvenir book and commemorative gift",
  ],
  souvenirDetails: [
    "Each registered member receives:",
    "• Golden Jubilee T-shirt (choose your size on the registration form)",
    "• Badge and commemorative gift (crest)",
    "• A copy of the Golden Jubilee souvenir book",
    "",
    "Meals on the day for members and their registered guests: breakfast, lunch and biryani dinner.",
    "Collect your kit at the registration desk with your ticket QR code.",
  ].join("\n"),
};

/** The member's own fee by SSC batch; other batches pay registrationFee above. */
export const membershipBatchFees: BatchFeeDef[] = [
  { fromBatch: 1989, toBatch: 2014, price: 1500 },
  { fromBatch: 2015, toBatch: 2026, price: 1250 },
];

/** What a member pays for each guest. Children under 5 come free and are not registered. */
export const membershipGuestTypes: GuestTypeDef[] = [
  { name: "Spouse", price: 600, max: 1 },
  { name: "Child (5 years or older)", price: 600, max: 5 },
];
