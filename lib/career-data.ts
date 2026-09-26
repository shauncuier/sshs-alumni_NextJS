/**
 * SSGHS Alumni — Phase 4: Career Hub, Mentorship & Reunion Ticketing Data
 */

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workplaceType: "On-site" | "Hybrid" | "Remote";
  jobType: "Full-time" | "Part-time" | "Internship" | "Contract";
  department: string;
  salaryRange: string;
  experienceLevel: "Entry Level" | "Mid Level" | "Senior Level" | "Executive";
  postedByAlumnus: {
    name: string;
    sscBatch: number;
    designation: string;
    avatarUrl: string;
  };
  description: string;
  requirements: string[];
  benefits: string[];
  deadline: string;
  applicationCount: number;
  featured?: boolean;
}

export interface MentorProfile {
  id: string;
  name: string;
  sscBatch: number;
  designation: string;
  organization: string;
  domain: "BCS & Civil Service" | "Medical & Surgery" | "Software & AI" | "Banking & Finance" | "Higher Studies (US/EU)" | "Corporate & HR";
  locationCity: string;
  avatarUrl: string;
  bio: string;
  yearsOfExperience: number;
  availableDays: string[];
  totalMenteesHelped: number;
  rating: number;
  skills: string[];
  topicsOffered: string[];
}

export interface ReunionTicketTier {
  id: string;
  name: string;
  priceBdt: number;
  badge: string;
  color: string;
  description: string;
  features: string[];
  includesMerchandise: boolean;
  maxQuantity: number;
}

export const sampleJobs: JobListing[] = [
  {
    id: "job-1",
    title: "Senior Full-Stack Engineer (Next.js & Cloud)",
    company: "NexGen Cloud Labs",
    companyLogo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=120&auto=format&fit=crop&q=80",
    location: "Chattogram / Dhaka / Remote",
    workplaceType: "Hybrid",
    jobType: "Full-time",
    department: "Engineering",
    salaryRange: "৳1,40,000 - ৳2,20,000 BDT",
    experienceLevel: "Senior Level",
    postedByAlumnus: {
      name: "Engr. Tanvir Ahmed",
      sscBatch: 2008,
      designation: "VP of Engineering (NexGen)",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    },
    description: "We are scaling our enterprise microservices and customer portal. Looking for a talented alumnus proficient in modern React, Next.js, TypeScript, and AWS/Kubernetes. High preference for SSGHS graduates who demonstrate passion for clean architecture.",
    requirements: [
      "4+ years of professional full-stack development experience",
      "Solid mastery of TypeScript, Next.js App Router, and Node.js",
      "Familiarity with PostgreSQL / MongoDB and Redis caching",
      "Excellent communication and peer-mentoring attitude",
    ],
    benefits: [
      "Flexible hybrid hours with bi-weekly campus meetup",
      "Full health insurance & annual festival bonuses (2x)",
      "Dedicated professional certification allowance",
      "Annual company retreat in Cox's Bazar / Sylhet",
    ],
    deadline: "2026-10-31",
    applicationCount: 14,
    featured: true,
  },
  {
    id: "job-2",
    title: "Resident Medical Officer (ICU / Emergency)",
    company: "Chittagong Metropolitan Hospital",
    companyLogo: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=120&auto=format&fit=crop&q=80",
    location: "GEC Circle, Chattogram",
    workplaceType: "On-site",
    jobType: "Full-time",
    department: "Clinical Medicine",
    salaryRange: "৳65,000 - ৳90,000 BDT",
    experienceLevel: "Mid Level",
    postedByAlumnus: {
      name: "Dr. Nusrat Jahan",
      sscBatch: 2005,
      designation: "Associate Professor of Cardiology",
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    },
    description: "Metropolitan Hospital is expanding its critical care unit. Seeking dedicated MBBS doctors with BMDC registration. Priority mentorship offered by senior SSGHS doctors.",
    requirements: [
      "MBBS from a recognized medical college with valid BMDC license",
      "1-2 years experience in ICU or emergency medicine preferred",
      "Willingness to handle rotating evening and night shifts",
      "BLS / ACLS certification is a strong plus",
    ],
    benefits: [
      "Subsidized postgraduate FCPS / MD coaching guidance",
      "Free medical coverage for immediate family",
      "On-duty dining and transportation allowance",
    ],
    deadline: "2026-10-25",
    applicationCount: 8,
    featured: true,
  },
  {
    id: "job-3",
    title: "Supply Chain & Marine Logistics Coordinator",
    company: "Karnaphuli Freight & Marine Services",
    companyLogo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop&q=80",
    location: "Agrabad Commercial Area, Chattogram",
    workplaceType: "On-site",
    jobType: "Full-time",
    department: "Logistics",
    salaryRange: "৳50,000 - ৳75,000 BDT",
    experienceLevel: "Entry Level",
    postedByAlumnus: {
      name: "Mahbubur Rahman",
      sscBatch: 1999,
      designation: "Managing Director",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
    },
    description: "Coordinate container tracking, customs clearance, and port liaison at Chattogram Sea Port. Excellent entry point for young alumni looking to build a high-growth career in shipping and international trade.",
    requirements: [
      "BBA / BSc in Supply Chain, Commerce, or any relevant discipline",
      "Strong spoken and written English for overseas vessel correspondence",
      "Comfortable with Excel and shipping portal operations",
    ],
    benefits: [
      "Annual performance incentive based on cargo volume",
      "Comprehensive port clearance safety training",
      "Provident fund and gratuity benefits",
    ],
    deadline: "2026-11-15",
    applicationCount: 22,
    featured: false,
  },
  {
    id: "job-4",
    title: "Software QA Automation Intern",
    company: "Inovio Fintech Bangladesh",
    companyLogo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=120&auto=format&fit=crop&q=80",
    location: "Remote / Chattogram",
    workplaceType: "Remote",
    jobType: "Internship",
    department: "Quality Assurance",
    salaryRange: "৳20,000 - ৳25,000 BDT stipend",
    experienceLevel: "Entry Level",
    postedByAlumnus: {
      name: "Md. Jashedul Islam",
      sscBatch: 2008,
      designation: "Lead Solutions Architect",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    },
    description: "Great opportunity for current CS / CSE undergraduate alumni from batches 2022-2025. Learn automated API testing with Playwright and Jest in a live production payment gateway environment.",
    requirements: [
      "Current student or fresh graduate in CSE / EEE or related subject",
      "Basic understanding of JavaScript / TypeScript and REST APIs",
      "Hunger to learn test-driven development and CI/CD pipelines",
    ],
    benefits: [
      "Full-time employment conversion opportunity based on performance",
      "Flexible study hours around university exam schedules",
      "Direct 1-on-1 mentorship with senior architects",
    ],
    deadline: "2026-10-20",
    applicationCount: 31,
    featured: false,
  },
];

