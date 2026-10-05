# Graph Report - IVI  (2026-10-05)

## Corpus Check
- 334 files · ~398,034 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 2763 nodes · 8241 edges · 170 communities (126 shown, 44 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 195 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68bea3da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- dates.ts
- avisos.tsx
- creditCard.ts
- build-golden.cjs
- repositories.ts
- client.ts
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
- react-native
- findDateMentions
- onboarding.tsx
- formatDateDMY
- materialize.ts
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- chatIntentParser.ts
- react-native-safe-area-context
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- catalogLoader.ts
- themeRegistry.ts
- Selector Interactivo de Técnicas de Diagnóstico Organizacional
- market-data/index.ts
- useAppStore
- CLAUDE.md
- Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)
- manifest.json
- 0005_audit_log.sql
- Bitácora de cambios
- 0002_budgets_goals.sql
- 0003_investments_liabilities.sql
- tsconfig.json
- Arquitectura
- parseYmd
- ai-relay/index.ts
- bench.cjs
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- recurrenceText.ts
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
- NotificationProvider
- build.py
- sync-mapeo.cjs
- Fase 2 P0-S2 — Contratos versionados del motor local
- ejecutor.cjs
- movimientos.tsx
- app/_layout.tsx
- concepts.ts
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- registry.ts
- Motor de clasificación (registro por voz/texto)
- p3-chat.cjs
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- handwritten.cjs
- webSpeech.ts
- Account
- packs.cjs
- 0020_push_notifications.sql
- categories.ts
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments
- Golden set del motor local — resultados (P1, P1b y P2)
- 1. Estado Actual y Componentes Activos (The Core)
- fuzz.cjs
- useTheme
- size-report.cjs
- presupuesto.tsx
- run-golden.cjs
- actionCatalogP3.ts
- p3-store.cjs
- appearance.tsx
- ia.tsx
- previsto.cjs
- chat-snapshot.cjs
- 0023_p3_forecast_recurring_reminders.sql
- rnd
- scripts
- run-planes.cjs
- usePressToTalk.ts
- deudas.cjs
- run-fechas.cjs
- capture.tsx
- ics.ts
- golden/README.md
- createClient.ts
- planExecutor.ts
- smoke-web.cjs
- P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos
- recurrencia.cjs
- 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)
- isoOf
- tarjeta-store.cjs
- P2 — Planificador multi-acción, fechas y catálogo en segundo plano
- surveyRepository.ts
- virtualIds.ts
- 0022_category_mappings.sql
- ThemeContextValue
- stub-native.cjs
- p3Validation.ts
- ledger.ts
- fresh.cjs
- date.ts
- fechas.cjs
- fechas-sellado.cjs
- fresh2.cjs
- @react-native-async-storage/async-storage
- stub-async-storage.cjs
- sync/types.ts
- expo-router
- fresh3.cjs
- public.liabilities
- public.liabilities
- registerConfiguredProvider.ts
- tarjeta.cjs
- Tarjeta de crédito — que no se te pase ni el corte ni el pago
- staticExchangeRateProvider.ts
- onboardingSurvey.ts
- financialInsights.ts
- public.accounts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 192 edges
2. `useAppStore` - 132 edges
3. `react-native` - 106 edges
4. `react` - 105 edges
5. `formatCurrency()` - 82 edges
6. `GlassCard()` - 80 edges
7. `@expo/vector-icons` - 68 edges
8. `Currency` - 63 edges
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

## Communities (170 total, 44 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.05
Nodes (45): Qué fallaba en Fresco 5 (clases, no frases sueltas), ACCOUNT_DECREMENT_WORDS, ACCOUNT_INCREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, ARTICLE_AMBIGUOUS, __auditNumberVariants() (+37 more)

### Community 1 - "dates.ts"
Cohesion: 0.10
Nodes (19): DateMention, DatePrefer, DateRelation, DAY_WORDS, DAYWORD_RE, extractTime(), MONTH_ABBR, MONTH_RE (+11 more)

### Community 2 - "avisos.tsx"
Cohesion: 0.10
Nodes (48): Avisos(), Kind, KINDS, Recurrentes(), STATUS_LABEL, NewTransaction(), normalize(), SearchEntry (+40 more)

