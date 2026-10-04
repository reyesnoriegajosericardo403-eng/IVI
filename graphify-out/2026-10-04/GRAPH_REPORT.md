# Graph Report - IVI  (2026-10-04)

## Corpus Check
- 285 files · ~330,509 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 2186 nodes · 6165 edges · 157 communities (117 shown, 40 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 175 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5196445d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- dates.ts
- budget-template/[id].tsx
- registry.ts
- build-golden.cjs
- repositories.ts
- useAppStore
- (tabs)/index.tsx
- planner.ts
- SyncEngine.ts
- extended.ts
- app.js
- dependencies
- push-notify/index.ts
- ThemeProvider.tsx
- expo
- actionCatalog.ts
- useAppStore.ts
- package.json
- finance.ts
- useTheme
- BudgetTemplateList.tsx
- onboarding.tsx
- resolveAddTransaction
- GlassCard
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- chatIntentParser.ts
- perfil.tsx
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- catalogLoader.ts
- themeRegistry.ts
- Selector Interactivo de Técnicas de Diagnóstico Organizacional
- market-data/index.ts
- ledger.ts
- CLAUDE.md
- Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)
- manifest.json
- 0005_audit_log.sql
- Bitácora de cambios
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- Arquitectura
- ConceptBudgetForm.tsx
- ai-relay/index.ts
- run-golden.cjs
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- ia.tsx
- public.survey_responses
- 0015_ui_themes.sql
- ai-settings.tsx
- budget_assignments_range_idx
- sw.js
- delete-account/index.ts
- vercel.json
- public.budget_templates
- Catálogo de categorías
- public.liabilities
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
- NotificationProvider
- build.py
- sync-mapeo.cjs
- ActionPlan
- client.ts
- capture.tsx
- app/_layout.tsx
- P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- providers/types.ts
- classifyNormalized
- budgetPeriods.ts
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- audit-catalog.cjs
- @expo/vector-icons
- Account
- packs.cjs
- 0020_push_notifications.sql
- categories.ts
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments
- Golden set del motor local — resultados (P1, P1b y P2)
- VALU — Blueprint de Proyecto: Cierre de Fase 1
- presupuesto.tsx
- format.ts
- size-report.cjs
- MonthBudgetBreakdown.tsx
- runSync
- parseCaptureText
- ts-hook.cjs
- react
- ChatPlanCard.tsx
- handwritten.cjs
- AiOrb.tsx
- extractAmount
- ChatSidebar.tsx
- scripts
- run-planes.cjs
- usePressToTalk.ts
- devDependencies
- fresh.cjs
- fresh2.cjs
- ConceptRow.tsx
- golden/README.md
- createClient.ts
- ejecutor.cjs
- smoke-web.cjs
- catalogo.cjs
- BudgetActionPanel.tsx
- 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)
- LLMActionAgentProvider.ts
- webSpeech.ts
- P2 — Planificador multi-acción, fechas y catálogo en segundo plano
- surveyRepository.ts
- staticExchangeRateProvider.ts
- 0022_category_mappings.sql
- 3. Deuda Técnica y Parches
- stub-native.cjs
- run-fechas.cjs
- financialInsights.ts
- 1. Estado Actual y Componentes Activos (The Core)
- metro.config.js
- fechas.cjs
- fechas-sellado.cjs
- SyncTable
- @react-native-async-storage/async-storage
- stub-async-storage.cjs

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 168 edges
2. `react` - 92 edges
3. `react-native` - 92 edges
4. `useAppStore` - 75 edges
5. `formatCurrency()` - 68 edges
6. `GlassCard()` - 62 edges
7. `@expo/vector-icons` - 59 edges
8. `Currency` - 54 edges
9. `Dashboard()` - 47 edges
10. `Presupuesto()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `4.3 Seguridad del sistema de escritura por IA (resumen operativo)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/components/HoldToConfirmButton.tsx
- `Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/memoria-proyecto/01-arquitectura.md → src/components/HoldToConfirmButton.tsx
- `Chat de IA con acciones sobre datos + rediseño visual` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/memoria-proyecto/05-bitacora-cambios.md → src/components/HoldToConfirmButton.tsx
- `3.3 Código temporal / soluciones rápidas pendientes de refactor` --references--> `SyncMeta`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/data/types.ts
- `Presupuestos (16 operaciones)` --references--> `Transaction`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/data/types.ts

## Import Cycles
- None detected.

## Communities (157 total, 40 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.05
Nodes (40): ACCOUNT_DECREMENT_WORDS, ACCOUNT_INCREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, ARTICLE_AMBIGUOUS, __auditNumberVariants(), buildKeywordIndexSteps() (+32 more)

### Community 1 - "dates.ts"
Cohesion: 0.09
Nodes (39): addDays(), DateMention, DatePrefer, DateRelation, DAY_WORDS, DAYWORD_RE, extractDate(), extractPeriod() (+31 more)

### Community 2 - "budget-template/[id].tsx"
Cohesion: 0.11
Nodes (23): GROUP_COLOR_KEY, GROUP_ICON, GROUPS, Scope, styles, CUSTOM_OPTIONS, PropagateChoice, PropagateChoiceSheet() (+15 more)

### Community 3 - "registry.ts"
Cohesion: 0.17
Nodes (14): answerQuestion(), buildFinancialContextSummary(), createLLMAIInterpreterProvider(), createLLMCopilotProvider(), registerConfiguredLLMProvider(), localActionAgentProvider, localAIInterpreterProvider, localCopilotProvider (+6 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.07
Nodes (27): addFresh(), AMBIG, amountText(), by, C, cases, catOf(), F (+19 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (40): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+32 more)

### Community 6 - "useAppStore"
Cohesion: 0.16
Nodes (22): Index(), Privacidad(), styles, CURRENCIES, Settings(), styles, THEME_OPTIONS, AccountDropdown() (+14 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.09
Nodes (41): Dashboard(), GROUP_LABELS, Scope, styles, Draft, LIABILITY_TYPES, LiabilityForm(), Patrimonio() (+33 more)

### Community 8 - "planner.ts"
Cohesion: 0.11
Nodes (31): Estado de implementación (P2, 2026-10-04), assert, base, ctx, oneAccount, { planFromText, answerClarification, previewPlan, splitPlanSegments }, { resolveAddTransaction }, InterpretedMessage (+23 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.26
Nodes (12): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), buildProfileRow(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable, ALL_TABLES, getSessionCreds(), getUserId() (+4 more)

### Community 10 - "extended.ts"
Cohesion: 0.10
Nodes (14): PACK_BANCOS, PACK_COMIDA, PACK_COMPLEMENTOS, PACK_COMPRAS, PACK_DINERO, PACK_FAMILIA, PACK_HOGAR, PACK_IMPUESTOS (+6 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.10
Nodes (32): RFC-8291, RFC-8292, claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver(), Env (+24 more)

### Community 14 - "ThemeProvider.tsx"
Cohesion: 0.09
Nodes (34): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, AppBackground() (+26 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.07
Nodes (34): 0. El principio de arquitectura ya está vigente — con una precisión, ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, askLiability() (+26 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.12
Nodes (31): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionStatus, ChatConversation, ChatMessage, ContributeToGoalArgs (+23 more)

### Community 18 - "package.json"
Cohesion: 0.09
Nodes (21): main, name, private, version, expo-clipboard, expo-constants, expo-font, expo-image-picker (+13 more)

### Community 19 - "finance.ts"
Cohesion: 0.11
Nodes (35): 4. Contrato de cálculo y presentación de efectos, bucketOf(), bucketOf(), findBudgetConcept(), findIncomeConcept(), parseSubBudgetId(), findSubcategoryAnyCategory(), buildBudgetLines() (+27 more)

### Community 20 - "useTheme"
Cohesion: 0.16
Nodes (23): TabsLayout(), expo-router, AccountCard(), AccountCardVisual(), styles, AppTabBar(), HIT_SLOP, MORE_TABS (+15 more)

### Community 21 - "BudgetTemplateList.tsx"
Cohesion: 0.20
Nodes (14): Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON (+6 more)

### Community 22 - "onboarding.tsx"
Cohesion: 0.13
Nodes (28): BudgetTemplateEdit(), AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, Onboarding(), ONBOARDING_GROUP_EXPLANATIONS, Step (+20 more)

### Community 23 - "resolveAddTransaction"
Cohesion: 0.20
Nodes (33): Razones históricas de por qué se pausó originalmente (2026-09-02), Mapa de piezas, ask(), askAccount(), askAmount(), askDate(), askGoal(), askName() (+25 more)

### Community 24 - "GlassCard"
Cohesion: 0.13
Nodes (26): Instalar(), Step(), InstitutionScreen(), styles, Inversiones(), styles, Terminos(), react-native-safe-area-context (+18 more)

### Community 25 - "data/types.ts"
Cohesion: 0.18
Nodes (26): Section, 1.3 Esquema de datos — jerarquía y clasificación exacta, ActionValidationContext, CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, Segment (+18 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "chatIntentParser.ts"
Cohesion: 0.13
Nodes (21): base, ctx, { detectChatIntent }, NOW, out, PHRASES, resolveBudgetConcept(), resolveDeleteBudgetLine() (+13 more)

### Community 29 - "perfil.tsx"
Cohesion: 0.14
Nodes (24): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS (+16 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.06
Nodes (90): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), ChipRow(), Field() (+82 more)

### Community 32 - "catalogLoader.ts"
Cohesion: 0.16
Nodes (17): 1. El «túnel» del catálogo: qué es y qué no es, Cómo se comporta, De dónde sale el resto del peso (atribución por mapa de fuentes, antes de quitar reanimated), Peso medido (descarga comprimida al abrir la app, versión web; KB = 1,024 bytes), Qué NO se hizo, y por qué, CatalogStatus, getCatalogStatus(), getCatalogVersionInUse() (+9 more)

### Community 33 - "themeRegistry.ts"
Cohesion: 0.09
Nodes (34): 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), fetchRemoteVisualStyles(), darkColors, lightColors, palette, ThemeColors, ThemeContextValue, BASE_VARIANT (+26 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "ledger.ts"
Cohesion: 0.40
Nodes (4): AccountDelta, INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.16
Nodes (14): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+6 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.11
Nodes (18): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03/04 — P2: planificador multi-acción, fechas, catálogo en segundo plano y lo aprendido en la nube, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, Autenticación real, Bitácora de cambios (+10 more)

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
Nodes (10): Arquitectura, Autenticación, Cada registro es trazable y nunca se pierde, Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto), Estructura de carpetas (resumen), IA "trae tu propia cuenta" (BYOK), Principio: offline-first, PWA (instalar en pantalla de inicio) (+2 more)

### Community 46 - "ConceptBudgetForm.tsx"
Cohesion: 0.30
Nodes (12): PendingSave, BudgetFormInitial, styles, BudgetFrequency, BudgetPeriodicity, BudgetCalcInput, computeMonthlyAmount(), FREQUENCY_LABELS (+4 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "run-golden.cjs"
Cohesion: 0.05
Nodes (36): home_user_ivi_scripts_golden_golden_set_cases, { cases }, { DEFAULT_CATEGORIES: D }, P, t0, t1, texts, scripts_golden_golden_set (+28 more)

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "ia.tsx"
Cohesion: 0.21
Nodes (16): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+8 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "ai-settings.tsx"
Cohesion: 0.19
Nodes (16): AiSettings(), PROVIDERS, Status, styles, clearLLMProviderConfig(), getLLMProviderConfig(), isSecureStorageNative, setLLMProviderConfig() (+8 more)

### Community 61 - "Catálogo de categorías"
Cohesion: 0.22
Nodes (9): Ahorro — ahorro e inversión, Ampliación P1b (2026-10-03): áreas de finanzas personales que faltaban, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir (+1 more)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "sync-mapeo.cjs"
Cohesion: 0.13
Nodes (13): assert, { categoryMappingToRow, categoryMappingFromRow }, Module, path, plainRepo(), queued(), repositoryByTable, { runSync } (+5 more)

### Community 86 - "ActionPlan"
Cohesion: 0.13
Nodes (20): 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 5. Contrato de confirmación y ejecución idempotente, 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1 (+12 more)

### Community 87 - "client.ts"
Cohesion: 0.15
Nodes (9): expo-secure-store, react-native-url-polyfill, @supabase/supabase-js, getRegistration(), NotificationPermission, supabase, supabaseAnonPublicKey, supabaseProjectUrl (+1 more)

### Community 88 - "capture.tsx"
Cohesion: 0.15
Nodes (28): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, NewTransaction(), normalize(), SearchEntry (+20 more)

### Community 89 - "app/_layout.tsx"
Cohesion: 0.25
Nodes (11): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, isMarketPriced(), refreshMarketData(), useMarketDataRefresh(), useSyncEngine(), useRemoteVisualStyles() (+3 more)

### Community 90 - "P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)"
Cohesion: 0.09
Nodes (23): Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03), Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo), Cómo se evita el relleno (la parte que más importa), Dónde vive cada cosa, Golden set y resultados, Tamaño real (medido, no estimado), 2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil, Cifras que se pueden creer (primera y única corrida de cada sellado) (+15 more)

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "providers/types.ts"
Cohesion: 0.13
Nodes (18): 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), ParsedCapture, CATEGORY_CATALOG, RawCetesRates, RawQuote, relayMarketDataProvider (+10 more)

### Community 94 - "classifyNormalized"
Cohesion: 0.27
Nodes (11): Corrección difusa (typos de dictado/tecleo), __auditBestExact(), __auditKeywordIndex(), bestExactMatch(), categoryAllowed(), classifyNormalized(), fixParentsWord(), fuzzyMatchCategory() (+3 more)

### Community 95 - "budgetPeriods.ts"
Cohesion: 0.16
Nodes (18): comparePeriodKeys(), isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, MONTH_SHORT, pad(), ParsedPeriod (+10 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.24
Nodes (12): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, webPushNotificationProvider, NotificationSupport, DEFAULT_NOTIFICATION_SETTINGS (+4 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "audit-catalog.cjs"
Cohesion: 0.33
Nodes (5): COMMON, { DEFAULT_CATEGORIES }, map, NON_EXPENSE, { normalize }

### Community 99 - "@expo/vector-icons"
Cohesion: 0.11
Nodes (30): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage() (+22 more)

### Community 100 - "Account"
Cohesion: 0.15
Nodes (15): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (actualizada 2026-10-04), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — ahora viaja con la cuenta (2026-10-04) (+7 more)

### Community 101 - "packs.cjs"
Cohesion: 0.12
Nodes (14): AMBIG_NORM, AMBIGUOUS_BARE, { DEFAULT_CATEGORIES: D }, DIR, dry, fs, includeBase, NEVER_PRUNE (+6 more)

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): auth, public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth.users

### Community 103 - "categories.ts"
Cohesion: 0.13
Nodes (14): B, covered, { DEFAULT_CATEGORIES: D }, dup, ids, subs, { DEFAULT_CATEGORIES }, BASE_CATEGORIES (+6 more)

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "Golden set del motor local — resultados (P1, P1b y P2)"
Cohesion: 0.17
Nodes (12): Cifras que se pueden creer (primera y única corrida), Conjuntos nuevos, Contaminación (para no engañarse), Cómo seguir, Golden set del motor local — resultados (P1, P1b y P2), Límites conocidos (no se arreglan a propósito), P2 — fechas y planificador (2026-10-03/04), Qué aprendimos (patrones de falla en frases nuevas) (+4 more)

### Community 110 - "VALU — Blueprint de Proyecto: Cierre de Fase 1"
Cohesion: 0.14
Nodes (13): 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 4.1 Cómo se conectan las piezas, de punta a punta, 4.2 Las dos superficies de lenguaje natural, en paralelo, 4.3 Seguridad del sistema de escritura por IA (resumen operativo), 4. Arquitectura y Flujo Actual, 5.1 Dónde estamos parados, en una frase (+5 more)

### Community 111 - "presupuesto.tsx"
Cohesion: 0.28
Nodes (15): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetTemplateLegend(), BudgetChipRow(), isActive(), selectActiveBudgetAssignments() (+7 more)

### Community 112 - "format.ts"
Cohesion: 0.31
Nodes (7): styles, TransactionDetail(), ACCOUNT_TYPE_ICONS, formatCompactDate(), formatRelativeDay(), formatRelativeTime(), LOCALE_BY_CURRENCY

### Community 113 - "size-report.cjs"
Cohesion: 0.12
Nodes (14): ref_child_process, ref_os, ref_zlib, BUDGETS, dirArg, { execSync }, fs, initial (+6 more)

### Community 114 - "MonthBudgetBreakdown.tsx"
Cohesion: 0.21
Nodes (18): shiftMonths(), BudgetCalendar(), styles, Bucket, BUCKET_LABELS, BUCKET_ORDER, MonthBudgetBreakdown(), styles (+10 more)

### Community 115 - "runSync"
Cohesion: 0.39
Nodes (7): 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, useProfileReconciliation(), usePushProfileOnChange(), fetchRemoteProfile(), pullRemoteChanges(), pushPendingChanges(), runSync()

### Community 116 - "parseCaptureText"
Cohesion: 0.22
Nodes (8): { DEFAULT_CATEGORIES }, { normalize, parseCaptureText }, text, isoDateToTimestamp(), removeRanges(), extractCurrency(), extractType(), parseCaptureText()

### Community 117 - "ts-hook.cjs"
Cohesion: 0.20
Nodes (9): ref_fs, typescript, fs, Module, path, ROOT, ts, CATALOG_VERSION (+1 more)

### Community 118 - "react"
Cohesion: 0.11
Nodes (30): react, react-native, react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart() (+22 more)

### Community 119 - "ChatPlanCard.tsx"
Cohesion: 0.19
Nodes (15): 2.1 Rediseños completos por rechazo explícito del usuario, expo-haptics, ChatActionCard(), styles, styles, ChatPlanCard(), styles, AnimatedCircle (+7 more)

### Community 120 - "handwritten.cjs"
Cohesion: 0.22
Nodes (8): AJUSTES, GAS, MONTOS, MULTI_NUMERO, SEGMENTOS, SIN_CATEGORIA, TIPOS, TYPOS

### Community 121 - "AiOrb.tsx"
Cohesion: 0.33
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 122 - "extractAmount"
Cohesion: 0.15
Nodes (18): Ajuste de saldo y separación de varios movimientos, Coincidencia por límite de palabra (bug corregido 2026-09-02), Desambiguación de "gas", Extracción del monto (`extractAmount`), Fechas, planes y catálogo en segundo plano (P2, 2026-10-03/04), Memoria de correcciones (mapeo personal), Montos: decimales, miles y abreviaturas (2026-10-03), Motor de clasificación (registro por voz/texto) (+10 more)

### Community 123 - "ChatSidebar.tsx"
Cohesion: 0.43
Nodes (6): ChatSidebar(), dateGroup(), GROUP_ORDER, MobileDrawer(), normalize(), styles

### Community 124 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, android, build:web, ios, size, start, test, typecheck (+1 more)

### Community 125 - "run-planes.cjs"
Cohesion: 0.14
Nodes (10): NONE, argsOk(), base, byKind, CASES, check(), ctx, fails (+2 more)

### Community 126 - "usePressToTalk.ts"
Cohesion: 0.40
Nodes (4): PressToTalkStatus, usePressToTalk(), UsePressToTalkResult, providers

### Community 127 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 130 - "ConceptRow.tsx"
Cohesion: 0.20
Nodes (12): CategoryIcon(), CategoryIconProps, styles, WEEKDAY_FULL_LABELS, STATUS_LABEL, styles, IncomeConceptRow(), styles (+4 more)

### Community 133 - "createClient.ts"
Cohesion: 0.38
Nodes (8): createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient(), createLLMClient(), providerFetch(), LLMClient, LLMMessage

### Community 134 - "ejecutor.cjs"
Cohesion: 0.15
Nodes (10): 1. Contrato de interpretación (`interpretMessage` → v2), ref_module, assert, { executePlan, recoverInterruptedPlan }, Module, path, plan(), { planFromText, previewPlan } (+2 more)

### Community 135 - "smoke-web.cjs"
Cohesion: 0.17
Nodes (11): ref_http, ref_path, fs, http, meta, now, path, routes (+3 more)

### Community 136 - "catalogo.cjs"
Cohesion: 0.20
Nodes (7): ref_assert, assert, cat, ext, loader, parser, sub()

### Community 137 - "BudgetActionPanel.tsx"
Cohesion: 0.29
Nodes (9): BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, templateIcon(), DateRange, rangeLabel(), computeBudgetStatus() (+1 more)

### Community 138 - "2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)"
Cohesion: 0.22
Nodes (9): 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`), Acciones del chat (17 tipos, catálogo cerrado), Con una IA conectada (BYOK), Ejecutor (§5), Límites conocidos, Qué hace (ejemplos reales de las pruebas), Reconocimiento local: errores de siempre que se corrigieron, Reglas (+1 more)

