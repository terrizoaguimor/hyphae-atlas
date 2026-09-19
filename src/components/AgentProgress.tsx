"use client";

import {useEffect, useState} from "react";
import type {Locale} from "@/agent/modes";
import {uiCopy} from "@/i18n/copy";

export function AgentProgress({locale}: {locale: Locale}) {
  const [active, setActive] = useState(0);
  const copy = uiCopy[locale];
  useEffect(() => {
    const interval = window.setInterval(() => setActive((value) => Math.min(value + 1, copy.loadingSteps.length - 1)), 4_500);
    return () => window.clearInterval(interval);
  }, [copy.loadingSteps.length]);
  return (
    <div className="agent-progress" role="status" aria-live="polite">
      <div><span className="agent-orbit" aria-hidden="true"><i/><i/><i/></span></div>
      <div className="agent-progress-copy"><strong>{copy.loadingTitle}</strong><p>{copy.loadingBody}</p><ol>{copy.loadingSteps.map((step, index) => <li className={index <= active ? "active" : ""} key={step}><span>{index < active ? "✓" : index + 1}</span>{step}</li>)}</ol></div>
    </div>
  );
}
