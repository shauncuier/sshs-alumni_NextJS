import type { ProofSummary } from "@/lib/members/proof-types";

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
  /** YYYY-MM-DD, for editing the reunion date. */
  reunionDateIso?: string;
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
  /** Smaller image for grids; imageUrl is the full-size one for the lightbox. */
  thumbUrl?: string;
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
  /** Days until the end date; null when the campaign has no end date. */
  daysLeft: number | null;
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
  /** Set for posts from the database (lib/feed.ts). */
  authorId?: string;
  profileId?: string | null;
  /** The viewer may delete this post (its author, or a moderator). */
  canDelete?: boolean;
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
  paymentStatus?: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | string | null;
  membershipEventId?: string | null;
  membershipEventSlug?: string | null;
  registrationId?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  totalFee?: number | null;
  paymentReceiptUrl?: string | null;
  avatarUrl?: string;
  avatarOriginalUrl?: string | null;
  hasValidPhoto?: boolean;
  /** Proof of study uploaded when joining (admin queue only). */
  proof?: ProofSummary | null;
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
};