### Community 139 - "LLMActionAgentProvider.ts"
Cohesion: 0.32
Nodes (6): ResolveResult, interpretationFrom(), MAX_PLAN_STEPS, buildActionContextSummary(), CATEGORY_CATALOG, createLLMActionAgentProvider()

### Community 140 - "webSpeech.ts"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 141 - "P2 — Planificador multi-acción, fechas y catálogo en segundo plano"
Cohesion: 0.29
Nodes (7): 3. Fechas, horas y periodos en español (`src/ai/dates.ts`), 4. Lo aprendido, sincronizado con la cuenta, 5. Pruebas, puertas de calidad y cifras honestas, 6. Decisiones abiertas (tuyas), 7. Prerrequisitos de P3 (previsto, recurrencia, avisos, deudas e inversiones) — estado, En una frase, P2 — Planificador multi-acción, fechas y catálogo en segundo plano

### Community 142 - "surveyRepository.ts"
Cohesion: 0.38
Nodes (5): expo-crypto, submitSurveyResponse(), SurveyAnswers, withNewMeta(), generateId()

### Community 143 - "staticExchangeRateProvider.ts"
Cohesion: 0.38
Nodes (5): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo

### Community 144 - "0022_category_mappings.sql"
Cohesion: 0.40
Nodes (5): category_mappings_set_timestamps, category_mappings_user_updated_idx, public.category_mappings, auth.users, public.set_sync_timestamps

