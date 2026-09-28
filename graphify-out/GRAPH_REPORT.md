# Graph Report - IVI  (2026-09-27)

## Corpus Check
- 200 files · ~149,614 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1296 nodes · 4245 edges · 79 communities (49 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `50db7a12`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- actionCatalog.ts
- ia.tsx
- useTheme
- themeRegistry.ts
- presupuesto.tsx
- repositories.ts
- useAppStore
- (tabs)/index.tsx
- movimientos.tsx
- perfil.tsx
- ThemeProvider.tsx
- app.js
- dependencies
- app/_layout.tsx
- NetWorthTrendChart.tsx
- expo
- MonthBudgetBreakdown.tsx
- useAppStore.ts
- package.json
- finance.ts
- onboarding.tsx
- client.ts
- budget-template/[id].tsx
- registry.ts
- financialInsights.ts
- data/types.ts
- 0014_budget_templates.sql
- BudgetTemplateList.tsx
- react
- PropagateChoiceSheet.tsx
- 0001_core_profiles_accounts_transactions.sql
- budgetPeriods.ts
- BudgetTemplate
- appearance.tsx
- Repository
- market-data/index.ts
- ledger.ts
- CLAUDE.md
- id.ts
- manifest.json
- 0005_audit_log.sql
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- ai-relay/index.ts
- scripts
- @react-native-async-storage/async-storage
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
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
- `PendingSave` --references--> `Currency`  [EXTRACTED]
  app/budget-template/[id].tsx → src/data/types.ts
- `Section` --references--> `Transaction`  [EXTRACTED]
  app/(tabs)/movimientos.tsx → src/data/types.ts
- `Capture()` --calls--> `applyCustomMapping()`  [EXTRACTED]
  app/capture.tsx → src/ai/localParser.ts
- `Capture()` --calls--> `detectAccountAdjustment()`  [EXTRACTED]
  app/capture.tsx → src/ai/localParser.ts
- `Capture()` --calls--> `resolveAccountByNameHint()`  [EXTRACTED]
  app/capture.tsx → src/utils/accounts.ts

## Import Cycles
- None detected.

## Communities (79 total, 30 thin omitted)

### Community 0 - "actionCatalog.ts"
Cohesion: 0.05
Nodes (91): ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS, cleanString() (+83 more)

### Community 1 - "ia.tsx"
Cohesion: 0.08
Nodes (41): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), MessageBody(), styles (+33 more)

### Community 2 - "useTheme"
Cohesion: 0.06
Nodes (87): PendingSave, Instalar(), Step(), Onboarding(), Draft, Inversiones(), InvestmentForm(), LiquidityForm() (+79 more)

### Community 3 - "themeRegistry.ts"
Cohesion: 0.09
Nodes (33): darkColors, lightColors, palette, ThemeColors, ThemeContextValue, BASE_VARIANT, isExpired(), isRecord() (+25 more)

### Community 4 - "presupuesto.tsx"
Cohesion: 0.23
Nodes (26): monthEndIso(), monthStartIso(), Presupuesto(), styles, bucketOf(), BudgetTemplateList(), bucketOf(), MonthBudgetBreakdown() (+18 more)

### Community 5 - "repositories.ts"
Cohesion: 0.08
Nodes (37): accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow(), budgetTemplateFromRow() (+29 more)

