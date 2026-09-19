# Hyphae Atlas — Plan integral para Sanity Challenge Path One

**Estado:** implementación y Context MCP completos; publicación externa pendiente<br>
**Fecha base:** 18 de septiembre de 2026<br>
**Deadline:** 4 de octubre de 2026, 11:59 p. m. PDT<br>
**Proyecto fuente:** `/home/terrizoaguimor/Documents/hyphae`
**Entrega:** Sanity Challenge — Path One: Ship an Agent That Queries Real Content

## 1. Resumen ejecutivo

Hyphae Atlas es un agente consciente de versiones y evidencias que responde preguntas críticas sobre compatibilidad, capacidades y afirmaciones técnicas de Hyphae. El backend controla Sanity Context MCP como autoridad documental y permite elegir xAI, OpenAI, Anthropic o un endpoint OpenAI-compatible para selección y síntesis.

La propuesta no presenta Hyphae como trabajo nuevo. Hyphae, su documentación, contratos y evidencias son contenido preexistente. El trabajo creado para el challenge será el modelo de contenido en Sanity, el pipeline de importación, la Knowledge Base, las reglas de autoridad, el agente, su interfaz, el corpus de evaluación y la documentación de la entrega.

### Propuesta de valor

Una búsqueda textual puede localizar palabras, pero no decide correctamente qué afirmación aplica a una release, commit, protocol minor, superficie o entorno determinado. Atlas relacionará esas dimensiones y devolverá un veredicto con fuentes, qualifiers, conflictos y límites.

### Modos del MVP

1. **Migration Advisor:** valida una migración entre versiones y enumera condiciones, riesgos y pasos.
2. **Capability Inspector:** determina si una capacidad está soportada en una versión, superficie y protocol minor.
3. **Claim Auditor:** decide si una afirmación técnica está respaldada, condicionada, prohibida o no demostrada.

## 2. Estado actual verificado

- El proyecto contiene `.env.example`, `.env` y `.gitignore`.
- `.env` está protegido con permisos `0600`.
- El dataset contiene 33 documentos Atlas namespaced y 13 documentos no-Atlas preservados.
- La API de xAI responde correctamente y Grok 4.6 completó la baseline del adapter provider-agnostic.
- Sanity Context MCP está activo en Knowledge Base mode con 21 entradas.
- Los tokens Viewer, Editor/importer y Deploy Studio fueron creados y validados por separado.
- La Knowledge Base, el endpoint MCP, el Studio y el schema están desplegados.

## 3. Objetivos y límites

### Objetivos

- Demostrar uso esencial, no decorativo, de Sanity Context y Knowledge Bases.
- Ofrecer respuestas versionadas y respaldadas por citas.
- Diferenciar fuentes publicadas, históricas y unreleased.
- Resolver o mostrar conflictos de autoridad entre documentos.
- Permitir a los jueces probar tres flujos claros sin autenticación.
- Mantener trazabilidad desde la respuesta hasta el archivo, release y commit de origen.
- Producir evidencia suficiente para completar todas las secciones de la plantilla del Path One.

### No objetivos del MVP

- Indexar todo el código fuente de Hyphae.
- Sustituir Sanity Context con el motor de búsqueda de Hyphae.
- Modificar contenido mediante Context MCP, que es de solo lectura.
- Cubrir todas las versiones y operaciones históricas de Hyphae.
- Ejecutar migraciones reales sobre directorios de usuarios.
- Dar recomendaciones operativas sin respaldo documental.
- Integrar inicialmente Agent Memory o todas las herramientas del MCP nativo de Hyphae.
- Crear una suite de pruebas unitarias por defecto; se implementarán validaciones, smoke checks y evaluación del agente. Las pruebas unitarias se añadirán solo si se solicitan.

## 4. Usuarios y escenarios principales

### Usuarios

- Personas evaluando o actualizando Hyphae.
- Desarrolladores que integran sus SDK o protocolo.
- Maintainers revisando documentación y claims.
- Auditores que necesitan relacionar claims con receipts, gates y commits.

### Escenarios de demostración

