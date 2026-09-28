# Graph Report - IVI  (2026-09-28)

## Corpus Check
- 221 files · ~171,555 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1571 nodes · 5006 edges · 107 communities (78 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 113 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fff468df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- HoldToConfirmButton.tsx
- onboarding.tsx
- providers/types.ts
- date.ts
- repositories.ts
- privacidad.tsx
- (tabs)/index.tsx
- capture.tsx
- SyncEngine.ts
- react-native
- app.js
- dependencies
- push-notify/index.ts
- NetWorthTrendChart.tsx
- expo
- LLMActionAgentProvider.ts
- Currency
- package.json
- finance.ts
- react
- localCopilot.ts
- useTheme
- ai-settings.tsx
- institutions.ts
- useAppStore.ts
- 0014_budget_templates.sql
- actionCatalog.ts
- expo-router
- perfil.tsx
- 0001_core_profiles_accounts_transactions.sql
- InvestmentForms.tsx
- ChatActionCard.tsx
- appearance.tsx
- data/types.ts
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
- Presupuesto
- budgetPeriods.ts
- ai-relay/index.ts
- scripts
- investmentModels.ts
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- ia.tsx
- public.survey_responses
- 0015_ui_themes.sql
- 1. Estado Actual y Componentes Activos (The Core)
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
- budget-template/[id].tsx
- useAppStore
- Fase 2 P0-S2 — Contratos versionados del motor local
- BudgetTemplateEdit
- ThemeProvider.tsx
- ChatSidebar.tsx
- surveyRepository.ts
- @expo/vector-icons
- [product].tsx
- investmentActions.ts
- client.ts
- BudgetActionPanel.tsx
- notificaciones.tsx
- settings.tsx
- MonthBudgetBreakdown.tsx
- presupuesto.tsx
- Pendientes y decisiones abiertas
- webSpeech.ts
- 0020_push_notifications.sql
- resolveAddLiability
- formatCurrency
- Migraciones de VALU Finance AI

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
- `2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos` --references--> `AppState`  [INFERRED]
  docs/memoria-proyecto/05-bitacora-cambios.md → src/store/useAppStore.ts
- `Pendiente de despliegue (2026-09-28) — notificaciones push e Inversiones por institución` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2` --references--> `Account`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Campos de fecha del presupuesto — solo locales` --references--> `Budget`  [INFERRED]
  docs/memoria-proyecto/06-pendientes.md → src/data/types.ts
- `Modelos de cálculo` --references--> `computeNetWorth()`  [INFERRED]
  docs/memoria-proyecto/07-instituciones-inversion.md → src/utils/finance.ts

## Import Cycles
- None detected.

## Communities (107 total, 29 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.09
Nodes (34): 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, ACCOUNT_DECREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, applyCustomMapping(), ARTICLE_AMBIGUOUS, containsKeywordAsWord() (+26 more)

### Community 1 - "HoldToConfirmButton.tsx"
Cohesion: 0.17
Nodes (12): 4.1 Cómo se conectan las piezas, de punta a punta, 4.2 Las dos superficies de lenguaje natural, en paralelo, 4.3 Seguridad del sistema de escritura por IA (resumen operativo), 4. Arquitectura y Flujo Actual, 5. Contrato de confirmación y ejecución idempotente, Chat de IA con acciones sobre datos + rediseño visual, AnimatedCircle, HoldState (+4 more)

### Community 2 - "onboarding.tsx"
Cohesion: 0.10
Nodes (24): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, ONBOARDING_GROUP_EXPLANATIONS, Step, styles, BUDGET_CONCEPTS (+16 more)

### Community 3 - "providers/types.ts"
Cohesion: 0.10
Nodes (23): 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, answerQuestion(), ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, localActionAgentProvider, localAIInterpreterProvider (+15 more)

### Community 4 - "date.ts"
Cohesion: 0.27
Nodes (15): BudgetCalendar(), styles, CalendarPicker(), CalendarPickerProps, styles, DateFieldProps, MonthBudgetBreakdown(), dateInRange() (+7 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "privacidad.tsx"
Cohesion: 0.25
Nodes (10): Index(), Privacidad(), styles, deleteAccountPermanently(), AuthState, useAuthSession(), useProfileReconciliation(), isSupabaseConfigured (+2 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.06
Nodes (82): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Dashboard(), GROUP_LABELS, Scope, styles, Draft (+74 more)

### Community 8 - "capture.tsx"
Cohesion: 0.17
Nodes (23): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, styles, TransactionDetail(), NewTransaction() (+15 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.21
Nodes (17): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, buildProfileRow(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable, ALL_TABLES, getSessionCreds() (+9 more)

### Community 10 - "react-native"
Cohesion: 0.15
Nodes (19): react-native, AccountCard(), AccountCardVisual(), styles, StackedCard(), styles, AccountDropdown(), MenuItem (+11 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.10
Nodes (32): RFC-8291, RFC-8292, claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver(), Env (+24 more)

### Community 14 - "NetWorthTrendChart.tsx"
Cohesion: 0.21
Nodes (18): AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), ChartKind, ChartOptionsDropdown(), ChartPeriod, PERIOD_LABELS (+10 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "LLMActionAgentProvider.ts"
Cohesion: 0.19
Nodes (24): positiveAmount(), resolveAddGoal(), resolveAddTransaction(), resolveContributeToGoal(), resolveDeleteAccount(), resolveDeleteBudgetLine(), resolveDeleteGoal(), resolveDeleteLiability() (+16 more)

### Community 17 - "Currency"
Cohesion: 0.16
Nodes (18): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, ContributeToGoalArgs, DeleteAccountArgs, DeleteBudgetLineArgs, DeleteGoalArgs (+10 more)

### Community 18 - "package.json"
Cohesion: 0.06
Nodes (30): devDependencies, @types/react, typescript, main, name, private, version, expo (+22 more)

### Community 19 - "finance.ts"
Cohesion: 0.12
Nodes (24): getAssignmentRange(), rangesOverlap(), CategorySpendSlice, FinancialHealth, findOverlappingAssignments(), HealthFactor, HealthFactorStatus, incomeByConceptInRange() (+16 more)

### Community 20 - "react"
Cohesion: 0.40
Nodes (4): react, react-native-svg, HealthGradientBarProps, ValuMarkProps

### Community 21 - "localCopilot.ts"
Cohesion: 0.25
Nodes (7): 4. Contrato de cálculo y presentación de efectos, Rule, rules, SUGGESTED_QUESTIONS, buildFinancialContextSummary(), isSameMonth(), spendByCategory()

### Community 22 - "useTheme"
Cohesion: 0.15
Nodes (16): Instalar(), Step(), BudgetProgressChart(), BudgetProgressItem, capItems(), styles, ThermometerBar(), YAxisRuler() (+8 more)

### Community 23 - "ai-settings.tsx"
Cohesion: 0.11
Nodes (33): AiSettings(), PROVIDERS, Status, styles, createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient() (+25 more)

### Community 24 - "institutions.ts"
Cohesion: 0.11
Nodes (26): InstitutionScreen(), styles, InstitutionCard(), InstitutionMonogram(), styles, formatAsOf(), InfoLine(), MONTHS (+18 more)

### Community 25 - "useAppStore.ts"
Cohesion: 0.16
Nodes (27): Section, 1.3 Esquema de datos — jerarquía y clasificación exacta, ActionValidationContext, AIActionStatus, ChatConversation, ChatMessage, CopilotContext, CustomCategoryMapping (+19 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "actionCatalog.ts"
Cohesion: 0.09
Nodes (26): ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS, ContributeToGoalCandidate (+18 more)

### Community 28 - "expo-router"
Cohesion: 0.18
Nodes (17): TabsLayout(), Terminos(), expo-router, AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS (+9 more)

### Community 29 - "perfil.tsx"
Cohesion: 0.15
Nodes (23): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS (+15 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "InvestmentForms.tsx"
Cohesion: 0.31
Nodes (23): DateField(), ChipRow(), Field(), FormActions(), parseAmount(), styles, SummaryLine(), BuyForm() (+15 more)

### Community 32 - "ChatActionCard.tsx"
Cohesion: 0.22
Nodes (11): expo-haptics, ChatActionCard(), styles, ChatComposer(), styles, PressToTalkStatus, usePressToTalk(), UsePressToTalkResult (+3 more)

### Community 33 - "appearance.tsx"
Cohesion: 0.06
Nodes (55): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`) (+47 more)

### Community 34 - "data/types.ts"
Cohesion: 0.17
Nodes (17): Inversiones(), styles, ASSET_CLASS_GROUP, ASSET_CLASS_LABELS, ASSET_CLASSES, isMarketPriced(), MARKET_PRICED, RISK_GROUP_LABELS (+9 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "ledger.ts"
Cohesion: 0.20
Nodes (8): ParsedCapture, TransactionType, AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES, reverseDeltas()

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.18
Nodes (14): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+6 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.06
Nodes (26): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1, 2026-09-28 (tarde) — Notificaciones push reales + Inversiones por institución, Autenticación real, Bitácora de cambios, Captura por voz: de mock a real (+18 more)

### Community 42 - "0002_budgets_goals.sql"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "0003_investments_liabilities.sql"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 45 - "Presupuesto"
Cohesion: 0.25
Nodes (16): Presupuesto(), Bucket, BUCKET_LABELS, BUCKET_ORDER, bucketOf(), BudgetTemplateList(), styles, TemplateDragHandle() (+8 more)

### Community 46 - "budgetPeriods.ts"
Cohesion: 0.16
Nodes (17): comparePeriodKeys(), isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), makeRangeKey(), MONTH_NAMES, MONTH_SHORT, pad() (+9 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, build:web, ios, start, web

### Community 49 - "investmentModels.ts"
Cohesion: 0.19
Nodes (20): Institution, InvestmentPosition, InstitutionSummary, ValuedPosition, CETES_FACE_VALUE, cetesAccruedValue(), cetesPurchase, dailyYieldEstimate() (+12 more)

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "ia.tsx"
Cohesion: 0.22
Nodes (14): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+6 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.11
Nodes (18): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1. Estado Actual y Componentes Activos (The Core), 2.1 Rediseños completos por rechazo explícito del usuario, 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 3.2 La conexión de IA — qué es bug real y qué es diseño esperado (+10 more)

### Community 83 - "accounts.ts"
Cohesion: 0.40
Nodes (9): findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts(), expenseBudgetForCategory(), normalizeAccountName() (+1 more)

### Community 84 - "budget-template/[id].tsx"
Cohesion: 0.18
Nodes (17): GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, BudgetSearchBar(), BudgetSearchEntry (+9 more)

### Community 85 - "useAppStore"
Cohesion: 0.24
Nodes (13): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, registerMarketDataProvider(), usePushProfileOnChange(), useSyncEngine(), fetchRemoteVisualStyles(), useRemoteVisualStyles() (+5 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.19
Nodes (11): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local (+3 more)

### Community 87 - "BudgetTemplateEdit"
Cohesion: 0.25
Nodes (16): BudgetTemplateEdit(), Onboarding(), ConceptBudgetForm(), ConceptRow(), ConceptSubBudgets(), IncomeConceptRow(), ProgressBar(), styles (+8 more)

### Community 88 - "ThemeProvider.tsx"
Cohesion: 0.27
Nodes (10): BOLDER, ThemeContext, ThemeContextValue, radius, spacing, TextWeight, typography, TypographyScale (+2 more)

### Community 89 - "ChatSidebar.tsx"
Cohesion: 0.19
Nodes (12): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, ChatSidebar(), dateGroup(), GROUP_ORDER (+4 more)

### Community 90 - "surveyRepository.ts"
Cohesion: 0.60
Nodes (3): submitSurveyResponse(), SurveyAnswers, generateId()

### Community 91 - "@expo/vector-icons"
Cohesion: 0.18
Nodes (13): @expo/vector-icons, CategoryIconProps, styles, WEEKDAY_FULL_LABELS, STATUS_LABEL, styles, styles, ProgressBarProps (+5 more)

### Community 92 - "[product].tsx"
Cohesion: 0.20
Nodes (15): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), HoldingsCell, HoldingsColumn (+7 more)

### Community 93 - "investmentActions.ts"
Cohesion: 0.24
Nodes (16): InstitutionProduct, findLiquidityPosition(), LIQUIDITY_TICKER, AssetClass, active(), adjustProductCash(), buyAsset(), BuyInput (+8 more)

### Community 94 - "client.ts"
Cohesion: 0.19
Nodes (7): react-native-url-polyfill, @supabase/supabase-js, getRegistration(), NotificationPermission, supabase, supabaseAnonPublicKey, supabaseProjectUrl

### Community 95 - "BudgetActionPanel.tsx"
Cohesion: 0.21
Nodes (13): BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON, KIND_LABELS, templateIcon() (+5 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.24
Nodes (12): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, webPushNotificationProvider, NotificationSupport, DEFAULT_NOTIFICATION_SETTINGS (+4 more)

### Community 97 - "settings.tsx"
Cohesion: 0.27
Nodes (9): CURRENCIES, Settings(), styles, THEME_OPTIONS, formatExpiry(), StylePicker(), StylePreview(), styles (+1 more)

### Community 98 - "MonthBudgetBreakdown.tsx"
Cohesion: 0.24
Nodes (10): Bucket, BUCKET_LABELS, BUCKET_ORDER, Segment, styles, BudgetAssignment, BudgetTemplate, DateRange (+2 more)

### Community 99 - "presupuesto.tsx"
Cohesion: 0.31
Nodes (9): monthEndIso(), monthStartIso(), styles, BudgetTemplateLegend(), isoDatesBetween(), countMonthDaysMatching(), daysInMonth(), toISODate() (+1 more)

### Community 100 - "Pendientes y decisiones abiertas"
Cohesion: 0.20
Nodes (10): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Memoria de correcciones — solo en este dispositivo, Mitigado, no resuelto (2026-09-27) — pérdida de datos al forzar el cierre de la app en iOS, Pendiente de despliegue (2026-09-28) — notificaciones push e Inversiones por institución, Pendientes y decisiones abiertas, Resuelto (2026-09-27) — Motor de intenciones financieras por voz/chat (transferencias, deudas, metas) (+2 more)

### Community 101 - "webSpeech.ts"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): auth, auth.users, public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx

### Community 103 - "resolveAddLiability"
Cohesion: 0.48
Nodes (7): Razones históricas de por qué se pausó originalmente (2026-09-02), cleanString(), resolveAccountType(), resolveAddAccount(), resolveAddLiability(), resolveCurrency(), resolveLiabilityType()

### Community 104 - "formatCurrency"
Cohesion: 0.47
Nodes (4): SectionToggle(), styles, formatCurrency(), LOCALE_BY_CURRENCY

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

## Knowledge Gaps
- **442 isolated node(s):** `styles`, `Panel`, `styles`, `styles`, `REMINDER_HOURS` (+437 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 520 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `react-native` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `date.ts`, `privacidad.tsx`, `(tabs)/index.tsx`, `capture.tsx`, `SyncEngine.ts`, `NetWorthTrendChart.tsx`, `package.json`, `react`, `useTheme`, `ai-settings.tsx`, `institutions.ts`, `expo-router`, `perfil.tsx`, `InvestmentForms.tsx`, `ChatActionCard.tsx`, `appearance.tsx`, `data/types.ts`, `Presupuesto`, `ia.tsx`, `budget-template/[id].tsx`, `useAppStore`, `BudgetTemplateEdit`, `ThemeProvider.tsx`, `ChatSidebar.tsx`, `surveyRepository.ts`, `@expo/vector-icons`, `[product].tsx`, `client.ts`, `BudgetActionPanel.tsx`, `notificaciones.tsx`, `settings.tsx`, `MonthBudgetBreakdown.tsx`, `presupuesto.tsx`, `webSpeech.ts`, `formatCurrency`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `date.ts`, `privacidad.tsx`, `(tabs)/index.tsx`, `capture.tsx`, `react-native`, `NetWorthTrendChart.tsx`, `ai-settings.tsx`, `institutions.ts`, `expo-router`, `perfil.tsx`, `InvestmentForms.tsx`, `appearance.tsx`, `data/types.ts`, `Presupuesto`, `ia.tsx`, `budget-template/[id].tsx`, `useAppStore`, `BudgetTemplateEdit`, `ThemeProvider.tsx`, `ChatSidebar.tsx`, `@expo/vector-icons`, `[product].tsx`, `BudgetActionPanel.tsx`, `notificaciones.tsx`, `settings.tsx`, `MonthBudgetBreakdown.tsx`, `presupuesto.tsx`, `formatCurrency`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `HoldToConfirmButton.tsx`, `onboarding.tsx`, `date.ts`, `privacidad.tsx`, `(tabs)/index.tsx`, `capture.tsx`, `react-native`, `NetWorthTrendChart.tsx`, `package.json`, `useTheme`, `ai-settings.tsx`, `institutions.ts`, `expo-router`, `perfil.tsx`, `InvestmentForms.tsx`, `ChatActionCard.tsx`, `appearance.tsx`, `data/types.ts`, `Presupuesto`, `investmentModels.ts`, `ia.tsx`, `budget-template/[id].tsx`, `useAppStore`, `BudgetTemplateEdit`, `ThemeProvider.tsx`, `ChatSidebar.tsx`, `@expo/vector-icons`, `[product].tsx`, `BudgetActionPanel.tsx`, `notificaciones.tsx`, `settings.tsx`, `MonthBudgetBreakdown.tsx`, `presupuesto.tsx`, `formatCurrency`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `styles`, `Panel`, `styles` to the rest of the system?**
  _442 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `providers/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1048780487804878 - nodes in this community are weakly interconnected._