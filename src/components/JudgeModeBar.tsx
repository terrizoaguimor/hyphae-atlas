"use client";

import {useEffect, useState} from "react";
import type {Locale} from "@/agent/modes";
import {judgeSteps, type JudgeStep} from "@/data/judge-mode";

type ApplicabilityRow = {id: string; claim: string; decision: "supported" | "unsupported" | "not-established"; scope: string; rationale: string};
type Payload = {available: true; adjudication: {title: string; status: "resolved"; humanReviewed: true; reviewedAt: string; reviewer: string; resolution: string; applicability: ApplicabilityRow[]}} | {available: false; error?: string};
const copy = {
  en: {
    eyebrow: "Judge mode · replay only",
    title: "Inspect the decision, not a staged live call.",
    body: "This URL loads the captured G7 claim replay. Controls only focus deterministic replay sections; no live POST is available.",
    steps: {conflict: "Conflict", report: "Report", proof: "Proof", evaluation: "Evaluation"},
    matrix: "Human adjudication applicability",
    claim: "Claim",
    decision: "Decision",
    scope: "Scope",
    rationale: "Why",
    loading: "Loading the published adjudication…",
    unavailable: "The persisted G7 adjudication is not available yet. Deploy the schema and import the pinned corpus to enable this table.",
    reviewed: "Human reviewed",
    demoTitle: "Recorded judge walkthrough",
    demoBody: "A 27-second replay-only recording of conflict, adjudication, report, proof path, and reviewed ablation. Captions are available in the embedded player and as a separate download; no live model request was made.",
    download: "Download WebM",
    captionsDownload: "Download captions",
    transcript: "Read transcript",
  },
  es: {
    eyebrow: "Modo juez · solo replay",
    title: "Inspecciona la decisión, no una llamada live preparada.",
    body: "Esta URL carga el replay capturado de la afirmación G7. Los controles solo enfocan secciones deterministas; no hay POST live disponible.",
    steps: {conflict: "Conflicto", report: "Informe", proof: "Prueba", evaluation: "Evaluación"},
    matrix: "Aplicabilidad de la adjudicación humana",
    claim: "Afirmación",
    decision: "Decisión",
    scope: "Alcance",
    rationale: "Motivo",
    loading: "Cargando la adjudicación publicada…",
    unavailable: "La adjudicación G7 persistida aún no está disponible. Despliega el schema e importa el corpus fijado para habilitar esta tabla.",
    reviewed: "Revisión humana",
    demoTitle: "Recorrido grabado para jueces",
    demoBody: "Una grabación de 27 segundos, solo replay, con conflicto, adjudicación, informe, Proof Path y ablación revisada. Los subtítulos están disponibles en el player y como descarga separada; no realizó consultas live al modelo.",
    download: "Descargar WebM",
    captionsDownload: "Descargar subtítulos",
    transcript: "Leer transcripción",
  },
} as const;
const decisionCopy = {en: {supported: "Supported", unsupported: "Unsupported", "not-established": "Not established"}, es: {supported: "Respaldado", unsupported: "No respaldado", "not-established": "No establecido"}} as const;
const transcript = {
  en: [
    ["00:00–00:04", "Judge Mode opens a URL-backed, replay-only G7 claim audit. No live agent request is made."],
    ["00:04–00:08", "The conflict view preserves the historical baseline, current gate closure, and scoped release receipt."],
    ["00:08–00:13", "The captured report rejects portable or dedicated-hardware latency certification and retains the virtualized environment qualifier."],
    ["00:13–00:17", "Proof Path exposes resolver-owned paths, commit pins, digests, lifecycle, and authority. Network verification stays disabled."],
    ["00:17–00:27", "The reviewed strict evidence rubric records 11/12 for Structured Context, 6/12 for exact lexical retrieval, and 0/12 for the pass-ineligible no-evidence control. Both retrieval arms matched all 12 accepted verdicts."],
  ],
  es: [
    ["00:00–00:04", "El Modo Juez abre por URL una auditoría G7 de solo replay. No se realiza ninguna consulta live al agente."],
    ["00:04–00:08", "La vista conserva el baseline histórico, el cierre vigente del gate y el receipt acotado de release."],
    ["00:08–00:13", "El informe rechaza la certificación portable o en hardware dedicado y conserva el límite del entorno virtualizado."],
    ["00:13–00:17", "Proof Path muestra paths, commits, digests, ciclo de vida y autoridad del resolver. La verificación de red queda deshabilitada."],
    ["00:17–00:27", "La rúbrica estricta revisada registra 11/12 para Context estructurado, 6/12 para recuperación léxica exacta y 0/12 para el control sin evidencia no elegible. Ambos brazos con recuperación acertaron los 12 veredictos aceptados."],
  ],
} as const;

