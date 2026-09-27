# Graph Report - IVI  (2026-09-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1294 nodes · 4244 edges · 83 communities (56 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9f2f6891`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 67
- Community 69
- Community 70
- Community 72
- Community 74
- Community 75
- Community 78
- Community 80
- Community 82

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
- `Section` --references--> `Transaction`  [EXTRACTED]
  app/(tabs)/movimientos.tsx → src/data/types.ts
- `PendingSave` --references--> `Currency`  [EXTRACTED]
  app/budget-template/[id].tsx → src/data/types.ts
- `Capture()` --calls--> `applyCustomMapping()`  [EXTRACTED]
  app/capture.tsx → src/ai/localParser.ts
- `Capture()` --calls--> `detectAccountAdjustment()`  [EXTRACTED]
  app/capture.tsx → src/ai/localParser.ts
- `Capture()` --calls--> `resolveAccountByNameHint()`  [EXTRACTED]
  app/capture.tsx → src/utils/accounts.ts

## Import Cycles
- None detected.

## Communities (83 total, 27 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (69): cleanString(), finiteAmount(), positiveAmount(), resolveAccountType(), resolveAddAccount(), resolveAddGoal(), resolveAddLiability(), resolveAddTransaction() (+61 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (58): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (55): Draft, Inversiones(), InvestmentForm(), LiquidityForm(), round4(), styles, TransactionForm(), Draft (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (49): AccountCard(), AccountCardVisual(), AccountCardVisualProps, styles, AccountCardStack(), AccountStackItem, StackedCard(), styles (+41 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (43): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetActionPanel(), CollapsibleRow(), BudgetCalendar(), BudgetTemplateLegend() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (28): groupByDay(), Section, styles, styles, TransactionDetail(), @expo/vector-icons, react, react-native (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (32): Dashboard(), GROUP_LABELS, Scope, styles, isActive(), selectActiveBudgetAssignments(), selectActiveBudgetTemplates(), selectActiveLiabilities() (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (30): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, NewTransaction(), normalize(), SearchEntry (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (24): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, SEX_OPTIONS, styles (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (23): Instalar(), Step(), AccountDropdown(), MenuItem, MiniSwitch(), styles, ChartOptionsDropdown(), PERIOD_LABELS (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (24): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, Perfil(), Settings(), usePushProfileOnChange(), useMarketDataRefresh(), buildProfileRow() (+16 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (23): react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), BudgetProgressItem, capItems() (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (26): ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS, ContributeToGoalCandidate (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (25): AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, AIActionProposal, AIActionStatus, AIActionType, ChatConversation (+17 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (25): main, name, private, version, expo, expo-clipboard, expo-constants, expo-crypto (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (24): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, DateRange, CategorySpendSlice, FinancialHealth, HealthFactor, incomeByConceptInRange() (+16 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (20): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, ONBOARDING_GROUP_EXPLANATIONS, Step, styles, BudgetSearchBar() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (16): Index(), Privacidad(), styles, CURRENCIES, styles, THEME_OPTIONS, establishSessionFromUrl(), deleteAccountPermanently() (+8 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (20): GROUP_COLOR_KEY, GROUP_ICON, GROUPS, Scope, styles, CUSTOM_OPTIONS, PropagateChoice, PropagateChoiceSheet() (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (11): answerQuestion(), localActionAgentProvider, localAIInterpreterProvider, localCopilotProvider, staticExchangeRateProvider, ProviderRegistry, ActionAgentProvider, AIInterpreterProvider (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (17): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Rule, rules, SUGGESTED_QUESTIONS, buildActionContextSummary(), buildFinancialContextSummary() (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.28
Nodes (20): ActionValidationContext, CopilotContext, Account, AuditAction, AuditLogEntry, Budget, BudgetAssignment, BudgetTemplate (+12 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (17): Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (16): TabsLayout(), Terminos(), AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS, styles (+8 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (15): AiSettings(), PROVIDERS, Status, styles, clearLLMProviderConfig(), isSecureStorageNative, setLLMProviderConfig(), LLM_PROVIDER_COST_NOTE (+7 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (16): comparePeriodKeys(), isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, pad(), ParsedPeriod, parsePeriodKey() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.26
Nodes (15): BudgetTemplateEdit(), Onboarding(), ConceptBudgetForm(), ConceptRow(), ConceptSubBudgets(), IncomeConceptRow(), ProgressBar(), styles (+7 more)

### Community 33 - "Community 33"
Cohesion: 0.21
Nodes (13): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.38
Nodes (8): createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient(), createLLMClient(), providerFetch(), LLMClient, LLMMessage

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (11): ParsedCapture, TransactionType, CetesRates, ExchangeRateInfo, MarketQuote, AccountDelta, accountDeltasForTransaction(), INFLOW_TYPES (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.19
Nodes (8): unavailableMarketDataProvider, registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), MarketDataProvider, supabaseAnonPublicKey

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (11): PendingSave, BudgetFormInitial, styles, BudgetFrequency, BudgetPeriodicity, BudgetCalcInput, computeMonthlyAmount(), FREQUENCY_LABELS (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (8): createLLMActionAgentProvider(), CATEGORY_CATALOG, createLLMAIInterpreterProvider(), registerConfiguredLLMProvider(), getLLMProviderConfig(), setActionAgentProvider(), setAIInterpreterProvider(), setCopilotProvider()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (8): budgets_set_timestamps, budgets_user_id_idx, goals_set_timestamps, goals_user_id_idx, public.budgets, public.goals, auth.users, public.set_sync_timestamps

### Community 43 - "Community 43"
Cohesion: 0.33
Nodes (8): investments_set_timestamps, investments_user_id_idx, liabilities_set_timestamps, liabilities_user_id_idx, public.investments, public.liabilities, auth.users, public.set_sync_timestamps

### Community 44 - "Community 44"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 45 - "Community 45"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 46 - "Community 46"
Cohesion: 0.32
Nodes (6): ALL_ACCOUNT_TYPES, Draft, styles, ACCOUNT_COLOR_SWATCHES, CASH_ACCOUNT_COLOR, DEFAULT_ACCOUNT_COLOR

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (6): scripts, android, build:web, ios, start, web

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "Community 51"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): SyncOp, SyncQueueEntry, SyncTable

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "Community 54"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

## Knowledge Gaps
- **363 isolated node(s):** `AccountAdjustment`, `AccountAdjustmentDirection`, `AmountCandidate`, `HoldState`, `HoldToConfirmButtonProps` (+358 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 420 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `Community 6` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 27`, `Community 28`, `Community 29`, `Community 32`, `Community 33`, `Community 34`, `Community 38`, `Community 45`, `Community 46`, `Community 49`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `Community 28` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 20`, `Community 21`, `Community 22`, `Community 24`, `Community 27`, `Community 29`, `Community 32`, `Community 33`, `Community 38`, `Community 46`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 12` to `Community 18`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `AccountAdjustment`, `AccountAdjustmentDirection`, `AmountCandidate` to the rest of the system?**
  _363 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0669710806697108 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05593561368209256 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07307692307692308 - nodes in this community are weakly interconnected._