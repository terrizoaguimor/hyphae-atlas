"use client";

import {useState} from "react";
import {gsap} from "gsap";
import type {Locale} from "@/agent/modes";
import type {ResolvedEvidenceSource} from "@/agent/report-schema";

type Verification = {state: "idle" | "checking" | "verified" | "mismatch" | "error"; message?: string};
const copy = {
  en: {eyebrow: "Cryptographic source ledger", title: "From answer to exact upstream bytes.", body: "Atlas resolves Sanity citations to the original Hyphae file, commit, license, and SHA-256. Verify any source against GitHub without trusting the model.", verifyAll: "Verify all sources", verifyingAll: "Verifying…", replayOnly: "Verification unavailable in replay-only Judge Mode", open: "Open upstream", verify: "Verify SHA-256", checking: "Checking bytes…", verified: "Digest verified", mismatch: "Digest mismatch", error: "Could not verify", commit: "Commit", digest: "SHA-256", authority: "Authority", supports: "Supports findings", source: "source"},
  es: {eyebrow: "Registro criptográfico de fuentes", title: "De la respuesta a los bytes upstream exactos.", body: "Atlas resuelve las citas de Sanity al archivo original, commit, licencia y SHA-256 de Hyphae. Verifica cualquier fuente contra GitHub sin confiar en el modelo.", verifyAll: "Verificar todas las fuentes", verifyingAll: "Verificando…", replayOnly: "Verificación no disponible en el Modo Juez de solo replay", open: "Abrir upstream", verify: "Verificar SHA-256", checking: "Comprobando bytes…", verified: "Digest verificado", mismatch: "Digest diferente", error: "No se pudo verificar", commit: "Commit", digest: "SHA-256", authority: "Autoridad", supports: "Respalda hallazgos", source: "fuente"},
} as const;

export function EvidenceLedger({sources, locale, allowVerification = true}: {sources: ResolvedEvidenceSource[]; locale: Locale; allowVerification?: boolean}) {
  const labels = copy[locale];
  const [verification, setVerification] = useState<Record<string, Verification>>({});
  const [allRunning, setAllRunning] = useState(false);

  async function verify(source: ResolvedEvidenceSource) {
    if (!allowVerification) return "error" as const;
    setVerification((value) => ({...value, [source.id]: {state: "checking"}}));
    try {
      const response = await fetch("/api/evidence/verify", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({sourceId: source.id})});
      const payload = await response.json();
      const state: Verification["state"] = response.ok && payload.verified ? "verified" : response.status === 409 ? "mismatch" : "error";
      setVerification((value) => ({...value, [source.id]: {state, message: typeof payload.error === "string" ? payload.error : undefined}}));
      if (state === "verified" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) window.requestAnimationFrame(() => gsap.fromTo(`[data-source-id="${source.id}"] .verification-state`, {scale: .75}, {scale: 1, duration: .45, ease: "back.out(2)"}));
      return state;
    } catch (error) {
      setVerification((value) => ({...value, [source.id]: {state: "error", message: error instanceof Error ? error.message : labels.error}}));
      return "error" as const;
    }
  }

  async function verifyAll() {
    if (!allowVerification) return;
    setAllRunning(true);
    for (const source of sources) await verify(source);
    setAllRunning(false);
  }

  function verificationLabel(state: Verification["state"]) {
    return state === "checking" ? labels.checking : state === "verified" ? labels.verified : state === "mismatch" ? labels.mismatch : state === "error" ? labels.error : labels.verify;
  }
  const states = Object.values(verification);
  const verifiedCount = states.filter((item) => item.state === "verified").length;
  const checkingCount = states.filter((item) => item.state === "checking").length;
  const liveMessage = locale === "es" ? `${checkingCount} verificando; ${verifiedCount} de ${sources.length} fuentes verificadas` : `${checkingCount} checking; ${verifiedCount} of ${sources.length} sources verified`;

  return (
    <section className="evidence-ledger" id="proof" tabIndex={-1} data-verification-enabled={allowVerification ? "true" : "false"} aria-busy={allRunning || checkingCount > 0}>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{liveMessage}</span>
      <div className="evidence-heading"><div><p className="eyebrow">{labels.eyebrow}</p><h3>{labels.title}</h3><p>{labels.body}</p></div><button type="button" className="outline-button" onClick={verifyAll} disabled={!allowVerification || allRunning} aria-busy={allRunning} title={!allowVerification ? labels.replayOnly : undefined}>{!allowVerification ? labels.replayOnly : allRunning ? labels.verifyingAll : `${labels.verifyAll} (${sources.length})`}</button></div>
      <div className="evidence-grid">{sources.map((source, index) => {
        const state = verification[source.id]?.state ?? "idle";
        return <article className={`evidence-card verification-${state}`} data-source-id={source.id} style={{"--source-order": index} as React.CSSProperties} key={source.id}>
          <div className="evidence-card-top"><span>{String(index + 1).padStart(2, "0")}</span><div><i>{source.lifecycleStatus}</i><i>{source.license}</i></div></div>
          <h4>{source.title}</h4><code className="source-path">{source.path}</code>
          {source.supportsFindings?.length ? <div className="supports-findings"><span>{labels.supports}</span>{source.supportsFindings.map((finding) => <i key={finding}>{finding + 1}</i>)}</div> : null}
          <dl><div><dt>{labels.commit}</dt><dd>{source.commit.slice(0, 12)}</dd></div><div><dt>{labels.digest}</dt><dd>{source.digest.slice(0, 16)}…</dd></div><div><dt>{labels.authority}</dt><dd>{source.authorityRank}/100</dd></div></dl>
          <div className="evidence-actions"><a href={source.url} target="_blank" rel="noreferrer">{labels.open}<span aria-hidden="true">↗</span></a><button type="button" className="verification-state" onClick={() => verify(source)} disabled={!allowVerification || state === "checking"} aria-busy={state === "checking"} title={!allowVerification ? labels.replayOnly : undefined}><span aria-hidden="true">{state === "verified" ? "✓" : state === "mismatch" || state === "error" ? "!" : "◇"}</span>{verificationLabel(state)}</button></div>
          <span className="sr-only" role="status" aria-live="polite">{source.title}: {verificationLabel(state)}</span>
          {verification[source.id]?.message ? <p className="verification-error">{verification[source.id].message}</p> : null}
        </article>;
      })}</div>
    </section>
  );
}
