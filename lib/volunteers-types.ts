export interface VolunteerItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  sscBatch: number;
  subcommittee: string;
  subcommitteeLabel: string;
  skills?: string;
  availability?: string;
  experience?: string;
  notes?: string;
  source: "PUBLIC_APPLICATION" | "EVENT_REGISTRATION";
  status: "PENDING" | "APPROVED" | "DECLINED";
  appliedAt: string;
}

export const SUBCOMMITTEES = [
  {
    id: "RECEPTION_VIP",
    name: "Reception & VIP Protocol",
    bengaliName: "অভ্যর্থনা ও ভিআইপি প্রোটোকল উপ-কমিটি",
    description: "Welcome distinguished guests, cabinet dignitaries, emeritus headmasters, and senior alumni delegates.",
    icon: "Sparkles",
  },
  {
    id: "GATE_SECURITY",
    name: "Gate Entry & Security QR Scanning",
    bengaliName: "গেট এন্ট্রি ও শৃঙ্খলা উপ-কমিটি",
    description: "Operate the digital ticket & card scanner at campus entrance gates; manage attendee flow and order.",
    icon: "ShieldCheck",
  },
  {
    id: "MEZBAN_FOOD",
    name: "Mezban Feast & Food Distribution",
    bengaliName: "ঐতিহ্যবাহী মেজবান ও খাবার বিতরণ উপ-কমিটি",
    description: "Coordinate Chittagong traditional Mezban banquet catering for 5,000+ delegates across batch pavilions.",
    icon: "Utensils",
  },
  {
    id: "MEDICAL_FIRSTAID",
    name: "Alumni Medical Wing & First Aid",
    bengaliName: "মেডিকেল ও জরুরি ফার্স্ট এইড উপ-কমিটি",
    description: "Run the emergency medical station, provide free health checks for retired teachers, and handle emergencies.",
    icon: "HeartPulse",
  },
  {
    id: "SOUVENIR_MEDIA",
    name: "Souvenir Publication & Media",
    bengaliName: "স্মারক গ্রন্থ 'সবুজ পদাবলি' ও প্রেস মিডিয়া",
    description: "Distribute commemorative hardcover book, manage press relations, and photograph historic moments.",
    icon: "BookOpen",
  },
  {
    id: "CULTURAL_STAGE",
    name: "Cultural Program & Stage Logistics",
    bengaliName: "সাংস্কৃতিক অনুষ্ঠান ও মঞ্চ ব্যবস্থাপনা",
    description: "Coordinate artist green rooms, concert stages (Warfaze, Shironamhin), sound, lighting, and aerial drone shows.",
    icon: "Music",
  },
  {
    id: "TEACHER_HONOR",
    name: "Teacher Felicitation ('Gurudakshina')",
    bengaliName: "গুরুদক্ষিণা ও শিক্ষক সম্মাননা উপ-কমিটি",
    description: "Escort beloved current & retired teachers, assist with gold medal & crest presentations on stage.",
    icon: "GraduationCap",
  },
  {
    id: "GENERAL_SUPPORT",
    name: "General Volunteer Support",
    bengaliName: "সার্বিক স্বেচ্ছাসেবী স্কোয়াড",
    description: "Flexible team providing rapid response, helpdesk support, and guidance across all campus zones.",
    icon: "Users",
  },
] as const;

export const SUBCOMMITTEE_LABELS: Record<string, string> = Object.fromEntries(
  SUBCOMMITTEES.map((s) => [s.id, s.name])
);
