"use client";

import {useRef, useState} from "react";
import {gsap} from "gsap";
import type {Locale} from "@/agent/modes";
import type {AgentResult} from "@/agent/report-schema";

const copy = {
  en: {eyebrow: "Agent trace", title: "See how Atlas reached this decision", show: "Open trace", hide: "Close trace", tools: "Context tools", entries: "Knowledge Base entries", captured: "Captured", model: "Model", duration: "Duration", labels: {orient: "Orient", read: "Retrieve", resolve: "Resolve", validate: "Validate"}},
  es: {eyebrow: "Traza del agente", title: "Mira cómo Atlas llegó a esta decisión", show: "Abrir traza", hide: "Cerrar traza", tools: "Herramientas Context", entries: "Entradas de la Knowledge Base", captured: "Capturado", model: "Modelo", duration: "Duración", labels: {orient: "Orientar", read: "Recuperar", resolve: "Resolver", validate: "Validar"}},
} as const;

function localizedDetail(step: AgentResult["trace"][number], result: AgentResult, locale: Locale): string {
  const entryCount = step.entries?.length ?? 0;
  if (locale === "es") {
    if (step.id === "orient") return "Llamada Context observada antes de la respuesta final.";
    if (step.id === "read") return entryCount ? `Recuperación observada de ${entryCount} ${entryCount === 1 ? "entrada" : "entradas"} de la Knowledge Base.` : "Recuperación observada; el proveedor no expuso los argumentos de entrada.";
    if (step.id === "resolve") return `Evidencia upstream resuelta para ${result.report.findings.length}/${result.report.findings.length} hallazgos en ${result.evidence.sources.length} documentos fuente.`;
    return "Se validaron el schema JSON y la resolución de fuentes por hallazgo. No es una validación factual independiente del veredicto.";
  }
  if (step.id === "orient") return "Observed Context tool call before the final response.";
  if (step.id === "read") return entryCount ? `Observed retrieval of ${entryCount} Knowledge Base ${entryCount === 1 ? "entry" : "entries"}.` : "Observed Knowledge Base retrieval; the provider did not expose entry arguments.";
  if (step.id === "resolve") return `Resolved upstream evidence for ${result.report.findings.length}/${result.report.findings.length} findings across ${result.evidence.sources.length} source documents.`;
  return "Validated the JSON schema and per-finding source resolution. This is not independent factual validation of the verdict.";
}

export function TracePanel({result, locale}: {result: AgentResult; locale: Locale}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const labels = copy[locale];
  function toggle() {
    const next = !open; setOpen(next);
    if (next && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.requestAnimationFrame(() => contentRef.current && gsap.fromTo(contentRef.current, {height: 0, opacity: 0}, {height: "auto", opacity: 1, duration: .55, ease: "power3.out"}));
  }
  const entries = [...new Set(result.trace.flatMap((step) => step.entries ?? []))];
  return (
    <section className={`trace-panel ${open ? "is-open" : ""}`}>
      <button type="button" className="trace-toggle" onClick={toggle} aria-expanded={open}><div><p className="eyebrow">{labels.eyebrow}</p><h3>{labels.title}</h3></div><span>{open ? labels.hide : labels.show}<i aria-hidden="true">{open ? "−" : "+"}</i></span></button>
      {open ? <div className="trace-content" ref={contentRef}>
        <div className="trace-metrics"><div><span>{labels.tools}</span><strong>{result.retrieval.toolsUsed.join(" · ") || "—"}</strong></div><div><span>{labels.entries}</span><strong>{entries.length}</strong></div><div><span>{labels.model}</span><strong>{result.retrieval.model}</strong></div><div><span>{labels.duration}</span><strong>{(result.retrieval.durationMs / 1000).toFixed(1)}s</strong></div></div>
        <ol className="trace-steps">{result.trace.map((step, index) => <li key={step.id}><span className="trace-index">{String(index + 1).padStart(2, "0")}</span><div><p>{labels.labels[step.id]}</p><h4>{step.name}</h4><span>{localizedDetail(step, result, locale)}</span>{step.entries?.length ? <div className="entry-chips">{step.entries.map((entry) => <code key={entry}>{entry}</code>)}</div> : null}</div><i aria-label="complete">✓</i></li>)}</ol>
        <p className="trace-captured">{labels.captured}: {new Date(result.capturedAt).toLocaleString(locale === "es" ? "es" : "en")}</p>
      </div> : null}
    </section>
  );
}
