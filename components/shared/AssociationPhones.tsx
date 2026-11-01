"use client";

import { useEffect, useState } from "react";
import { DEFAULT_CONTACT_PHONES, telHref, type ContactPhone } from "@/lib/contact-phones-shared";

/**
 * The association's contact numbers (Admin → Settings → Contact numbers), one per line,
 * each with its name when one is given. Shows the defaults until the saved list loads.
 */
export default function AssociationPhones({ linkClassName, nameClassName }: { linkClassName?: string; nameClassName?: string }) {
  const [phones, setPhones] = useState<ContactPhone[]>(DEFAULT_CONTACT_PHONES);

  useEffect(() => {
    let live = true;
    fetch("/api/contact-phones")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live && Array.isArray(data?.phones) && data.phones.length > 0) setPhones(data.phones);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <span className="flex flex-col gap-1">
      {phones.map((p) => (
        <span key={p.number}>
          {p.name && <span className={nameClassName}>{p.name}: </span>}
          <a href={telHref(p.number)} className={linkClassName}>
            {p.number}
          </a>
        </span>
      ))}
    </span>
  );
}
