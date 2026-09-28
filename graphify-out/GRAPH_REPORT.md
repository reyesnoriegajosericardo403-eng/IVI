# Graph Report - IVI  (2026-09-28)

## Corpus Check
- 202 files · ~154,813 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1379 nodes · 4388 edges · 94 communities (66 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5add7c6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- ChatActionCard.tsx
- onboarding.tsx
- visualStyles.ts
- presupuesto.tsx
- repositories.ts
- react
- (tabs)/index.tsx
- formatCurrency
- SyncEngine.ts
- useTheme
- app.js
- dependencies
- themeRegistry.ts
- NetWorthTrendChart.tsx
- expo
- LLMActionAgentProvider.ts
- useAppStore.ts
- package.json
- finance.ts
- patrimonio.tsx
- providers/types.ts
- budget-template/[id].tsx
- registry.ts
- financialInsights.ts
- data/types.ts
- 0014_budget_templates.sql
- actionCatalog.ts
- expo-router
- perfil.tsx
- 0001_core_profiles_accounts_transactions.sql
- GlassCard
- ChatComposer.tsx
- appearance.tsx
- inversiones.tsx
- market-data/index.ts
- Transaction
- CLAUDE.md
- Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)
- manifest.json
- 0005_audit_log.sql
- Bitácora de cambios
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- BudgetTemplateList.tsx
- budgetPeriods.ts
- ai-relay/index.ts
- scripts
- @react-native-async-storage/async-storage
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- ia.tsx
- public.survey_responses
- 0015_ui_themes.sql
- devDependencies
- budget_assignments_range_idx
- sw.js
- delete-account/index.ts
- vercel.json
- public.budget_templates
- public.investments
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
- accounts.ts
- budgetCalculator.ts
- app/_layout.tsx
- Fase 2 P0-S2 — Contratos versionados del motor local
- AppBackground.tsx
- ThemeContextValue
- AiOrb.tsx
- surveyRepository.ts
- @expo/vector-icons
- ChatSidebar.tsx
- onboardingSurvey.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 142 edges
2. `react-native` - 82 edges
3. `react` - 81 edges
4. `useAppStore` - 66 edges
5. `formatCurrency()` - 57 edges
6. `GlassCard()` - 53 edges
7. `@expo/vector-icons` - 53 edges
8. `Dashboard()` - 47 edges
9. `Currency` - 46 edges
10. `Presupuesto()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `3.3 Código temporal / soluciones rápidas pendientes de refactor` --references--> `SyncMeta`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/data/types.ts
- `4.3 Seguridad del sistema de escritura por IA (resumen operativo)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/components/HoldToConfirmButton.tsx
- `2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos` --references--> `AppState`  [INFERRED]
  docs/memoria-proyecto/05-bitacora-cambios.md → src/store/useAppStore.ts
- `Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Campos de fecha del presupuesto — solo locales` --references--> `Budget`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts

## Import Cycles
- None detected.

## Communities (94 total, 28 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.08
Nodes (37): 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, Movimientos (11 operaciones), ACCOUNT_DECREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, applyCustomMapping(), ARTICLE_AMBIGUOUS (+29 more)

### Community 1 - "ChatActionCard.tsx"
Cohesion: 0.14
Nodes (16): 2.1 Rediseños completos por rechazo explícito del usuario, 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 5. Contrato de confirmación y ejecución idempotente, Chat de IA con acciones sobre datos + rediseño visual, expo-haptics, ChatActionCard() (+8 more)

### Community 2 - "onboarding.tsx"
Cohesion: 0.11
Nodes (31): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, Onboarding(), ONBOARDING_GROUP_EXPLANATIONS, Step, styles (+23 more)

### Community 3 - "visualStyles.ts"
Cohesion: 0.17
Nodes (14): darkColors, lightColors, palette, ThemeColors, BUILT_IN_VISUAL_STYLES, DEFAULT_VISUAL_STYLE_ID, glassmorphism, LIQUID_GLASS_STYLE_ID (+6 more)

