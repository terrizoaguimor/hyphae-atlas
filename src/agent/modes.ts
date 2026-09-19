import type {QueryMode} from "./report-schema";

export type Locale = "en" | "es";
export type ModeContent = {label: string; eyebrow: string; description: string; example: string; outcome: string; action: string};

export const modeCopy: Record<Locale, Record<QueryMode, ModeContent>> = {
  en: {
    migration: {
      label: "Migration advisor",
      eyebrow: "Version safety",
      description: "Check whether an upgrade or import path is documented, what changes, and what rollback claims are unsafe.",
      example: "Can a Hyphae 2.x Native directory be opened with 3.0, and what happens after the first accepted mutation?",
      outcome: "A conditional verdict, the exact mutation boundary, and the missing downgrade guarantee.",
      action: "Check a migration",
    },
    capability: {
      label: "Capability inspector",
      eyebrow: "Feature reality",
      description: "Verify whether a feature exists on a specific API surface, protocol minor, and permission profile.",
      example: "Does the Native MCP adapter allow writes by default, and what limits apply to each tool call?",
      outcome: "A support verdict, hard limits, required authority, and the contracts that prove it.",
      action: "Inspect a capability",
    },
    claim: {
      label: "Claim auditor",
      eyebrow: "Evidence before assertion",
      description: "Check whether technical or performance language is supported by the exact release and evidence environment.",
      example: "Can we claim that G7 certifies portable dedicated-hardware latency for Hyphae 3.0.0?",
      outcome: "A rejected or qualified claim with the wording you can safely use instead.",
      action: "Audit a claim",
    },
  },
  es: {
    migration: {
      label: "Asesor de migración",
      eyebrow: "Seguridad entre versiones",
      description: "Comprueba si una actualización o importación está documentada, qué cambia y qué garantías de reversión no existen.",
      example: "¿Se puede abrir un directorio Native de Hyphae 2.x con 3.0 y qué ocurre después de la primera mutación aceptada?",
      outcome: "Un veredicto condicional, el límite exacto de mutación y la garantía de downgrade que no está demostrada.",
      action: "Comprobar una migración",
    },
    capability: {
      label: "Inspector de capacidades",
      eyebrow: "Realidad de la función",
      description: "Verifica si una función existe en una superficie API, protocol minor y perfil de permisos concretos.",
      example: "¿El adaptador MCP Native permite escrituras por defecto y qué límites aplica a cada llamada?",
      outcome: "Un veredicto de soporte, límites, permisos requeridos y los contratos que lo demuestran.",
      action: "Inspeccionar una capacidad",
    },
    claim: {
      label: "Auditor de afirmaciones",
      eyebrow: "Evidencia antes de afirmar",
      description: "Comprueba si una afirmación técnica o de rendimiento está respaldada por la release y el entorno exactos.",
      example: "¿Podemos afirmar que G7 certifica latencia portable en hardware dedicado para Hyphae 3.0.0?",
      outcome: "Una afirmación rechazada o condicionada y una alternativa que sí puede utilizarse con seguridad.",
      action: "Auditar una afirmación",
    },
  },
};
