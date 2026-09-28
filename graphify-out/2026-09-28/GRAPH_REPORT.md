# Graph Report - IVI  (2026-09-28)

## Corpus Check
- 201 files · ~152,123 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1310 nodes · 4269 edges · 85 communities (56 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `676880a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- ia.tsx
- onboarding.tsx
- themeRegistry.ts
- finance.ts
- repositories.ts
- settings.tsx
- (tabs)/index.tsx
- capture.tsx
- SyncEngine.ts
- ThemeProvider.tsx
- app.js
- dependencies
- useAppStore
- react
- expo
- formatCurrency
- useAppStore.ts
- package.json
- financialContext.ts
- patrimonio.tsx
- providers/types.ts
- selectors.ts
- ai-settings.tsx
- financialInsights.ts
- data/types.ts
- 0014_budget_templates.sql
- actionCatalog.ts
- useTheme
- GlassCard
- 0001_core_profiles_accounts_transactions.sql
- @expo/vector-icons
- registry.ts
- appearance.tsx
- inversiones.tsx
- market-data/index.ts
- ledger.ts
- CLAUDE.md
- Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)
- manifest.json
- 0005_audit_log.sql
- createClient.ts
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- metas.tsx
- webSpeech.ts
- ai-relay/index.ts
- scripts
- @react-native-async-storage/async-storage
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- staticExchangeRateProvider.ts
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
- registerMarketDataProvider.ts
- sync/types.ts

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
- `Presupuestos (16 operaciones)` --references--> `Transaction`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/data/types.ts
- `Metas (7 operaciones)` --references--> `Goal`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/data/types.ts
- `Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?")` --references--> `AIActionType`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/ai/chatTypes.ts
- `Resultado agregado` --references--> `AIActionType`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/ai/chatTypes.ts
- `Movimientos (11 operaciones)` --references--> `AddTransactionArgs`  [INFERRED]
  docs/02_fase2_auditoria_operaciones.md → src/ai/chatTypes.ts

## Import Cycles
- None detected.

## Communities (85 total, 29 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.09
Nodes (34): ACCOUNT_DECREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, applyCustomMapping(), ARTICLE_AMBIGUOUS, containsKeywordAsWord(), CURRENCY_WORDS (+26 more)

### Community 1 - "ia.tsx"
Cohesion: 0.09
Nodes (39): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+31 more)

### Community 2 - "onboarding.tsx"
Cohesion: 0.06
Nodes (72): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, AGE_OPTIONS (+64 more)

### Community 3 - "themeRegistry.ts"
Cohesion: 0.09
Nodes (35): darkColors, lightColors, palette, ThemeColors, ThemeContextValue, ThemeProvider(), BASE_VARIANT, isExpired() (+27 more)

