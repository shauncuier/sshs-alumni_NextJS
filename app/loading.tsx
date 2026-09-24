import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-emerald-900/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-800" />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 animate-pulse">
        Loading Sabuj Shikshayatan Alumni Portal...
      </p>
    </div>
  );
}