export const sampleMentors: MentorProfile[] = [
  {
    id: "men-1",
    name: "Mohammad Sayedul Hoque, BCS",
    sscBatch: 1996,
    designation: "Deputy Secretary",
    organization: "Ministry of Public Administration, Govt. of Bangladesh",
    domain: "BCS & Civil Service",
    locationCity: "Dhaka",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    bio: "24th BCS (Administration) Cadre. Served as Upazila Nirbahi Officer (UNO) and Additional Deputy Commissioner (ADC). Passionate about guiding young SSGHS alumni aspiring to crack the Bangladesh Civil Service examination.",
    yearsOfExperience: 20,
    availableDays: ["Friday Evening", "Saturday Morning"],
    totalMenteesHelped: 48,
    rating: 4.95,
    skills: ["BCS Cadre Strategy", "Written Exam Preparation", "Viva Voce Technique", "Public Policy Analysis"],
    topicsOffered: [
      "BCS Preliminary to Viva Roadmap",
      "Balancing Graduation Studies with BCS Preparation",
      "Career Growth Trajectory in Bangladesh Administration",
    ],
  },
  {
    id: "men-2",
    name: "Dr. Nusrat Jahan, FCPS",
    sscBatch: 2005,
    designation: "Associate Professor of Cardiology",
    organization: "Chittagong Medical College & Hospital",
    domain: "Medical & Surgery",
    locationCity: "Chattogram",
    avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    bio: "Graduated with honors from CMC. Completed FCPS in Medicine and Cardiology. Offers pragmatic advice for young doctors navigating internship, FCPS Part 1/2, and MRCP exams.",
    yearsOfExperience: 14,
    availableDays: ["Sunday Evening", "Thursday Night"],
    totalMenteesHelped: 62,
    rating: 4.98,
    skills: ["Postgraduate Medical Pathways", "FCPS Cardiology Coaching", "Clinical Case Presentations"],
    topicsOffered: [
      "Navigating FCPS vs MD vs MRCP Pathways",
      "Surviving Clinical Internship in Govt Hospitals",
      "Medical Research & International Paper Publishing",
    ],
  },
  {
    id: "men-3",
    name: "Engr. Tanvir Ahmed",
    sscBatch: 2008,
    designation: "Staff Software Architect",
    organization: "Silicon Valley Tech / Remote",
    domain: "Software & AI",
    locationCity: "Chattogram / San Jose",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "Ex-Samsung R&D. Now architecting cloud-native AI pipelines. Mentors alumni on international remote jobs, system design interviews, and open-source contributions.",
    yearsOfExperience: 12,
    availableDays: ["Saturday Evening", "Sunday Morning"],
    totalMenteesHelped: 39,
    rating: 4.92,
    skills: ["System Design", "Cloud Infrastructure", "Full-Stack React/Node", "International Remote Careers"],
    topicsOffered: [
      "Cracking US / European Remote Engineering Jobs from Bangladesh",
      "High-Level System Design & Microservice Patterns",
      "Resume Review for Silicon Valley Recruiters",
    ],
  },
  {
    id: "men-4",
    name: "Shahnaz Parveen, PhD",
    sscBatch: 2002,
    designation: "Postdoctoral Research Fellow",
    organization: "Technical University of Munich (TUM), Germany",
    domain: "Higher Studies (US/EU)",
    locationCity: "Munich, Germany",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    bio: "DAAD Scholar and Erasmus alumnus. Helps students craft winning SOPs, reach out to European professors for funded master's and PhD positions, and ace visa interviews.",
    yearsOfExperience: 10,
    availableDays: ["Friday Night", "Saturday Afternoon"],
    totalMenteesHelped: 54,
    rating: 4.96,
    skills: ["DAAD Scholarship", "Statement of Purpose (SOP)", "German / EU University Admissions", "Academic Research"],
    topicsOffered: [
      "Applying for Fully Funded Master's & PhD in Germany / EU",
      "SOP & CV Review for Academic Admissions",
      "Securing Research Assistantships (RA/TA)",
    ],
  },
];

