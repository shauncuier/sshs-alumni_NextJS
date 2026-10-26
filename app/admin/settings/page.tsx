import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Mail, MessageSquare, ScrollText, Users } from "lucide-react";
import OtpRequiredSwitch from "@/components/admin/OtpRequiredSwitch";
import PaymentNoticeSwitches from "@/components/admin/PaymentNoticeSwitches";
import PaymentSettingsForm from "@/components/admin/PaymentSettingsForm";
import SmsTestModeSwitch from "@/components/admin/SmsTestModeSwitch";
import { getBulkSmsConfig } from "@/lib/bulksmsbd";
import { getEmailProvider } from "@/lib/email";
import { can } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session-user";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/** Which service sends the site's email, from which address, and whether members actually receive it. */
function emailStatus(): { ok: boolean; service: string; sender: string; note: string } {
  const provider = getEmailProvider();
  if (provider === "smtp") {
    return { ok: true, service: "SMTP (Gmail)", sender: process.env.SMTP_FROM || process.env.SMTP_USER || "", note: "Members receive email. Gmail sends about 500 a day." };
  }
  if (provider === "resend") {
    const sender = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const testSender = /@(resend\.dev|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)\b/i.test(sender);
    return testSender
      ? { ok: false, service: "Resend", sender, note: "This sender is Resend's test address: only the Resend account owner receives email, members do not. Switch to Gmail (docs/PRODUCTION_ENV.md) or verify the association's domain in Resend." }
      : { ok: true, service: "Resend", sender, note: "Members receive email." };
  }
  return { ok: false, service: "None", sender: "", note: "No email service is set up: emails are only written to the server log." };
}

const SECTIONS = [
  { id: "payments", name: "Payments", icon: CreditCard, area: "payments" },
  { id: "sms", name: "SMS & verification", icon: MessageSquare, area: "sms" },
  { id: "email", name: "Email", icon: Mail, area: "settings" },
  { id: "access", name: "Users & log", icon: Users, area: "settings" },
] as const;

// Every setting in one place. Each section shows only to roles that may change it.
export default async function SettingsPage() {
  const me = await getSessionUser();
  if (!me) forbidden();
  const sections = SECTIONS.filter((s) => can(me.role, s.area));
  if (sections.length === 0) forbidden();
  const email = emailStatus();
  const sms = getBulkSmsConfig();

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">How members pay, how they verify their number, and how the site sends SMS and email.</p>
      </div>

      <nav aria-label="Settings sections" className="sticky top-14 lg:top-0 z-10 -mx-1 px-1 py-2 bg-slate-100/95 backdrop-blur flex gap-1 overflow-x-auto">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-emerald-400 whitespace-nowrap flex items-center gap-1.5">
            <s.icon className="w-3.5 h-3.5 text-emerald-700" /> {s.name}
          </a>
        ))}
      </nav>

      {can(me.role, "payments") && (
        <section id="payments" className="scroll-mt-28 space-y-4">
          <SectionTitle icon={CreditCard} title="Payments" text="bKash, Nagad, Bangla QR, bank and cash: switch each on or off and give its details. Members pay manually and the committee checks every payment." />
          <PaymentNoticeSwitches />
          <PaymentSettingsForm />
        </section>
      )}

      {can(me.role, "sms") && (
        <section id="sms" className="scroll-mt-28 space-y-3">
          <SectionTitle icon={MessageSquare} title="SMS & verification" text="Codes members get on their phone when they join or change their number." />
          <OtpRequiredSwitch />
          <SmsTestModeSwitch />
          <div className="p-4 rounded-2xl border border-slate-200 bg-white text-xs text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
            <span>SMS gateway: <b className="text-slate-900">{sms.isConfigured ? "BulkSMSBD, connected" : "not set up (codes are only simulated)"}</b></span>
            {sms.isConfigured && <span>Sender: <b className="text-slate-900 font-mono">{sms.senderId}</b></span>}
            <Link href="/admin/sms" className="font-bold text-emerald-800 underline">Send a bulk SMS</Link>
          </div>
        </section>
      )}

      {can(me.role, "settings") && (
        <section id="email" className="scroll-mt-28 space-y-3">
          <SectionTitle icon={Mail} title="Email" text="Codes, receipts and notices by email. Set on the server (see docs/PRODUCTION_ENV.md); shown here so you can check it." />
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${email.ok ? "bg-white border-slate-200" : "bg-amber-50 border-amber-300"}`}>
            {email.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />}
            <div className="space-y-0.5">
              <p className="font-bold text-slate-900">
                Sending with {email.service}
                {email.sender && <span className="font-normal text-slate-600"> · from {email.sender}</span>}
              </p>
              <p className="text-slate-600">{email.note}</p>
            </div>
          </div>
        </section>
      )}

      {can(me.role, "settings") && (
        <section id="access" className="scroll-mt-28 space-y-3">
          <SectionTitle icon={Users} title="Users & log" text="Who can use the admin panel, and a record of every change." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingLink href="/admin/users" icon={Users} title="Users & roles" text="Admins, moderators, treasurer; reset passwords, disable accounts." />
            <SettingLink href="/admin/logs" icon={ScrollText} title="Activity log" text="Every sign-in, payment decision and change, with who did it." />
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
      <Icon className="w-5 h-5 text-emerald-700 mt-1 shrink-0" />
      <div>
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SettingLink({ href, icon: Icon, title, text }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <Link href={href} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 flex items-start gap-3">
      <Icon className="w-5 h-5 text-emerald-700 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
      <ArrowRight className="w-4 h-4 text-slate-400 mt-0.5" />
    </Link>
  );
}