### Community 4 - "finance.ts"
Cohesion: 0.05
Nodes (102): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles (+94 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "settings.tsx"
Cohesion: 0.27
Nodes (9): CURRENCIES, Settings(), styles, THEME_OPTIONS, formatExpiry(), StylePicker(), StylePreview(), styles (+1 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.15
Nodes (21): Dashboard(), GROUP_LABELS, Scope, styles, DonutChartProps, DonutSlice, useBreakpoint(), useContentMaxWidth() (+13 more)

### Community 8 - "capture.tsx"
Cohesion: 0.14
Nodes (30): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, NewTransaction(), normalize(), SearchEntry (+22 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.07
Nodes (50): Auth(), Mode, styles, ForgotPassword(), styles, Index(), Privacidad(), styles (+42 more)

### Community 10 - "ThemeProvider.tsx"
Cohesion: 0.14
Nodes (22): react-native, AccountCardVisual(), styles, StackedCard(), styles, AccountDropdown(), MenuItem, MiniSwitch() (+14 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "useAppStore"
Cohesion: 0.22
Nodes (14): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, AppBackground(), usePushProfileOnChange(), refreshMarketData(), useMarketDataRefresh(), fetchRemoteVisualStyles() (+6 more)

### Community 14 - "react"
Cohesion: 0.23
Nodes (16): react, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), ChartKind, ChartOptionsDropdown(), ChartPeriod (+8 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "formatCurrency"
Cohesion: 0.17
Nodes (29): positiveAmount(), resolveAddGoal(), resolveAddTransaction(), resolveBudgetConcept(), resolveContributeToGoal(), resolveDeleteAccount(), resolveDeleteBudgetLine(), resolveDeleteGoal() (+21 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.12
Nodes (30): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionProposal, AIActionStatus, ChatConversation, ChatMessage (+22 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (23): main, name, private, version, expo, expo-clipboard, expo-constants, expo-crypto (+15 more)

### Community 19 - "financialContext.ts"
Cohesion: 0.43
Nodes (5): buildActionContextSummary(), buildFinancialContextSummary(), createLLMCopilotProvider(), isSameMonth(), spendByCategory()

### Community 20 - "patrimonio.tsx"
Cohesion: 0.12
Nodes (28): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Draft, LIABILITY_TYPES, Patrimonio(), SectionHeader(), styles (+20 more)

### Community 21 - "providers/types.ts"
Cohesion: 0.11
Nodes (15): ResolveOk, ResolvedAction, ParsedCapture, CATEGORY_CATALOG, RawCetesRates, RawQuote, ProviderRegistry, ActionAgentProvider (+7 more)

### Community 22 - "selectors.ts"
Cohesion: 0.46
Nodes (7): isActive(), selectActiveBudgetAssignments(), selectActiveBudgetTemplates(), selectActiveGoals(), selectActiveNetWorthHistory(), selectActivePeriodOverrides(), selectActiveTemplateBudgetLines()

### Community 23 - "ai-settings.tsx"
Cohesion: 0.18
Nodes (17): AiSettings(), PROVIDERS, Status, styles, expo-secure-store, clearLLMProviderConfig(), getLLMProviderConfig(), isSecureStorageNative (+9 more)

### Community 24 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 25 - "data/types.ts"
Cohesion: 0.20
Nodes (23): Section, ActionValidationContext, CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, Account, AuditAction (+15 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "actionCatalog.ts"
Cohesion: 0.10
Nodes (27): ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS, cleanString() (+19 more)

### Community 28 - "useTheme"
Cohesion: 0.16
Nodes (22): TabsLayout(), expo-router, AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS, styles (+14 more)

### Community 29 - "GlassCard"
Cohesion: 0.12
Nodes (20): Instalar(), Step(), AGE_OPTIONS, Perfil(), SEX_OPTIONS, styles, LiabilityForm(), Terminos() (+12 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "@expo/vector-icons"
Cohesion: 0.18
Nodes (19): groupByDay(), Movimientos(), styles, @expo/vector-icons, CalendarPicker(), CalendarPickerProps, styles, DateField() (+11 more)

### Community 32 - "registry.ts"
Cohesion: 0.19
Nodes (13): answerQuestion(), PressToTalkStatus, UsePressToTalkResult, createLLMActionAgentProvider(), createLLMAIInterpreterProvider(), registerConfiguredLLMProvider(), localActionAgentProvider, localAIInterpreterProvider (+5 more)

### Community 33 - "appearance.tsx"
Cohesion: 0.11
Nodes (26): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+18 more)

### Community 34 - "inversiones.tsx"
Cohesion: 0.19
Nodes (18): Draft, Inversiones(), InvestmentForm(), LiquidityForm(), round4(), styles, TransactionForm(), ASSET_CLASS_GROUP (+10 more)

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

### Community 41 - "createClient.ts"
Cohesion: 0.38
Nodes (8): createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient(), createLLMClient(), providerFetch(), LLMClient, LLMMessage

### Community 42 - "0002_budgets_goals.sql"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "0003_investments_liabilities.sql"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 45 - "metas.tsx"
Cohesion: 0.23
Nodes (12): Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage(), pacingMessage(), styles, ProgressBar() (+4 more)

### Community 46 - "webSpeech.ts"
Cohesion: 0.25
Nodes (7): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider, SpeechToTextProvider

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

### Community 52 - "staticExchangeRateProvider.ts"
Cohesion: 0.32
Nodes (6): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo, toBaseCurrency()

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 83 - "registerMarketDataProvider.ts"
Cohesion: 0.47
Nodes (4): unavailableMarketDataProvider, registerMarketDataProvider(), relayMarketDataProvider, setMarketDataProvider()

### Community 84 - "sync/types.ts"
Cohesion: 0.50
Nodes (3): SyncOp, SyncQueueEntry, SyncTable

## Knowledge Gaps
- **369 isolated node(s):** `De dónde sale el "65"`, `Deudas (9 operaciones)`, `Avisos (8 operaciones)`, `Divergencias resueltas frente al inventario original`, `Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*)` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 428 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `ThemeProvider.tsx` to `ia.tsx`, `onboarding.tsx`, `finance.ts`, `settings.tsx`, `(tabs)/index.tsx`, `capture.tsx`, `SyncEngine.ts`, `react`, `package.json`, `patrimonio.tsx`, `ai-settings.tsx`, `useTheme`, `GlassCard`, `@expo/vector-icons`, `appearance.tsx`, `inversiones.tsx`, `createClient.ts`, `metas.tsx`, `webSpeech.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `appearance.tsx`, `onboarding.tsx`, `ia.tsx`, `finance.ts`, `inversiones.tsx`, `settings.tsx`, `(tabs)/index.tsx`, `capture.tsx`, `SyncEngine.ts`, `ThemeProvider.tsx`, `useAppStore`, `metas.tsx`, `react`, `patrimonio.tsx`, `ai-settings.tsx`, `GlassCard`, `@expo/vector-icons`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `De dónde sale el "65"`, `Deudas (9 operaciones)`, `Avisos (8 operaciones)` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0907563025210084 - nodes in this community are weakly interconnected._
- **Should `ia.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09178743961352658 - nodes in this community are weakly interconnected._
- **Should `onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._