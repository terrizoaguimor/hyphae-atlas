"use client";

import Script from "next/script";
import {useEffect, useRef, useState} from "react";
import type {Locale} from "@/agent/modes";

declare global {
  interface Window {turnstile?: {render(container: HTMLElement, options: Record<string, unknown>): string; reset(widgetId: string): void; remove(widgetId: string): void};}
}

const copy = {
  en: {title: "Human verification", body: "Required only for a fresh live model query. Replays never need a challenge.", ready: "Verification complete", waiting: "Complete the Cloudflare check to enable Run live", error: "Verification could not complete.", retry: "Reload challenge"},
  es: {title: "Verificación humana", body: "Solo es obligatoria para una consulta nueva al modelo. Los replays nunca requieren challenge.", ready: "Verificación completada", waiting: "Completa la comprobación de Cloudflare para habilitar la consulta live", error: "No se pudo completar la verificación.", retry: "Recargar challenge"},
} as const;

export function TurnstileChallenge({locale, resetKey, onToken}: {locale: Locale; resetKey: number; onToken(token: string): void}) {
  const hostRef = useRef<HTMLDivElement>(null); const widgetRef = useRef<string | null>(null); const [scriptReady, setScriptReady] = useState(false); const [state, setState] = useState<"waiting" | "ready" | "error">("waiting");
  const labels = copy[locale]; const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (scriptReady) return;
    const timeout = window.setTimeout(() => setState("error"), 12_000);
    return () => window.clearTimeout(timeout);
  }, [scriptReady]);
  useEffect(() => {
    if (!scriptReady || !sitekey || !hostRef.current || !window.turnstile) return;
    if (widgetRef.current) window.turnstile.remove(widgetRef.current);
    widgetRef.current = window.turnstile.render(hostRef.current, {sitekey, action: "atlas-query", theme: "light", size: "flexible", appearance: "always", callback: (token: string) => {setState("ready"); onToken(token);}, "expired-callback": () => {setState("waiting"); onToken("");}, "error-callback": () => {setState("error"); onToken("");}});
    return () => {if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current); widgetRef.current = null;};
  }, [scriptReady, sitekey, resetKey, onToken]);
  return <div className={`turnstile-shell turnstile-${state}`} aria-busy={state === "waiting"}><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setState("error")}/><div><p className="eyebrow">{labels.title}</p><span>{labels.body}</span></div><div className="turnstile-widget" ref={hostRef}/><p role="status" aria-live="polite">{state === "ready" ? `✓ ${labels.ready}` : state === "error" ? <>{labels.error} <button type="button" onClick={() => window.location.reload()}>{labels.retry}</button></> : labels.waiting}</p></div>;
}
