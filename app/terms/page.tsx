import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { pageMetadata, shareCard } from "@/lib/seo";
import { schoolInfo } from "@/lib/data";

export const metadata: Metadata = pageMetadata({
  image: shareCard("about"),
  path: "/terms",
  title: "Terms of use and privacy",
  description:
    "The rules for using the Praktan Sabujian Parishad website, and how the association collects, shows and protects members' personal information.",
});

const UPDATED = "4 November 2026";

/** One titled block of the page. */
function Part({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const email = schoolInfo.associationEmail;
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />

      <main className="flex-1 pb-24">
        <section className="bg-[#06281e] text-white py-14 border-b border-emerald-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms of use and privacy</h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              The website of Praktan Sabujian Parishad (প্রাক্তন সবুজিয়ান পরিষদ), the alumni association of {schoolInfo.name}. Last updated {UPDATED}.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 space-y-10">
          <nav aria-label="On this page" className="text-sm">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-emerald-700">
              <li><a href="#terms" className="hover:underline">Terms of use</a></li>
              <li><a href="#privacy" className="hover:underline">Privacy</a></li>
              <li><a href="#payments" className="hover:underline">Payments</a></li>
              <li><a href="#contact" className="hover:underline">Questions</a></li>
            </ul>
          </nav>

          <Part id="terms" title="Terms of use">
            <p>
              Anyone can read the public pages. Membership is for former students of {schoolInfo.name}; the committee checks each registration
              before an account is approved, and may refuse or remove an account that gives false details.
            </p>
            <p>When you use the site, please:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>give your own, true details and keep your password to yourself;</li>
              <li>be respectful in posts, comments and messages: no abuse, threats, hate, spam or advertising;</li>
              <li>post only photos and writing that you have the right to share;</li>
              <li>use other members&apos; contact details only to keep in touch, never for marketing or to pass on to others;</li>
              <li>not try to break, overload or get around the security of the site.</li>
            </ul>
            <p>
              The committee may edit or remove content that breaks these rules, and suspend accounts that keep breaking them. Writing and photos you
              post stay yours; by posting them you let the association show them on this site and in its own publications.
            </p>
            <p>
              We work to keep the site accurate and running, but it is offered as it is. These terms follow the laws of Bangladesh, and the
              association&apos;s <Link href="/constitution" className="text-emerald-700 hover:underline">constitution</Link> applies to its members.
              We may update this page; the date above shows the latest change.
            </p>
          </Part>

          <Part id="privacy" title="Privacy">
            <p>
              <strong className="text-slate-900">What we collect.</strong> When you register: your name, SSC batch, email address, mobile number, and
              the profile details you choose to add, such as your photo, profession, workplace and city. When you register for an event: the guests
              you bring and your payment reference. We also keep the messages you send through the contact form.
            </p>
            <p>
              <strong className="text-slate-900">Who can see it.</strong> Your phone number and email address are hidden from other members unless you
              choose to show them in your profile settings. The alumni directory lists only approved members. Committee members see what they need
              for their role, for example the treasurer sees payments. We never sell or rent your details.
            </p>
            <p>
              <strong className="text-slate-900">Why we use it.</strong> To verify that you are a former student, run your account, send you
              messages about your account, events and notices, and keep the association&apos;s membership and accounts records.
            </p>
            <p>
              <strong className="text-slate-900">Cookies and analytics.</strong> A cookie keeps you signed in. We use Google Analytics and Microsoft
              Clarity to see which pages are used and where the site is hard to use. They record clicks and scrolling, not the passwords you type.
            </p>
            <p>
              <strong className="text-slate-900">Keeping it safe.</strong> Passwords are stored only as a one-way hash, the site is served only over HTTPS, and
              the data is kept on our hosting provider&apos;s servers.
            </p>
            <p>
              <strong className="text-slate-900">Your choices.</strong> You can change your profile and what it shows at any time in your settings.
              To get a copy of your data, correct it, or have your account deleted, email us at{" "}
              <a href={`mailto:${email}`} className="text-emerald-700 hover:underline">{email}</a>. Payment records may be kept after an account is
              deleted, as the association&apos;s accounts require.
            </p>
          </Part>

          <Part id="payments" title="Payments">
            <p>
              Membership fees, event fees and donations are paid by bKash, Nagad, Bangla QR, bank transfer or cash, to the accounts shown on the payment
              page. The site never asks for or stores card numbers or PINs. A payment counts once the treasurer has confirmed it. For a refund
              question, contact us with your payment reference.
            </p>
          </Part>

          <Part id="contact" title="Questions">
            <p>
              Write to <a href={`mailto:${email}`} className="text-emerald-700 hover:underline">{email}</a> or use the{" "}
              <Link href="/contact" className="text-emerald-700 hover:underline">contact page</Link>.
            </p>
          </Part>
        </div>
      </main>

      <Footer />
    </div>
  );
}
