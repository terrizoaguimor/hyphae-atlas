"use client";

import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import type {Locale} from "@/agent/modes";
import type {QueryMode} from "@/agent/report-schema";
import cases from "../../evaluation/cases.json";
import baseline from "../../evaluation/baseline-summary.json";

type Filter = "all" | QueryMode;
const copy = {
  en: {eyebrow: "Evaluation lab", title: "Evidence behavior, measured in public.", body: "The corpus checks verdicts, exact upstream evidence, critical terminology, per-finding grounding, prohibited assertions, and real Context tool usage.", filters: {all: "All 12", migration: "Migrations", capability: "Capabilities", claim: "Claims"}, semantic: "cases passed in one full run", verdicts: "verdict accuracy", sources: "exact source coverage", grounding: "finding grounding", tools: "Context tool compliance", expected: "Accepted verdict", evidence: "Required evidence", concepts: "Required concepts", pass: "Validated", note: "Strict final baseline", noteBody: "All 12 cases passed in one uninterrupted run. Every required upstream path and semantic term group resolved, every finding was grounded, both Context tools were observed, and zero affirmative prohibited assertions passed."},
  es: {eyebrow: "Laboratorio de evaluación", title: "Comportamiento de evidencia, medido en público.", body: "El corpus comprueba veredictos, evidencia upstream exacta, terminología crítica, grounding por hallazgo, afirmaciones prohibidas y uso real de tools Context.", filters: {all: "Los 12", migration: "Migraciones", capability: "Capacidades", claim: "Afirmaciones"}, semantic: "casos aprobados en una corrida completa", verdicts: "exactitud de veredictos", sources: "cobertura exacta de fuentes", grounding: "grounding por hallazgo", tools: "cumplimiento de tools Context", expected: "Veredicto aceptado", evidence: "Evidencia requerida", concepts: "Conceptos requeridos", pass: "Validado", note: "Baseline final estricta", noteBody: "Los 12 casos pasaron en una sola corrida. Se resolvieron todas las rutas y grupos semánticos, cada hallazgo quedó fundamentado, ambas tools fueron observadas y no pasó ninguna afirmación prohibida positiva."},
} as const;

export function EvaluationLab({locale}: {locale: Locale}) {
  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const labels = copy[locale];
  const visible = cases.filter((item) => filter === "all" || item.mode === filter);
  useEffect(() => {if (gridRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(gridRef.current.children, {y: 12}, {y: 0, duration: .4, stagger: .045, ease: "power2.out", clearProps: "transform"});}, [filter]);
  return (
    <section className="evaluation-lab" id="evaluation">
      <div className="evaluation-intro"><div><p className="eyebrow">{labels.eyebrow}</p><h2>{labels.title}</h2></div><p>{labels.body}</p></div>
      <div className="evaluation-scoreboard">
        <div className="score-primary"><strong>{baseline.fullRun.passed}/{baseline.fullRun.total}</strong><span>{labels.semantic}</span></div>
        <div className="score-detail"><div><strong>100%</strong><span>{labels.verdicts}</span></div><div><strong>100%</strong><span>{labels.sources}</span></div><div><strong>100%</strong><span>{labels.grounding}</span></div><div><strong>100%</strong><span>{labels.tools}</span></div></div>
      </div>
      <div className="evaluation-note"><span>i</span><div><strong>{labels.note}</strong><p>{labels.noteBody}</p></div></div>
      <div className="evaluation-filters" role="group" aria-label={locale === "es" ? "Categoría de evaluación" : "Evaluation category"}>{(["all", "migration", "capability", "claim"] as Filter[]).map((item) => <button type="button" aria-pressed={filter === item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{labels.filters[item]}</button>)}</div>
      <div className="evaluation-grid" ref={gridRef}>{visible.map((item, index) => <details className="evaluation-case" key={item.id}><summary><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.mode}</small><strong>{item.question}</strong></div><i>{labels.pass}</i></summary><div className="case-detail"><div><span>{labels.expected}</span><strong>{item.expectedVerdicts.join(" / ")}</strong></div><div><span>{labels.evidence}</span><code>{item.requiredSourcePaths.join(" · ")}</code></div><div><span>{labels.concepts}</span><code>{item.requiredTerms.join(" · ")}</code></div></div></details>)}</div>
    </section>
  );
}