### Community 145 - "3. Deuda Técnica y Parches"
Cohesion: 0.40
Nodes (5): 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real, 3. Deuda Técnica y Parches

### Community 146 - "stub-native.cjs"
Cohesion: 0.40
Nodes (4): ref_crypto, crypto, handler, proxy

### Community 147 - "run-fechas.cjs"
Cohesion: 0.40
Nodes (3): D, fails, sealed

### Community 148 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 149 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.50
Nodes (4): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, 1. Estado Actual y Componentes Activos (The Core)

### Community 150 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

### Community 151 - "fechas.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 152 - "fechas-sellado.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 153 - "SyncTable"
Cohesion: 0.50
Nodes (3): SyncOp, SyncQueueEntry, SyncTable

## Knowledge Gaps
- **736 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+731 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 864 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `budget-template/[id].tsx`, `ConceptRow.tsx`, `useAppStore`, `(tabs)/index.tsx`, `BudgetActionPanel.tsx`, `ThemeProvider.tsx`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `GlassCard`, `perfil.tsx`, `[product].tsx`, `ConceptBudgetForm.tsx`, `ia.tsx`, `ai-settings.tsx`, `capture.tsx`, `app/_layout.tsx`, `notificaciones.tsx`, `@expo/vector-icons`, `presupuesto.tsx`, `format.ts`, `MonthBudgetBreakdown.tsx`, `react`, `ChatPlanCard.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `react-native` connect `react` to `budget-template/[id].tsx`, `ConceptRow.tsx`, `createClient.ts`, `useAppStore`, `(tabs)/index.tsx`, `BudgetActionPanel.tsx`, `SyncEngine.ts`, `webSpeech.ts`, `ThemeProvider.tsx`, `surveyRepository.ts`, `package.json`, `useTheme`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `GlassCard`, `perfil.tsx`, `[product].tsx`, `ConceptBudgetForm.tsx`, `ia.tsx`, `ai-settings.tsx`, `client.ts`, `capture.tsx`, `app/_layout.tsx`, `notificaciones.tsx`, `@expo/vector-icons`, `presupuesto.tsx`, `format.ts`, `MonthBudgetBreakdown.tsx`, `ChatPlanCard.tsx`, `AiOrb.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `budget-template/[id].tsx`, `ConceptRow.tsx`, `useAppStore`, `(tabs)/index.tsx`, `BudgetActionPanel.tsx`, `ThemeProvider.tsx`, `package.json`, `useTheme`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `GlassCard`, `perfil.tsx`, `[product].tsx`, `catalogLoader.ts`, `themeRegistry.ts`, `ConceptBudgetForm.tsx`, `ia.tsx`, `ai-settings.tsx`, `capture.tsx`, `app/_layout.tsx`, `notificaciones.tsx`, `@expo/vector-icons`, `presupuesto.tsx`, `format.ts`, `MonthBudgetBreakdown.tsx`, `runSync`, `ChatPlanCard.tsx`, `AiOrb.tsx`, `ChatSidebar.tsx`, `usePressToTalk.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _736 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053426248548199766 - nodes in this community are weakly interconnected._
- **Should `dates.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09487179487179487 - nodes in this community are weakly interconnected._
- **Should `budget-template/[id].tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._