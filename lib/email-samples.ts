import {
  contactMessageEmail,
  donationReceiptEmail,
  membershipApprovedEmail,
  membershipRejectedEmail,
  noticeEmail,
  registrationConfirmedEmail,
  registrationReceivedEmail,
  siteUrl,
  verificationCodeEmail,
  type RegistrationEmailInput,
  type RenderedEmail,
} from "./email-templates";

// Every email the site sends, filled with sample values: for `npm run email:preview`
// and `npm run email:test -- <address> <name>`. Sample people only; nothing here is real.
const registration: RegistrationEmailInput = {
  name: "Rahim Uddin",
  eventTitle: "Golden Jubilee: 50 Years of Sabuj Shikshayatan (সুবর্ণ জয়ন্তী)",
  eventDate: "Saturday, 26 December 2026, 8:00 AM – 9:00 PM",
  venue: "Sabuj Shikshayatan Government High School campus, Sitakunda, Chattogram",
  isMembershipEvent: true,
  headCount: 4,
  guests: [
    { name: "Spouse", count: 1 },
    { name: "Child", count: 2 },
  ],
  totalFee: 3200,
  donationAmount: 500,
  paymentMethod: "bKash",
  transactionId: "9AB3XK1LQ",
};

export const EMAIL_SAMPLES: Record<string, () => RenderedEmail> = {
  "verification-code": () => verificationCodeEmail("482913", 10),
  "registration-received": () => registrationReceivedEmail(registration),
  "registration-confirmed": () => registrationConfirmedEmail(registration),
  "membership-approved": () => membershipApprovedEmail("Rahim Uddin", 1998),
  "membership-rejected": () => membershipRejectedEmail("Rahim Uddin"),
  "donation-receipt": () =>
    donationReceiptEmail({ donorName: "Rahim Uddin", amount: 5000, campaignTitle: "Library books for 2027", receiptId: "DON-2026-0042", paymentMethod: "Nagad", transactionRef: "7KD92LQ1" }),
  "contact-message": () =>
    contactMessageEmail({ name: "Rahim Uddin", email: "rahim@example.com", subject: "Batch 1998 reunion", message: "Assalamu alaikum,\nWe want to hold our batch reunion on campus in January. Who should we talk to?", ticketId: "TICK-4F2A9C" }),
  "job-application": () =>
    noticeEmail({
      subject: "New application: Junior Accountant",
      heading: "New job application",
      paragraphs: ["Rahim Uddin applied for Junior Accountant at Example Traders Ltd. Reply to this email to answer them directly."],
      rows: [["Applicant", "Rahim Uddin"], ["Email", "rahim@example.com"], ["SSC batch", "1998"]],
      quote: "I have three years of experience in bookkeeping and would be glad to join.",
      button: { label: "See all applications", url: siteUrl("/careers/mine") },
    }),
  "mentorship-request": () =>
    noticeEmail({
      subject: "Mentorship request from Rahim Uddin",
      heading: "New mentorship request",
      paragraphs: ["Rahim Uddin (SSC 2015) asked for your mentorship on: preparing for medical admission", "Accept or decline it on your mentorship page; reply to this email to write to them directly."],
      button: { label: "Open my mentorship requests", url: siteUrl("/mentorship/mine") },
    }),
};
