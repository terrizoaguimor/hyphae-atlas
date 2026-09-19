"use client";

import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import type {Locale} from "@/agent/modes";

const content = {
  en: {
    eyebrow: "A real conflict Atlas had to resolve",
    title: "The same gate. Three moments in time.",
    body: "A historical target document said no G7 run had passed. Current gate evidence says G7 is closed. The 3.0.0 receipt proves a release, but not a new dedicated-hardware G7 run. Atlas must preserve all three without flattening them into one answer.",
    sources: [
      {stage: "Historical target", date: "Pre-G7 baseline", title: "No G7 performance gate has passed", body: "True when this target prose was written. It defines methodology and thresholds, but is stale for current closure status.", path: "docs/performance/microsecond-first.md", rank: "Historical · authority 55"},
      {stage: "Current gate authority", date: "Closure ff188af", title: "G7 is closed—within a scoped environment", body: "The gate index records virtualized operational-scale closure and explicitly excludes dedicated-hardware, interference, and portable latency certification.", path: "docs/gates/native-gate-status.md", rank: "Current gate · authority 95"},
      {stage: "Published release", date: "3.0.0 · Sep 4, 2026", title: "G8 release evidence is not a G7 latency rerun", body: "The exact-SHA receipt proves published artifacts and platform evidence. It does not turn the older G7 profile into universal 3.0.0 performance evidence.", path: "docs/release/receipts/3.0.0.md", rank: "Exact receipt · authority 100"},
    ],
    resolution: "Safe conclusion",
    verdict: "G7 is closed, but it cannot be cited as portable or dedicated-hardware latency certification for Hyphae 3.0.0.",
    why: "Why structure wins",
    whyBody: "Keyword search returns both “not passed” and “closed.” Version, lifecycle, evidence class, and authority turn those strings into a correct decision.",
  },
  es: {
    eyebrow: "Un conflicto real que Atlas tuvo que resolver",
    title: "El mismo gate. Tres momentos distintos.",
    body: "Un documento histórico decía que ninguna ejecución G7 había pasado. La evidencia vigente dice que G7 está cerrado. El receipt 3.0.0 prueba una release, pero no una nueva ejecución G7 en hardware dedicado. Atlas debe conservar las tres piezas sin mezclarlas.",
    sources: [
      {stage: "Objetivo histórico", date: "Baseline anterior a G7", title: "Ningún gate de rendimiento G7 ha pasado", body: "Era cierto cuando se escribió este objetivo. Define metodología y umbrales, pero está obsoleto para determinar el cierre actual.", path: "docs/performance/microsecond-first.md", rank: "Histórico · autoridad 55"},
      {stage: "Autoridad vigente", date: "Cierre ff188af", title: "G7 está cerrado dentro de un entorno acotado", body: "El índice registra cierre operacional virtualizado y excluye certificación de hardware dedicado, interferencia y latencia portable.", path: "docs/gates/native-gate-status.md", rank: "Gate vigente · autoridad 95"},
      {stage: "Release publicada", date: "3.0.0 · 4 Sep 2026", title: "La evidencia G8 no es una nueva ejecución G7", body: "El receipt exact-SHA prueba artefactos y evidencia de plataformas. No convierte el perfil G7 anterior en evidencia universal de rendimiento 3.0.0.", path: "docs/release/receipts/3.0.0.md", rank: "Receipt exacto · autoridad 100"},
    ],
    resolution: "Conclusión segura",
    verdict: "G7 está cerrado, pero no puede citarse como certificación de latencia portable o en hardware dedicado para Hyphae 3.0.0.",
    why: "Por qué gana la estructura",
    whyBody: "Una búsqueda devuelve tanto “no ha pasado” como “cerrado”. Versión, ciclo de vida, clase de evidencia y autoridad convierten esas cadenas en una decisión correcta.",
  },
} as const;

export function ConflictTimeline({locale}: {locale: Locale}) {
  const [active, setActive] = useState(1);
  const detailRef = useRef<HTMLDivElement>(null);
  const copy = content[locale];
  useEffect(() => {if (detailRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(detailRef.current, {y: 10}, {y: 0, duration: .45, ease: "power2.out", clearProps: "transform"});}, [active, locale]);
  return (
    <section className="conflict-story" id="conflict-story">
      <div className="conflict-story-intro"><p className="eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2><p>{copy.body}</p></div>
      <div className="timeline-shell">
        <div className="timeline-track" role="group" aria-label={locale === "es" ? "Cronología de evidencia" : "Evidence timeline"}>{copy.sources.map((source, index) => <button type="button" aria-pressed={active === index} className={active === index ? "active" : ""} onClick={() => setActive(index)} key={source.path}><span>{index + 1}</span><small>{source.date}</small><strong>{source.stage}</strong></button>)}</div>
        <div className="timeline-detail" ref={detailRef}><div><p className="eyebrow">{copy.sources[active].rank}</p><h3>{copy.sources[active].title}</h3><p>{copy.sources[active].body}</p><code>{copy.sources[active].path}</code></div><span className={`timeline-state state-${active}`}>{active === 0 ? "HISTORICAL" : active === 1 ? "CURRENT" : "SCOPED"}</span></div>
        <div className="conflict-resolution"><div><p className="eyebrow">{copy.resolution}</p><strong>{copy.verdict}</strong></div><div><p className="eyebrow">{copy.why}</p><span>{copy.whyBody}</span></div></div>
      </div>
    </section>
  );
}
