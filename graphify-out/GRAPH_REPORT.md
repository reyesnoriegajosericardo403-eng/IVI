# Graph Report - IVI  (2026-10-03)

## Corpus Check
- 234 files · ~229,539 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1764 nodes · 5267 edges · 114 communities (81 shown, 33 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `67fc2a32`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- ChatActionCard.tsx
- onboarding.tsx
- ai-settings.tsx
- build-golden.cjs
- repositories.ts
- useAppStore
- (tabs)/index.tsx
- capture.tsx
- SyncEngine.ts
- appearance.tsx
- app.js
- dependencies
- push-notify/index.ts
- app/_layout.tsx
- expo
- actionCatalog.ts
- useAppStore.ts
- package.json
- finance.ts
- NetWorthTrendChart.tsx
- BudgetTemplateList.tsx
- react-native
- useTheme
- GlassCard
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- MonthBudgetBreakdown.tsx
- perfil.tsx
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- run-golden.cjs
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
- budgetPeriods.ts
- ai-relay/index.ts
- ThemeProvider.tsx
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- MarketDataProvider
- public.survey_responses
- 0015_ui_themes.sql
- 1. Estado Actual y Componentes Activos (The Core)
- budget_assignments_range_idx
- sw.js
- delete-account/index.ts
- vercel.json
- public.budget_templates
- Cómo se agrupan los gastos en el Presupuesto
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
- registry.ts
- Fase 2 P0-S2 — Contratos versionados del motor local
- @react-native-async-storage/async-storage
- accounts.ts
- createClient.ts
- providers/types.ts
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- relayMarketDataProvider.ts
- client.ts
- presupuesto.tsx
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- audit-catalog.cjs
- react
- Account
- webSpeech.ts
- 0020_push_notifications.sql
- staticExchangeRateProvider.ts
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments
- Golden set del motor local — resultados (P1)
- 3. Deuda Técnica y Parches
- 5. Punto de Partida para la Fase 2
- financialInsights.ts
- 4. Arquitectura y Flujo Actual

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 168 edges
2. `react-native` - 91 edges
3. `react` - 90 edges
4. `useAppStore` - 69 edges
5. `formatCurrency()` - 63 edges
6. `GlassCard()` - 62 edges
7. `@expo/vector-icons` - 58 edges
8. `Currency` - 52 edges
9. `Dashboard()` - 47 edges
10. `Presupuesto()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `4.3 Seguridad del sistema de escritura por IA (resumen operativo)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/components/HoldToConfirmButton.tsx
- `Chat de IA con acciones sobre datos + rediseño visual` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/memoria-proyecto/05-bitacora-cambios.md → src/components/HoldToConfirmButton.tsx
- `3.3 Código temporal / soluciones rápidas pendientes de refactor` --references--> `SyncMeta`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/data/types.ts
- `Presupuestos (16 operaciones)` --references--> `Transaction`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/data/types.ts
- `Campos de fecha del presupuesto — solo locales` --references--> `Budget`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts

## Import Cycles
- None detected.

## Communities (114 total, 33 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.05
Nodes (65): Ajuste de saldo y separación de varios movimientos, Catálogo ampliado y cómo se mide (P1, 2026-10-03), Coincidencia por límite de palabra (bug corregido 2026-09-02), Corrección difusa (typos de dictado/tecleo), Desambiguación de "gas", Extracción del monto (`extractAmount`), Memoria de correcciones (mapeo personal), Montos: decimales, miles y abreviaturas (2026-10-03) (+57 more)

### Community 1 - "ChatActionCard.tsx"
Cohesion: 0.20
Nodes (12): 2.1 Rediseños completos por rechazo explícito del usuario, 5. Contrato de confirmación y ejecución idempotente, Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto), expo-haptics, ChatActionCard(), styles, AnimatedCircle, HoldState (+4 more)

### Community 2 - "onboarding.tsx"
Cohesion: 0.06
Nodes (66): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, AGE_OPTIONS (+58 more)

