"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Classes for the wrapper (the input keeps `className`). */
  wrapperClassName?: string;
};

/**
 * A password field with an eye button to show or hide what was typed (handy on
 * phones). The input keeps the caller's classes; room is made on the right for the button.
 */
export default function PasswordInput({ className = "", wrapperClassName = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-11!`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
