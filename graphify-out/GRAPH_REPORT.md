# Graph Report - IVI  (2026-10-05)

## Corpus Check
- 352 files · ~424,386 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 3049 nodes · 8986 edges · 194 communities (147 shown, 47 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 201 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e08deaf7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- dates.ts
- recurrentes.tsx
- creditCard.ts
- build-golden.cjs
- repositories.ts
- tools.ts
- (tabs)/index.tsx
- planner.ts
- SyncEngine.ts
- extended.ts
- app.js
- dependencies
- push-notify/index.ts
- ref_assert
- expo
- actionCatalog.ts
- useAppStore.ts
- package.json
- finance.ts
- aiAgentHandler.ts
- ayuda.cjs
- onboarding.tsx
- useTheme
- materialize.ts
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- modelActions.ts
- privacidad.tsx
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- p3Intents.ts
- themeRegistry.ts
- Selector Interactivo de Técnicas de Diagnóstico Organizacional
- market-data/index.ts
- forecast.ts
- CLAUDE.md
- Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)
- manifest.json
- 0005_audit_log.sql
- Bitácora de cambios
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- Arquitectura
- recurrence.ts
- agente-app.cjs
- bench.cjs
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- agentLoop.ts
- public.survey_responses
- 0015_ui_themes.sql
- ai-settings.tsx
- budget_assignments_range_idx
- sw.js
- delete-account/index.ts
- vercel.json
- public.budget_templates
- Catálogo de categorías
- ref_path
- public.survey_responses
- public.budgets
- public.accounts
- public.budgets
- public.budgets
- public.accounts
- public.budgets
- public.profiles
- public.profiles
- public.profiles
- selectors.ts
- build.py
- sync-mapeo.cjs
- Fase 2 P0-S2 — Contratos versionados del motor local
- ejecutor.cjs
- BudgetTemplateList.tsx
- useAppStore
- concepts.ts
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- providers/types.ts
- Motor de clasificación (registro por voz/texto)
- p3-chat.cjs
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- appearance.tsx
- webSpeech.ts
- Account
- packs.cjs
- 0020_push_notifications.sql
- audit-budget.cjs
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments
- Golden set del motor local — resultados (P1, P1b y P2)
- 3. Deuda Técnica y Parches
- fuzz.cjs
- movimientos.tsx
- size-report.cjs
- date.ts
- run-golden.cjs
- actionCatalogP3.ts
- p3-store.cjs
- react
- ChatPlanCard.tsx
- previsto.cjs
- chatIntentParser.ts
- 0023_p3_forecast_recurring_reminders.sql
- ia.tsx
- scripts
- run-planes.cjs
- usePressToTalk.ts
- deudas.cjs
- aiProviders.ts
- catalogLoader.ts
- avisos.tsx
- golden/README.md
- hybridInterpreter.ts
- presupuesto.tsx
- smoke-agente.cjs
- P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos
- recurrencia.cjs
- 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)
- app/_layout.tsx
- tarjeta-store.cjs
- P2 — Planificador multi-acción, fechas y catálogo en segundo plano
- surveyRepository.ts
- virtualIds.ts
- 0022_category_mappings.sql
- ThemeProvider.tsx
- stub-native.cjs
- recurrenceText.ts
- classifyNormalized
- accounts.ts
- budgetPeriods.ts
- fechas.cjs
- fechas-sellado.cjs
- relayMarketDataProvider.ts
- @react-native-async-storage/async-storage
- stub-async-storage.cjs
- sync/types.ts
- react-native
- catalogo.cjs
- public.liabilities
- public.liabilities
- P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)
- registry.ts
- ts-hook.cjs
- findDateMentions
- AiOrb.tsx
- tarjeta.cjs
- ai-agente.cjs
- ChatSidebar.tsx
- P4 · Ayuda contextual y auditoría de privacidad (2026-10-05)
- Tarjeta de crédito — que no se te pase ni el corte ni el pago
- staticExchangeRateProvider.ts
- audit-catalog.cjs
- callOnce
- compilerOptions
- handwritten.cjs
- public.accounts
- why.cjs
- BudgetActionPanel.tsx
- Agente de IA de VALU — el "cerebro" de la app (2026-10-05)
- memory.ts
- dataOwner.ts
- 1. Estado Actual y Componentes Activos (The Core)
- run-fechas.cjs
- isoOf
- 0025_ai_usage_and_budget_dates.sql
- deno-shim.d.ts
- complementos.ts
- hogar.ts
- impuestos.ts
- ocio.ts
- public.budgets

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 197 edges
2. `useAppStore` - 140 edges
3. `react` - 108 edges
4. `react-native` - 107 edges
5. `formatCurrency()` - 84 edges
6. `GlassCard()` - 82 edges
7. `@expo/vector-icons` - 70 edges
8. `Currency` - 64 edges
9. `Dashboard()` - 48 edges
10. `normalize()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `Estado de implementación (P3, 2026-10-04)` --references--> `resolveCandidate()`  [INFERRED]
  docs/03_fase2_contratos_v1.md → src/ai/actionCatalog.ts
- `Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?")` --references--> `AIActionType`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/ai/chatTypes.ts
- `Resultado agregado` --references--> `AIActionType`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/ai/chatTypes.ts
- `0. El principio de arquitectura ya está vigente — con una precisión` --references--> `ResolvedAction`  [INFERRED]
  docs/03_fase2_contratos_v1.md → src/ai/chatTypes.ts
