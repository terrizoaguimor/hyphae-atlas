"use client";

import {useEffect, useRef, useState} from "react";
import {gsap} from "gsap";
import type {Locale} from "@/agent/modes";
import type {QueryMode} from "@/agent/report-schema";
import cases from "../../evaluation/cases.json";
import baseline from "../../evaluation/baseline-summary.json";
import ablation from "../../evaluation/ablation-summary.json";
import {ablationArtifactSchema, isReviewedPublicAblation} from "../../evaluation/ablation-contract";

type Filter = "all" | QueryMode;
const ablationData = ablationArtifactSchema.parse(ablation);
const showAblationMetrics = isReviewedPublicAblation(ablationData);
if (ablationData.status !== "pending" && !showAblationMetrics) throw new Error("Public ablation summary must be pending or a reviewed full promotion");
const copy = {
  en: {eyebrow: "Evaluation lab", title: "Evidence behavior, measured in public.", body: "The corpus checks verdicts, exact upstream evidence, critical terminology, per-finding grounding, prohibited assertions, and real Context tool usage.", filters: {all: "All 12", migration: "Migrations", capability: "Capabilities", claim: "Claims"}, semantic: "cases passed in one full run", verdicts: "verdict accuracy", sources: "exact source coverage", grounding: "finding grounding", tools: "Context tool compliance", expected: "Accepted verdict", evidence: "Required evidence", concepts: "Required concepts", pass: "Validated", note: "Strict final baseline", noteBody: "All 12 cases passed in one uninterrupted run. Every required upstream path and semantic term group resolved, every finding was grounded, both Context tools were observed, and zero affirmative prohibited assertions passed."},
  es: {eyebrow: "Laboratorio de evaluación", title: "Comportamiento de evidencia, medido en público.", body: "El corpus comprueba veredictos, evidencia upstream exacta, terminología crítica, grounding por hallazgo, afirmaciones prohibidas y uso real de tools Context.", filters: {all: "Los 12", migration: "Migraciones", capability: "Capacidades", claim: "Afirmaciones"}, semantic: "casos aprobados en una corrida completa", verdicts: "exactitud de veredictos", sources: "cobertura exacta de fuentes", grounding: "grounding por hallazgo", tools: "cumplimiento de tools Context", expected: "Veredicto aceptado", evidence: "Evidencia requerida", concepts: "Conceptos requeridos", pass: "Validado", note: "Baseline final estricta", noteBody: "Los 12 casos pasaron en una sola corrida. Se resolvieron todas las rutas y grupos semánticos, cada hallazgo quedó fundamentado, ambas tools fueron observadas y no pasó ninguna afirmación prohibida positiva."},
} as const;
const ablationCopy = {
  en: {eyebrow: "Three-arm ablation", title: "Structured provenance vs exact lexical retrieval vs no-evidence control", pending: "Pending", passRate: "strict evidence-compliance pass rate", verdict: "accepted verdict", source: "resolved required sources", grounding: "citation resolution", resolution: "resolution policy"},
  es: {eyebrow: "Ablación de tres brazos", title: "Procedencia estructurada vs recuperación léxica exacta vs control sin evidencia", pending: "Pendiente", passRate: "tasa estricta de cumplimiento de evidencia", verdict: "veredicto aceptado", source: "fuentes requeridas resueltas", grounding: "resolución de citas", resolution: "política de resolución"},
} as const;
const percentage = (value: number) => `${Math.round(value * 100)}%`;

export function EvaluationLab({locale}: {locale: Locale}) {
  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const labels = copy[locale];
  const ablationLabels = ablationCopy[locale];
  const visible = cases.filter((item) => filter === "all" || item.mode === filter);
  useEffect(() => {if (gridRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(gridRef.current.children, {y: 12}, {y: 0, duration: .4, stagger: .045, ease: "power2.out", clearProps: "transform"});}, [filter]);
  return (
    <section className="evaluation-lab" id="evaluation" tabIndex={-1} data-evaluation-filter={filter}>
      <div className="evaluation-intro"><div><p className="eyebrow">{labels.eyebrow}</p><h2>{labels.title}</h2></div><p>{labels.body}</p></div>
      <div className="evaluation-scoreboard">
        <div className="score-primary"><strong>{baseline.fullRun.passed}/{baseline.fullRun.total}</strong><span>{labels.semantic}</span></div>
        <div className="score-detail"><div><strong>{percentage(baseline.fullRun.verdictAccuracy)}</strong><span>{labels.verdicts}</span></div><div><strong>{percentage(baseline.fullRun.sourceCoverage)}</strong><span>{labels.sources}</span></div><div><strong>{percentage(baseline.fullRun.findingGrounding)}</strong><span>{labels.grounding}</span></div><div><strong>{percentage(baseline.fullRun.contextToolCompliance)}</strong><span>{labels.tools}</span></div></div>
      </div>
      <div className="evaluation-note"><span>i</span><div><strong>{labels.note}</strong><p>{labels.noteBody}</p></div></div>
      <div className="ablation-heading"><p className="eyebrow">{ablationLabels.eyebrow}</p><h3>{ablationLabels.title}</h3><p>{ablationData.note[locale]}</p></div>
      <div className="ablation-grid" data-ablation-status={ablationData.status} data-publication-state={showAblationMetrics ? "reviewed" : "pending"}>{ablationData.arms.map((arm) => {const metrics = showAblationMetrics ? arm.metrics : null; return <article data-ablation-arm={arm.id} data-run-status={showAblationMetrics ? "reviewed" : "pending"} key={arm.id}><span>{metrics ? percentage(metrics.passRate) : ablationLabels.pending}</span><h4>{arm.label[locale]}</h4><p>{arm.description[locale]}</p><dl><div><dt>{ablationLabels.verdict}</dt><dd>{metrics ? percentage(metrics.verdictAccuracy) : "—"}</dd></div><div><dt>{ablationLabels.source}</dt><dd>{metrics ? percentage(metrics.sourceCoverage) : "—"}</dd></div><div><dt>{ablationLabels.grounding}</dt><dd>{metrics ? percentage(metrics.findingGrounding) : "—"}</dd></div><div><dt>{ablationLabels.resolution}</dt><dd>{arm.resolutionMode}</dd></div></dl><small>{ablationLabels.passRate}</small></article>;})}</div>
      <div className="evaluation-filters" role="group" aria-label={locale === "es" ? "Categoría de evaluación" : "Evaluation category"}>{(["all", "migration", "capability", "claim"] as Filter[]).map((item) => <button type="button" aria-pressed={filter === item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{labels.filters[item]}</button>)}</div>
      <div className="evaluation-grid" ref={gridRef}>{visible.map((item, index) => <details className="evaluation-case" key={item.id}><summary><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.mode}</small><strong>{item.question}</strong></div><i>{labels.pass}</i></summary><div className="case-detail"><div><span>{labels.expected}</span><strong>{item.expectedVerdicts.join(" / ")}</strong></div><div><span>{labels.evidence}</span><code>{item.requiredSourcePaths.join(" · ")}</code></div><div><span>{labels.concepts}</span><code>{item.requiredTerms.join(" · ")}</code></div></div></details>)}</div>
    </section>
  );
}