### Community 4 - "presupuesto.tsx"
Cohesion: 0.14
Nodes (35): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles (+27 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "react"
Cohesion: 0.14
Nodes (24): Index(), Privacidad(), styles, CURRENCIES, Settings(), styles, THEME_OPTIONS, react (+16 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.11
Nodes (41): RootStack(), SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Dashboard(), GROUP_LABELS, Scope, styles (+33 more)

### Community 8 - "formatCurrency"
Cohesion: 0.15
Nodes (30): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, groupByDay(), Movimientos(), styles (+22 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.06
Nodes (46): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 1. Estado Actual y Componentes Activos (The Core), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional) (+38 more)

### Community 10 - "useTheme"
Cohesion: 0.15
Nodes (25): react-native, AccountCard(), AccountCardVisual(), styles, AccountCardStack(), StackedCard(), styles, BudgetChipRow() (+17 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "themeRegistry.ts"
Cohesion: 0.28
Nodes (11): fetchRemoteVisualStyles(), useRemoteVisualStyles(), BASE_VARIANT, isRecord(), parseRemoteVisualStyle(), parseVariant(), pickStrings(), pickSurface() (+3 more)

### Community 14 - "NetWorthTrendChart.tsx"
Cohesion: 0.18
Nodes (20): react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), capItems(), styles (+12 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "LLMActionAgentProvider.ts"
Cohesion: 0.15
Nodes (31): Razones históricas de por qué se pausó originalmente (2026-09-02), cleanString(), finiteAmount(), positiveAmount(), resolveAccountType(), resolveAddAccount(), resolveAddGoal(), resolveAddLiability() (+23 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.12
Nodes (32): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionStatus, ChatConversation, ChatMessage, ContributeToGoalArgs (+24 more)

### Community 18 - "package.json"
Cohesion: 0.10
Nodes (20): main, name, private, version, expo, expo-clipboard, expo-constants, expo-font (+12 more)

### Community 19 - "finance.ts"
Cohesion: 0.12
Nodes (28): 4. Contrato de cálculo y presentación de efectos, findSubcategoryAnyCategory(), getUsdMxnRate(), CategorySpendSlice, countsForBudget(), FinancialHealth, HealthFactor, HealthFactorStatus (+20 more)

### Community 20 - "patrimonio.tsx"
Cohesion: 0.15
Nodes (15): Draft, LIABILITY_TYPES, LiabilityForm(), styles, ALL_ACCOUNT_TYPES, Draft, styles, HealthGradientBar() (+7 more)

### Community 21 - "providers/types.ts"
Cohesion: 0.24
Nodes (9): 1.3 Esquema de datos — jerarquía y clasificación exacta, CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, UserProfile, ActionAgentContext, CetesRates (+1 more)

### Community 22 - "budget-template/[id].tsx"
Cohesion: 0.12
Nodes (25): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, Scope, styles, CUSTOM_OPTIONS, PropagateChoice (+17 more)

### Community 23 - "registry.ts"
Cohesion: 0.05
Nodes (57): AiSettings(), PROVIDERS, Status, styles, 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, answerQuestion(), isWebSpeechAvailable() (+49 more)

### Community 24 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 25 - "data/types.ts"
Cohesion: 0.20
Nodes (20): ActionValidationContext, Segment, Account, AuditAction, AuditLogEntry, Budget, BudgetAssignment, BudgetTemplate (+12 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "actionCatalog.ts"
Cohesion: 0.08
Nodes (26): 0. El principio de arquitectura ya está vigente — con una precisión, ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS (+18 more)

### Community 28 - "expo-router"
Cohesion: 0.21
Nodes (15): TabsLayout(), expo-router, AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS, styles (+7 more)

### Community 29 - "perfil.tsx"
Cohesion: 0.13
Nodes (27): Auth(), Mode, styles, ForgotPassword(), styles, Instalar(), Step(), AGE_OPTIONS (+19 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "GlassCard"
Cohesion: 0.18
Nodes (22): InvestmentForm(), round4(), TransactionForm(), Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage() (+14 more)

### Community 32 - "ChatComposer.tsx"
Cohesion: 0.25
Nodes (9): EmptyHero(), timeGreeting(), ChatComposer(), styles, PressToTalkStatus, usePressToTalk(), UsePressToTalkResult, providers (+1 more)

### Community 33 - "appearance.tsx"
Cohesion: 0.15
Nodes (19): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, AppearancePreview() (+11 more)

### Community 34 - "inversiones.tsx"
Cohesion: 0.17
Nodes (19): Draft, Inversiones(), LiquidityForm(), styles, ASSET_CLASS_GROUP, ASSET_CLASS_LABELS, ASSET_CLASSES, findLiquidityPosition() (+11 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "Transaction"
Cohesion: 0.15
Nodes (11): Section, Presupuestos (16 operaciones), ParsedCapture, Transaction, TransactionType, AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES (+3 more)

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.21
Nodes (12): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+4 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.07
Nodes (24): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1, Autenticación real, Bitácora de cambios, Captura por voz: de mock a real, Cuentas y tarjetas (+16 more)

### Community 42 - "0002_budgets_goals.sql"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "0003_investments_liabilities.sql"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 45 - "BudgetTemplateList.tsx"
Cohesion: 0.14
Nodes (22): Bucket, BUCKET_LABELS, BUCKET_ORDER, bucketOf(), BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES (+14 more)

### Community 46 - "budgetPeriods.ts"
Cohesion: 0.15
Nodes (18): comparePeriodKeys(), DateRange, isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, MONTH_SHORT, pad() (+10 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, build:web, ios, start, web

### Community 49 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "ia.tsx"
Cohesion: 0.23
Nodes (13): AnimatedDot, AnimatedLinearGradient, ChatBackground(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody(), styles (+5 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 83 - "accounts.ts"
Cohesion: 0.30
Nodes (13): findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts(), expenseBudgetForCategory(), normalizeAccountName() (+5 more)

### Community 84 - "budgetCalculator.ts"
Cohesion: 0.27
Nodes (11): PendingSave, BudgetFormInitial, BudgetFrequency, BudgetPeriodicity, BudgetCalcInput, computeMonthlyAmount(), FREQUENCY_LABELS, PERIODICITY_LABELS (+3 more)

### Community 85 - "app/_layout.tsx"
Cohesion: 0.20
Nodes (11): RootLayout(), TRANSPARENT_NAVIGATION_THEME, 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), expo-splash-screen, expo-status-bar, react-native-gesture-handler, ThemeProvider(), isExpired() (+3 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.28
Nodes (8): 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local, AIActionProposal

### Community 87 - "AppBackground.tsx"
Cohesion: 0.39
Nodes (7): AppBackground(), GradientLayer(), resolveBackgroundPhoto(), styles, BackgroundPhotoLayer(), focalKeyword(), findBackgroundImage()

### Community 88 - "ThemeContextValue"
Cohesion: 0.28
Nodes (8): ThemeContextValue, radius, spacing, TextWeight, typography, TypographyScale, TypographyToken, StyleSurface

### Community 89 - "AiOrb.tsx"
Cohesion: 0.32
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 90 - "surveyRepository.ts"
Cohesion: 0.38
Nodes (5): expo-crypto, submitSurveyResponse(), SurveyAnswers, withNewMeta(), generateId()

### Community 91 - "@expo/vector-icons"
Cohesion: 0.43
Nodes (5): @expo/vector-icons, CategoryIconProps, styles, CATEGORY_ICONS, IoniconName

### Community 92 - "ChatSidebar.tsx"
Cohesion: 0.43
Nodes (6): ChatSidebar(), dateGroup(), GROUP_ORDER, MobileDrawer(), normalize(), styles

### Community 93 - "onboardingSurvey.ts"
Cohesion: 0.33
Nodes (5): CASUAL_SURVEY, FORMAL_SURVEY, SurveyOption, SurveyQuestion, SurveyTone

## Knowledge Gaps
- **401 isolated node(s):** `1.1 Stack técnico verificado`, `1.2 Inventario de pantallas activas (`app/`)`, `2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos)`, `2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada)`, `3.2 La conexión de IA — qué es bug real y qué es diseño esperado` (+396 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 461 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `ChatActionCard.tsx`, `onboarding.tsx`, `presupuesto.tsx`, `react`, `(tabs)/index.tsx`, `formatCurrency`, `NetWorthTrendChart.tsx`, `patrimonio.tsx`, `budget-template/[id].tsx`, `registry.ts`, `expo-router`, `perfil.tsx`, `GlassCard`, `appearance.tsx`, `inversiones.tsx`, `BudgetTemplateList.tsx`, `ia.tsx`, `app/_layout.tsx`, `AppBackground.tsx`, `@expo/vector-icons`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `react-native` connect `useTheme` to `ChatActionCard.tsx`, `onboarding.tsx`, `presupuesto.tsx`, `react`, `(tabs)/index.tsx`, `formatCurrency`, `SyncEngine.ts`, `NetWorthTrendChart.tsx`, `package.json`, `patrimonio.tsx`, `budget-template/[id].tsx`, `registry.ts`, `expo-router`, `perfil.tsx`, `GlassCard`, `ChatComposer.tsx`, `appearance.tsx`, `inversiones.tsx`, `BudgetTemplateList.tsx`, `@react-native-async-storage/async-storage`, `ia.tsx`, `AppBackground.tsx`, `AiOrb.tsx`, `surveyRepository.ts`, `@expo/vector-icons`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ChatActionCard.tsx`, `onboarding.tsx`, `presupuesto.tsx`, `(tabs)/index.tsx`, `formatCurrency`, `SyncEngine.ts`, `useTheme`, `themeRegistry.ts`, `NetWorthTrendChart.tsx`, `package.json`, `patrimonio.tsx`, `budget-template/[id].tsx`, `registry.ts`, `expo-router`, `perfil.tsx`, `GlassCard`, `ChatComposer.tsx`, `appearance.tsx`, `inversiones.tsx`, `BudgetTemplateList.tsx`, `ia.tsx`, `app/_layout.tsx`, `AppBackground.tsx`, `AiOrb.tsx`, `@expo/vector-icons`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `1.1 Stack técnico verificado`, `1.2 Inventario de pantallas activas (`app/`)`, `2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos)` to the rest of the system?**
  _401 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._
- **Should `ChatActionCard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._
- **Should `onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._