- `Aclaraciones (§2)` --references--> `MissingField`  [INFERRED]
  docs/memoria-proyecto/09-p2-planificador-fechas-y-catalogo-en-segundo-plano.md → src/ai/chatTypes.ts

## Import Cycles
- None detected.

## Communities (194 total, 47 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.05
Nodes (41): ACCOUNT_DECREMENT_WORDS, ACCOUNT_INCREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, ARTICLE_AMBIGUOUS, __auditNumberVariants(), buildKeywordIndexSteps() (+33 more)

### Community 1 - "dates.ts"
Cohesion: 0.10
Nodes (19): DateMention, DatePrefer, DateRelation, DAY_WORDS, DAYWORD_RE, extractTime(), MONTH_ABBR, MONTH_RE (+11 more)

### Community 2 - "recurrentes.tsx"
Cohesion: 0.17
Nodes (18): Kind, KINDS, Recurrentes(), STATUS_LABEL, normalize(), SearchEntry, styles, TYPES (+10 more)

### Community 3 - "creditCard.ts"
Cohesion: 0.24
Nodes (17): anchorFor(), cardCycle, cardDue, CardPayStatus, cardReminderSpecs(), CardSettings, cardStatement, daysBetween() (+9 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.06
Nodes (31): addFresh(), AMBIG, amountText(), by, C, cases, catOf(), F (+23 more)

### Community 5 - "repositories.ts"
Cohesion: 0.06
Nodes (49): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+41 more)

