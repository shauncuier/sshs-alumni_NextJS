export interface AlumniMember {
  id: string;
  fullName: string;
  sscBatch: number;
  graduationYear: number;
  rollNumber?: string;
  profession: string;
  company: string;
  industry: string;
  locationCity: string;
  locationCountry: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
  isVerified: boolean;
  phone?: string;
  email: string;
  skills: string[];
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    github?: string;
    website?: string;
  };
  schoolMemories?: string;
  contributions?: string;
  connectionCount: number;
}

export interface BatchInfo {
  year: number;
  name: string;
  tagline: string;
  totalAlumni: number;
  classRepresentative: string;
  representativePhone: string;
  reunionDate?: string;
  coverImage: string;
  description: string;
}

export interface EventItem {
  id: string;
  title: string;
  category: "REUNION" | "SPORTS" | "WEBINAR" | "CULTURAL" | "COMMUNITY";
  date: string;
  time: string;
  venue: string;
  locationCity: string;
  organizer: string;
  bannerImage: string;
  maxAttendees: number;
  attendeesCount: number;
  description: string;
  isRegistrationOpen: boolean;
  agenda?: { time: string; activity: string }[];
  isMegaEvent?: boolean;
  subtitle?: string;
  registrationFee?: string;
  registrationDeadline?: string;
  guestOfHonor?: string;
  packages?: { name: string; price: string; description: string; includes: string[]; isPopular?: boolean }[];
  highlights?: string[];
  souvenirDetails?: string;
  slug?: string;
  isMembershipEvent?: boolean;
  placesLeft?: number;
  closedMessage?: string | null;
}

export interface AlumniStoryItem {
  id: string;
  title: string;
  authorName: string;
  batchYear: number;
  profession: string;
  currentOrganization: string;
  coverImage: string;
  summary: string;
  fullStory: string;
  quote: string;
  publishedDate: string;
  readTime: string;
}

export interface AchievementItem {
  id: string;
  recipientName: string;
  batchYear: number;
  category: "Entrepreneurs" | "Doctors" | "Engineers" | "Researchers" | "Government Officers" | "Educators" | "Artists" | "Business Leaders";
  title: string;
  organization: string;
  description: string;
  photoUrl: string;
  yearAwarded: number;
}

export interface GalleryPhotoItem {
  id: string;
  albumCategory: "School Memories" | "Old Campus" | "Reunions" | "Sports" | "Cultural Events" | "Teachers";
  title: string;
  imageUrl: string;
  year?: number;
  caption: string;
  submittedBy: string;
}

export interface DonationCampaignItem {
  id: string;
  title: string;
  category: "Scholarship" | "STEM Lab" | "Library" | "Emergency Aid" | "Sports" | "Campus Development";
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  bannerImage: string;
  daysLeft: number;
  featured: boolean;
}

export interface PostItem {
  id: string;
  author: {
    name: string;
    avatar: string;
    batch: number;
    profession: string;
    isVerified: boolean;
  };
  timestamp: string;
  content: string;
  images?: string[];
  likesCount: number;
  commentsCount: number;
  batchTag?: number;
  isLiked?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  category: "School News" | "Alumni News" | "Events" | "Announcements";
  excerpt: string;
  content: string;
  featuredImage: string;
  date: string;
  author: string;
}

export interface VerificationRequestItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  sscBatch: number;
  rollNumber: string;
  profession: string;
  location: string;
  documentType: string;
  documentUrl: string;
  submittedAt: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  awaitingPayment?: boolean;
  avatarUrl?: string;
}

// -----------------------------------------------------------------
// Official Institution Profile: Sabuj Shikshayatan Govt High School
// -----------------------------------------------------------------

export const schoolInfo = {
  name: "Sabuj Shikshayatan Government High School",
  shortName: "SSGHS",
  bengaliName: "সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়",
  established: 1985,
  eiin: "105070",
  location: "South Sonaichhari, Sitakunda, Chattogram, Bangladesh",
  board: "Board of Intermediate and Secondary Education, Chattogram",
  email: "info@sabujsghs.edu.bd",
  phone: "+880 1745-950025",
  website: "https://sabujsghs.edu.bd/",
  tagline: "Connecting Generations, Preserving Heritage, Shaping the Future",
  motto: "Knowledge, Character, and National Dedication",
  stats: {
    totalAlumni: 5200,
    activeBatches: 41,
    countries: 28,
    professions: 110,
    fundsRaised: 1850000,
  },
};

