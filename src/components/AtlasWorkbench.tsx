"use client";

import {type FormEvent, useEffect, useMemo, useRef, useState} from "react";
import {gsap} from "gsap";
import {modeCopy, type Locale} from "@/agent/modes";
import type {AgentResult, QueryMode} from "@/agent/report-schema";
import {uiCopy} from "@/i18n/copy";
import {getReplay} from "@/data/replays";
import {AgentProgress} from "./AgentProgress";
import {KnowledgeGraph} from "./KnowledgeGraph";
import {ReportView} from "./ReportView";
import {Tooltip} from "./Tooltip";
import {ConflictTimeline} from "./ConflictTimeline";
import {EvaluationLab} from "./EvaluationLab";

type Configuration = {status: string; xaiConfigured: boolean; sanityDatasetConfigured: boolean; contextConfigured: boolean; retrievalMode: string};
type ExecutionMode = "replay" | "live";
const motionAllowed = () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const executionCopy = {
  en: {replay: "Instant replay", replayBody: "Open a real, previously captured Context MCP run immediately. No model credits.", live: "Run live", liveBody: "Ask Grok to read the current Knowledge Base now. Usually 1–3 minutes.", open: "Open verified replay", banner: "Verified replay", bannerBody: "This is an unedited result captured from the live Sanity Context MCP flow."},
  es: {replay: "Replay instantáneo", replayBody: "Abre inmediatamente una ejecución real capturada previamente con Context MCP. No consume créditos.", live: "Ejecutar en vivo", liveBody: "Pide a Grok que consulte ahora la Knowledge Base actual. Suele tardar 1–3 minutos.", open: "Abrir replay verificado", banner: "Replay verificado", bannerBody: "Este es un resultado sin editar capturado desde el flujo real de Sanity Context MCP."},
} as const;