### Community 3 - "creditCard.ts"
Cohesion: 0.17
Nodes (19): anchorFor(), CardAlertPrefs, cardCycle, CardPayStatus, cardReminderSpecs(), CardSettings, cardStatement, daysBetween() (+11 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.08
Nodes (21): addFresh(), AMBIG, by, C, cases, catOf(), F, F2 (+13 more)

### Community 5 - "repositories.ts"
Cohesion: 0.06
Nodes (50): CategoryMappingRecord, Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow() (+42 more)

### Community 6 - "client.ts"
Cohesion: 0.19
Nodes (14): Index(), RawCetesRates, RawQuote, AuthState, useAuthSession(), useProfileReconciliation(), isSupabaseConfigured, supabase (+6 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.12
Nodes (31): Dashboard(), GROUP_LABELS, Scope, styles, AccountCard(), AccountCardVisual(), AccountCardVisualProps, styles (+23 more)

### Community 8 - "planner.ts"
Cohesion: 0.08
Nodes (44): 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, Estado de implementación (P2, 2026-10-04), assert, base, ctx, oneAccount, { planFromText, answerClarification, previewPlan, splitPlanSegments }, { resolveAddTransaction } (+36 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.25
Nodes (15): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, repositoryByTable, ALL_TABLES, getSessionCreds(), getUserId(), OPTIONAL_TABLES, pullRemoteChanges() (+7 more)

### Community 10 - "extended.ts"
Cohesion: 0.08
Nodes (22): typescript, fs, Module, path, ROOT, ts, PACK_BANCOS, PACK_COMIDA (+14 more)

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
Cohesion: 0.08
Nodes (40): Razones históricas de por qué se pausó originalmente (2026-09-02), ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS (+32 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.07
Nodes (57): AddAccountArgs, AddForecastArgs, AddGoalArgs, AddLiabilityArgs, AddRecurringArgs, AddRecurringContributionArgs, AddReminderArgs, AddTransactionArgs (+49 more)

### Community 18 - "package.json"
Cohesion: 0.07
Nodes (25): config, { getDefaultConfig }, devDependencies, @types/react, typescript, main, name, private (+17 more)

### Community 19 - "finance.ts"
Cohesion: 0.08
Nodes (38): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, 4. Contrato de cálculo y presentación de efectos, ProgressBarProps, buildFinancialContextSummary(), comparePeriodKeys(), DateRange (+30 more)

### Community 20 - "react-native"
Cohesion: 0.07
Nodes (54): Instalar(), Step(), styles, Privacidad(), styles, CURRENCIES, Settings(), styles (+46 more)

### Community 21 - "findDateMentions"
Cohesion: 0.26
Nodes (14): addDays(), extractPeriod(), findDateMentions(), add(), fold(), fullYear(), num(), pickDayMonth() (+6 more)

### Community 22 - "onboarding.tsx"
Cohesion: 0.09
Nodes (58): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, AGE_OPTIONS (+50 more)

### Community 23 - "formatDateDMY"
Cohesion: 0.24
Nodes (22): resolveAddGoal(), resolveAddTransaction(), resolveTransferBetweenAccounts(), activeAccounts(), eligibleAccounts(), resolveAddForecast(), resolveAddRecurring(), resolveAddReminder() (+14 more)

### Community 24 - "materialize.ts"
Cohesion: 0.14
Nodes (26): noonIso(), buildForecast(), buildOccurrence(), dateOfIso(), DEFAULT_CATEGORY, eventDatesFor(), FORECAST_HORIZON_DAYS, forecastIdFor() (+18 more)

### Community 25 - "data/types.ts"
Cohesion: 0.12
Nodes (40): Section, 1.3 Esquema de datos — jerarquía y clasificación exacta, 3. Avisos (recordatorios), ForecastGroup, ActionValidationContext, CopilotContext, Rule, rules (+32 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "chatIntentParser.ts"
Cohesion: 0.17
Nodes (33): Mapa de piezas, resolveBudgetConcept(), resolveCandidate(), resolveContributeToGoal(), resolveDeleteAccount(), resolveDeleteBudgetLine(), resolveDeleteGoal(), resolveDeleteLiability() (+25 more)

### Community 29 - "react-native-safe-area-context"
Cohesion: 0.14
Nodes (25): Auth(), Mode, styles, ForgotPassword(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS (+17 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.06
Nodes (103): InstitutionScreen(), money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), Inversiones() (+95 more)

### Community 32 - "catalogLoader.ts"
Cohesion: 0.16
Nodes (18): 1. El «túnel» del catálogo: qué es y qué no es, Cómo se comporta, De dónde sale el resto del peso (atribución por mapa de fuentes, antes de quitar reanimated), Peso medido (descarga comprimida al abrir la app, versión web; KB = 1,024 bytes), Qué NO se hizo, y por qué, warmUpLocalParser(), CatalogStatus, getCatalogStatus() (+10 more)

### Community 33 - "themeRegistry.ts"
Cohesion: 0.12
Nodes (28): fetchRemoteVisualStyles(), useRemoteVisualStyles(), darkColors, lightColors, palette, ThemeColors, BASE_VARIANT, isExpired() (+20 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "useAppStore"
Cohesion: 0.17
Nodes (31): Tarjetas(), previewPlan(), AttentionWidget(), CardPanel(), TIMES, ForecastView(), selectActiveAccounts(), selectActiveOccurrences() (+23 more)

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.15
Nodes (12): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+4 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.10
Nodes (21): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03/04 — P2: planificador multi-acción, fechas, catálogo en segundo plano y lo aprendido en la nube, 2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, 2026-10-04 — P3: previsto vs. real, pagos recurrentes, avisos, deudas y dividendos (+13 more)

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

### Community 46 - "parseYmd"
Cohesion: 0.26
Nodes (12): nextEventDate(), clampDay(), daysInMonth(), fromEpochDay(), generate(), isLeap(), nextOccurrence(), parseYmd() (+4 more)

### Community 47 - "ai-relay/index.ts"
Cohesion: 0.29
Nodes (5): ALLOWED_HOSTS, CORS_HEADERS, FORWARDABLE_HEADERS, RelayRequest, requestLog

### Community 48 - "bench.cjs"
Cohesion: 0.10
Nodes (18): home_user_ivi_scripts_golden_golden_set_cases, { cases }, { DEFAULT_CATEGORIES: D }, P, t0, t1, texts, scripts_golden_golden_set (+10 more)

### Community 50 - "0004_net_worth_snapshots.sql"
Cohesion: 0.40
Nodes (5): net_worth_snapshots_set_timestamps, net_worth_snapshots_user_date_idx, public.net_worth_snapshots, auth.users, public.set_sync_timestamps

### Community 51 - "diagnostico-organizacional/vercel.json"
Cohesion: 0.50
Nodes (3): cleanUrls, headers, trailingSlash

### Community 52 - "recurrenceText.ts"
Cohesion: 0.24
Nodes (12): findRecurrence(), foldKeep(), Hit, matchCore(), matchDayOfMonth(), NUM_WORDS, numOf(), RecurrenceMention (+4 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "ai-settings.tsx"
Cohesion: 0.20
Nodes (15): AiSettings(), PROVIDERS, Status, styles, clearLLMProviderConfig(), isSecureStorageNative, setLLMProviderConfig(), LLM_PROVIDER_COST_NOTE (+7 more)

### Community 61 - "Catálogo de categorías"
Cohesion: 0.22
Nodes (9): Ahorro — ahorro e inversión, Ampliación P1b (2026-10-03): áreas de finanzas personales que faltaban, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir (+1 more)

### Community 62 - "ref_path"
Cohesion: 0.10
Nodes (18): ref_module, ref_path, acc(), bad, C, ctx, meta(), Module (+10 more)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "sync-mapeo.cjs"
Cohesion: 0.13
Nodes (13): assert, { categoryMappingToRow, categoryMappingFromRow }, Module, path, plainRepo(), queued(), repositoryByTable, { runSync } (+5 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.15
Nodes (16): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 5. Contrato de confirmación y ejecución idempotente, 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0 (+8 more)

### Community 87 - "ejecutor.cjs"
Cohesion: 0.20
Nodes (6): assert, { executePlan, recoverInterruptedPlan }, Module, path, { planFromText, previewPlan }, { useAppStore }

### Community 88 - "movimientos.tsx"
Cohesion: 0.26
Nodes (11): groupByDay(), Movimientos(), styles, styles, TransactionDetail(), CategoryIcon(), SectionToggle(), topSpendSubcategories() (+3 more)

### Community 89 - "app/_layout.tsx"
Cohesion: 0.16
Nodes (18): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, expo-splash-screen, expo-status-bar, react-native-gesture-handler, usePushProfileOnChange(), useMarketDataRefresh() (+10 more)

### Community 90 - "concepts.ts"
Cohesion: 0.19
Nodes (11): Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03), Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo), Cómo se evita el relleno (la parte que más importa), Dónde vive cada cosa, Golden set y resultados, Tamaño real (medido, no estimado), Conjuntos nuevos, detectConcepts() (+3 more)

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "registry.ts"
Cohesion: 0.15
Nodes (15): 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), localAIInterpreterProvider, unavailableMarketDataProvider, registerMarketDataProvider(), relayMarketDataProvider, ProviderRegistry (+7 more)

### Community 94 - "Motor de clasificación (registro por voz/texto)"
Cohesion: 0.12
Nodes (25): Movimientos (11 operaciones), Ajuste de saldo y separación de varios movimientos, Coincidencia por límite de palabra (bug corregido 2026-09-02), Corrección difusa (typos de dictado/tecleo), Desambiguación de "gas", Extracción del monto (`extractAmount`), Fechas, planes y catálogo en segundo plano (P2, 2026-10-03/04), Montos: decimales, miles y abreviaturas (2026-10-03) (+17 more)

### Community 95 - "p3-chat.cjs"
Cohesion: 0.14
Nodes (23): acc(), assert, bal(), ctx(), expectAction(), expectClar(), expectNot(), meta() (+15 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.14
Nodes (14): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, getRegistration(), webPushNotificationProvider, NotificationPermission (+6 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "handwritten.cjs"
Cohesion: 0.22
Nodes (8): AJUSTES, GAS, MONTOS, MULTI_NUMERO, SEGMENTOS, SIN_CATEGORIA, TIPOS, TYPOS

### Community 99 - "webSpeech.ts"
Cohesion: 0.39
Nodes (6): isWebSpeechAvailable(), SPEECH_ERROR_MESSAGES, speechErrorMessage(), StartListeningOptions, startWebSpeechListening(), webSpeechProvider

### Community 100 - "Account"
Cohesion: 0.10
Nodes (23): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (actualizada 2026-10-04), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — ahora viaja con la cuenta (2026-10-04) (+15 more)

### Community 101 - "packs.cjs"
Cohesion: 0.08
Nodes (20): assert, cat, ext, loader, parser, sub(), AMBIG_NORM, AMBIGUOUS_BARE (+12 more)

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth, auth.users

### Community 103 - "categories.ts"
Cohesion: 0.08
Nodes (23): B, covered, { DEFAULT_CATEGORIES: D }, dup, ids, subs, COMMON, { DEFAULT_CATEGORIES } (+15 more)

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "Golden set del motor local — resultados (P1, P1b y P2)"
Cohesion: 0.11
Nodes (18): Cifras que se pueden creer (primera y única corrida), Cifras que se pueden creer (primera y única corrida de cada sellado), Conjuntos nuevos, Contaminación (para no engañarse), Contaminación (para no engañarse), Cómo seguir, Experimentos descartados (no se adoptaron), Golden set del motor local — resultados (P1, P1b y P2) (+10 more)

### Community 110 - "1. Estado Actual y Componentes Activos (The Core)"
Cohesion: 0.08
Nodes (23): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), 1. Estado Actual y Componentes Activos (The Core), 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 3.2 La conexión de IA — qué es bug real y qué es diseño esperado (+15 more)

### Community 111 - "fuzz.cjs"
Cohesion: 0.11
Nodes (18): argv, assert, base, ctx, D, { detectChatIntent }, { findRecurrence }, hostile (+10 more)

### Community 112 - "useTheme"
Cohesion: 0.09
Nodes (37): Draft, LIABILITY_TYPES, LiabilityForm(), Patrimonio(), SectionHeader(), styles, AccountCardStack(), AccountStackItem (+29 more)

### Community 113 - "size-report.cjs"
Cohesion: 0.12
Nodes (14): ref_child_process, ref_os, ref_zlib, BUDGETS, dirArg, { execSync }, fs, initial (+6 more)

### Community 114 - "presupuesto.tsx"
Cohesion: 0.10
Nodes (46): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles (+38 more)

### Community 115 - "run-golden.cjs"
Cohesion: 0.11
Nodes (18): allRows, args, { cases }, cl, eq(), evaluate(), GOLDEN_NOW, knownRows (+10 more)

### Community 116 - "actionCatalogP3.ts"
Cohesion: 0.08
Nodes (62): AddForecastCandidate, AddRecurringCandidate, AddRecurringContributionCandidate, AddReminderCandidate, askForecast(), askOpenLiability(), askRecurrence(), askRule() (+54 more)

### Community 117 - "p3-store.cjs"
Cohesion: 0.15
Nodes (17): acc(), assert, bal(), fcs(), live(), Module, occsOf(), pad() (+9 more)

### Community 118 - "appearance.tsx"
Cohesion: 0.07
Nodes (46): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, expo-image-picker (+38 more)

### Community 119 - "ia.tsx"
Cohesion: 0.08
Nodes (50): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+42 more)

### Community 120 - "previsto.cjs"
Cohesion: 0.11
Nodes (15): { accountDeltasForTransaction }, accounts, assert, { deterministicId }, F, L, M, meta() (+7 more)

### Community 121 - "chat-snapshot.cjs"
Cohesion: 0.29
Nodes (6): base, ctx, { detectChatIntent }, NOW, out, PHRASES

### Community 122 - "0023_p3_forecast_recurring_reminders.sql"
Cohesion: 0.17
Nodes (18): public.transactions, public.recurring_rules, public.reminder_occurrences, public.reminders, recurring_rules_set_timestamps, recurring_rules_user_updated_idx, reminder_occurrences_due_idx, reminder_occurrences_reminder_idx (+10 more)

### Community 123 - "rnd"
Cohesion: 0.40
Nodes (5): amountText(), int(), pick(), rnd, words()

### Community 124 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, android, build:web, ios, size, start, test, typecheck (+1 more)

### Community 125 - "run-planes.cjs"
Cohesion: 0.14
Nodes (10): NONE, argsOk(), base, byKind, CASES, check(), ctx, fails (+2 more)

### Community 126 - "usePressToTalk.ts"
Cohesion: 0.50
Nodes (3): PressToTalkStatus, UsePressToTalkResult, providers

### Community 127 - "deudas.cjs"
Cohesion: 0.18
Nodes (11): acc(), assert, { computeNetWorth, upcomingLiabilityReminders }, D, lb(), meta, Module, path (+3 more)

### Community 128 - "run-fechas.cjs"
Cohesion: 0.40
Nodes (3): D, fails, sealed

### Community 129 - "capture.tsx"
Cohesion: 0.15
Nodes (20): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, Memoria de correcciones (mapeo personal), describeDateEs(), applyCustomMapping() (+12 more)

### Community 130 - "ics.ts"
Cohesion: 0.43
Nodes (7): RFC-5545, alarmTrigger(), buildIcs(), compact(), escapeIcsText(), foldLine(), utcStamp()

### Community 133 - "createClient.ts"
Cohesion: 0.38
Nodes (8): createClaudeClient(), createGeminiClient(), createGrokClient(), createOpenAIClient(), createLLMClient(), providerFetch(), LLMClient, LLMMessage

### Community 134 - "planExecutor.ts"
Cohesion: 0.43
Nodes (6): PlanStatus, ApplyStepResult, executePlan(), ExecuteResult, recoverInterruptedPlan(), statusFromSteps()

### Community 135 - "smoke-web.cjs"
Cohesion: 0.17
Nodes (11): ref_fs, ref_http, fs, http, meta, now, path, routes (+3 more)

### Community 136 - "P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos"
Cohesion: 0.18
Nodes (11): 1. Previsto vs. real, 2. Pagos recurrentes, 4. Deudas ampliadas y dividendos, 5. Chat: 15 acciones nuevas, Cómo se midió (y qué NO prueba), En una frase, Lo que NO está hecho (y por qué), Mapa de piezas (+3 more)

### Community 137 - "recurrencia.cjs"
Cohesion: 0.25
Nodes (5): assert, P, R, ri(), rnd()

### Community 138 - "2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)"
Cohesion: 0.20
Nodes (10): 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`), Acciones del chat (17 tipos, catálogo cerrado), Aclaraciones (§2), Con una IA conectada (BYOK), Ejecutor (§5), Límites conocidos, Qué hace (ejemplos reales de las pruebas), Reconocimiento local: errores de siempre que se corrigieron (+2 more)

### Community 139 - "isoOf"
Cohesion: 0.50
Nodes (5): fortnightPeriod(), isoOf(), lastDayOfMonth(), monthPeriod(), relationOf()

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
Nodes (8): base(), isVirtualId(), norm(), substituteVirtualIds(), VIRTUAL_PREFIX, virtualIdFor(), VirtualKind, virtualKindOf()

### Community 144 - "0022_category_mappings.sql"
Cohesion: 0.40
Nodes (5): category_mappings_set_timestamps, category_mappings_user_updated_idx, public.category_mappings, auth.users, public.set_sync_timestamps

### Community 145 - "ThemeContextValue"
Cohesion: 0.32
Nodes (7): ThemeContextValue, radius, spacing, TextWeight, typography, TypographyScale, TypographyToken

### Community 146 - "stub-native.cjs"
Cohesion: 0.40
Nodes (4): ref_crypto, crypto, handler, proxy

### Community 147 - "p3Validation.ts"
Cohesion: 0.29
Nodes (7): validTimeOfDay(), normalizeIntervalMinutes(), REMINDER_DEFAULTS, ReminderDraft, RuleDraft, validateReminderDraft(), validateRuleDraft()

### Community 148 - "ledger.ts"
Cohesion: 0.40
Nodes (4): AccountDelta, INFLOW_TYPES, mergeDeltas(), OUTFLOW_TYPES

### Community 150 - "date.ts"
Cohesion: 0.09
Nodes (39): shiftMonths(), BudgetCalendar(), styles, CalendarPicker(), CalendarPickerProps, styles, DonutChart(), DonutChartProps (+31 more)

### Community 151 - "fechas.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 152 - "fechas-sellado.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 154 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 158 - "expo-router"
Cohesion: 0.21
Nodes (15): TabsLayout(), expo-router, AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS, styles (+7 more)

### Community 163 - "registerConfiguredProvider.ts"
Cohesion: 0.31
Nodes (9): answerQuestion(), createLLMAIInterpreterProvider(), createLLMCopilotProvider(), registerConfiguredLLMProvider(), getLLMProviderConfig(), localCopilotProvider, setActionAgentProvider(), setAIInterpreterProvider() (+1 more)

### Community 167 - "tarjeta.cjs"
Cohesion: 0.28
Nodes (6): assert, base(), C, meta, pay(), tx()

### Community 171 - "Tarjeta de crédito — que no se te pase ni el corte ni el pago"
Cohesion: 0.29
Nodes (7): Cómo funciona (reglas), Decisiones que tomé por defecto (cámbialas si no te gustan), Dónde está, En una frase, Lo que falta, Lo que garantiza que no se te pase, Tarjeta de crédito — que no se te pase ni el corte ni el pago

### Community 172 - "staticExchangeRateProvider.ts"
Cohesion: 0.38
Nodes (5): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo

### Community 173 - "onboardingSurvey.ts"
Cohesion: 0.33
Nodes (5): CASUAL_SURVEY, FORMAL_SURVEY, SurveyOption, SurveyQuestion, SurveyTone

### Community 174 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

## Knowledge Gaps
- **881 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+876 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1043 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **44 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `capture.tsx`, `avisos.tsx`, `client.ts`, `(tabs)/index.tsx`, `finance.ts`, `react-native`, `onboarding.tsx`, `date.ts`, `react-native-safe-area-context`, `expo-router`, `[product].tsx`, `useAppStore`, `ai-settings.tsx`, `movimientos.tsx`, `app/_layout.tsx`, `notificaciones.tsx`, `presupuesto.tsx`, `appearance.tsx`, `ia.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `capture.tsx`, `avisos.tsx`, `creditCard.ts`, `client.ts`, `(tabs)/index.tsx`, `planExecutor.ts`, `SyncEngine.ts`, `tarjeta-store.cjs`, `surveyRepository.ts`, `virtualIds.ts`, `useAppStore.ts`, `finance.ts`, `react-native`, `ledger.ts`, `onboarding.tsx`, `p3Validation.ts`, `materialize.ts`, `react-native-safe-area-context`, `[product].tsx`, `themeRegistry.ts`, `sync-mapeo.cjs`, `ejecutor.cjs`, `movimientos.tsx`, `app/_layout.tsx`, `p3-chat.cjs`, `Account`, `useTheme`, `presupuesto.tsx`, `actionCatalogP3.ts`, `p3-store.cjs`, `appearance.tsx`, `ia.tsx`, `deudas.cjs`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `capture.tsx`, `avisos.tsx`, `createClient.ts`, `client.ts`, `(tabs)/index.tsx`, `SyncEngine.ts`, `surveyRepository.ts`, `package.json`, `finance.ts`, `onboarding.tsx`, `date.ts`, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `expo-router`, `[product].tsx`, `useAppStore`, `ai-settings.tsx`, `movimientos.tsx`, `app/_layout.tsx`, `notificaciones.tsx`, `webSpeech.ts`, `useTheme`, `presupuesto.tsx`, `appearance.tsx`, `ia.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _881 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04902867715078631 - nodes in this community are weakly interconnected._
- **Should `dates.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `avisos.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10312004230565838 - nodes in this community are weakly interconnected._