export const sampleBatches: BatchInfo[] = [
  {
    year: 2005,
    name: "SSC Batch 2005",
    tagline: "The Trailblazers of Millennium",
    totalAlumni: 142,
    classRepresentative: "Kazi Minhazur Rahman",
    representativePhone: "+880 1711-234567",
    reunionDate: "2026-11-20",
    coverImage: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1000&q=80",
    description: "The 2005 batch represents the golden heritage of Sabuj Shikshayatan, with leaders pioneering software, healthcare, maritime logistics, and civil service."
  },
  {
    year: 2008,
    name: "SSC Batch 2008",
    tagline: "Unbreakable Brotherhood & Vision",
    totalAlumni: 168,
    classRepresentative: "Md. Jashedul Islam",
    representativePhone: "+880 1819-987654",
    reunionDate: "2026-12-15",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80",
    description: "Proud batch of engineers, doctors, and entrepreneurs holding regular annual get-togethers and scholarship drives for juniors."
  },
  {
    year: 2010,
    name: "SSC Batch 2010",
    tagline: "Decade of Dedication & Excellence",
    totalAlumni: 185,
    classRepresentative: "Dr. Farhan Tanvir",
    representativePhone: "+880 1912-345678",
    reunionDate: "2026-10-05",
    coverImage: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=80",
    description: "Actively sponsoring secondary students with tuition and sports equipment for the school inter-house tournaments."
  },
  {
    year: 2012,
    name: "SSC Batch 2012",
    tagline: "Passionate Achievers",
    totalAlumni: 194,
    classRepresentative: "Nusrat Jahan Chowdhury",
    representativePhone: "+880 1612-445566",
    reunionDate: "2026-12-28",
    coverImage: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80",
    description: "Dynamic batch with global representation in tech hubs from Dublin to Tokyo, maintaining active monthly meetups and welfare funds."
  },
  {
    year: 2015,
    name: "SSC Batch 2015",
    tagline: "Voices of Innovation",
    totalAlumni: 210,
    classRepresentative: "Abrar Hassan",
    representativePhone: "+880 1715-998877",
    coverImage: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=1000&q=80",
    description: "Young professionals leading startup ventures, creative media agencies, and fintech initiatives across Chattogram and Dhaka."
  },
  {
    year: 2018,
    name: "SSC Batch 2018",
    tagline: "The Digital Vanguard",
    totalAlumni: 220,
    classRepresentative: "Saifullah Mahmud",
    representativePhone: "+880 1823-112233",
    coverImage: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1000&q=80",
    description: "Graduates of universities in Bangladesh and abroad, maintaining strong camaraderie and mentorship for school juniors."
  },
  {
    year: 2020,
    name: "SSC Batch 2020",
    tagline: "Resilient Spirit",
    totalAlumni: 205,
    classRepresentative: "Tasnim Ahmed",
    representativePhone: "+880 1933-556677",
    coverImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80",
    description: "Completed SSC with historic unity, organizing relief programs and youth volunteering drives."
  },
  {
    year: 2022,
    name: "SSC Batch 2022",
    tagline: "Rising Stars",
    totalAlumni: 198,
    classRepresentative: "Mahir Faysal",
    representativePhone: "+880 1744-889900",
    coverImage: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1000&q=80",
    description: "Currently pursuing higher studies at BUET, CUET, Chittagong Medical College, Dhaka University, and leading institutions."
  },
  {
    year: 2024,
    name: "SSC Batch 2024",
    tagline: "The New Horizon",
    totalAlumni: 180,
    classRepresentative: "Sadia Sultana",
    representativePhone: "+880 1855-667788",
    coverImage: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1000&q=80",
    description: "Our newest alumni batch, energetic and proud of their alma mater's ongoing educational achievements."
  }
];