1. **Migración 2.x → 3.0:** determinar si puede abrirse el directorio, cuándo cambia su formato y qué no está documentado.
2. **Claim de rendimiento:** decidir si G7 permite afirmar latencia certificada en hardware dedicado para 3.0.
3. **Released vs unreleased:** comprobar si una característica candidata de Agent Memory pertenece a la release publicada.
4. **Capacidad por superficie:** verificar si una operación existe en CLI, HTTP, SDK y MCP, y bajo qué permisos o protocol minor.
5. **Semántica transaccional:** diferenciar snapshot isolation de serializabilidad y evitar un claim prohibido.

## 5. Ajuste a las reglas del Path One

| Requisito | Evidencia prevista |
|---|---|
| Agente funcional | Aplicación pública con tres modos de consulta |
| Sanity Context MCP | Endpoint en Knowledge Base mode |
| Knowledge Base | Corpus curado de Hyphae más dataset estructurado |
| Contenido real | Documentación, contratos, fixtures, gates y receipts reales |
| Uso significativo de estructura | Relaciones entre releases, claims, capabilities, contratos y evidencias |
| Implementación técnica | Backend tipado, validación de entrada/salida y trazas redactadas |
| Usabilidad | Formularios guiados, ejemplos y panel de evidencias |
| Sanity Project Details | Project ID y, si es posible, dataset público |
| Demo | URL desplegada y video corto |
| Código | Repositorio público del trabajo nuevo |
| Trabajo previo | Declaración explícita y atribución de Hyphae |
| Idioma elegible para premios | Artículo final en inglés |
| Tag | `#sanitychallenge` |

## 6. Arquitectura propuesta

```text
Navegador
   │
   ▼
Next.js UI
   │ HTTPS
   ▼
API server-side `/api/agent`
   ├── validación, cuotas y cancelación
   ├── initial_context directo
   ├── modelo configurado selecciona paths
   ├── validación exacta contra outline
   ├── knowledge_base_read directo
   ├── modelo configurado sintetiza JSON
   └── grounding y Evidence Resolver
          │
          ▼
Sanity Context MCP (Knowledge Base mode)
   ├── initial_context
   └── knowledge_base_read
          │
          ▼
Hyphae Knowledge Base
   ├── dataset estructurado de Sanity
   ├── contenido curado
   ├── reglas de autoridad
   └── decisiones de conflicto
```

### Arquitectura MCP primaria

Atlas posee el loop MCP; ningún proveedor recibe el token Context ni controla las tools. El modelo solo selecciona entre paths del outline y sintetiza a partir del contenido ya recuperado.

### Proveedores

- `xai`: Chat Completions compatible.
- `openai`: Responses API.
- `anthropic`: Messages API.
- `openai-compatible`: endpoint HTTPS configurable.

El demo usa xAI, pero Context, trazas, grounding, replays y evaluación son independientes del proveedor.

### Extensión posterior

El MCP nativo de Hyphae podrá consultar las capacidades de una instancia activa. Será una fuente operacional secundaria, nunca la autoridad documental ni un sustituto de Sanity Context.

## 7. Stack técnico propuesto

- **Lenguaje:** TypeScript estricto.
- **Aplicación:** Next.js con rutas de servidor.
- **UI:** React y CSS accesible; evitar una dependencia visual pesada para el MVP.
- **CMS/modelado:** Sanity Studio y Content Lake.
- **Conocimiento:** Sanity Context en Knowledge Base mode.
- **Modelo:** proveedor configurable (`xai`, `openai`, `anthropic`, `openai-compatible`); el demo usa Grok 4.6.
- **Validación:** schemas TypeScript/Zod o equivalente para entrada y reporte.
- **Despliegue preferido:** Vercel para la aplicación y hosting administrado de Sanity para Studio/Context.
- **Gestión de paquetes:** se elegirá npm o pnpm después de comprobar qué está instalado; no se fijarán versiones sin consultar las versiones actuales.

## 8. Estructura inicial del repositorio

Se mantendrá una sola aplicación para reducir complejidad:

```text
.
├── PLAN.md
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── sanity.config.ts
├── sanity.cli.ts
├── src/
│   ├── app/
│   │   ├── api/agent/route.ts
│   │   ├── page.tsx
│   │   └── results/
│   ├── components/
│   │   ├── QueryForm.tsx
│   │   ├── VerdictCard.tsx
│   │   ├── EvidenceList.tsx
│   │   └── ConflictPanel.tsx
│   ├── agent/
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   ├── report-schema.ts
│   │   ├── sanity-context.ts
│   │   └── modes.ts
│   ├── sanity/
│   │   ├── client.ts
│   │   └── schemaTypes/
│   └── security/
│       ├── limits.ts
│       └── redaction.ts
├── scripts/
│   ├── import-hyphae.ts
│   ├── verify-corpus.ts
│   └── context-smoke.ts
├── corpus/
│   ├── manifest.json
│   └── README.md
├── evaluation/
│   ├── cases.json
│   ├── run.ts
│   └── results/
└── docs/
    ├── architecture.md
    ├── content-authority.md
    ├── submission-evidence.md
    └── submission-draft.md
```

No se crearán todos los archivos de una vez. Primero se generará el skeleton mínimo, después se completará por fases.

## 9. Modelo de contenido en Sanity

Todos los IDs importados usarán un namespace como `hyphaeAtlas.*` para no colisionar con los 12 documentos existentes. Ningún script borrará documentos fuera de ese namespace.

### `sourceDocument`

Representa una fuente y su procedencia.

- `title`
- `sourcePath`
- `sourceUrl`
- `sourceRef`
- `sourceCommit`
- `contentDigest`
- `content`
- `license`
- `authorityDomain`
- `authorityRank`
- `lifecycleStatus`: `published | historical | unreleased | draft`
- `versionScope`
- `lastVerifiedAt`

### `hyphaeRelease`

- `version`
- `releaseDate`
- `commit`
- `status`
- `diskFormats`
- `protocolMinors`
- `publicationReceipt`
- `sourceDocuments[]`

### `capability`

- `name`
- `description`
- `introducedIn`
- `removedIn`
- `surfaces[]`
- `protocolMinors[]`
- `requiredPermissions[]`
- `bounds[]`
- `nonClaims[]`
- `evidence[]`

### `compatibilityRule`

- `fromVersion`
- `toVersion`
- `direction`
- `status`: `supported | unsupported | conditional | unknown`
- `conditions[]`
- `migrationBehavior`
- `rollbackEvidence`
- `fixture`
- `sources[]`

### `productClaim`

- `statement`
- `classification`: `allowed | conditional | prohibited | unproven`
- `versionScope`
- `environmentScope`
- `requiredQualifiers[]`
- `prohibitedWording[]`
- `evidence[]`
- `sources[]`

### `evidenceArtifact`

- `name`
- `type`: `gate | receipt | fixture | benchmark | conformance | formal-model`
- `release`
- `commit`
- `environment`
- `assertions[]`
- `limitations[]`
- `digest`
- `sourceUrl`

### `publicContract`

- `name`
- `contractVersion`
- `protocolMinor`
- `surface`
- `operations[]`
- `permissions[]`
- `schemaDigest`
- `sourceDocument`

## 10. Corpus inicial

### Fuentes narrativas y normativas

1. `README.md`
2. `CHANGELOG.md`
3. `LICENSE-POLICY.md`
4. `compatibility/README.md`
5. `contracts/README.md`
6. `mcp/README.md`
7. `docs/product/claims.md`
8. `docs/product/native-capabilities.md`
9. `docs/product/agent-memory.md`
10. `docs/gates/native-gate-status.md`
11. `docs/release/receipts/3.0.0.md`
12. `docs/native/sql-semantics-v1.md`
13. `docs/native/mvcc-commit-v1.md`
14. `docs/native/local-product-v1.md`
15. `docs/performance/microsecond-first.md`

### Fuentes legibles por máquina

- `contracts/native-mcp-v2.json`
- `contracts/openapi/hyphae-v2.yaml`
- `config/native-gate-status.json`
- Metadata de fixtures bajo `compatibility/`; no se cargarán blobs binarios completos.
- Cierres y receipts JSON seleccionados que estén vinculados a 3.0.0.

