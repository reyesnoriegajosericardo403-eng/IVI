# Graph Report - IVI  (2026-10-02)

## Corpus Check
- 222 files · ~178,186 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1652 nodes · 5114 edges · 109 communities (76 shown, 33 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7864fd78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- HoldToConfirmButton.tsx
- onboarding.tsx
- providers/types.ts
- investmentModels.ts
- repositories.ts
- useAppStore
- (tabs)/index.tsx
- capture.tsx
- app/_layout.tsx
- appearance.tsx
- app.js
- dependencies
- push-notify/index.ts
- inversiones.tsx
- expo
- actionCatalog.ts
- useAppStore.ts
- package.json
- finance.ts
- react-native
- BudgetTemplateList.tsx
- useTheme
- investmentActions.ts
- [id]/index.tsx
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- MonthBudgetBreakdown.tsx
- expo-router
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- usePressToTalk.ts
- ThemeProvider.tsx
- Selector Interactivo de Técnicas de Diagnóstico Organizacional
- market-data/index.ts
- ledger.ts
- CLAUDE.md
- Transaction
- manifest.json
- 0005_audit_log.sql
- Bitácora de cambios
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- Arquitectura
- budgetPeriods.ts
- ai-relay/index.ts
- scripts
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- @expo/vector-icons
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
- chatIntentParser.ts
- Fase 2 P0-S2 — Contratos versionados del motor local
- @react-native-async-storage/async-storage
- accounts.ts
- ChatSidebar.tsx
- surveyRepository.ts
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- presupuesto.tsx
- client.ts
- Presupuesto
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- AiOrb.tsx
- CategoryIcon.tsx
- Pendientes y decisiones abiertas
- BudgetTemplate
- 0020_push_notifications.sql
- devDependencies
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments

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
- `3.3 Código temporal / soluciones rápidas pendientes de refactor` --references--> `SyncMeta`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/data/types.ts
- `Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Hoja de ruta de Fase 2` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Inversiones por institución` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts

## Import Cycles
- None detected.

## Communities (109 total, 33 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.07
Nodes (40): Coincidencia por límite de palabra (bug corregido 2026-09-02), Corrección difusa (typos de dictado/tecleo), Desambiguación de "gas", Extracción del monto (`extractAmount`), Memoria de correcciones (mapeo personal), Motor de clasificación (registro por voz/texto), Pipeline (orden en que se resuelve una frase), Qué se evaluó y NO se implementó (y por qué) (+32 more)

### Community 1 - "HoldToConfirmButton.tsx"
Cohesion: 0.15
Nodes (13): 2.1 Rediseños completos por rechazo explícito del usuario, 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 5. Contrato de confirmación y ejecución idempotente, Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto), Chat de IA con acciones sobre datos + rediseño visual, AnimatedCircle (+5 more)

### Community 2 - "onboarding.tsx"
Cohesion: 0.06
Nodes (69): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, AGE_OPTIONS (+61 more)

### Community 3 - "providers/types.ts"
Cohesion: 0.06
Nodes (59): AiSettings(), PROVIDERS, Status, styles, 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), answerQuestion() (+51 more)

### Community 4 - "investmentModels.ts"
Cohesion: 0.12
Nodes (30): ALL_INSTITUTIONS, CommissionTier, EQUITY_CLASSES, findInstitution(), findProduct(), FISCAL_MX_2026, Institution, INSTITUTIONS (+22 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "useAppStore"
Cohesion: 0.23
Nodes (13): Privacidad(), styles, CURRENCIES, Settings(), styles, THEME_OPTIONS, signOut(), deleteAccountPermanently() (+5 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.05
Nodes (85): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Dashboard(), GROUP_LABELS, Scope, styles, Draft (+77 more)

### Community 8 - "capture.tsx"
Cohesion: 0.13
Nodes (25): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, styles, TransactionDetail(), NewTransaction() (+17 more)

### Community 9 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (24): Index(), RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, useProfileReconciliation(), usePushProfileOnChange() (+16 more)

### Community 10 - "appearance.tsx"
Cohesion: 0.14
Nodes (20): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+12 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.10
Nodes (32): RFC-8291, RFC-8292, claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver(), Env (+24 more)

### Community 14 - "inversiones.tsx"
Cohesion: 0.19
Nodes (17): Inversiones(), styles, ASSET_CLASS_GROUP, ASSET_CLASS_LABELS, ASSET_CLASSES, isMarketPriced(), LIQUIDITY_TICKER, MARKET_PRICED (+9 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.10
Nodes (45): Razones históricas de por qué se pausó originalmente (2026-09-02), ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS (+37 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.12
Nodes (32): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionStatus, ChatConversation, ChatMessage, ContributeToGoalArgs (+24 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (24): main, name, private, version, expo, expo-clipboard, expo-constants, expo-font (+16 more)

### Community 19 - "finance.ts"
Cohesion: 0.12
Nodes (23): findSubcategoryAnyCategory(), rangesOverlap(), buildLinesFromTemplateLines(), CategorySpendSlice, FinancialHealth, findOverlappingAssignments(), HealthFactor, HealthFactorStatus (+15 more)

### Community 20 - "react-native"
Cohesion: 0.27
Nodes (10): react-native, react-native-svg, AppBackground(), GradientLayer(), resolveBackgroundPhoto(), styles, BackgroundPhotoLayer(), focalKeyword() (+2 more)

### Community 21 - "BudgetTemplateList.tsx"
Cohesion: 0.15
Nodes (17): Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON (+9 more)

### Community 22 - "useTheme"
Cohesion: 0.11
Nodes (37): Instalar(), Step(), Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage(), pacingMessage() (+29 more)

### Community 23 - "investmentActions.ts"
Cohesion: 0.22
Nodes (17): InstitutionProduct, findLiquidityPosition(), AssetClass, active(), adjustProductCash(), buyAsset(), BuyInput, CetesInput (+9 more)

### Community 24 - "[id]/index.tsx"
Cohesion: 0.21
Nodes (14): InstitutionScreen(), styles, InstitutionCard(), InstitutionMonogram(), styles, formatAsOf(), InfoLine(), MONTHS (+6 more)

### Community 25 - "data/types.ts"
Cohesion: 0.20
Nodes (19): 1.3 Esquema de datos — jerarquía y clasificación exacta, ActionValidationContext, CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, Account, AuditAction (+11 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "MonthBudgetBreakdown.tsx"
Cohesion: 0.18
Nodes (15): 4. Contrato de cálculo y presentación de efectos, bucketOf(), Bucket, BUCKET_LABELS, BUCKET_ORDER, bucketOf(), Segment, styles (+7 more)

### Community 29 - "expo-router"
Cohesion: 0.14
Nodes (26): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS (+18 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.18
Nodes (35): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), ChipRow(), Field() (+27 more)

### Community 32 - "usePressToTalk.ts"
Cohesion: 0.50
Nodes (3): PressToTalkStatus, UsePressToTalkResult, providers

### Community 33 - "ThemeProvider.tsx"
Cohesion: 0.05
Nodes (67): TabsLayout(), AccountDropdown(), MenuItem, MiniSwitch(), styles, AppTabBar(), HIT_SLOP, MORE_TABS (+59 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "ledger.ts"
Cohesion: 0.29
Nodes (6): AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES, reverseDeltas()

### Community 38 - "Transaction"
Cohesion: 0.15
Nodes (16): Section, Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original (+8 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.12
Nodes (16): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, Autenticación real, Bitácora de cambios, Captura por voz: de mock a real (+8 more)

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
Cohesion: 0.15
Nodes (18): comparePeriodKeys(), DateRange, isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), makeRangeKey(), MONTH_NAMES, MONTH_SHORT (+10 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, build:web, ios, start, web

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "@expo/vector-icons"
Cohesion: 0.16
Nodes (24): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+16 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.10
Nodes (19): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), 1. Estado Actual y Componentes Activos (The Core), 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real (+11 more)

### Community 61 - "Cómo se agrupan los gastos en el Presupuesto"
Cohesion: 0.25
Nodes (8): Ahorro — ahorro e inversión, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir, Sin concepto (a propósito)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "chatIntentParser.ts"
Cohesion: 0.28
Nodes (12): 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, resolveDeleteAccount(), resolveDeleteLiability(), ADD_VERBS, captureNameAfter(), DELETE_VERBS, detectChatIntent(), hasAnyWord() (+4 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.19
Nodes (11): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local (+3 more)

### Community 87 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 88 - "accounts.ts"
Cohesion: 0.32
Nodes (12): findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts(), expenseBudgetForCategory(), normalizeAccountName() (+4 more)

### Community 89 - "ChatSidebar.tsx"
Cohesion: 0.36
Nodes (7): ChatSidebar(), dateGroup(), GROUP_ORDER, MobileDrawer(), normalize(), styles, useBreakpoint()

### Community 90 - "surveyRepository.ts"
Cohesion: 0.38
Nodes (5): expo-crypto, submitSurveyResponse(), SurveyAnswers, withNewMeta(), generateId()

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "presupuesto.tsx"
Cohesion: 0.36
Nodes (8): styles, BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, templateIcon(), rangeLabel(), computeBudgetStatus()

### Community 94 - "client.ts"
Cohesion: 0.14
Nodes (12): registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, getRegistration(), setMarketDataProvider(), NotificationPermission, AuthState (+4 more)

### Community 95 - "Presupuesto"
Cohesion: 0.19
Nodes (25): monthEndIso(), monthStartIso(), Presupuesto(), BudgetCalendar(), BudgetTemplateLegend(), styles, CalendarPickerProps, styles (+17 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.24
Nodes (12): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, webPushNotificationProvider, NotificationSupport, DEFAULT_NOTIFICATION_SETTINGS (+4 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "AiOrb.tsx"
Cohesion: 0.33
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 99 - "CategoryIcon.tsx"
Cohesion: 0.47
Nodes (4): CategoryIconProps, styles, CATEGORY_ICONS, IoniconName

### Community 100 - "Pendientes y decisiones abiertas"
Cohesion: 0.14
Nodes (14): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (2026-10-02), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — solo en este dispositivo (+6 more)

### Community 101 - "BudgetTemplate"
Cohesion: 0.67
Nodes (4): BudgetAssignment, BudgetTemplate, ResolvedPeriodBudget, UpcomingAssignmentSummary

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): auth, public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth.users

### Community 103 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

## Knowledge Gaps
- **485 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+480 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 574 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `providers/types.ts`, `useAppStore`, `(tabs)/index.tsx`, `capture.tsx`, `app/_layout.tsx`, `appearance.tsx`, `inversiones.tsx`, `react-native`, `BudgetTemplateList.tsx`, `[id]/index.tsx`, `MonthBudgetBreakdown.tsx`, `expo-router`, `[product].tsx`, `ThemeProvider.tsx`, `@expo/vector-icons`, `ChatSidebar.tsx`, `presupuesto.tsx`, `Presupuesto`, `notificaciones.tsx`, `CategoryIcon.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `providers/types.ts`, `useAppStore`, `(tabs)/index.tsx`, `capture.tsx`, `app/_layout.tsx`, `appearance.tsx`, `inversiones.tsx`, `package.json`, `BudgetTemplateList.tsx`, `useTheme`, `[id]/index.tsx`, `MonthBudgetBreakdown.tsx`, `expo-router`, `[product].tsx`, `ThemeProvider.tsx`, `@expo/vector-icons`, `@react-native-async-storage/async-storage`, `ChatSidebar.tsx`, `surveyRepository.ts`, `presupuesto.tsx`, `client.ts`, `Presupuesto`, `notificaciones.tsx`, `AiOrb.tsx`, `CategoryIcon.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `react` connect `useTheme` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `providers/types.ts`, `investmentModels.ts`, `useAppStore`, `(tabs)/index.tsx`, `capture.tsx`, `app/_layout.tsx`, `appearance.tsx`, `inversiones.tsx`, `package.json`, `react-native`, `BudgetTemplateList.tsx`, `[id]/index.tsx`, `MonthBudgetBreakdown.tsx`, `expo-router`, `[product].tsx`, `usePressToTalk.ts`, `ThemeProvider.tsx`, `@expo/vector-icons`, `ChatSidebar.tsx`, `presupuesto.tsx`, `client.ts`, `Presupuesto`, `notificaciones.tsx`, `AiOrb.tsx`, `CategoryIcon.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _485 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07073170731707316 - nodes in this community are weakly interconnected._
- **Should `onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06233062330623306 - nodes in this community are weakly interconnected._
- **Should `providers/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05543345543345543 - nodes in this community are weakly interconnected._