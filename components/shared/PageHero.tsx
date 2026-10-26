import React from "react";

/** The dark green title band at the top of the association's public pages. */
export default function PageHero({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-[#06281e] text-white py-14 sm:py-16 border-b border-emerald-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900 text-emerald-300 text-xs font-semibold border border-emerald-700/60">
            {icon}
            <span>{eyebrow}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
          {children && <div className="text-emerald-100 text-sm leading-relaxed">{children}</div>}
        </div>
      </div>
    </section>
  );
}