### Política de selección

- Empezar con 15–25 fuentes de alta autoridad.
- No importar `target/`, `.git/`, `.env`, credenciales, artefactos locales ni directorios de datos.
- No indexar el código Rust completo en el MVP.
- Cada fuente tendrá ruta pública, commit/ref, digest y licencia.
- El corpus publicado se fijará a referencias reproducibles; el working tree solo se usará para contenido explícitamente marcado como unreleased.

## 11. Jerarquía de autoridad

No se usará un único ranking global. La autoridad depende del tipo de afirmación:

| Dominio | Autoridad primaria |
|---|---|
| Vocabulario de claims | `docs/product/claims.md` |
| API y wire behavior | Contratos JSON/OpenAPI y especificaciones normativas |
| Capacidad publicada | Capability matrix, contrato aplicable y release |
| Publicación de artefactos | Receipt de la release |
| Evidencia de cierre | Gate/closure ligado al commit exacto |
| Compatibilidad histórica | Fixtures y pruebas versionadas |
| Guía operativa | Especificación operativa aplicable |
| Trabajo futuro | Roadmaps/unreleased; nunca prueban disponibilidad publicada |

### Reglas permanentes de la Knowledge Base

- Resolver siempre por versión, commit y superficie cuando estén disponibles.
- Separar `published`, `historical` y `unreleased`.
- No promover roadmaps o candidatos a capacidad publicada.
- No generalizar evidencia de rendimiento fuera de su entorno y commit.
- No afirmar serializabilidad, distribución o compatibilidad universal.
- Cuando dos fuentes discrepen, mostrar ambas y explicar cuál domina para ese dominio.
- Si falta evidencia, responder `unknown` o `unproven`.
- Cada conclusión crítica debe conservar una cita o referencia de procedencia.

## 12. Pipeline de importación

### Entrada

- Path local configurable para desarrollo.
- Ref/commit explícito.
- `corpus/manifest.json` con ruta, tipo, autoridad, estado y licencia.

### Proceso

1. Validar que cada ruta esté dentro del repositorio Hyphae permitido.
2. Rechazar rutas sensibles o no declaradas.
3. Leer la fuente desde el ref indicado.
4. Calcular SHA-256.
5. Parsear Markdown, JSON o YAML.
6. Extraer metadata y relaciones.
7. Generar documentos con IDs deterministas namespaced.
8. Mostrar un dry run sin contenido sensible.
9. Hacer upsert idempotente en Sanity.
10. Emitir un receipt local con IDs y digests, nunca tokens.

### Seguridad de escritura

- La primera validación de escritura usará un documento temporal bajo `hyphaeAtlas.smoke.*`.
- Solo se eliminará ese documento temporal creado por el mismo proceso.
- Los importadores no usarán operaciones de borrado global.
- Se comprobará el dataset antes y después para confirmar que los 12 documentos existentes no cambian.

## 13. Knowledge Base y Context MCP

### Purpose propuesto

> Help Hyphae users, maintainers, and auditors determine whether a migration, capability, or technical claim is valid for an exact release, protocol surface, and evidence scope.

### Construcción

1. Activar Context/Knowledge Bases en la organización.
2. Desplegar el schema de Sanity.
3. Adjuntar el dataset estructurado como fuente.
4. Añadir únicamente fuentes curadas y reproducibles.
5. Ejecutar el primer build.
6. Revisar outline, cobertura y topics periféricos.
7. Resolver contradicciones reales.
8. Añadir instrucciones de autoridad.
9. Reconstruir y comprobar que las decisiones persisten.
10. Crear el MCP `hyphae-atlas` en Knowledge Base mode.
11. Crear token de organización con `Context Viewer`.
12. Guardar URL y token solo en `.env`/hosting.

### Herramientas esperadas

- `initial_context`: obtiene propósito y outline.
- `knowledge_base_read`: lee una o varias entradas relevantes.

No se documentará `groq_query` como parte de este endpoint porque pertenece a GROQ mode.

## 14. Diseño del agente

### Flujo

