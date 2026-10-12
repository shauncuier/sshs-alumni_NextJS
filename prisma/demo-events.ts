// Demo events for local development only (npm run db:seed). Production seeding
// must not create these; see step 11 of docs/PRODUCTION_ROADMAP.md.
import type { EventItem } from "../lib/data";

export const demoEvents: EventItem[] = [
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