### Community 6 - "useAppStore"
Cohesion: 0.20
Nodes (16): Perfil(), Privacidad(), styles, CURRENCIES, Settings(), styles, THEME_OPTIONS, formatExpiry() (+8 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.14
Nodes (26): Dashboard(), GROUP_LABELS, Scope, styles, AccountCardStack(), BudgetProgressItem, DonutChart(), budgetConceptsByGroup() (+18 more)

### Community 8 - "movimientos.tsx"
Cohesion: 0.08
Nodes (52): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, groupByDay(), Movimientos(), styles (+44 more)

### Community 9 - "perfil.tsx"
Cohesion: 0.15
Nodes (23): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, SEX_OPTIONS, styles (+15 more)

### Community 10 - "ThemeProvider.tsx"
Cohesion: 0.15
Nodes (24): react-native, AccountCardVisual(), styles, StackedCard(), styles, AccountDropdown(), MenuItem, MiniSwitch() (+16 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "app/_layout.tsx"
Cohesion: 0.17
Nodes (19): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, usePushProfileOnChange(), buildProfileRow(), pushRemoteProfile(), pushRemoteProfileKeepalive(), ALL_TABLES (+11 more)

### Community 14 - "NetWorthTrendChart.tsx"
Cohesion: 0.15
Nodes (24): react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), capItems(), styles (+16 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "MonthBudgetBreakdown.tsx"
Cohesion: 0.20
Nodes (8): DonutChartProps, DonutSlice, Bucket, BUCKET_LABELS, BUCKET_ORDER, Segment, styles, BudgetGroupId

### Community 17 - "useAppStore.ts"
Cohesion: 0.11
Nodes (34): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionProposal, AIActionStatus, AIActionType, ChatConversation (+26 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (23): main, name, private, version, expo, expo-constants, expo-font, expo-linking (+15 more)

### Community 19 - "finance.ts"
Cohesion: 0.12
Nodes (30): makeSubBudgetId(), getUsdMxnRate(), buildFinancialContextSummary(), buildBudgetLines(), CategorySpendSlice, computeNetWorth(), countsForBudget(), FinancialHealth (+22 more)

### Community 20 - "onboarding.tsx"
Cohesion: 0.07
Nodes (38): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, ONBOARDING_GROUP_EXPLANATIONS, Step, styles, Draft (+30 more)

### Community 21 - "client.ts"
Cohesion: 0.14
Nodes (17): Index(), registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), AuthState, useProfileReconciliation() (+9 more)

### Community 22 - "budget-template/[id].tsx"
Cohesion: 0.20
Nodes (25): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, Scope, styles, SaludFinanciera(), STATUS_ICON (+17 more)

### Community 23 - "registry.ts"
Cohesion: 0.05
Nodes (58): AiSettings(), PROVIDERS, Status, styles, ResolveOk, ResolvedAction, answerQuestion(), isWebSpeechAvailable() (+50 more)

### Community 24 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 25 - "data/types.ts"
Cohesion: 0.18
Nodes (21): Section, ActionValidationContext, CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, Account, AuditAction (+13 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "BudgetTemplateList.tsx"
Cohesion: 0.14
Nodes (18): BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles, Bucket, BUCKET_LABELS, BUCKET_ORDER, styles (+10 more)

### Community 28 - "react"
Cohesion: 0.19
Nodes (17): TabsLayout(), expo-router, react, react-native-safe-area-context, AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu() (+9 more)

### Community 29 - "PropagateChoiceSheet.tsx"
Cohesion: 0.50
Nodes (3): CUSTOM_OPTIONS, PropagateChoice, styles

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "budgetPeriods.ts"
Cohesion: 0.14
Nodes (18): comparePeriodKeys(), dateInRange(), DateRange, isDateInPeriodKey(), makePeriodKey(), MONTH_NAMES, MONTH_SHORT, pad() (+10 more)

### Community 32 - "BudgetTemplate"
Cohesion: 0.67
Nodes (4): BudgetAssignment, BudgetTemplate, ResolvedPeriodBudget, UpcomingAssignmentSummary

### Community 33 - "appearance.tsx"
Cohesion: 0.11
Nodes (27): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+19 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "ledger.ts"
Cohesion: 0.29
Nodes (6): AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES, reverseDeltas()

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 42 - "0002_budgets_goals.sql"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "0003_investments_liabilities.sql"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

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

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

## Knowledge Gaps
- **364 isolated node(s):** `graphify`, `AccountAdjustment`, `AccountAdjustmentDirection`, `AmountCandidate`, `HoldState` (+359 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 422 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `ThemeProvider.tsx` to `ia.tsx`, `useTheme`, `presupuesto.tsx`, `useAppStore`, `(tabs)/index.tsx`, `movimientos.tsx`, `perfil.tsx`, `app/_layout.tsx`, `NetWorthTrendChart.tsx`, `MonthBudgetBreakdown.tsx`, `package.json`, `onboarding.tsx`, `client.ts`, `budget-template/[id].tsx`, `registry.ts`, `BudgetTemplateList.tsx`, `react`, `PropagateChoiceSheet.tsx`, `appearance.tsx`, `@react-native-async-storage/async-storage`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `appearance.tsx`, `ia.tsx`, `presupuesto.tsx`, `useAppStore`, `(tabs)/index.tsx`, `movimientos.tsx`, `perfil.tsx`, `ThemeProvider.tsx`, `app/_layout.tsx`, `NetWorthTrendChart.tsx`, `MonthBudgetBreakdown.tsx`, `onboarding.tsx`, `client.ts`, `budget-template/[id].tsx`, `registry.ts`, `BudgetTemplateList.tsx`, `react`, `PropagateChoiceSheet.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ia.tsx`, `useTheme`, `presupuesto.tsx`, `useAppStore`, `(tabs)/index.tsx`, `movimientos.tsx`, `perfil.tsx`, `ThemeProvider.tsx`, `app/_layout.tsx`, `NetWorthTrendChart.tsx`, `MonthBudgetBreakdown.tsx`, `package.json`, `onboarding.tsx`, `client.ts`, `budget-template/[id].tsx`, `registry.ts`, `BudgetTemplateList.tsx`, `PropagateChoiceSheet.tsx`, `appearance.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `graphify`, `AccountAdjustment`, `AccountAdjustmentDirection` to the rest of the system?**
  _364 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actionCatalog.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05021929824561404 - nodes in this community are weakly interconnected._
- **Should `ia.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07568027210884354 - nodes in this community are weakly interconnected._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.055525606469002696 - nodes in this community are weakly interconnected._