export const sampleAlumni: AlumniMember[] = [
  {
    id: "alm-1",
    fullName: "Md. Jashedul Islam",
    sscBatch: 2008,
    graduationYear: 2008,
    rollNumber: "1024",
    profession: "Lead Software Architect",
    company: "Grab / FinTech Solutions",
    industry: "Technology & Software",
    locationCity: "Chattogram",
    locationCountry: "Bangladesh",
    bio: "Passionate about high-scale distributed systems and mentoring young school coders. Proud Sabuj Shikshayatan alumnus batch 2008.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    coverUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    isVerified: true,
    phone: "+880 1819-987654",
    email: "jashedul@example.com",
    skills: ["System Architecture", "Next.js", "Cloud Computing", "Mentorship", "Database Optimization"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      github: "https://github.com",
      facebook: "https://facebook.com"
    },
    schoolMemories: "Winning the inter-school science fair in 2007 under the guidance of our Physics teacher Sir Nazmul.",
    contributions: "Donated 10 computers to the school ICT laboratory in 2023.",
    connectionCount: 248
  },
  {
    id: "alm-2",
    fullName: "Dr. Nusrat Jahan",
    sscBatch: 2006,
    graduationYear: 2006,
    rollNumber: "1002",
    profession: "Consultant Cardiologist",
    company: "Chittagong Medical College Hospital",
    industry: "Healthcare & Medicine",
    locationCity: "Chattogram",
    locationCountry: "Bangladesh",
    bio: "Dedicated to clinical cardiology and public health outreach. Organizing free health checkup camps for retired school teachers.",
    avatarUrl: "/dr-nusrat.jpg",
    coverUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    isVerified: true,
    phone: "+880 1712-445566",
    email: "dr.nusrat@example.com",
    skills: ["Cardiology", "Emergency Medicine", "Public Health", "Clinical Research"],
    socialLinks: {
      linkedin: "https://linkedin.com"
    },
    schoolMemories: "Morning assembly prayers on the school green field and afternoon debates in Room 204.",
    contributions: "Lead physician for the annual Alumni Health Fair.",
    connectionCount: 312
  },
  {
    id: "alm-3",
    fullName: "Engr. Tanvir Ahmed",
    sscBatch: 2004,
    graduationYear: 2004,
    rollNumber: "1015",
    profession: "Principal Structural Engineer",
    company: "Arup / Infrastructure Group",
    industry: "Civil & Structural Engineering",
    locationCity: "London",
    locationCountry: "United Kingdom",
    bio: "Working on major mega-bridge and port infrastructure projects. Proud to represent Sabuj Shikshayatan internationally.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "tanvir.ahmed@example.com",
    skills: ["Bridge Engineering", "Marine Structures", "BIM", "Project Leadership"],
    socialLinks: {
      linkedin: "https://linkedin.com"
    },
    schoolMemories: "Playing cricket and football in the monsoon rain on the school grounds.",
    contributions: "Co-sponsor of the Sabuj Shikshayatan Merit Scholarship Fund.",
    connectionCount: 420
  },
  {
    id: "alm-4",
    fullName: "Barrister Asif Mahmud",
    sscBatch: 2007,
    graduationYear: 2007,
    rollNumber: "1009",
    profession: "Advocate, Supreme Court of Bangladesh",
    company: "Mahmud & Associates",
    industry: "Legal & Judiciary",
    locationCity: "Dhaka",
    locationCountry: "Bangladesh",
    bio: "Constitutional and maritime corporate law specialist. Advising non-profits and student legal advocacy initiatives.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "asif.legal@example.com",
    skills: ["Corporate Law", "Litigation", "Arbitration", "Pro Bono Advisory"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      facebook: "https://facebook.com"
    },
    schoolMemories: "Champion speaker at the 2006 Inter-School Parliamentary Debate.",
    connectionCount: 195
  },
  {
    id: "alm-5",
    fullName: "Farhana Rahman",
    sscBatch: 2011,
    graduationYear: 2011,
    rollNumber: "1033",
    profession: "Co-Founder & CEO",
    company: "GreenHarvest AgriTech",
    industry: "AgriTech & Startups",
    locationCity: "Chattogram",
    locationCountry: "Bangladesh",
    bio: "Empowering 10,000+ local farmers through smart supply chain algorithms and cold storage logistics. Forbes 30 Under 30 nominee.",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "farhana@greenharvest.io",
    skills: ["Entrepreneurship", "Venture Capital", "Supply Chain", "Product Strategy"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      website: "https://greenharvest.io"
    },
    schoolMemories: "Founding the first Eco-Club at school with our Biology teacher.",
    connectionCount: 512
  },
  {
    id: "alm-6",
    fullName: "Md. Tariqul Islam",
    sscBatch: 2009,
    graduationYear: 2009,
    rollNumber: "1045",
    profession: "Senior Deputy Director",
    company: "Bangladesh Bank",
    industry: "Banking & Financial Regulation",
    locationCity: "Dhaka",
    locationCountry: "Bangladesh",
    bio: "Monetary policy research and foreign exchange reserves management. Passionate about economic literacy for youths.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "tariqul.bb@example.com",
    skills: ["Monetary Policy", "Financial Analysis", "Macroeconomics", "Risk Management"],
    schoolMemories: "Math Olympiad training sessions after school hours.",
    connectionCount: 160
  },
  {
    id: "alm-7",
    fullName: "Shamim Reza",
    sscBatch: 2013,
    graduationYear: 2013,
    rollNumber: "1078",
    profession: "AI Research Scientist",
    company: "DeepMind / University of Toronto",
    industry: "Artificial Intelligence",
    locationCity: "Toronto",
    locationCountry: "Canada",
    bio: "PhD in Machine Learning. Researching generative models for biological discovery. Always connected to my alma mater roots.",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "shamim.reza@example.com",
    skills: ["Deep Learning", "PyTorch", "Graph Neural Networks", "Python"],
    socialLinks: {
      linkedin: "https://linkedin.com",
      github: "https://github.com"
    },
    schoolMemories: "Borrowing science fiction books from the school library every Thursday.",
    connectionCount: 380
  },
  {
    id: "alm-8",
    fullName: "Nafisa Kamal",
    sscBatch: 2016,
    graduationYear: 2016,
    rollNumber: "1012",
    profession: "Senior Brand Manager",
    company: "Unilever Bangladesh",
    industry: "FMCG & Marketing",
    locationCity: "Chattogram",
    locationCountry: "Bangladesh",
    bio: "Building consumer brands with purpose. Host of marketing webinars and youth leadership training sessions.",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "nafisa.kamal@example.com",
    skills: ["Brand Strategy", "Digital Media", "Consumer Insights", "Public Speaking"],
    schoolMemories: "Annual cultural program choir lead singer 2014-2016.",
    connectionCount: 290
  },
  {
    id: "alm-9",
    fullName: "Md. Zubair Hossain",
    sscBatch: 2017,
    graduationYear: 2017,
    rollNumber: "1055",
    profession: "Civil Service Officer (Admin Cadre)",
    company: "Government of Bangladesh",
    industry: "Public Administration",
    locationCity: "Sylhet",
    locationCountry: "Bangladesh",
    bio: "Assistant Commissioner & Executive Magistrate. Serving the public with integrity and dedication to national progress.",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    isVerified: false, // Pending verification example
    email: "zubair.bcs@example.com",
    skills: ["Public Policy", "Crisis Management", "Governance", "Community Outreach"],
    schoolMemories: "Class 10 farewell ceremony and speeches.",
    connectionCount: 140
  },
  {
    id: "alm-10",
    fullName: "Kazi Sadman Sakib",
    sscBatch: 2019,
    graduationYear: 2019,
    rollNumber: "1022",
    profession: "Full Stack Engineer",
    company: "Pathao",
    industry: "Ride Sharing & Logistics",
    locationCity: "Dhaka",
    locationCountry: "Bangladesh",
    bio: "Building scalable merchant platforms and payment integrations. Proud to give back to junior alumni.",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    isVerified: true,
    email: "sadman.sakib@example.com",
    skills: ["TypeScript", "Node.js", "Kafka", "PostgreSQL"],
    schoolMemories: "Coding our first HTML website in the school computer lab.",
    connectionCount: 175
  }
];

