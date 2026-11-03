/**
 * The main public pages, for AI agents: listed in /llms.txt (lib/agent-summary.ts) and
 * offered by the in-browser "open_page" tool (components/shared/WebMcpTools.tsx).
 * Each entry says what the page holds.
 */
export const KEY_PAGES: { path: string; title: string; about: string }[] = [
  { path: "/about", title: "About the association", about: "who we are, aims and the executive council" },
  { path: "/school", title: "The school", about: "history of Sabuj Shikshayatan Government High School since 1976" },
  { path: "/teachers", title: "Teachers", about: "today's teachers, former head teachers and former staff" },
  { path: "/events", title: "Events", about: "reunions and programmes, with dates, fees and online registration" },
  { path: "/jubilee", title: "Golden Jubilee 2026", about: "the school's 50th-anniversary celebration" },
  { path: "/register", title: "Join", about: "membership registration for former students" },
  { path: "/alumni", title: "Alumni directory", about: "verified members who chose to be listed" },
  { path: "/batches", title: "SSC batches", about: "members grouped by SSC year" },
  { path: "/news", title: "News", about: "association news" },
  { path: "/notices", title: "Notices", about: "official notices from the committee" },
  { path: "/stories", title: "Stories", about: "stories written by alumni" },
  { path: "/achievements", title: "Achievements", about: "achievements of alumni" },
  { path: "/committee", title: "Committee", about: "the current executive committee" },
  { path: "/constitution", title: "Constitution", about: "the association's constitution in Bangla and English" },
  { path: "/careers", title: "Jobs", about: "job openings shared by alumni" },
  { path: "/mentorship", title: "Mentorship", about: "alumni who offer mentoring" },
  { path: "/donate", title: "Donate", about: "fundraising campaigns for the school and students" },
  { path: "/contact", title: "Contact", about: "address, phone numbers and a contact form" },
  { path: "/terms", title: "Terms and privacy", about: "terms of use and how member data is handled" },
];
