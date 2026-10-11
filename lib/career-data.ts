/**
 * SSGHS Alumni — Phase 4: Career Hub and Mentorship types
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
