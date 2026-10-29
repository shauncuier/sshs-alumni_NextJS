import React from "react";
import type { Metadata } from "next";
import { BookOpenText } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHero from "@/components/shared/PageHero";
import MagazineForm from "@/components/magazine/MagazineForm";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/magazine",
  image: null,
  title: "স্মরণিকার জন্য লেখা পাঠান",
  description: "সুবর্ণজয়ন্তী স্মরণিকার জন্য লেখা, স্মৃতিচারণ, গল্প ও কবিতা পাঠান। প্রাক্তন ও বর্তমান সবুজিয়ান এবং শিক্ষকমন্ডলী সবাই লিখতে পারেন; লগইন লাগবে না।",
});

// Public: anyone can send a writing for the souvenir book; the committee
// collects the submissions from Admin → Magazine text.
export default function MagazinePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      <main className="flex-1 pb-24">
        <PageHero icon={<BookOpenText className="w-3.5 h-3.5" />} eyebrow="সুবর্ণজয়ন্তী স্মরণিকা" title="স্মরণিকার জন্য লেখা পাঠান">
          লেখা, স্মৃতিচারণমূলক গল্প, কবিতা: প্রাক্তন ও বর্তমান সবুজিয়ান এবং শিক্ষকমন্ডলী সবার জন্য।
        </PageHero>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-10">
          <MagazineForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