### Community 6 - "tools.ts"
Cohesion: 0.13
Nodes (35): ACTION_GUIDE, ACTION_ITEM_SCHEMA, addDays(), base(), buscarMovimientos(), CARD_STATUS_ES, categoryName(), dateArg() (+27 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.07
Nodes (56): Dashboard(), GROUP_LABELS, Scope, styles, Draft, LIABILITY_TYPES, LiabilityForm(), Patrimonio() (+48 more)

### Community 8 - "planner.ts"
Cohesion: 0.12
Nodes (26): assert, base, ctx, oneAccount, { planFromText, answerClarification, previewPlan, splitPlanSegments }, { resolveAddTransaction }, src_ai_actioncatalog_actionvalidationcontext, src_ai_actioncatalog_resolveresult (+18 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.19
Nodes (20): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, useProfileReconciliation(), buildProfileRow(), fetchRemoteProfile(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable (+12 more)

### Community 10 - "extended.ts"
Cohesion: 0.14
Nodes (10): PACK_BANCOS, PACK_COMIDA, PACK_COMPRAS, PACK_DINERO, PACK_FAMILIA, PACK_PAREJA, PACK_PROTEGIDAS, PACK_SALUD (+2 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.07
Nodes (50): RFC-8291, RFC-8292, claimAttempt(), claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver() (+42 more)

### Community 14 - "ref_assert"
Cohesion: 0.14
Nodes (7): ref_assert, assert, I, NOW, assert, C, T0

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.07
Nodes (35): 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS (+27 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.06
Nodes (59): AddAccountArgs, AddForecastArgs, AddGoalArgs, AddLiabilityArgs, AddRecurringArgs, AddRecurringContributionArgs, AddReminderArgs, AddTransactionArgs (+51 more)

### Community 18 - "package.json"
Cohesion: 0.07
Nodes (26): config, { getDefaultConfig }, devDependencies, @types/react, typescript, main, name, private (+18 more)

### Community 19 - "finance.ts"
Cohesion: 0.11
Nodes (27): findSubcategoryAnyCategory(), comparePeriodKeys(), DateRange, buildLinesFromTemplateLines(), CategorySpendSlice, computeBudgetStatus(), FinancialHealth, HealthFactor (+19 more)

### Community 20 - "aiAgentHandler.ts"
Cohesion: 0.09
Nodes (31): req(), addUsage(), AgentEnv, byokBurstExceeded(), byokBursts, byokConfig(), CORS_HEADERS, dayKey() (+23 more)

### Community 21 - "ayuda.cjs"
Cohesion: 0.13
Nodes (16): acc(), assert, ctx(), { DATA_FLOWS, ALL_HOSTS }, extra, fs, { HELP_TOPICS, searchHelp, getHelpTopic }, meta() (+8 more)

### Community 22 - "onboarding.tsx"
Cohesion: 0.07
Nodes (63): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, AGE_OPTIONS (+55 more)

### Community 23 - "useTheme"
Cohesion: 0.09
Nodes (44): Ayuda(), Instalar(), Step(), InstitutionScreen(), styles, CURRENCIES, Settings(), styles (+36 more)

### Community 24 - "materialize.ts"
Cohesion: 0.11
Nodes (29): cyrb128(), deterministicId(), noonIso(), buildForecast(), buildOccurrence(), dateOfIso(), DEFAULT_CATEGORY, eventDatesFor() (+21 more)

### Community 25 - "data/types.ts"
Cohesion: 0.11
Nodes (42): Section, 1.3 Esquema de datos — jerarquía y clasificación exacta, Presupuestos (16 operaciones), 3. Avisos (recordatorios), ForecastGroup, AgentMemoryItem, AgentData, ActionValidationContext (+34 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Agente de IA (el "cerebro" de VALU), Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura) (+4 more)

### Community 28 - "modelActions.ts"
Cohesion: 0.14
Nodes (53): Razones históricas de por qué se pausó originalmente (2026-09-02), Mapa de piezas, resolveAccountType(), resolveAddAccount(), resolveAddGoal(), resolveAddLiability(), resolveAddTransaction(), resolveCandidate() (+45 more)

### Community 29 - "privacidad.tsx"
Cohesion: 0.10
Nodes (35): Auth(), Mode, styles, ForgotPassword(), styles, Index(), AGE_OPTIONS, Perfil() (+27 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.06
Nodes (99): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), Inversiones(), styles (+91 more)

### Community 32 - "p3Intents.ts"
Cohesion: 0.15
Nodes (30): liveReminders(), namedInvestments(), namedOpenLiabilities(), namedReminders(), namedRules(), resolveCancelReminder(), resolveEndRecurring(), resolvePauseRecurring() (+22 more)

### Community 33 - "themeRegistry.ts"
Cohesion: 0.12
Nodes (27): fetchRemoteVisualStyles(), useRemoteVisualStyles(), darkColors, lightColors, palette, ThemeColors, BASE_VARIANT, isExpired() (+19 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "forecast.ts"
Cohesion: 0.22
Nodes (16): Estado de implementación (P2, 2026-10-04), previewPlan(), dayOf(), firstShortfall(), forecastTotals, isForecast(), projectBalances(), ProjectedBalance (+8 more)

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.17
Nodes (11): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+3 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.05
Nodes (38): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 (tarde) — Notificaciones push reales + Inversiones por institución, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03/04 — P2: planificador multi-acción, fechas, catálogo en segundo plano y lo aprendido en la nube, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, 2026-10-04 — P3: previsto vs. real, pagos recurrentes, avisos, deudas y dividendos (+30 more)

### Community 42 - "0002_budgets_goals.sql"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "0003_investments_liabilities.sql"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 45 - "Arquitectura"
Cohesion: 0.20
Nodes (10): Agente de IA (desde 2026-10-05; reemplaza al BYOK), Arquitectura, Autenticación, Cada registro es trazable y nunca se pierde, Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto), Estructura de carpetas (resumen), Principio: offline-first, PWA (instalar en pantalla de inicio) (+2 more)

### Community 46 - "recurrence.ts"
Cohesion: 0.14
Nodes (27): LiabilityDirection, parseDay(), applyPayment(), installmentProgress, isOpenLiability(), PAYMENT_SUBCATEGORY, PaymentEffect, round2() (+19 more)

### Community 47 - "agente-app.cjs"
Cohesion: 0.09
Nodes (24): acc(), { AgentError }, assert, { buildValidationContext }, { createAgentActionProvider, snapshotForAgent, forgetAgentFailure }, ctxFromStore(), { historyFromMessages }, { hybridInterpreterProvider } (+16 more)

### Community 48 - "bench.cjs"
Cohesion: 0.10
Nodes (18): home_user_ivi_scripts_golden_golden_set_cases, { cases }, { DEFAULT_CATEGORIES: D }, P, t0, t1, texts, scripts_golden_golden_set (+10 more)

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "agentLoop.ts"
Cohesion: 0.10
Nodes (28): AgentTurnInput, AgentTurnResult, buildSystemPrompt(), describeAction(), MAX_AGENT_STEPS, names(), normalizeHistory(), resolveProposal() (+20 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "ai-settings.tsx"
Cohesion: 0.12
Nodes (28): AiSettings(), Check, explain(), PROVIDERS, styles, AgentError, AgentStatus, aiEnabled() (+20 more)

### Community 61 - "Catálogo de categorías"
Cohesion: 0.22
Nodes (9): Ahorro — ahorro e inversión, Ampliación P1b (2026-10-03): áreas de finanzas personales que faltaban, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir (+1 more)

### Community 62 - "ref_path"
Cohesion: 0.10
Nodes (18): ref_module, ref_path, acc(), bad, C, ctx, meta(), Module (+10 more)

### Community 83 - "selectors.ts"
Cohesion: 0.25
Nodes (21): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, SILENT, snapshotForAgent(), hideNamesFromAi(), isActive(), isPostedTransaction() (+13 more)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "sync-mapeo.cjs"
Cohesion: 0.13
Nodes (13): assert, { categoryMappingToRow, categoryMappingFromRow }, Module, path, plainRepo(), queued(), repositoryByTable, { runSync } (+5 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.14
Nodes (16): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 5. Contrato de confirmación y ejecución idempotente, 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0 (+8 more)

### Community 87 - "ejecutor.cjs"
Cohesion: 0.15
Nodes (12): assert, { executePlan, recoverInterruptedPlan }, Module, path, { planFromText, previewPlan }, { useAppStore }, PlanStatus, ApplyStepResult (+4 more)

### Community 88 - "BudgetTemplateList.tsx"
Cohesion: 0.19
Nodes (14): Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON (+6 more)

### Community 89 - "useAppStore"
Cohesion: 0.16
Nodes (21): Tarjetas(), RFC-5545, extractLearnableKeywords(), CardPanel(), TIMES, useAppStore, CardAlertPrefs, cardHeadline() (+13 more)

### Community 90 - "concepts.ts"
Cohesion: 0.19
Nodes (11): Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03), Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo), Cómo se evita el relleno (la parte que más importa), Dónde vive cada cosa, Golden set y resultados, Tamaño real (medido, no estimado), Conjuntos nuevos, detectConcepts() (+3 more)

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "providers/types.ts"
Cohesion: 0.22
Nodes (12): 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), PendingClarification, ProviderRegistry, ActionAgentProvider, AIInterpreterProvider, CopilotProvider (+4 more)

### Community 94 - "Motor de clasificación (registro por voz/texto)"
Cohesion: 0.16
Nodes (15): Movimientos (11 operaciones), Ajuste de saldo y separación de varios movimientos, Coincidencia por límite de palabra (bug corregido 2026-09-02), Desambiguación de "gas", Extracción del monto (`extractAmount`), Fechas, planes y catálogo en segundo plano (P2, 2026-10-03/04), Memoria de correcciones (mapeo personal), Montos: decimales, miles y abreviaturas (2026-10-03) (+7 more)

### Community 95 - "p3-chat.cjs"
Cohesion: 0.14
Nodes (23): acc(), assert, bal(), ctx(), expectAction(), expectClar(), expectNot(), meta() (+15 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.13
Nodes (23): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, HelpButton(), HelpTopicBody(), styles (+15 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "appearance.tsx"
Cohesion: 0.12
Nodes (24): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, resolveBackgroundPhoto() (+16 more)

### Community 99 - "webSpeech.ts"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 100 - "Account"
Cohesion: 0.14
Nodes (16): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Agente de IA — activarlo (2026-10-05), Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (actualizada 2026-10-05), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución (+8 more)

### Community 101 - "packs.cjs"
Cohesion: 0.12
Nodes (14): AMBIG_NORM, AMBIGUOUS_BARE, { DEFAULT_CATEGORIES: D }, DIR, dry, fs, includeBase, NEVER_PRUNE (+6 more)

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth, auth.users

### Community 103 - "audit-budget.cjs"
Cohesion: 0.29
Nodes (6): B, covered, { DEFAULT_CATEGORIES: D }, dup, ids, subs

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-agent` (el agente de IA de la app), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "Golden set del motor local — resultados (P1, P1b y P2)"
Cohesion: 0.17
Nodes (12): Cifras que se pueden creer (primera y única corrida), Conjuntos nuevos, Contaminación (para no engañarse), Cómo seguir, Golden set del motor local — resultados (P1, P1b y P2), Límites conocidos (no se arreglan a propósito), P2 — fechas y planificador (2026-10-03/04), Qué aprendimos (patrones de falla en frases nuevas) (+4 more)

### Community 110 - "3. Deuda Técnica y Parches"
Cohesion: 0.12
Nodes (15): 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real, 3. Deuda Técnica y Parches, 4.1 Cómo se conectan las piezas, de punta a punta, 4.2 Las dos superficies de lenguaje natural, en paralelo, 4.3 Seguridad del sistema de escritura por IA (resumen operativo) (+7 more)

### Community 111 - "fuzz.cjs"
Cohesion: 0.11
Nodes (18): argv, assert, base, ctx, D, { detectChatIntent }, { findRecurrence }, hostile (+10 more)

### Community 112 - "movimientos.tsx"
Cohesion: 0.10
Nodes (33): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, groupByDay(), Movimientos(), styles (+25 more)

### Community 113 - "size-report.cjs"
Cohesion: 0.12
Nodes (14): ref_child_process, ref_os, ref_zlib, BUDGETS, dirArg, { execSync }, fs, initial (+6 more)

### Community 114 - "date.ts"
Cohesion: 0.19
Nodes (19): shiftMonths(), BudgetCalendar(), styles, Bucket, BUCKET_LABELS, BUCKET_ORDER, MonthBudgetBreakdown(), styles (+11 more)

### Community 115 - "run-golden.cjs"
Cohesion: 0.11
Nodes (18): allRows, args, { cases }, cl, eq(), evaluate(), GOLDEN_NOW, knownRows (+10 more)

### Community 116 - "actionCatalogP3.ts"
Cohesion: 0.10
Nodes (36): activeAccounts(), AddForecastCandidate, AddRecurringCandidate, AddRecurringContributionCandidate, AddReminderCandidate, askForecast(), askOpenLiability(), askRule() (+28 more)

### Community 117 - "p3-store.cjs"
Cohesion: 0.15
Nodes (17): acc(), assert, bal(), fcs(), live(), Module, occsOf(), pad() (+9 more)

### Community 118 - "react"
Cohesion: 0.14
Nodes (21): react, react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), BudgetProgressItem (+13 more)

### Community 119 - "ChatPlanCard.tsx"
Cohesion: 0.16
Nodes (18): 2.1 Rediseños completos por rechazo explícito del usuario, 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), expo-haptics, ChatActionCard(), styles, styles (+10 more)

### Community 120 - "previsto.cjs"
Cohesion: 0.12
Nodes (13): { accountDeltasForTransaction }, accounts, assert, { deterministicId }, F, L, M, meta() (+5 more)

### Community 121 - "chatIntentParser.ts"
Cohesion: 0.11
Nodes (16): base, ctx, { detectChatIntent }, NOW, out, PHRASES, ADD_VERBS, captureNameAfter() (+8 more)

### Community 122 - "0023_p3_forecast_recurring_reminders.sql"
Cohesion: 0.17
Nodes (18): public.transactions, public.recurring_rules, public.reminder_occurrences, public.reminders, recurring_rules_set_timestamps, recurring_rules_user_updated_idx, reminder_occurrences_due_idx, reminder_occurrences_reminder_idx (+10 more)

### Community 123 - "ia.tsx"
Cohesion: 0.16
Nodes (20): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+12 more)

### Community 124 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, android, build:web, ios, size, start, test, typecheck (+1 more)

### Community 125 - "run-planes.cjs"
Cohesion: 0.14
Nodes (10): NONE, argsOk(), base, byKind, CASES, check(), ctx, fails (+2 more)

### Community 126 - "usePressToTalk.ts"
Cohesion: 0.40
Nodes (4): PressToTalkStatus, usePressToTalk(), UsePressToTalkResult, providers

### Community 127 - "deudas.cjs"
Cohesion: 0.18
Nodes (11): acc(), assert, { computeNetWorth, upcomingLiabilityReminders }, D, lb(), meta, Module, path (+3 more)

### Community 128 - "aiProviders.ts"
Cohesion: 0.13
Nodes (19): AnthropicMessage, buildGeminiBody(), ChatResult, chatWithFallback(), GEMINI_SKIP_SIGNATURE, geminiSchema(), geminiStruct(), isGeminiContent() (+11 more)

### Community 129 - "catalogLoader.ts"
Cohesion: 0.15
Nodes (19): 2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil, 1. El «túnel» del catálogo: qué es y qué no es, Cómo se comporta, De dónde sale el resto del peso (atribución por mapa de fuentes, antes de quitar reanimated), Peso medido (descarga comprimida al abrir la app, versión web; KB = 1,024 bytes), Qué NO se hizo, y por qué, warmUpLocalParser(), CatalogStatus (+11 more)

### Community 130 - "avisos.tsx"
Cohesion: 0.24
Nodes (22): Avisos(), DateField(), AttentionWidget(), SmallButton(), ForecastCard(), ForecastView(), OccurrenceCard(), whenLabel() (+14 more)

### Community 133 - "hybridInterpreter.ts"
Cohesion: 0.18
Nodes (8): ParsedCapture, TransactionType, agentLLMClient, getAiInterpreter(), hybridInterpreterProvider, CATEGORY_CATALOG, createLLMAIInterpreterProvider(), LLMClient

### Community 134 - "presupuesto.tsx"
Cohesion: 0.27
Nodes (17): monthEndIso(), monthStartIso(), Presupuesto(), styles, verPresupuesto(), BudgetTemplateLegend(), bucketOf(), bucketOf() (+9 more)

### Community 135 - "smoke-agente.cjs"
Cohesion: 0.09
Nodes (21): ref_fs, ref_http, aiRequests, fs, http, meta, now, path (+13 more)

### Community 136 - "P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos"
Cohesion: 0.22
Nodes (9): 1. Previsto vs. real, 2. Pagos recurrentes, 4. Deudas ampliadas y dividendos, 5. Chat: 15 acciones nuevas, Cómo se midió (y qué NO prueba), En una frase, Lo que NO está hecho (y por qué), P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos (+1 more)

### Community 137 - "recurrencia.cjs"
Cohesion: 0.25
Nodes (5): assert, P, R, ri(), rnd()

### Community 138 - "2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)"
Cohesion: 0.20
Nodes (10): 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`), Acciones del chat (17 tipos, catálogo cerrado), Aclaraciones (§2), Con una IA conectada (BYOK), Ejecutor (§5), Límites conocidos, Qué hace (ejemplos reales de las pruebas), Reconocimiento local: errores de siempre que se corrigieron (+2 more)

### Community 139 - "app/_layout.tsx"
Cohesion: 0.19
Nodes (13): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, expo-splash-screen, expo-status-bar, react-native-gesture-handler, AppBackground(), GradientLayer() (+5 more)

### Community 140 - "tarjeta-store.cjs"
Cohesion: 0.13
Nodes (26): acc(), { answerQuestion }, assert, { cardReminderId, cardDue }, CUT, DUE, inDays(), live() (+18 more)

### Community 141 - "P2 — Planificador multi-acción, fechas y catálogo en segundo plano"
Cohesion: 0.29
Nodes (7): 3. Fechas, horas y periodos en español (`src/ai/dates.ts`), 4. Lo aprendido, sincronizado con la cuenta, 5. Pruebas, puertas de calidad y cifras honestas, 6. Decisiones abiertas (tuyas), 7. Prerrequisitos de P3 (previsto, recurrencia, avisos, deudas e inversiones) — estado, En una frase, P2 — Planificador multi-acción, fechas y catálogo en segundo plano

### Community 142 - "surveyRepository.ts"
Cohesion: 0.38
Nodes (5): expo-crypto, submitSurveyResponse(), SurveyAnswers, withNewMeta(), generateId()

### Community 143 - "virtualIds.ts"
Cohesion: 0.27
Nodes (9): base(), isVirtualId(), norm(), simulateStep(), substituteVirtualIds(), VIRTUAL_PREFIX, virtualIdFor(), VirtualKind (+1 more)

### Community 144 - "0022_category_mappings.sql"
Cohesion: 0.40
Nodes (5): category_mappings_set_timestamps, category_mappings_user_updated_idx, public.category_mappings, auth.users, public.set_sync_timestamps

### Community 145 - "ThemeProvider.tsx"
Cohesion: 0.09
Nodes (24): @expo/vector-icons, CalendarPickerProps, styles, CategoryIconProps, styles, DateFieldProps, CUSTOM_OPTIONS, PropagateChoice (+16 more)

### Community 146 - "stub-native.cjs"
Cohesion: 0.40
Nodes (4): ref_crypto, crypto, handler, proxy

### Community 147 - "recurrenceText.ts"
Cohesion: 0.23
Nodes (14): findRecurrence(), foldKeep(), Hit, matchCore(), matchDayOfMonth(), NUM_WORDS, numOf(), RecurrenceMention (+6 more)

### Community 148 - "classifyNormalized"
Cohesion: 0.27
Nodes (11): Corrección difusa (typos de dictado/tecleo), __auditBestExact(), __auditKeywordIndex(), bestExactMatch(), categoryAllowed(), classifyNormalized(), fixParentsWord(), fuzzyMatchCategory() (+3 more)

### Community 149 - "accounts.ts"
Cohesion: 0.27
Nodes (13): resolveBudgetConcept(), findInvestment(), findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts() (+5 more)

### Community 150 - "budgetPeriods.ts"
Cohesion: 0.15
Nodes (19): FREQUENCY_LABELS, PERIODICITY_LABELS, isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, MONTH_SHORT, pad() (+11 more)

### Community 151 - "fechas.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 152 - "fechas-sellado.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 153 - "relayMarketDataProvider.ts"
Cohesion: 0.21
Nodes (8): unavailableMarketDataProvider, registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), CetesRates, supabaseAnonPublicKey

### Community 154 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 158 - "react-native"
Cohesion: 0.11
Nodes (34): TabsLayout(), react-native, AccountCard(), AccountCardVisual(), styles, StackedCard(), styles, AccountDropdown() (+26 more)

### Community 159 - "catalogo.cjs"
Cohesion: 0.20
Nodes (8): Mapa de piezas, assert, cat, count(), ext, loader, parser, sub()

### Community 162 - "P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)"
Cohesion: 0.20
Nodes (10): Cifras que se pueden creer (primera y única corrida de cada sellado), Contaminación (para no engañarse), Experimentos descartados (no se adoptaron), P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03), Próximo paso de medición, Qué fallaba en Fresco 5 (clases, no frases sueltas), Rendimiento y robustez, extractCategory() (+2 more)

### Community 163 - "registry.ts"
Cohesion: 0.20
Nodes (11): forgetAgentStatus(), answerQuestion(), agentActionProvider, forgetAgentFailure(), registerConfiguredLLMProvider(), localActionAgentProvider, localAIInterpreterProvider, localCopilotProvider (+3 more)

### Community 164 - "ts-hook.cjs"
Cohesion: 0.22
Nodes (8): typescript, fs, Module, path, ROOT, ts, CATALOG_VERSION, EXTENDED_PACKS

### Community 165 - "findDateMentions"
Cohesion: 0.26
Nodes (14): addDays(), extractPeriod(), findDateMentions(), add(), fold(), fullYear(), num(), pickDayMonth() (+6 more)

### Community 166 - "AiOrb.tsx"
Cohesion: 0.33
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 167 - "tarjeta.cjs"
Cohesion: 0.28
Nodes (6): assert, base(), C, meta, pay(), tx()

### Community 168 - "ai-agente.cjs"
Cohesion: 0.19
Nodes (9): assert, chatBody, fakeWorld(), geminiOk(), H, P, queue, res() (+1 more)

### Community 169 - "ChatSidebar.tsx"
Cohesion: 0.43
Nodes (6): ChatSidebar(), dateGroup(), GROUP_ORDER, MobileDrawer(), normalize(), styles

### Community 170 - "P4 · Ayuda contextual y auditoría de privacidad (2026-10-05)"
Cohesion: 0.40
Nodes (5): 1. Ayuda contextual, 2. Auditoría de privacidad: qué salió y qué se corrigió, 3. Diseño para compartir correcciones (opt-in, no implementado), Hallazgos y qué se hizo, P4 · Ayuda contextual y auditoría de privacidad (2026-10-05)

### Community 171 - "Tarjeta de crédito — que no se te pase ni el corte ni el pago"
Cohesion: 0.29
Nodes (7): Cómo funciona (reglas), Decisiones que tomé por defecto (cámbialas si no te gustan), Dónde está, En una frase, Lo que falta, Lo que garantiza que no se te pase, Tarjeta de crédito — que no se te pase ni el corte ni el pago

### Community 172 - "staticExchangeRateProvider.ts"
Cohesion: 0.38
Nodes (5): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo

### Community 173 - "audit-catalog.cjs"
Cohesion: 0.33
Nodes (5): COMMON, { DEFAULT_CATEGORIES }, map, NON_EXPENSE, { normalize }

### Community 174 - "callOnce"
Cohesion: 0.31
Nodes (12): anthropicError(), buildAnthropicBody(), buildOpenAIBody(), callOnce(), clampText(), geminiError(), openAIError(), parseGeminiResponse() (+4 more)

### Community 175 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution, noEmit, skipLibCheck (+4 more)

### Community 176 - "handwritten.cjs"
Cohesion: 0.22
Nodes (8): AJUSTES, GAS, MONTOS, MULTI_NUMERO, SEGMENTOS, SIN_CATEGORIA, TIPOS, TYPOS

### Community 179 - "why.cjs"
Cohesion: 0.50
Nodes (3): { DEFAULT_CATEGORIES }, { normalize, parseCaptureText }, text

### Community 180 - "BudgetActionPanel.tsx"
Cohesion: 0.43
Nodes (6): BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, templateIcon(), rangeLabel()

### Community 181 - "Agente de IA de VALU — el "cerebro" de la app (2026-10-05)"
Cohesion: 0.33
Nodes (6): 1. Por qué la IA nunca funcionó (diagnóstico), 2. Qué se construyó, 3. Cómo activarla (desde el iPad), 4. Costos, límites y privacidad, 5. Pruebas, Agente de IA de VALU — el "cerebro" de la app (2026-10-05)

### Community 182 - "memory.ts"
Cohesion: 0.40
Nodes (5): appendMemory(), cleanMemoryText(), MAX_MEMORY_CHARS, MAX_MEMORY_ITEMS, norm()

### Community 183 - "dataOwner.ts"
Cohesion: 0.53
Nodes (5): decideOwner(), OwnerDecision, readOwner(), useDataOwnerGuard(), writeOwner()

### Community 184 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.40
Nodes (5): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), 1. Estado Actual y Componentes Activos (The Core), resolveVisualStyle()

### Community 185 - "run-fechas.cjs"
Cohesion: 0.40
Nodes (3): D, fails, sealed

### Community 186 - "isoOf"
Cohesion: 0.50
Nodes (5): fortnightPeriod(), isoOf(), lastDayOfMonth(), monthPeriod(), relationOf()

## Knowledge Gaps
- **973 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+968 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1156 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `avisos.tsx`, `recurrentes.tsx`, `presupuesto.tsx`, `(tabs)/index.tsx`, `app/_layout.tsx`, `ThemeProvider.tsx`, `onboarding.tsx`, `privacidad.tsx`, `react-native`, `[product].tsx`, `ChatSidebar.tsx`, `BudgetActionPanel.tsx`, `ai-settings.tsx`, `selectors.ts`, `BudgetTemplateList.tsx`, `useAppStore`, `notificaciones.tsx`, `appearance.tsx`, `movimientos.tsx`, `date.ts`, `react`, `ChatPlanCard.tsx`, `ia.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `avisos.tsx`, `recurrentes.tsx`, `creditCard.ts`, `presupuesto.tsx`, `(tabs)/index.tsx`, `SyncEngine.ts`, `app/_layout.tsx`, `tarjeta-store.cjs`, `surveyRepository.ts`, `virtualIds.ts`, `useAppStore.ts`, `ThemeProvider.tsx`, `finance.ts`, `onboarding.tsx`, `useTheme`, `materialize.ts`, `modelActions.ts`, `privacidad.tsx`, `react-native`, `[product].tsx`, `themeRegistry.ts`, `forecast.ts`, `recurrence.ts`, `agente-app.cjs`, `memory.ts`, `ai-settings.tsx`, `dataOwner.ts`, `selectors.ts`, `sync-mapeo.cjs`, `ejecutor.cjs`, `BudgetTemplateList.tsx`, `p3-chat.cjs`, `appearance.tsx`, `movimientos.tsx`, `actionCatalogP3.ts`, `p3-store.cjs`, `ia.tsx`, `deudas.cjs`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `formatCurrency()` connect `(tabs)/index.tsx` to `recurrentes.tsx`, `avisos.tsx`, `planner.ts`, `actionCatalog.ts`, `ThemeProvider.tsx`, `onboarding.tsx`, `useTheme`, `modelActions.ts`, `react-native`, `[product].tsx`, `forecast.ts`, `agentLoop.ts`, `BudgetActionPanel.tsx`, `BudgetTemplateList.tsx`, `useAppStore`, `appearance.tsx`, `movimientos.tsx`, `date.ts`, `actionCatalogP3.ts`, `react`, `ChatPlanCard.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _973 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05204872646733112 - nodes in this community are weakly interconnected._
- **Should `dates.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `build-golden.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.059743954480796585 - nodes in this community are weakly interconnected._