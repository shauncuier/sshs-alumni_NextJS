// Demo events for local development only (npm run db:seed). Production seeding
// must not create these; see step 11 of docs/PRODUCTION_ROADMAP.md.
import type { EventItem } from "../lib/data";

export const demoEvents: EventItem[] = [
  {
    id: "evt-golden-jubilee-50",
    title: "50 Years Golden Jubilee Grand Celebration (সুবর্ণ জয়ন্তী ৫০ বছর পূর্তি উৎসব)",
    subtitle: "Half a Century of Knowledge, Legacy & Brotherhood (1974 - 2024)",
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
      { time: "Day 2 (Dec 31) - 11:30 AM", activity: "Launch of 500-page Commemorative Souvenir Book 'সবুজ পদাবলি (1974-2024)'" },
      { time: "Day 2 (Dec 31) - 01:00 PM", activity: "Traditional Chittagong Mezban Grand Feast for 5,000+ Alumni & Families" },
      { time: "Day 2 (Dec 31) - 04:00 PM", activity: "Golden Jubilee Alumni Excellence Awards (Distinguished Public Servants, Scientists, Doctors, Business Leaders)" },
      { time: "Day 2 (Dec 31) - 06:30 PM", activity: "Gala Concert ft. Shironamhin, Warfaze & Alumni Musical Troupe" },
      { time: "Day 2 (Dec 31) - 11:59 PM", activity: "New Year 2027 Countdown, 500-Drone Aerial Formation Show & Grand Fireworks Extravaganza" }
    ],
    packages: [
      {
        name: "General Alumnus Delegate",
        price: "৳1,000",
        description: "Official registration for individual alumni member across any batch (1974-2025).",
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
      "50 Batches Convergence (1974 – 2025)",
      "Traditional Chittagong Mezban for 5,000+ Attendees",
      "Gurudakshina Honors for 100+ Beloved Teachers",
      "500-Page Hardbound Souvenir Book 'সবুজ পদাবলি'",
      "500-Drone Aerial Formation & Synchronized Fireworks",
      "Live Concert featuring Warfaze, Shironamhin & Alumni Artists",
      "৳1 Crore School Endowment & STEM Innovation Lab Fund"
    ],
    souvenirDetails: "Every registered delegate receives a luxury commemorative bag containing the 50th Anniversary Hardcover Souvenir Book ('সবুজ পদাবলি'), Custom Gold-Embroidered Crest, Premium Polo Shirt, Heritage Cap, Brass Lapel Pin, and RFID Smart Delegate Badge."
  },
  {
    id: "evt-1",
    title: "Grand Alumni Reunion 2026: Generations of Green",
    category: "REUNION",
    date: "2026-11-20",
    time: "09:00 AM - 08:00 PM",
    venue: "Sabuj Shikshayatan Government High School Main Campus Grounds",
    locationCity: "Chattogram",
    organizer: "Central Alumni Executive Committee",
    bannerImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    maxAttendees: 2000,
    attendeesCount: 840,
    description: "The biggest gathering in our school's history! Featuring an inauguration march, honored retired teachers tribute, batch stalls, traditional Chittagong Mezban lunch, cultural concert, and grand fireworks.",
    isRegistrationOpen: true,
    agenda: [
      { time: "09:00 AM", activity: "Alumni Welcome, Registration & Nostalgia Kit Distribution" },
      { time: "10:30 AM", activity: "National Anthem, School Song & Inaugural Flag Hoisting" },
      { time: "11:30 AM", activity: "Tribute to Respected Teachers & Lifetime Recognition Awards" },
      { time: "01:00 PM", activity: "Traditional Mezban & Grand Networking Feast" },
      { time: "03:00 PM", activity: "Inter-Batch Friendly Cricket & Football Matches" },
      { time: "05:30 PM", activity: "Evening Cultural Performance by Alumni Artists & Special Guest Band" },
      { time: "07:30 PM", activity: "Grand Fireworks & Farewell" }
    ]
  },
  {
    id: "evt-2",
    title: "SSGHS Alumni Inter-Batch Cricket Carnival Season 5",
    category: "SPORTS",
    date: "2026-10-14",
    time: "08:30 AM - 05:30 PM",
    venue: "Chattogram District Stadium Ground",
    locationCity: "Chattogram",
    organizer: "Alumni Sports Subcommittee",
    bannerImage: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80",
    maxAttendees: 500,
    attendeesCount: 320,
    description: "16 batches battle it out for the prestigious Green Crest Trophy! T10 tennis ball cricket, commentary, cheerleaders, and BBQ.",
    isRegistrationOpen: true
  },
  {
    id: "evt-3",
    title: "Global Alumni Tech & Career Leadership Summit",
    category: "WEBINAR",
    date: "2026-10-28",
    time: "07:00 PM - 09:30 PM (BST)",
    venue: "Zoom Online Live & School Auditorium",
    locationCity: "Global / Hybrid",
    organizer: "Alumni Career Guild",
    bannerImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
    maxAttendees: 1000,
    attendeesCount: 450,
    description: "Keynotes from alumni leaders working at Google, Microsoft, Arup London, and Bangladesh Central Bank on global career transitions and AI frontiers.",
    isRegistrationOpen: true
  },
  {
    id: "evt-4",
    title: "Annual Teachers' Tribute & Healthcare Day",
    category: "COMMUNITY",
    date: "2026-12-05",
    time: "10:00 AM - 03:00 PM",
    venue: "School Auditorium, Main Campus",
    locationCity: "Chattogram",
    organizer: "Alumni Medical Doctors Wing",
    bannerImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    maxAttendees: 300,
    attendeesCount: 180,
    description: "Honoring our current and retired teachers with floral felicitations, honorary pension gifts, and free comprehensive health screenings by alumnus doctors.",
    isRegistrationOpen: true
  }
];