export const sampleEvents: EventItem[] = [
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

export const sampleStories: AlumniStoryItem[] = [
  {
    id: "sty-1",
    title: "From School Classrooms to Silicon Valley: Engineering at Scale",
    authorName: "Md. Jashedul Islam",
    batchYear: 2008,
    profession: "Lead Software Architect",
    currentOrganization: "Grab / FinTech",
    coverImage: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    summary: "How an insatiable curiosity sparked in the school's humble computer lab propelled Jashedul to lead distributed systems handling billions of transactions.",
    quote: "Sabuj Shikshayatan taught us grit. We didn't have fancy equipment back then, but we had teachers who believed our dreams were valid.",
    publishedDate: "September 12, 2026",
    readTime: "5 min read",
    fullStory: `Growing up walking the corridors of Sabuj Shikshayatan Government High School, my mornings began with the pledge of national service. We shared benches, walked through rainy alleys, and listened in awe to our science teacher explain the wonders of electromagnetism.\n\nToday, designing distributed cloud architectures that process hundreds of thousands of concurrent requests across Southeast Asia, I often look back at our school blackboard. The foundational discipline of mathematics and peer camaraderie learned in Class 9 and 10 remain the bedrock of my leadership.`
  },
  {
    id: "sty-2",
    title: "Healing Hearts with Compassion: A Cardiologist's Mission",
    authorName: "Dr. Nusrat Jahan",
    batchYear: 2006,
    profession: "Consultant Cardiologist",
    currentOrganization: "Chittagong Medical College Hospital",
    coverImage: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    summary: "From first-aid drills on the school field to performing complex coronary angioplasties, Dr. Nusrat shares her journey of empathy and perseverance.",
    quote: "True success is measured by the number of lives you touch when no one is looking.",
    publishedDate: "August 28, 2026",
    readTime: "6 min read",
    fullStory: `Medicine is an exacting discipline, but its soul is human connection. I remember our Headmaster Sir addressing us during morning assembly: 'Whatever you become in life, be an honest citizen who serves the underprivileged.' Those words became my guiding compass when studying through grueling nights in medical college.`
  },
  {
    id: "sty-3",
    title: "Sustainable AgriTech: Empowering 10,000 Farmers Across Bangladesh",
    authorName: "Farhana Rahman",
    batchYear: 2011,
    profession: "Co-Founder & CEO",
    currentOrganization: "GreenHarvest AgriTech",
    coverImage: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80",
    summary: "Combining technology and agricultural logistics, Farhana's startup prevents food wastage and guarantees fair market prices for rural farmers.",
    quote: "When women lead in technology and agriculture, entire community ecosystems transform.",
    publishedDate: "July 15, 2026",
    readTime: "4 min read",
    fullStory: `Starting an agri-tech venture in a developing country required resilience against skepticism. But our school instilled a fearlessness: that young Bangladeshis are capable of solving Bangladesh's most complex challenges.`
  }
];

export const sampleAchievements: AchievementItem[] = [
  {
    id: "ach-1",
    recipientName: "Dr. Nusrat Jahan",
    batchYear: 2006,
    category: "Doctors",
    title: "National Young Cardiologist Excellence Award",
    organization: "Bangladesh Cardiac Society",
    description: "Awarded for groundbreaking clinical research on early cardiovascular intervention in South Asian youth.",
    photoUrl: "/dr-nusrat.jpg",
    yearAwarded: 2025
  },
  {
    id: "ach-2",
    recipientName: "Engr. Tanvir Ahmed",
    batchYear: 2004,
    category: "Engineers",
    title: "Fellowship of Institution of Civil Engineers (FICE)",
    organization: "Institution of Civil Engineers (UK)",
    description: "Honored for outstanding engineering leadership in structural resilience and high-speed port viaducts.",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    yearAwarded: 2024
  },
  {
    id: "ach-3",
    recipientName: "Farhana Rahman",
    batchYear: 2011,
    category: "Entrepreneurs",
    title: "Forbes 30 Under 30 Asia (Industry & Manufacturing)",
    organization: "Forbes Asia",
    description: "Recognized for pioneering cold chain IoT innovations that uplifted agricultural incomes in 14 districts.",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    yearAwarded: 2025
  },
  {
    id: "ach-4",
    recipientName: "Barrister Asif Mahmud",
    batchYear: 2007,
    category: "Government Officers",
    title: "Distinguished Public Interest Legal Advocate",
    organization: "Supreme Court Bar Association",
    description: "Awarded for exceptional pro-bono representation of underprivileged environmental rights groups.",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    yearAwarded: 2023
  },
  {
    id: "ach-5",
    recipientName: "Shamim Reza",
    batchYear: 2013,
    category: "Researchers",
    title: "NeurIPS Outstanding Research Paper Award",
    organization: "Neural Information Processing Systems",
    description: "Authored leading research on scalable representation learning for molecular biology.",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    yearAwarded: 2024
  }
];

export const sampleGallery: GalleryPhotoItem[] = [
  {
    id: "gal-1",
    albumCategory: "School Memories",
    title: "Morning Assembly on the Green Quadrangle",
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
    year: 2018,
    caption: "Students lining up in neat columns for daily morning assembly and physical drills.",
    submittedBy: "School Archives"
  },
  {
    id: "gal-2",
    albumCategory: "Old Campus",
    title: "Historic Academic Wing & Shaded Courtyard",
    imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
    year: 2012,
    caption: "The iconic shaded veranda where generations of students stood watching the rain.",
    submittedBy: "Batch 2008 Committee"
  },
  {
    id: "gal-3",
    albumCategory: "Reunions",
    title: "Decade Celebration: Batch 2005 Gathering",
    imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80",
    year: 2023,
    caption: "Friends catching up after 15 years, sharing laughter, nostalgia, and traditional food.",
    submittedBy: "Kazi Minhazur Rahman"
  },
  {
    id: "gal-4",
    albumCategory: "Sports",
    title: "Inter-School Football Championship Victory",
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
    year: 2015,
    caption: "Our school football team lifting the regional division trophy.",
    submittedBy: "Sports Department"
  },
  {
    id: "gal-5",
    albumCategory: "Teachers",
    title: "Honoring Beloved Headmaster and Senior Faculty",
    imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
    year: 2022,
    caption: "Alumni presenting crests of honor to retired science, bangla, and math teachers.",
    submittedBy: "Alumni Executive Council"
  },
  {
    id: "gal-6",
    albumCategory: "Cultural Events",
    title: "Pahela Baishakh Celebration on Campus",
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    year: 2024,
    caption: "Students and alumni in vibrant red and white celebrating Bengali New Year.",
    submittedBy: "Cultural Club"
  }
];

export const sampleDonations: DonationCampaignItem[] = [
  {
    id: "don-1",
    title: "Sabuj Shikshayatan Alumni Merit & Need-Based Scholarship 2026",
    category: "Scholarship",
    description: "Supporting 50 high-achieving underprivileged secondary students with full tuition, uniform sets, textbooks, and monthly educational stipends.",
    goalAmount: 800000,
    raisedAmount: 585000,
    donorCount: 142,
    bannerImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
    daysLeft: 35,
    featured: true
  },
  {
    id: "don-2",
    title: "Modern STEM & Robotics Innovation Center",
    category: "STEM Lab",
    description: "Equipping the school laboratory with 30 modern workstations, Arduino & Raspberry Pi kits, 3D printers, and high-speed fiber internet for the next generation of engineers.",
    goalAmount: 1200000,
    raisedAmount: 760000,
    donorCount: 98,
    bannerImage: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=80",
    daysLeft: 50,
    featured: true
  },
  {
    id: "don-3",
    title: "School Central Library Digitalization & Book Drive",
    category: "Library",
    description: "Adding 2,500 new Bengali & English classic literature, science encyclopedias, and digital e-reader tablets for students.",
    goalAmount: 400000,
    raisedAmount: 320000,
    donorCount: 75,
    bannerImage: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    daysLeft: 20,
    featured: false
  },
  {
    id: "don-4",
    title: "Emergency Student & Teacher Healthcare Solidarity Fund",
    category: "Emergency Aid",
    description: "A revolving transparent emergency medical reserve providing immediate grants for critical surgeries and hospitalizations.",
    goalAmount: 600000,
    raisedAmount: 410000,
    donorCount: 88,
    bannerImage: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
    daysLeft: 42,
    featured: false
  }
];

export const samplePosts: PostItem[] = [
  {
    id: "post-1",
    author: {
      name: "Md. Jashedul Islam",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      batch: 2008,
      profession: "Lead Software Architect",
      isVerified: true
    },
    timestamp: "2 hours ago",
    content: "Had the privilege of visiting our beloved Sabuj Shikshayatan campus yesterday! Walked through the old classrooms on the 2nd floor. It was heartwarming to see the new computer lab buzzing with students learning Python. Batch 2008 is planning an informal meetup next Friday evening. Who's in?",
    images: [
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1000&q=80"
    ],
    likesCount: 64,
    commentsCount: 18,
    batchTag: 2008,
    isLiked: true
  },
  {
    id: "post-2",
    author: {
      name: "Dr. Nusrat Jahan",
      avatar: "/dr-nusrat.jpg",
      batch: 2006,
      profession: "Consultant Cardiologist",
      isVerified: true
    },
    timestamp: "1 day ago",
    content: "Important Announcement: The Alumni Medical Wing will conduct a Free Cardiac and General Health Screening Camp on October 10th at the school auditorium, dedicated to our current and retired teachers. We need 5 more volunteer doctors and student assistants. Please DM me or comment below!",
    likesCount: 112,
    commentsCount: 34,
    batchTag: 2006
  },
  {
    id: "post-3",
    author: {
      name: "Farhana Rahman",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      batch: 2011,
      profession: "Co-Founder & CEO, GreenHarvest",
      isVerified: true
    },
    timestamp: "3 days ago",
    content: "Proud to share that our startup has been nominated for the National Sustainable Enterprise Award! None of this would have been possible without the inquisitive spirit nurtured in Room 102. Big thanks to all the teachers and batchmates who supported us from day one!",
    images: [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80"
    ],
    likesCount: 89,
    commentsCount: 22,
    batchTag: 2011
  }
];

export const sampleNews: NewsItem[] = [
  {
    id: "news-1",
    title: "Registration Opens for Grand Alumni Reunion 2026: 'Generations of Green'",
    category: "Alumni News",
    excerpt: "Over 2,000 alumni across four decades will convene at the school main campus on November 20, 2026.",
    content: "The Executive Committee of Sabuj Shikshayatan Government High School Alumni Association is thrilled to officially open online registrations for the landmark Grand Reunion 2026. Batches from 1985 through 2025 are cordially invited to celebrate our shared heritage, honor respected teachers, and participate in a festive full-day program.",
    featuredImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1000&q=80",
    date: "September 18, 2026",
    author: "Alumni Communications Bureau"
  },
  {
    id: "news-2",
    title: "SSGHS Achieves 100% Pass Rate in SSC Examination 2026 with 92% GPA 5.0",
    category: "School News",
    excerpt: "The school community celebrates outstanding academic excellence in the regional Board SSC results.",
    content: "Sabuj Shikshayatan Government High School has once again distinguished itself with sterling academic performance in the Secondary School Certificate examination. Out of 240 examinees, 221 secured GPA 5.0 in science and business groups. The Alumni Association extends heartfelt congratulations to the students, parents, and dedicated faculty.",
    featuredImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=80",
    date: "September 05, 2026",
    author: "Headmaster's Office"
  },
  {
    id: "news-3",
    title: "Alumni STEM Laboratory Phase 1 Handed Over to School Administration",
    category: "Alumni News",
    excerpt: "30 high-performance computer workstations and robotics kits donated by alumni batches are now operational.",
    content: "In a formal handover ceremony attended by senior alumni representatives, school teachers, and education board officials, the newly refurbished Computer and Robotics Laboratory was inaugurated. The facility is set to train over 800 secondary students each term in computational thinking and programming.",
    featuredImage: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1000&q=80",
    date: "August 22, 2026",
    author: "Development Taskforce"
  }
];

export const sampleVerificationRequests: VerificationRequestItem[] = [
  {
    id: "vr-1",
    fullName: "Md. Zubair Hossain",
    email: "zubair.bcs@example.com",
    phone: "+880 1711-889911",
    sscBatch: 2017,
    rollNumber: "1055",
    profession: "Civil Service Officer (Admin Cadre)",
    location: "Sylhet, Bangladesh",
    documentType: "SSC Certificate & Testimonial",
    documentUrl: "/docs/sample-testimonial.pdf",
    submittedAt: "2026-09-22 14:30",
    status: "PENDING"
  },
  {
    id: "vr-2",
    fullName: "Ayesha Siddiqua",
    email: "ayesha.s@example.com",
    phone: "+880 1819-223344",
    sscBatch: 2014,
    rollNumber: "1028",
    profession: "Senior Lecturer, English",
    location: "Dhaka, Bangladesh",
    documentType: "SSC Marksheet Copy",
    documentUrl: "/docs/sample-marksheet.pdf",
    submittedAt: "2026-09-23 09:15",
    status: "PENDING"
  },
  {
    id: "vr-3",
    fullName: "Kamrul Hasan Bappi",
    email: "kamrul.bappi@example.com",
    phone: "+880 1912-778899",
    sscBatch: 2009,
    rollNumber: "1071",
    profession: "Assistant Vice President, BRAC Bank",
    location: "Chattogram, Bangladesh",
    documentType: "School ID & SSC Registration Card",
    documentUrl: "/docs/sample-regcard.pdf",
    submittedAt: "2026-09-21 17:45",
    status: "VERIFIED"
  }
];