export function AtlasWorkbench() {
  const rootRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const executionRef = useRef(0);
  const [locale, setLocale] = useState<Locale>("en");
  const [mode, setMode] = useState<QueryMode>("migration");
  const [question, setQuestion] = useState(modeCopy.en.migration.example);
  const [currentVersion, setCurrentVersion] = useState("2.x Native");
  const [targetVersion, setTargetVersion] = useState("3.0.0");
  const [surface, setSurface] = useState("");
  const [protocolMinor, setProtocolMinor] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("replay");
  const [resultOrigin, setResultOrigin] = useState<ExecutionMode>("replay");
  const [configuration, setConfiguration] = useState<Configuration | null>(null);

  const copy = uiCopy[locale];
  const modes = modeCopy[locale];
  const active = modes[mode];
  const contextLabel = useMemo(() => configuration?.contextConfigured ? copy.live : copy.preview, [configuration, copy.live, copy.preview]);

  useEffect(() => {
    const saved = window.localStorage.getItem("atlas-locale");
    const preferred: Locale = saved === "es" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
    document.documentElement.lang = preferred;
    const localeFrame = window.requestAnimationFrame(() => setLocale(preferred));
    fetch("/api/agent", {cache: "no-store"}).then((response) => response.json()).then(setConfiguration).catch(() => setConfiguration(null));
    const context = gsap.context(() => {
      if (motionAllowed()) gsap.fromTo("[data-reveal]", {y: 18}, {y: 0, duration: .7, stagger: .07, ease: "power3.out", clearProps: "transform"});
    }, rootRef);
    return () => {window.cancelAnimationFrame(localeFrame); context.revert();};
  }, []);

  useEffect(() => {
    if (!queryRef.current || !motionAllowed()) return;
    gsap.fromTo(queryRef.current, {opacity: .45, y: 8}, {opacity: 1, y: 0, duration: .38, ease: "power2.out"});
  }, [mode, locale]);

  useEffect(() => {
    if (!result || !reportRef.current) return;
    if (motionAllowed()) gsap.fromTo(reportRef.current, {opacity: 0, y: 30}, {opacity: 1, y: 0, duration: .7, ease: "power3.out"});
    reportRef.current.scrollIntoView({behavior: motionAllowed() ? "smooth" : "auto", block: "start"});
  }, [result]);

  useEffect(() => () => requestRef.current?.abort(), []);

  function cancelPendingRequest() {
    executionRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
  }

  function changeLocale(next: Locale) {
    cancelPendingRequest();
    setLocale(next); window.localStorage.setItem("atlas-locale", next); document.documentElement.lang = next;
    setQuestion(modeCopy[next][mode].example); setExecutionMode("replay"); setResult(null); setError("");
  }

  function selectMode(nextMode: QueryMode, scroll = false) {
    cancelPendingRequest();
    setMode(nextMode); setQuestion(modes[nextMode].example); setExecutionMode("replay"); setResult(null); setError("");
    if (nextMode === "migration") {setCurrentVersion("2.x Native"); setTargetVersion("3.0.0"); setSurface(""); setProtocolMinor("");}
    if (nextMode === "capability") {setCurrentVersion(""); setTargetVersion("3.0.0"); setSurface("Native MCP"); setProtocolMinor("2");}
    if (nextMode === "claim") {setCurrentVersion(""); setTargetVersion("3.0.0"); setSurface(""); setProtocolMinor("");}
    if (scroll) window.setTimeout(() => document.getElementById("try-atlas")?.scrollIntoView({behavior: motionAllowed() ? "smooth" : "auto", block: "start"}), 50);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); cancelPendingRequest(); setError(""); setResult(null);
    if (executionMode === "replay") {
      try {setResult(getReplay(locale, mode).result); setResultOrigin("replay");} catch (caught) {setError(caught instanceof Error ? caught.message : copy.errorUnexpected);}
      return;
    }
    const executionId = ++executionRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST", headers: {"Content-Type": "application/json"}, signal: controller.signal,
        body: JSON.stringify({mode, locale, question, ...(currentVersion ? {currentVersion} : {}), ...(targetVersion ? {targetVersion} : {}), ...(surface ? {surface} : {}), ...(protocolMinor ? {protocolMinor: Number(protocolMinor)} : {})}),
      });
      const payload = await response.json();
      if (executionId !== executionRef.current) return;
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : copy.errorFallback);
      setResult(payload as AgentResult); setResultOrigin("live");
    } catch (caught) {
      if (executionId === executionRef.current && !(caught instanceof DOMException && caught.name === "AbortError")) setError(caught instanceof Error ? caught.message : copy.errorUnexpected);
    } finally {
      if (executionId === executionRef.current) {requestRef.current = null; setLoading(false);}
    }
  }

  return (
    <div ref={rootRef}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={copy.home}><span className="brand-mark" aria-hidden="true">H</span><span>Hyphae <strong>Atlas</strong></span></a>
        <nav className="header-nav" aria-label={locale === "es" ? "Navegación principal" : "Primary navigation"}><a href="#how">{copy.navHow}</a><a href="#try-atlas">{copy.navTry}</a></nav>
        <div className="header-actions">
          <div className={`connection-status ${configuration?.contextConfigured ? "is-live" : ""}`} title={contextLabel}><span/><strong>{configuration?.contextConfigured ? "LIVE" : "PREVIEW"}</strong></div>
          <div className="language-switch" role="group" aria-label={copy.language}><button type="button" className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")} aria-pressed={locale === "en"}>EN</button><button type="button" className={locale === "es" ? "active" : ""} onClick={() => changeLocale("es")} aria-pressed={locale === "es"}>ES</button></div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy" data-reveal>
            <p className="eyebrow">{copy.heroEyebrow}</p>
            <h1>{copy.heroTitle}<br/><em>{copy.heroAccent}</em></h1>
            <p className="lede">{copy.heroBody}</p>
            <div className="hero-actions"><button className="primary-button dark" type="button" onClick={() => selectMode("migration", true)}>{copy.heroCta}<span aria-hidden="true">→</span></button><a href="#how">{copy.heroSecondary}</a></div>
            <div className="trust-row">{copy.trust.map((item) => <span key={item}>{item}</span>)}</div>
          </div>
          <div className="hero-visual" data-reveal>
            <div className="visual-heading"><div><p className="eyebrow">Live architecture</p><h2>{copy.graphTitle}</h2></div><Tooltip content={copy.graphDescription}>{locale === "es" ? "Flujo" : "Flow"}</Tooltip></div>
            <KnowledgeGraph mode={mode} locale={locale} busy={loading} contextLive={configuration?.contextConfigured === true}/>
            <p>{copy.graphDescription}</p>
          </div>
        </section>

        <section className="one-sentence" data-reveal><span>{copy.oneSentenceLabel}</span><p>{copy.oneSentence}</p></section>

        <section className="how-section" id="how">
          <div className="section-intro" data-reveal><p className="eyebrow">{copy.howEyebrow}</p><h2>{copy.howTitle}</h2><p>{copy.howBody}</p></div>
          <div className="process-grid">{copy.steps.map(([title, body], index) => <article data-reveal key={title}><span className="step-number">0{index + 1}</span><div className="step-icon" aria-hidden="true">{index === 0 ? "?" : index === 1 ? "⌘" : index === 2 ? "↗" : "✓"}</div><h3>{title}</h3><p>{body}</p>{index === 1 ? <Tooltip content={copy.tooltips.knowledgeBase}>Knowledge Base</Tooltip> : index === 3 ? <Tooltip content={copy.tooltips.verdict}>{locale === "es" ? "Veredicto" : "Verdict"}</Tooltip> : null}</article>)}</div>
        </section>

        <section className="guided-section">
          <div className="section-intro compact-intro" data-reveal><p className="eyebrow">{copy.guidedEyebrow}</p><h2>{copy.guidedTitle}</h2><p>{copy.guidedBody}</p></div>
          <div className="guided-grid">{(Object.keys(modes) as QueryMode[]).map((item, index) => <button type="button" className={`guided-card guided-${item}`} onClick={() => selectMode(item, true)} data-reveal key={item}><span className="guided-index">0{index + 1}</span><p className="eyebrow">{modes[item].eyebrow}</p><h3>{modes[item].label}</h3><p>{modes[item].description}</p><div><span>{copy.expected}</span><strong>{modes[item].outcome}</strong></div><b>{modes[item].action} →</b></button>)}</div>
        </section>

        <ConflictTimeline locale={locale}/>

        <section className="try-section" id="try-atlas">
          <div className="try-heading" data-reveal><div><p className="eyebrow">{copy.workbenchEyebrow}</p><h2>{copy.workbenchTitle}</h2></div><p>{copy.guidedBody}</p></div>
          <div className="workbench" data-reveal>
            <div className="mode-rail" role="group" aria-label={locale === "es" ? "Modo de análisis" : "Analysis mode"}>{(Object.keys(modes) as QueryMode[]).map((item) => <button type="button" aria-pressed={mode === item} className={mode === item ? "active" : ""} onClick={() => selectMode(item)} key={item}><span>{modes[item].eyebrow}</span><strong>{modes[item].label}</strong><small>{modes[item].description}</small></button>)}</div>
            <div ref={queryRef}>
              <form className="query-panel" onSubmit={submit}>
                <div className="panel-heading"><div><p className="eyebrow">{active.eyebrow}</p><h3>{active.label}</h3><p>{active.description}</p></div><button type="button" className="text-button" onClick={() => setQuestion(active.example)}>{copy.loadExample}</button></div>
                <div className="execution-switch" role="group" aria-label={locale === "es" ? "Modo de ejecución" : "Execution mode"}>
                  <button type="button" aria-pressed={executionMode === "replay"} className={executionMode === "replay" ? "active" : ""} onClick={() => {cancelPendingRequest(); setExecutionMode("replay"); setQuestion(active.example); setResult(null);}}><span>↻</span><div><strong>{executionCopy[locale].replay}</strong><small>{executionCopy[locale].replayBody}</small></div></button>
                  <button type="button" aria-pressed={executionMode === "live"} className={executionMode === "live" ? "active" : ""} disabled={configuration?.contextConfigured !== true} onClick={() => {cancelPendingRequest(); setExecutionMode("live"); setResult(null);}}><span>✦</span><div><strong>{executionCopy[locale].live}</strong><small>{executionCopy[locale].liveBody}</small></div></button>
                </div>
                <label className="question-field"><span className="label-line">{copy.question}<small>{copy.questionHelp}</small></span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength={10} maxLength={2000} rows={5} required disabled={loading} readOnly={executionMode === "replay"}/><span className="character-count">{question.length}/2000</span></label>
                <div className="field-grid">
                  {mode === "migration" ? <><label>{copy.currentVersion}<input value={currentVersion} onChange={(event) => setCurrentVersion(event.target.value)} placeholder="2.x Native" disabled={loading} readOnly={executionMode === "replay"}/></label><label>{copy.targetVersion}<input value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)} placeholder="3.0.0" disabled={loading} readOnly={executionMode === "replay"}/></label></> : null}
                  {mode === "capability" ? <><label>{copy.surface}<input value={surface} onChange={(event) => setSurface(event.target.value)} placeholder="Native MCP" disabled={loading} readOnly={executionMode === "replay"}/></label><label>{copy.protocolMinor}<input type="number" min="0" value={protocolMinor} onChange={(event) => setProtocolMinor(event.target.value)} placeholder="2" disabled={loading} readOnly={executionMode === "replay"}/></label></> : null}
                  {mode === "claim" ? <label>{copy.targetVersion}<input value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)} placeholder="3.0.0" disabled={loading} readOnly={executionMode === "replay"}/></label> : null}
                </div>
                {loading ? <AgentProgress locale={locale}/> : <div className="form-footer"><p>{copy.unknownNote}</p><button className="primary-button" type="submit">{executionMode === "replay" ? executionCopy[locale].open : copy.generate}<span aria-hidden="true">→</span></button></div>}
                {error ? <div className="error-message" role="alert">{error}</div> : null}
              </form>
            </div>
          </div>
        </section>

        <div ref={reportRef} aria-live="polite">{result ? <>{resultOrigin === "replay" ? <div className="replay-banner"><span>↻</span><div><strong>{executionCopy[locale].banner}</strong><p>{executionCopy[locale].bannerBody} · {new Date(result.capturedAt).toLocaleString(locale === "es" ? "es" : "en")}</p></div><button type="button" onClick={() => {setExecutionMode("live"); document.getElementById("try-atlas")?.scrollIntoView({behavior: motionAllowed() ? "smooth" : "auto"});}}>{executionCopy[locale].live} →</button></div> : null}<ReportView result={result} locale={locale}/></> : null}</div>

        <EvaluationLab locale={locale}/>

        <section className="method">
          <div data-reveal><p className="eyebrow">{copy.methodEyebrow}</p><h2>{copy.methodTitle}</h2></div>
          <div className="method-grid">{copy.method.map(([title, body], index) => <article data-reveal key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>
      </main>

      <footer><p>Hyphae Atlas · {copy.footer}</p><p>{copy.disclaimer}</p></footer>
    </div>
  );
}
