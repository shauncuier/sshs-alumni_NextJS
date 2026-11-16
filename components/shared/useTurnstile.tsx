"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile robot check for a public form (server side: lib/turnstile.ts).
 *
 *   const bot = useTurnstile("contact");
 *   ...{bot.widget}
 *   <button disabled={!bot.ready}>   body: { ...fields, turnstileToken: bot.token }
 *   finally bot.reset()              // a token works once
 *
 * While the check is off (no secret on the server) `required` is false, `ready` is true
 * and nothing is shown. Most visitors pass without clicking anything; the box only
 * appears when Cloudflare wants an interaction.
 */

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let siteKeyPromise: Promise<string | null> | null = null;
function loadSiteKey(): Promise<string | null> {
  siteKeyPromise ??= fetch("/api/auth/turnstile", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (data && typeof data.siteKey === "string" ? data.siteKey : null))
    .catch(() => null);
  return siteKeyPromise;
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileAction = "login" | "sms_code" | "email_code" | "register" | "contact" | "magazine" | "password_reset";

export function useTurnstile(action: TurnstileAction, { enabled = true }: { enabled?: boolean } = {}) {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void loadSiteKey().then((key) => live && setSiteKey(key));
    return () => {
      live = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !siteKey || !el) return;
    let live = true;
    loadScript()
      .then((api) => {
        if (!live) return;
        widgetId.current = api.render(el, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          size: "flexible",
          theme: "light",
          callback: (t: string) => {
            setToken(t);
            setFailed(false);
          },
          "expired-callback": () => setToken(null),
          "timeout-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
            return true;
          },
        });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      setToken(null);
    };
  }, [enabled, siteKey, el, action]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, []);

  // Until the key has loaded, assume the check is on (the server checks either way).
  const required = enabled && siteKey !== null;
  const ready = !required || Boolean(token);

  const widget = required ? (
    <div className="space-y-1">
      <div ref={setEl} />
      {failed ? (
        <p role="alert" className="text-[11px] font-bold text-rose-700">
          The robot check could not load. Check your connection and refresh the page.
        </p>
      ) : (
        !token && <p className="text-[11px] text-slate-500">Checking your browser…</p>
      )}
    </div>
  ) : null;

  return { required, ready, token, reset, widget };
}
