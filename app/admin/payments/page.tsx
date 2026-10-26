import { redirect } from "next/navigation";

// Payment settings now live with every other setting.
export default function PaymentSettingsPage() {
  redirect("/admin/settings#payments");
}
