import {defineField, defineType} from "sanity";

const sourceReference = {
  type: "reference" as const,
  to: [{type: "sourceDocument"}],
};

export const sourceDocument = defineType({
  name: "sourceDocument",
  title: "Source document",
  type: "document",
  fields: [
    defineField({name: "title", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "sourcePath", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "sourceUrl", type: "url", validation: (rule) => rule.required()}),
    defineField({name: "sourceRef", type: "string", validation: (rule) => rule.required().regex(/^[a-f0-9]{40}$/)}),
    defineField({name: "sourceCommit", type: "string", validation: (rule) => rule.required().regex(/^[a-f0-9]{40}$/)}),
    defineField({name: "contentDigest", type: "string", validation: (rule) => rule.required().regex(/^[a-f0-9]{64}$/)}),
    defineField({name: "format", type: "string", options: {list: ["markdown", "json", "yaml"]}}),
    defineField({name: "documentKind", type: "string"}),
    defineField({name: "content", type: "text", rows: 24, validation: (rule) => rule.required()}),
    defineField({name: "license", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "authorityDomains", type: "array", of: [{type: "string"}], validation: (rule) => rule.required().min(1)}),
    defineField({name: "authorityRank", type: "number", validation: (rule) => rule.required().min(0).max(100)}),
    defineField({
      name: "lifecycleStatus",
      type: "string",
      options: {list: ["published", "historical", "unreleased", "draft"], layout: "radio"},
      validation: (rule) => rule.required(),
    }),
    defineField({name: "versionScope", type: "array", of: [{type: "string"}], validation: (rule) => rule.required().min(1)}),
    defineField({name: "lastVerifiedAt", type: "datetime", validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: "title", subtitle: "sourcePath", status: "lifecycleStatus"}, prepare: ({title, subtitle, status}) => ({title, subtitle: `${status} · ${subtitle}`})},
});

export const hyphaeRelease = defineType({
  name: "hyphaeRelease",
  title: "Hyphae release",
  type: "document",
  fields: [
    defineField({name: "version", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "releaseDate", type: "date", validation: (rule) => rule.required()}),
    defineField({name: "commit", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "status", type: "string", options: {list: ["published", "historical", "unreleased"]}, validation: (rule) => rule.required()}),
    defineField({name: "diskFormats", type: "array", of: [{type: "string"}]}),
    defineField({name: "protocolMinors", type: "array", of: [{type: "number"}]}),
    defineField({name: "summary", type: "text", rows: 5}),
    defineField({name: "publicationReceipt", ...sourceReference}),
    defineField({name: "sourceDocuments", type: "array", of: [sourceReference]}),
  ],
  preview: {select: {title: "version", subtitle: "status"}},
});

export const capability = defineType({
  name: "capability",
  title: "Capability",
  type: "document",
  fields: [
    defineField({name: "name", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "description", type: "text", rows: 5, validation: (rule) => rule.required()}),
    defineField({name: "introducedIn", type: "reference", to: [{type: "hyphaeRelease"}]}),
    defineField({name: "removedIn", type: "reference", to: [{type: "hyphaeRelease"}]}),
    defineField({name: "surfaces", type: "array", of: [{type: "string"}]}),
    defineField({name: "protocolMinors", type: "array", of: [{type: "number"}]}),
    defineField({name: "requiredPermissions", type: "array", of: [{type: "string"}]}),
    defineField({name: "bounds", type: "array", of: [{type: "string"}]}),
    defineField({name: "nonClaims", type: "array", of: [{type: "string"}]}),
    defineField({name: "evidence", type: "array", of: [{type: "reference", to: [{type: "evidenceArtifact"}]}]}),
    defineField({name: "sources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
  ],
});

export const compatibilityRule = defineType({
  name: "compatibilityRule",
  title: "Compatibility rule",
  type: "document",
  fields: [
    defineField({name: "title", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "fromVersion", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "toVersion", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "direction", type: "string", options: {list: ["upgrade", "downgrade", "import", "protocol"]}}),
    defineField({name: "status", type: "string", options: {list: ["supported", "unsupported", "conditional", "unknown"]}, validation: (rule) => rule.required()}),
    defineField({name: "conditions", type: "array", of: [{type: "string"}]}),
    defineField({name: "migrationBehavior", type: "text", rows: 6}),
    defineField({name: "rollbackEvidence", type: "text", rows: 4}),
    defineField({name: "fixture", type: "string"}),
    defineField({name: "sources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
  ],
});

export const productClaim = defineType({
  name: "productClaim",
  title: "Product claim",
  type: "document",
  fields: [
    defineField({name: "statement", type: "text", rows: 4, validation: (rule) => rule.required()}),
    defineField({name: "classification", type: "string", options: {list: ["allowed", "conditional", "prohibited", "unproven"]}, validation: (rule) => rule.required()}),
    defineField({name: "versionScope", type: "array", of: [{type: "string"}]}),
    defineField({name: "environmentScope", type: "array", of: [{type: "string"}]}),
    defineField({name: "requiredQualifiers", type: "array", of: [{type: "string"}]}),
    defineField({name: "prohibitedWording", type: "array", of: [{type: "string"}]}),
    defineField({name: "evidence", type: "array", of: [{type: "reference", to: [{type: "evidenceArtifact"}]}]}),
    defineField({name: "sources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
  ],
  preview: {select: {title: "statement", subtitle: "classification"}},
});

export const evidenceArtifact = defineType({
  name: "evidenceArtifact",
  title: "Evidence artifact",
  type: "document",
  fields: [
    defineField({name: "name", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "artifactType", type: "string", options: {list: ["gate", "receipt", "fixture", "benchmark", "conformance", "formal-model"]}, validation: (rule) => rule.required()}),
    defineField({name: "release", type: "reference", to: [{type: "hyphaeRelease"}]}),
    defineField({name: "commit", type: "string"}),
    defineField({name: "environment", type: "string"}),
    defineField({name: "assertions", type: "array", of: [{type: "string"}]}),
    defineField({name: "limitations", type: "array", of: [{type: "string"}]}),
    defineField({name: "digest", type: "string"}),
    defineField({name: "source", ...sourceReference, validation: (rule) => rule.required()}),
  ],
});

export const conflictAdjudication = defineType({
  name: "conflictAdjudication",
  title: "Conflict adjudication",
  type: "document",
  fields: [
    defineField({name: "title", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "domain", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "question", type: "text", rows: 4, validation: (rule) => rule.required()}),
    defineField({name: "status", type: "string", options: {list: ["resolved", "superseded"]}, validation: (rule) => rule.required()}),
    defineField({name: "humanReviewed", type: "boolean", initialValue: true, validation: (rule) => rule.required().custom((value) => value === true || "A human review is required")}),
    defineField({name: "reviewedAt", type: "date", validation: (rule) => rule.required()}),
    defineField({name: "reviewer", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "policyVersion", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "decisionDigest", type: "string", readOnly: true, validation: (rule) => rule.required().regex(/^[a-f0-9]{64}$/)}),
    defineField({name: "corpusCommit", type: "string", readOnly: true, validation: (rule) => rule.required().regex(/^[a-f0-9]{40}$/)}),
    defineField({name: "corpusDocumentCount", type: "number", readOnly: true, validation: (rule) => rule.required().integer().min(1)}),
    defineField({name: "corpusSnapshotDigest", type: "string", readOnly: true, validation: (rule) => rule.required().regex(/^[a-f0-9]{64}$/)}),
    defineField({name: "resolution", type: "text", rows: 8, validation: (rule) => rule.required()}),
    defineField({name: "versionScope", type: "array", of: [{type: "string"}], validation: (rule) => rule.required().min(1)}),
    defineField({name: "environmentScope", type: "array", of: [{type: "string"}], validation: (rule) => rule.required().min(1)}),
    defineField({name: "historicalSources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
    defineField({name: "authoritativeSources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
    defineField({name: "scopedSources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
    defineField({name: "applicability", type: "array", validation: (rule) => rule.required().min(1), of: [{type: "object", name: "applicabilityDecision", fields: [
      defineField({name: "id", type: "string", validation: (rule) => rule.required()}),
      defineField({name: "claim", type: "text", rows: 3, validation: (rule) => rule.required()}),
      defineField({name: "decision", type: "string", options: {list: ["supported", "unsupported", "not-established"]}, validation: (rule) => rule.required()}),
      defineField({name: "scope", type: "string", validation: (rule) => rule.required()}),
      defineField({name: "rationale", type: "text", rows: 4, validation: (rule) => rule.required()}),
      defineField({name: "sources", type: "array", of: [sourceReference], validation: (rule) => rule.required().min(1)}),
    ]}]}),
  ],
  preview: {select: {title: "title", subtitle: "status"}},
});

export const publicContract = defineType({
  name: "publicContract",
  title: "Public contract",
  type: "document",
  fields: [
    defineField({name: "name", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "contractVersion", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "protocolMinor", type: "number"}),
    defineField({name: "surface", type: "string", validation: (rule) => rule.required()}),
    defineField({name: "operations", type: "array", of: [{type: "string"}]}),
    defineField({name: "permissions", type: "array", of: [{type: "string"}]}),
    defineField({name: "schemaDigest", type: "string"}),
    defineField({name: "source", ...sourceReference, validation: (rule) => rule.required()}),
  ],
});

export const atlasSchemas = [sourceDocument, hyphaeRelease, capability, compatibilityRule, productClaim, evidenceArtifact, conflictAdjudication, publicContract];