export function JudgeModeBar({locale, step, onStep}: {locale: Locale; step: JudgeStep; onStep: (step: JudgeStep) => void}) {
  const labels = copy[locale];
  const [state, setState] = useState<{status: "loading" | "available" | "unavailable"; payload?: Extract<Payload, {available: true}>}>({status: "loading"});
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/adjudications/g7", {cache: "no-store", signal: controller.signal})
      .then(async (response) => ({response, body: await response.json() as Payload}))
      .then(({response, body}) => {if (response.ok && body.available) setState({status: "available", payload: body}); else setState({status: "unavailable"});})
      .catch((error) => {if (!(error instanceof DOMException && error.name === "AbortError")) setState({status: "unavailable"});});
    return () => controller.abort();
  }, []);
  const headers = [labels.claim, labels.decision, labels.scope, labels.rationale];
  return <section className="judge-mode" aria-labelledby="judge-mode-title" data-judge-controls data-adjudication-state={state.status}>
    <div className="judge-intro"><div><p className="eyebrow">{labels.eyebrow}</p><h2 id="judge-mode-title">{labels.title}</h2></div><p>{labels.body}</p></div>
    <div className="judge-steps" role="group" aria-label={locale === "es" ? "Pasos del modo juez" : "Judge mode steps"}>{judgeSteps.map((item, index) => <button type="button" data-judge-step-target={item} aria-pressed={step === item} className={step === item ? "active" : ""} onClick={() => onStep(item)} key={item}><span>{index + 1}</span>{labels.steps[item]}</button>)}</div>
    <div className="applicability-shell" aria-live="polite">
      <p className="eyebrow">{labels.matrix}</p>
      {state.status === "loading" ? <p className="adjudication-state">{labels.loading}</p> : state.status === "unavailable" || !state.payload ? <p className="adjudication-state unavailable" role="status">{labels.unavailable}</p> : <>
        <div className="adjudication-resolution"><strong>{state.payload.adjudication.title}</strong><span>{labels.reviewed} · {state.payload.adjudication.reviewer} · {state.payload.adjudication.reviewedAt}</span><p>{state.payload.adjudication.resolution}</p></div>
        <table className="applicability-table"><caption className="visually-hidden">{labels.matrix}</caption><thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{state.payload.adjudication.applicability.map((row) => <tr data-applicability-id={row.id} key={row.id}><td><span className="mobile-cell-label" aria-hidden="true">{labels.claim}</span>{row.claim}</td><td data-decision={row.decision}><span className="mobile-cell-label" aria-hidden="true">{labels.decision}</span><strong>{decisionCopy[locale][row.decision]}</strong></td><td><span className="mobile-cell-label" aria-hidden="true">{labels.scope}</span>{row.scope}</td><td><span className="mobile-cell-label" aria-hidden="true">{labels.rationale}</span>{row.rationale}</td></tr>)}</tbody></table>
      </>}
    </div>
    <div className="judge-recording" aria-labelledby="judge-recording-title" aria-describedby="judge-recording-description">
      <div><h3 className="eyebrow" id="judge-recording-title">{labels.demoTitle}</h3><p id="judge-recording-description">{labels.demoBody}</p><div className="judge-downloads"><a href="/demo/hyphae-atlas-judge.webm" download>{labels.download} ↓</a><a href={`/demo/judge-mode.${locale}.vtt`} download>{labels.captionsDownload} ↓</a></div><details className="judge-transcript"><summary>{labels.transcript}</summary><ol>{transcript[locale].map(([time, text]) => <li key={time}><time>{time}</time><span>{text}</span></li>)}</ol></details></div>
      <video controls preload="metadata" poster="/demo/hyphae-atlas-judge-poster.webp" aria-labelledby="judge-recording-title" aria-describedby="judge-recording-description">
        <source src="/demo/hyphae-atlas-judge.webm" type="video/webm"/>
        <track kind="captions" src={`/demo/judge-mode.${locale}.vtt`} srcLang={locale} label={locale === "es" ? "Español" : "English"} default/>
      </video>
    </div>
  </section>;
}