1. Validar y clasificar la pregunta.
2. Añadir versión/superficie faltante como incertidumbre; no inventarla.
3. Obtener `initial_context` al inicio de la conversación o usar el equivalente HTTP si se decide cachearlo.
4. Elegir rutas del outline.
5. Leer rutas relevantes en una llamada agrupada cuando sea posible.
6. Comparar aplicabilidad, autoridad y temporalidad.
7. Construir un reporte estructurado.
8. Validar el reporte antes de devolverlo.
9. Mostrar fuentes, conflictos y límites al usuario.

### Contrato de salida

```json
{
  "mode": "migration | capability | claim",
  "verdict": "supported | unsupported | conditional | unknown | unproven",
  "summary": "string",
  "applicability": {
    "version": "string | null",
    "surface": "string | null",
    "protocolMinor": "string | null"
  },
  "findings": [
    {
      "statement": "string",
      "status": "confirmed | conditional | rejected | unknown",
      "qualifiers": ["string"],
      "sources": ["string"]
    }
  ],
  "conflicts": [
    {
      "description": "string",
      "resolution": "string",
      "sources": ["string"]
    }
  ],
  "recommendedActions": ["string"],
  "limitations": ["string"]
}
```

### Guardrails

- Tool allowlist estricta.
- Máximo de rondas de herramientas.
- Longitud máxima de entrada y salida.
- Tiempo límite por solicitud.
- Rechazo de instrucciones que intenten cambiar la jerarquía de autoridad.
- Contenido recuperado tratado como datos no confiables, no como instrucciones del sistema.
- No registrar tokens, prompts completos o contenido sensible.
- Respuesta `unknown` cuando no hay evidencia suficiente.

## 15. Interfaz del MVP

### Pantalla única con tres modos

- `Migration`
- `Capability`
- `Claim audit`

### Componentes

- Formulario guiado por modo.
- Ejemplos precargados.
- Indicador de estado: supported, conditional, unsupported o unknown.
- Resumen ejecutivo.
- Lista de findings.
- Panel de qualifiers.
- Evidencias con enlaces.
- Panel específico de conflictos.
- Metadata de versión/superficie.
- Opción para copiar un reporte redactado.

### Accesibilidad y experiencia

- Navegación por teclado.
- Estados de carga y error claros.
- Colores acompañados de texto/iconos.
- Diseño responsive.
- Sin login para jueces.
- Explicación visible de que Atlas no ejecuta migraciones ni sustituye documentación oficial.

## 16. Control de costes y abuso

Los créditos de xAI son finitos. El despliegue público tendrá:

- Rate limit por IP o sesión.
- Límite de longitud de consulta.
- Número máximo de tool calls.
- Cache de ejemplos oficiales y consultas normalizadas cuando sea seguro.
- Timeout estricto.
- Límite de tokens de salida.
- Sin herramientas web abiertas ni MCPs adicionales en el MVP.
- Métricas agregadas sin contenido sensible.
- Posibilidad de desactivar temporalmente consultas libres conservando demos precomputadas, solo como contingencia; la entrega principal seguirá siendo funcional.

## 17. Evaluación del agente

La evaluación forma parte de la demostración de calidad del agente, no será una suite unitaria general del proyecto.

### Corpus inicial: 12–15 casos

- 4–5 casos de migración.
- 4–5 casos de capacidad y superficie.
- 4–5 casos de claims y evidencia.
- Al menos 2 casos released vs unreleased.
- Al menos 2 conflictos entre fuentes o scopes.
- Al menos 2 preguntas cuya respuesta correcta sea `unknown`/`unproven`.

### Cada caso define

- Pregunta.
- Contexto de versión/superficie.
- Veredicto esperado.
- Fuentes obligatorias.
- Qualifiers obligatorios.
- Afirmaciones prohibidas.
- Razón del caso.

### Métricas

- Exactitud del veredicto.
- Cobertura de fuentes obligatorias.
- Detección correcta de released/unreleased.
- Preservación de qualifiers.
- Tasa de afirmaciones sin respaldo.
- Uso correcto de herramientas.
- Latencia y consumo aproximado por consulta.

### Gate de calidad

No se desplegará como candidato final si:

