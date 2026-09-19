import type {AgentResult} from "@/agent/report-schema";
import type {Locale} from "@/agent/modes";
import {uiCopy} from "@/i18n/copy";
import {Tooltip} from "./Tooltip";
import {TracePanel} from "./TracePanel";
import {EvidenceLedger} from "./EvidenceLedger";

const verdictLabels = {
  en: {supported: "Supported", unsupported: "Unsupported", conditional: "Conditional", unknown: "Unknown", unproven: "Unproven"},
  es: {supported: "Respaldado", unsupported: "No respaldado", conditional: "Condicional", unknown: "Desconocido", unproven: "No demostrado"},
} as const;
const statusLabels = {
  en: {confirmed: "confirmed", conditional: "conditional", rejected: "rejected", unknown: "unknown"},
  es: {confirmed: "confirmado", conditional: "condicional", rejected: "rechazado", unknown: "desconocido"},
} as const;
const reportCopy = {
  en: {report: "Evidence report", version: "Version", surface: "Surface", protocol: "Protocol minor", retrieval: "Retrieval", findings: "Findings", conclusions: "grounded conclusions", conflicts: "Conflicts surfaced", decisions: "authority decisions", actions: "Recommended actions", noAction: "No action established.", limitations: "Limitations", noLimits: "No additional limitations returned.", ledger: "Source ledger", cited: "cited sources", source: "Source", citation: "Citation", preview: "Preview mode", generated: "Generated with", tools: "Tools"},
  es: {report: "Informe de evidencia", version: "Versión", surface: "Superficie", protocol: "Protocol minor", retrieval: "Recuperación", findings: "Hallazgos", conclusions: "conclusiones fundamentadas", conflicts: "Conflictos detectados", decisions: "decisiones de autoridad", actions: "Acciones recomendadas", noAction: "No se estableció una acción.", limitations: "Limitaciones", noLimits: "No se devolvieron limitaciones adicionales.", ledger: "Registro de fuentes", cited: "fuentes citadas", source: "Fuente", citation: "Cita", preview: "Modo de vista previa", generated: "Generado con", tools: "Herramientas"},
} as const;

export function ReportView({result, locale}: {result: AgentResult; locale: Locale}) {
  const {report, retrieval} = result;
  const labels = reportCopy[locale];
  const tooltips = uiCopy[locale].tooltips;
  return (
    <section className="report" aria-labelledby="report-title">
      {retrieval.warning ? <div className="preview-warning"><span>{labels.preview}</span>{retrieval.warning}</div> : null}
      <div className="report-hero">
        <div><p className="eyebrow">{labels.report}</p><h2 id="report-title">{report.summary}</h2></div>
        <span className={`verdict verdict-${report.verdict}`}>{verdictLabels[locale][report.verdict]}</span>
      </div>

      <div className="report-meta" aria-label={locale === "es" ? "Aplicabilidad del informe" : "Report applicability"}>
        <div><span>{labels.version}</span><strong>{report.applicability.version ?? "—"}</strong></div>
        <div><span>{labels.surface}</span><strong>{report.applicability.surface ?? "—"}</strong></div>
        <div><span>{labels.protocol}</span><strong>{report.applicability.protocolMinor ?? "—"}</strong></div>
        <div><span>{labels.retrieval}</span><strong>{retrieval.mode === "sanity-context-mcp" ? "Sanity Context MCP" : "Dataset preview"}</strong></div>
      </div>

      <TracePanel result={result} locale={locale}/>

      <div className="section-block">
        <div className="section-heading"><p className="eyebrow">{labels.findings}</p><span>{report.findings.length} {labels.conclusions}</span></div>
        <div className="finding-list">
          {report.findings.map((finding, index) => (
            <article className="finding" key={`${finding.statement}-${index}`}>
              <div className="finding-top"><span className={`status-dot status-${finding.status}`} /><span>{statusLabels[locale][finding.status]}</span></div>
              <p>{finding.statement}</p>
              {finding.qualifiers.length ? <><div className="micro-label"><Tooltip content={tooltips.qualifier}>{locale === "es" ? "Condiciones" : "Qualifiers"}</Tooltip></div><ul className="tag-list">{finding.qualifiers.map((qualifier) => <li key={qualifier}>{qualifier}</li>)}</ul></> : null}
              {finding.sourceUrls.length ? <div className="inline-sources">{finding.sourceUrls.map((reference, sourceIndex) => <span title={reference} key={reference}>{labels.citation} {sourceIndex + 1}</span>)}</div> : null}
            </article>
          ))}
        </div>
      </div>

      {report.conflicts.length ? <div className="section-block conflict-section"><div className="section-heading"><p className="eyebrow">{labels.conflicts}</p><span>{report.conflicts.length} {labels.decisions}</span></div>{report.conflicts.map((conflict, index) => <article className="conflict" key={`${conflict.description}-${index}`}><p>{conflict.description}</p><strong>{conflict.resolution}</strong></article>)}</div> : null}

      <div className="report-columns">
        <div className="section-block compact"><p className="eyebrow">{labels.actions}</p>{report.recommendedActions.length ? <ol>{report.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ol> : <p className="muted">{labels.noAction}</p>}</div>
        <div className="section-block compact"><p className="eyebrow">{labels.limitations}</p>{report.limitations.length ? <ul>{report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul> : <p className="muted">{labels.noLimits}</p>}</div>
      </div>

      <EvidenceLedger sources={result.evidence.sources} locale={locale}/>

      <p className="runtime-note">{labels.generated} {retrieval.model} · {(retrieval.durationMs / 1000).toFixed(1)}s{retrieval.toolsUsed.length ? ` · ${labels.tools}: ${retrieval.toolsUsed.join(", ")}` : ""}</p>
    </section>
  );
}
