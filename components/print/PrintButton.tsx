"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

/** Opens the print dialog once every image on the page (photos, QR codes) has loaded. */
export default function PrintButton({ label = "Print", className = "" }: { label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    const imgs = [...document.querySelectorAll<HTMLImageElement>("img")];
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            })
      )
    );
    setBusy(false);
    window.print();
  };
  return (
    <button
      type="button"
      onClick={() => void print()}
      disabled={busy}
      className={`min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer ${className}`}
    >
      <Printer className="w-4 h-4" /> {busy ? "Preparing…" : label}
    </button>
  );
}