- Confunde unreleased con published en un caso crítico.
- Omite citas en findings críticos.
- Convierte un non-claim en claim.
- Afirma compatibilidad cuando la evidencia es desconocida.

## 18. Seguridad, privacidad y licencias

### Secretos

- `.env` permanece ignorado y con permisos `0600`.
- Los tokens viven solo en backend y hosting.
- No se usan prefijos públicos para tokens.
- Ningún error devuelve headers de autorización.
- Las sesiones y videos se revisan antes de publicarse.
- `SANITY_CONTEXT_TOKEN` tendrá permiso mínimo `Context Viewer`.

### Datos enviados a terceros

- Las preguntas de usuarios y los fragmentos necesarios del conocimiento pasarán por xAI para ejecutar el agente.
- No se enviará código privado, credenciales ni contenido del `.env`.
- El corpus de Hyphae utilizado será contenido público y atribuido.

### Licencias

Según `LICENSE-POLICY.md` de Hyphae:

- Software y especificaciones normativas: Apache-2.0.
- Documentación narrativa: CC-BY-SA-4.0.
- Marcas y logotipos: fuera de esas licencias.

Cada fuente importada conservará licencia, URL, path y commit. El dataset derivado y la documentación de entrega cumplirán atribución y share-alike cuando aplique. No se utilizará el logotipo sin revisar la política de marcas.

## 19. Fases de implementación y gates

### Fase 0 — Acceso y spike técnico

**Trabajo**

- Confirmar disponibilidad de Context/Knowledge Bases.
- Verificar escritura namespaced en Sanity con un documento temporal.
- Crear una KB mínima de 2–3 fuentes.
- Crear token `Context Viewer` y endpoint MCP.
- Probar `initial_context` y `knowledge_base_read`.
- Probar Grok → Sanity Context MCP.

**Gate G0**

Una pregunta mínima provoca ambas herramientas y devuelve una respuesta con una cita. Si falla MCP remoto directo, activar fallback backend-mediated.

### Fase 1 — Schema y pipeline

**Trabajo**

- Crear skeleton de Next.js y Sanity.
- Implementar los siete schema types.
- Crear manifest inicial.
- Implementar dry run, digest, IDs deterministas y upsert.
- Importar lote mínimo sin modificar documentos existentes.

**Gate G1**

Studio muestra relaciones navegables; repetir el import no crea duplicados; los 12 documentos previos permanecen intactos.

### Fase 2 — Knowledge Base curada

**Trabajo**

- Importar 15–25 fuentes.
- Construir la KB.
- Revisar outline y cobertura.
- Resolver al menos una contradicción.
- Aplicar reglas released/unreleased y claims.

**Gate G2**

La KB separa correctamente contenido publicado, histórico y unreleased y conserva la decisión tras rebuild.

### Fase 3 — Agente y reporte

**Trabajo**

- Implementar los tres modos.
- Definir prompts y contrato de salida.
- Integrar Context MCP y Grok.
- Añadir validación, límites, timeouts y redacción.
- Registrar trazas técnicas sin secretos.

**Gate G3**

Los tres escenarios principales producen veredictos estructurados, fuentes y qualifiers válidos.

### Fase 4 — Interfaz

**Trabajo**

- Construir formularios y ejemplos.
- Renderizar reportes, evidencias y conflictos.
- Añadir estados de error y accesibilidad.
- Añadir rate limit y cache controlado.

**Gate G4**

Una persona nueva completa los tres flujos sin instrucciones externas ni login.

### Fase 5 — Evaluación y correcciones

**Trabajo**

- Crear casos de evaluación.
- Ejecutar baseline.
- Corregir corpus, instrucciones o prompts.
- Guardar resultados comparables para el artículo.

**Gate G5**

Cero fallos críticos released/unreleased, non-claim y compatibilidad falsa; findings críticos con citas.

### Fase 6 — Extensión opcional Hyphae MCP

Solo si G0–G5 están cerrados y hay tiempo:

- Conectar una instancia controlada de Hyphae mediante su MCP read-only.
- Comparar capacidades reportadas por la instancia con la documentación de Sanity.
- Mantener roles claramente separados.

