import type { EventItem } from "../lib/data";

/**
 * The membership event: joining the association is its paid registration. Seeded
 * in every environment (npm run db:seed and npm run db:seed:prod); admins edit the
 * details, fees and payment instructions in /admin/events afterwards.
 */
export const MEMBERSHIP_EVENT_ID = "evt-golden-jubilee-50";

export const membershipEvent: EventItem = {
  id: "evt-golden-jubilee-50",
  title: "50 Years Golden Jubilee Grand Celebration (সুবর্ণ জয়ন্তী ৫০ বছর পূর্তি উৎসব)",
  subtitle: "Half a Century of Knowledge, Legacy & Brotherhood (1976 - 2026)",
  category: "REUNION",
  date: "2026-12-30",
  time: "Grand Landmark Festival (Approx. Date: December 30, 2026)",
  venue: "Main Campus Grounds & Central Convention Center, Sitakunda, Chattogram",
  locationCity: "Chattogram",
  organizer: "Golden Jubilee National Steering Committee & SSGHS Alumni Association",
  bannerImage: "/golden-jubilee.jpg",
  maxAttendees: 5000,
  attendeesCount: 2340,
  isRegistrationOpen: true,
  isMegaEvent: true,
  registrationFee: "৳1,000 / Person (৳500 each extra adult, ৳300 below 12 yrs)",
  registrationDeadline: "December 15, 2026",
  guestOfHonor: "Distinguished Veterans, Emeritus Headmasters & Cabinet Dignitaries",
  description: "The grandest celebration in the 50-year history of Sabuj Shikshayatan Government High School! A historic convergence of 50 batches of alumni from Bangladesh and across the world. Featuring the Golden Jubilee Heritage Rally, Gurudakshina Teacher Felicitation, Grand Chittagong Traditional Mezban for 5,000+ alumni, Mega Concert with premier bands, Commemorative Souvenir Book 'সবুজ পদাবলি', batch pavilions, and a breathtaking Drone Light & Fireworks Extravaganza.",
  agenda: [
    { time: "Day 1 (Dec 30) - 08:30 AM", activity: "Grand Golden Jubilee Peace Rally & Jubilant Campus March from Sitakunda Center" },
    { time: "Day 1 (Dec 30) - 10:30 AM", activity: "National Anthem, School Song & 50th Year Golden Flag Hoisting with Release of Doves" },
    { time: "Day 1 (Dec 30) - 11:30 AM", activity: "Grand Opening Ceremony, Speeches by Chief Guests & Inauguration of Batch Pavilions" },
    { time: "Day 1 (Dec 30) - 01:00 PM", activity: "Traditional Banquet Lunch & Inter-Batch Informal Reconnection Sessions" },
    { time: "Day 1 (Dec 30) - 03:30 PM", activity: "'Gurudakshina' - Emotional Felicitation of Respected Retired & Current Teachers with Gold Medals" },
    { time: "Day 1 (Dec 30) - 06:00 PM", activity: "Memorial Homage to Departed Teachers & Classmates with 500 Memorial Lanterns" },
    { time: "Day 2 (Dec 31) - 09:30 AM", activity: "Golden Jubilee Inter-Batch Cricket & Football Challenge Cup Finals" },
    { time: "Day 2 (Dec 31) - 11:30 AM", activity: "Launch of 500-page Commemorative Souvenir Book 'সবুজ পদাবলি (1976-2026)'" },
    { time: "Day 2 (Dec 31) - 01:00 PM", activity: "Traditional Chittagong Mezban Grand Feast for 5,000+ Alumni & Families" },
    { time: "Day 2 (Dec 31) - 04:00 PM", activity: "Golden Jubilee Alumni Excellence Awards (Distinguished Public Servants, Scientists, Doctors, Business Leaders)" },
    { time: "Day 2 (Dec 31) - 06:30 PM", activity: "Gala Concert ft. Shironamhin, Warfaze & Alumni Musical Troupe" },
    { time: "Day 2 (Dec 31) - 11:59 PM", activity: "New Year 2027 Countdown, 500-Drone Aerial Formation Show & Grand Fireworks Extravaganza" }
  ],
  packages: [
    {
      name: "General Alumnus Delegate",
      price: "৳1,000",
      description: "Official registration for individual alumni member across any batch.",
      includes: [
        "Full Festival Access Pass",
        "50-Year Commemorative Souvenir Hardcover Book 'সবুজ পদাবলি'",
        "Custom Embroidered Golden Jubilee Polo Shirt",
        "Commemorative Heritage Cap & Golden Crest Lapel Pin",
        "Traditional Chittagong Mezban Grand Feast Pass",
        "RFID Smart Delegate Access Badge"
      ],
      isPopular: true
    },
    {
      name: "Alumnus + Spouse / Extra Guest",
      price: "৳1,500",
      description: "Includes alumnus registration (৳1,000) + 1 extra adult/spouse (৳500).",
      includes: [
        "2x Full Festival Access Passes (Alumnus + Spouse)",
        "1x Deluxe Commemorative Souvenir Hardcover Book",
        "2x Embroidered Jubilee Polo Shirts / Stoles",
        "2x Commemorative Caps & Brass Badges",
        "2x Traditional Chittagong Mezban Grand Feast Passes",
        "Family Lounge & Photo Pavilion Access"
      ]
    },
    {
      name: "Family (Alumnus + Spouse + 1 Child < 12yr)",
      price: "৳1,800",
      description: "Includes alumnus (৳1,000) + spouse (৳500) + child under 12 (৳300).",
      includes: [
        "3x Festival Passes (Alumnus + Adult Guest + Child under 12)",
        "1x Commemorative Souvenir Book 'সবুজ পদাবলি'",
        "2x Adult Embroidered Polos + Kids Souvenir Badge & Cap",
        "3x Mezban Feast Passes with Kids Food Counter",
        "Kids Fun Zone & Interactive Gaming Access",
        "Special Golden Jubilee Family Portrait"
      ]
    },
    {
      name: "Golden Patron & Sponsor",
      price: "৳5,000",
      description: "Prestigious patron tier supporting the school 50-year development endowment.",
      includes: [
        "VIP Stage Seating for All Ceremonies",
        "Gold-Plated 50-Year Laser Engraved Commemorative Crest",
        "Permanent Name Etched on Campus Golden Jubilee Plaque",
        "Complimentary Family Entry (Alumnus + Spouse + Children)",
        "VIP Lounge & Executive Mezban Dining Access",
        "Special Citation in Souvenir Book 'সবুজ পদাবলি'"
      ]
    }
  ],
  highlights: [
    "Alumni of every batch since 1977",
    "Traditional Chittagong Mezban for 5,000+ Attendees",
    "Gurudakshina Honors for 100+ Beloved Teachers",
    "500-Page Hardbound Souvenir Book 'সবুজ পদাবলি'",
    "500-Drone Aerial Formation & Synchronized Fireworks",
    "Live Concert featuring Warfaze, Shironamhin & Alumni Artists",
    "৳1 Crore School Endowment & STEM Innovation Lab Fund"
  ],
  souvenirDetails: "Every registered delegate receives a luxury commemorative bag containing the 50th Anniversary Hardcover Souvenir Book ('সবুজ পদাবলি'), Custom Gold-Embroidered Crest, Premium Polo Shirt, Heritage Cap, Brass Lapel Pin, and RFID Smart Delegate Badge."
};

/** Head counts per package, used to size each registration. */
export const membershipPackageHeads: Record<string, { adults: number; children: number; guestsFree?: boolean }> = {
  "General Alumnus Delegate": { adults: 1, children: 0 },
  "Alumnus + Spouse / Extra Guest": { adults: 2, children: 0 },
  "Family (Alumnus + Spouse + 1 Child < 12yr)": { adults: 2, children: 1 },
  "Golden Patron & Sponsor": { adults: 1, children: 0, guestsFree: true },
};