### Community 3 - "ai-settings.tsx"
Cohesion: 0.19
Nodes (16): AiSettings(), PROVIDERS, Status, styles, clearLLMProviderConfig(), getLLMProviderConfig(), isSecureStorageNative, setLLMProviderConfig() (+8 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.05
Nodes (42): ref_fs, ref_module, ref_path, typescript, addFresh(), AMBIG, amountText(), by (+34 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "useAppStore"
Cohesion: 0.18
Nodes (18): Index(), Privacidad(), styles, CURRENCIES, Settings(), styles, THEME_OPTIONS, formatExpiry() (+10 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.05
Nodes (88): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS (+80 more)

### Community 8 - "capture.tsx"
Cohesion: 0.10
Nodes (34): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, groupByDay(), Movimientos(), styles (+26 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.20
Nodes (19): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, useProfileReconciliation(), buildProfileRow(), fetchRemoteProfile(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable (+11 more)

### Community 10 - "appearance.tsx"
Cohesion: 0.11
Nodes (28): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+20 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.10
Nodes (32): RFC-8291, RFC-8292, claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver(), Env (+24 more)

### Community 14 - "app/_layout.tsx"
Cohesion: 0.19
Nodes (13): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, expo-splash-screen, expo-status-bar, react-native-gesture-handler, isMarketPriced(), usePushProfileOnChange() (+5 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.09
Nodes (52): Razones históricas de por qué se pausó originalmente (2026-09-02), Resuelto (2026-09-27) — Motor de intenciones financieras por voz/chat (transferencias, deudas, metas), ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate (+44 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.12
Nodes (28): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, ContributeToGoalArgs, DeleteAccountArgs, DeleteBudgetLineArgs, DeleteGoalArgs (+20 more)

### Community 18 - "package.json"
Cohesion: 0.07
Nodes (27): devDependencies, @types/react, typescript, main, name, private, scripts, android (+19 more)

### Community 19 - "finance.ts"
Cohesion: 0.12
Nodes (33): 4. Contrato de cálculo y presentación de efectos, bucketOf(), bucketOf(), findBudgetConcept(), findIncomeConcept(), parseSubBudgetId(), findSubcategoryAnyCategory(), buildBudgetLines() (+25 more)

### Community 20 - "NetWorthTrendChart.tsx"
Cohesion: 0.14
Nodes (24): react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), BudgetProgressItem, capItems() (+16 more)

### Community 21 - "BudgetTemplateList.tsx"
Cohesion: 0.15
Nodes (19): BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList() (+11 more)

### Community 22 - "react-native"
Cohesion: 0.16
Nodes (20): react-native, AccountCard(), AccountCardVisual(), styles, StackedCard(), styles, AccountDropdown(), MenuItem (+12 more)

### Community 23 - "useTheme"
Cohesion: 0.17
Nodes (20): Instalar(), Step(), TabsLayout(), Terminos(), expo-router, react-native-safe-area-context, AppTabBar(), HIT_SLOP (+12 more)

### Community 24 - "GlassCard"
Cohesion: 0.15
Nodes (26): InstitutionScreen(), styles, Inversiones(), styles, Draft, GoalCard(), GoalEditForm(), Metas() (+18 more)

### Community 25 - "data/types.ts"
Cohesion: 0.14
Nodes (30): Section, 1.3 Esquema de datos — jerarquía y clasificación exacta, ActionValidationContext, AIActionStatus, ChatConversation, ChatMessage, CopilotContext, Rule (+22 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "MonthBudgetBreakdown.tsx"
Cohesion: 0.22
Nodes (8): DonutChart(), DonutChartProps, DonutSlice, Bucket, BUCKET_LABELS, BUCKET_ORDER, Segment, styles

### Community 29 - "perfil.tsx"
Cohesion: 0.14
Nodes (24): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS (+16 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.06
Nodes (91): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), DateField(), ChipRow() (+83 more)

### Community 32 - "run-golden.cjs"
Cohesion: 0.11
Nodes (18): home_user_ivi_scripts_golden_golden_set_cases, scripts_golden_golden_set, allRows, args, { cases }, cl, eq(), evaluate() (+10 more)

### Community 33 - "themeRegistry.ts"
Cohesion: 0.12
Nodes (28): 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), fetchRemoteVisualStyles(), useRemoteVisualStyles(), darkColors, lightColors, palette, ThemeColors, BASE_VARIANT (+20 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "ledger.ts"
Cohesion: 0.29
Nodes (6): AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES, reverseDeltas()

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
Nodes (18): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, Autenticación real, Bitácora de cambios (+10 more)

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
Cohesion: 0.22
Nodes (9): Arquitectura, Autenticación, Cada registro es trazable y nunca se pierde, Estructura de carpetas (resumen), IA "trae tu propia cuenta" (BYOK), Principio: offline-first, PWA (instalar en pantalla de inicio), Qué es VALU (+1 more)

### Community 46 - "budgetPeriods.ts"
Cohesion: 0.14
Nodes (19): comparePeriodKeys(), DateRange, isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, MONTH_SHORT, pad() (+11 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "ThemeProvider.tsx"
Cohesion: 0.18
Nodes (13): StatCard(), StatCardProps, styles, BOLDER, ThemeContext, ThemeContextValue, radius, spacing (+5 more)

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "MarketDataProvider"
Cohesion: 0.24
Nodes (9): 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), ProviderRegistry, AIInterpreterProvider, CopilotProvider, ExchangeRateProvider, MarketDataProvider (+1 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.22
Nodes (8): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, 1. Estado Actual y Componentes Activos (The Core), 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), VALU — Blueprint de Proyecto: Cierre de Fase 1

### Community 61 - "Cómo se agrupan los gastos en el Presupuesto"
Cohesion: 0.25
Nodes (8): Ahorro — ahorro e inversión, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir, Sin concepto (a propósito)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "registry.ts"
Cohesion: 0.27
Nodes (9): answerQuestion(), createLLMActionAgentProvider(), createLLMAIInterpreterProvider(), registerConfiguredLLMProvider(), localAIInterpreterProvider, localCopilotProvider, setActionAgentProvider(), setAIInterpreterProvider() (+1 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.19
Nodes (11): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local (+3 more)

### Community 87 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 88 - "accounts.ts"
Cohesion: 0.32
Nodes (12): findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts(), expenseBudgetForCategory(), normalizeAccountName() (+4 more)

### Community 89 - "createClient.ts"
Cohesion: 0.38
Nodes (8): createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient(), createLLMClient(), providerFetch(), LLMClient, LLMMessage

### Community 90 - "providers/types.ts"
Cohesion: 0.29
Nodes (7): buildActionContextSummary(), buildFinancialContextSummary(), CATEGORY_CATALOG, createLLMCopilotProvider(), localActionAgentProvider, ActionAgentContext, ActionAgentProvider

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "relayMarketDataProvider.ts"
Cohesion: 0.21
Nodes (8): unavailableMarketDataProvider, registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), CetesRates, MarketQuote

### Community 94 - "client.ts"
Cohesion: 0.19
Nodes (7): react-native-url-polyfill, @supabase/supabase-js, getRegistration(), NotificationPermission, supabase, supabaseAnonPublicKey, supabaseProjectUrl

### Community 95 - "presupuesto.tsx"
Cohesion: 0.23
Nodes (24): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetCalendar(), BudgetTemplateLegend(), styles, MonthBudgetBreakdown() (+16 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.24
Nodes (12): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, webPushNotificationProvider, NotificationSupport, DEFAULT_NOTIFICATION_SETTINGS (+4 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "audit-catalog.cjs"
Cohesion: 0.18
Nodes (8): COMMON, { DEFAULT_CATEGORIES }, map, NON_EXPENSE, { normalize }, { DEFAULT_CATEGORIES }, { normalize, parseCaptureText }, text

### Community 99 - "react"
Cohesion: 0.12
Nodes (25): styles, @expo/vector-icons, react, CalendarPicker(), CalendarPickerProps, styles, CategoryIconProps, styles (+17 more)

### Community 100 - "Account"
Cohesion: 0.16
Nodes (14): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (2026-10-02), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — solo en este dispositivo (+6 more)

### Community 101 - "webSpeech.ts"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): auth, public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth.users

### Community 103 - "staticExchangeRateProvider.ts"
Cohesion: 0.38
Nodes (5): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "Golden set del motor local — resultados (P1)"
Cohesion: 0.33
Nodes (6): Cómo seguir, Golden set del motor local — resultados (P1), Límites conocidos (no se arreglan a propósito), Qué aprendimos (patrones de falla en frases nuevas), Qué se midió, Resultados

### Community 110 - "3. Deuda Técnica y Parches"
Cohesion: 0.40
Nodes (5): 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real, 3. Deuda Técnica y Parches

### Community 111 - "5. Punto de Partida para la Fase 2"
Cohesion: 0.40
Nodes (5): 5.1 Dónde estamos parados, en una frase, 5.2 Estado de los 3 pasos originales + lo que sigue, 5.3 Otros dos hilos abiertos, fuera del roadmap original, 5.3bis Fase 2 ya arrancó formalmente (28 sep 2026) — reemplaza el "Paso 2" de arriba, 5. Punto de Partida para la Fase 2

### Community 112 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 113 - "4. Arquitectura y Flujo Actual"
Cohesion: 0.50
Nodes (4): 4.1 Cómo se conectan las piezas, de punta a punta, 4.2 Las dos superficies de lenguaje natural, en paralelo, 4.3 Seguridad del sistema de escritura por IA (resumen operativo), 4. Arquitectura y Flujo Actual

## Knowledge Gaps
- **552 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+547 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 649 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `ChatActionCard.tsx`, `onboarding.tsx`, `ai-settings.tsx`, `useAppStore`, `(tabs)/index.tsx`, `capture.tsx`, `appearance.tsx`, `app/_layout.tsx`, `NetWorthTrendChart.tsx`, `BudgetTemplateList.tsx`, `react-native`, `GlassCard`, `MonthBudgetBreakdown.tsx`, `perfil.tsx`, `[product].tsx`, `ThemeProvider.tsx`, `presupuesto.tsx`, `notificaciones.tsx`, `react`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `ChatActionCard.tsx`, `onboarding.tsx`, `ai-settings.tsx`, `useAppStore`, `(tabs)/index.tsx`, `capture.tsx`, `SyncEngine.ts`, `appearance.tsx`, `package.json`, `NetWorthTrendChart.tsx`, `BudgetTemplateList.tsx`, `useTheme`, `GlassCard`, `MonthBudgetBreakdown.tsx`, `perfil.tsx`, `[product].tsx`, `ThemeProvider.tsx`, `@react-native-async-storage/async-storage`, `createClient.ts`, `client.ts`, `presupuesto.tsx`, `notificaciones.tsx`, `react`, `webSpeech.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `typescript` connect `build-golden.cjs` to `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _552 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052214452214452214 - nodes in this community are weakly interconnected._
- **Should `onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.060350877192982454 - nodes in this community are weakly interconnected._
- **Should `build-golden.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.04591836734693878 - nodes in this community are weakly interconnected._