**Criterio de descarte**

Eliminar esta extensión si complica despliegue, explicación o evaluación de Sanity.

### Fase 7 — Entrega

**Trabajo**

- Desplegar aplicación.
- Preparar repositorio público.
- Completar README.
- Grabar video de 2–3 minutos.
- Curar Agent Session sin secretos.
- Redactar artículo en inglés.
- Añadir Project ID/dataset, URL, código y tag.

**Gate G7**

Checklist del Path One completo y demo probada desde una sesión limpia.

## 20. Calendario objetivo

| Fecha | Resultado |
|---|---|
| Sep 18 | Plan, credenciales base y smoke tests |
| Sep 19 | G0: Context/KB/MCP mínimo funcionando |
| Sep 20–21 | G1: schemas e importador idempotente |
| Sep 22 | G2: corpus y Knowledge Base curada |
| Sep 23–24 | G3: agente y salida estructurada |
| Sep 25–26 | G4: interfaz funcional |
| Sep 27–28 | G5: evaluación y correcciones |
| Sep 29 | Extensión opcional o buffer técnico |
| Sep 30 | Despliegue candidato |
| Oct 1 | Freeze funcional y artículo inicial |
| Oct 2 | Video y sesión curada |
| Oct 3 | Revisión final y envío preferido |
| Oct 4 | Buffer; deadline 11:59 p. m. PDT |

## 21. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Context/KB no disponible | Bloqueante | Resolver en G0 antes de implementar la app |
| MCP remoto xAI incompatible | Alto | Fallback backend-mediated |
| Token Sanity sin escritura | Alto | Smoke write namespaced y ajuste de permisos |
| Corpus demasiado amplio | Alto | Limitar a 15–25 fuentes y tres modos |
| Sanity parece decorativo | Bloqueante para judging | Hacer autoridad, conflictos y relaciones visibles |
| Confusión released/unreleased | Alto | Campo de estado, instrucciones y casos gold |
| Claims sin qualifiers | Alto | Modelo estructurado y gate de evaluación |
| Créditos xAI agotados | Alto | Rate limit, cache, límites y monitoreo |
| Citas poco navegables | Medio | `sourceUrl`, path, ref y commit en cada fuente |
| Licencias mal atribuidas | Alto | Metadata obligatoria y página de atribución |
| Exposición de secretos | Crítico | Server-only, redacción y revisión de sesiones |
| Tiempo insuficiente | Alto | Extensiones opcionales solo después de G0–G5 |

## 22. Definition of Done del MVP

### Producto

- Los tres modos funcionan desde una URL pública.
- No requiere login para los jueces.
- Las respuestas tienen veredicto, findings, qualifiers, fuentes y límites.
- Los errores no exponen secretos ni detalles internos sensibles.

### Sanity

- Schema desplegado y dataset estructurado.
- Importador reproducible e idempotente.
- 15–25 fuentes curadas con procedencia y licencia.
- Knowledge Base construida y revisada.
- Al menos una contradicción real resuelta.
- Endpoint MCP en Knowledge Base mode.
- Uso verificable de `initial_context` y `knowledge_base_read`.

### Calidad del agente

- Cero fallos críticos en released/unreleased y claims prohibidos dentro del corpus gold.
- Findings críticos con fuente.
- Preguntas sin evidencia terminan en `unknown`/`unproven`.
- Límites de coste y llamadas aplicados.

### Entrega

- Repositorio público del trabajo nuevo.
- README reproducible.
- Demo pública.
- Video corto.
- Artículo en inglés usando la plantilla.
- Project ID o dataset público.
- `#sanitychallenge`.
- Atribución de Hyphae y separación de trabajo preexistente/nuevo.
- Agent Session opcional revisada y pública si se incluye.

## 23. Contenido de la publicación

### What I Built

- Problema, usuarios, tres modos y diferenciación.
- Declaración de trabajo previo y nuevo.

### Demo

- URL pública.
- Video con migración, claim rechazado y released/unreleased.

### Code

- Repositorio, arquitectura, setup y evaluación.

### How I Used Sanity