export const sampleTicketTiers: ReunionTicketTier[] = [
  {
    id: "tier-standard",
    name: "Alumnus Delegate Pass",
    priceBdt: 1500,
    badge: "Most Popular",
    color: "emerald",
    description: "Standard individual entry for SSGHS registered alumni to the Grand Golden Jubilee Reunion.",
    features: [
      "Full day admission to all campus ceremonies & cultural night",
      "Grand Buffet Luncheon & Evening Traditional Mezban Snacks",
      "Commemorative Golden Jubilee T-Shirt (Premium Combed Cotton)",
      "Official 50th Anniversary Souvenir Book & Alumni Crest Badge",
      "Gate QR Fast-Track verification on mobile",
    ],
    includesMerchandise: true,
    maxQuantity: 1,
  },
  {
    id: "tier-couple",
    name: "Couple / Family Delegate Pass",
    priceBdt: 2800,
    badge: "Family Dining",
    color: "indigo",
    description: "Admits alumnus plus spouse or family companion with dedicated family pavilion seating.",
    features: [
      "Admission for 2 Attendees (Alumnus + Spouse / Family member)",
      "2x Grand Buffet Luncheon & Family Dining reserved table",
      "2x Golden Jubilee Souvenir T-Shirts (select sizes)",
      "Souvenir book, commemorative pin, and reunion gift kit",
      "Access to Children's Play Zone & Heritage Photo Booth",
    ],
    includesMerchandise: true,
    maxQuantity: 2,
  },
  {
    id: "tier-patron",
    name: "Golden Jubilee VIP Patron Pass",
    priceBdt: 5000,
    badge: "Patron Honor",
    color: "amber",
    description: "Distinguished sponsorship package for alumni wanting to deeply support the alma mater.",
    features: [
      "VIP Front-Row Seating at Main Stage Auditorium",
      "Exclusive Golden Jubilee Blazer Crest & Gold-plated Lapel Pin",
      "Donor's name printed on Permanent Golden Jubilee Honor Roll Plaque",
      "Private High-Tea reception with Retired Headmasters and Dignitaries",
      "All meals, souvenir book, and premium delegate kit included",
    ],
    includesMerchandise: true,
    maxQuantity: 5,
  },
  {
    id: "tier-teacher-sponsor",
    name: "Sponsor a Retired Teacher's Seat",
    priceBdt: 1000,
    badge: "Noble Tribute",
    color: "rose",
    description: "Honorary sponsorship to bring our beloved veteran teachers to the reunion with full dignity.",
    features: [
      "Directly funds round-trip AC car transport for one retired teacher",
      "Provides special honorary gift crest presented in your batch's name",
      "Your name listed in the 'Gratitude to Gurus' souvenir section",
      "Tax-exempt association contribution certificate",
    ],
    includesMerchandise: false,
    maxQuantity: 10,
  },
];
