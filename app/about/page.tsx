import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { schoolInfo } from "@/lib/data";
import {
  GraduationCap,
  Target,
  Eye,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  FileText
} from "lucide-react";

export default function AboutPage() {
  const committee = [
    { name: "Dr. Kazi Minhazur Rahman", role: "President", batch: 2005, profession: "Associate Professor, CUET" },
    { name: "Md. Jashedul Islam", role: "General Secretary", batch: 2008, profession: "Lead Software Architect" },
    { name: "Dr. Nusrat Jahan", role: "Vice President (Welfare)", batch: 2006, profession: "Consultant Cardiologist" },
    { name: "Barrister Asif Mahmud", role: "Legal & Constitutional Advisor", batch: 2007, profession: "Supreme Court Advocate" },
    { name: "Engr. Tanvir Ahmed", role: "International Chapter Director", batch: 2004, profession: "Principal Structural Engineer" },
    { name: "Farhana Rahman", role: "Treasurer & Fund Convener", batch: 2011, profession: "CEO, GreenHarvest" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        {/* Header */}
        <section className="bg-[#06281e] text-white py-16 border-b border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
                <Users className="w-3.5 h-3.5" />
                <span>Executive Council &amp; Constitution</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                About the Alumni Association
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed">
                Founded to unite generations of former students of Sabuj Shikshayatan Government High School, uphold the school&apos;s educational prestige, and foster lifelong solidarity.
              </p>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                To build an inclusive, collaborative community where former students of all batches can reconnect, mentor secondary school students, honor our teachers, and invest transparently in the academic excellence and infrastructural development of Sabuj Shikshayatan Government High School.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Our Vision</h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                To stand as one of Bangladesh&apos;s most active, impactful, and digitally integrated school alumni associations, setting high benchmarks in student merit scholarships, science innovation, healthcare support, and global community camaraderie.
              </p>
            </div>
          </div>

          {/* Executive Committee */}
          <div className="mt-16 space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Leadership
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Executive Committee (2025 — 2027)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Elected representatives dedicated to serving the alumni body and supporting school initiatives.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {committee.map((member) => (
                <div
                  key={member.name}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {member.role}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 mt-3">{member.name}</h3>
                  <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                    SSC Batch &apos;{member.batch}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{member.profession}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