- Corpus y purpose.
- Schemas y relaciones.
- Build de KB.
- Conflictos e instrucciones.
- Uso de `initial_context` y `knowledge_base_read`.
- Ejemplo antes/después de estructurar contenido.

### Sanity Project Details

- Project ID.
- Dataset.
- Purpose de KB.
- Enlace público si está disponible.

### Agent Session

- Sesión curada del schema, importador, integración y corrección de un fallo.

## 24. Decisiones pendientes

Estas decisiones se resolverán en G0/G1, no bloquean el plan:

1. Disponibilidad efectiva de Knowledge Bases para la organización.
2. Nombre final: `Hyphae Atlas` frente a `Hyphae Release Guardian`.
3. MCP remoto directo de xAI frente a wrapper backend.
4. npm frente a pnpm según herramientas instaladas.
5. Dataset completamente público o Project ID con acceso de judges.
6. Inclusión de Hyphae Native MCP como extensión.
7. Selección final de 15–25 fuentes y refs exactos.
8. Política final de rate limit según hosting.

## 25. Primera secuencia después de aprobar el plan

1. Verificar el estado exacto del proyecto Sanity y sus 12 documentos sin leer contenido innecesario.
2. Comprobar escritura con un documento namespaced temporal y retirarlo.
3. Activar Context/Knowledge Bases en Dashboard.
4. Crear KB mínima con `claims.md`, `native-capabilities.md` y `native-gate-status.md`.
5. Crear endpoint MCP `hyphae-atlas` y token `Context Viewer`.
6. Completar las dos variables pendientes del `.env`.
7. Ejecutar smoke de `initial_context` y `knowledge_base_read`.
8. Probar una consulta Grok → Sanity Context.
9. Solo después, crear el skeleton de la aplicación.

---

Este documento es la autoridad de alcance para el MVP. Cualquier funcionalidad nueva debe justificar qué criterio del challenge mejora y no puede desplazar los gates obligatorios G0–G5.

## 26. Estado de ejecución al 19 de septiembre de 2026

### Completado

- G0: credenciales Sanity/xAI, Studio desplegado, Knowledge Base construida y Context MCP live.
- G1: skeleton, dependencias exactas, siete schemas e importador idempotente.
- G2: 20 fuentes y 13 documentos estructurados importados; 21 entradas de Knowledge Base construidas.
- G3: loop MCP propio, providers intercambiables, contrato, grounding auditado, guardrails y fallback preview.
- G4: interfaz responsive de tres modos.
- G5: corpus gold estricto de 12 casos; 12/12 en una sola corrida con cobertura completa y cero afirmaciones prohibidas positivas.
- G7 documental: README, atribución, arquitectura, guía Context, ledger y submission draft.
- Validación local: lint, typecheck, schema, corpus, build y audit de producción pasan.
- Context smoke live: 21 entries, `initial_context`, `knowledge_base_read`, veredicto esperado y grounding upstream auditado.
- Conflicto temporal real identificado y resuelto en política: baseline histórico de rendimiento frente al cierre vigente de G7.

### Pendiente por publicación externa

- Repositorio público creado y `main` publicado en https://github.com/terrizoaguimor/hyphae-atlas.
- Desplegar la aplicación con una cuenta/CLI de hosting autenticada.
- Capturar screenshots del outline/conflicto.
- Grabar video, publicar Agent Session y sustituir placeholders del submission.

La Knowledge Base fue administrada con el CLI oficial `sanity context` 6.15.0. El MCP utiliza el override oficial `mode=knowledge_base` y `knowledgeBases=...` para servir exclusivamente herramientas de Knowledge Base.

## 27. Competitive proof and UX layer

Implemented after reviewing current Path One submissions:

- deterministic citation-to-upstream Evidence Resolver;
- allowlisted SHA-256 source verification endpoint;
- visible operational Agent Trace without private reasoning;
- six real EN/ES instant replays plus live execution;
- interactive G7 temporal-authority timeline;
- public 12-case Evaluation Lab with explicit timeout disclosure;
- Three.js/GSAP explanatory motion with WebGL and reduced-motion fallbacks;
- headless desktop/mobile visual review.
