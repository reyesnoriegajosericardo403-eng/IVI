# Graph Report - IVI  (2026-10-04)

## Corpus Check
- 332 files · ~397,506 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 2754 nodes · 8211 edges · 179 communities (139 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 195 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04426c2b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- dates.ts
- avisos.tsx
- actionCatalogP3.ts
- build-golden.cjs
- repositories.ts
- privacidad.tsx
- (tabs)/index.tsx
- planner.ts
- SyncEngine.ts
- extended.ts
- app.js
- dependencies
- push-notify/index.ts
- appearance.tsx
- expo
- actionCatalog.ts
- useAppStore.ts
- package.json
- finance.ts
- useTheme
- BudgetTemplateList.tsx
- budget-template/[id].tsx
- LLMActionAgentProvider.ts
- materialize.ts
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- chatIntentParser.ts
- actions.ts
- 0001_core_profiles_accounts_transactions.sql
- [product].tsx
- catalogLoader.ts
- visualStyles.ts
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
- recurrence.ts
- ai-relay/index.ts
- bench.cjs
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
- ejecutor.cjs
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
- client.ts
- formatCurrency
- app/_layout.tsx
- concepts.ts
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- ActionAgentProvider
- extractAmount
- p3-chat.cjs
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- audit-catalog.cjs
- metas.tsx
- Pendientes y decisiones abiertas
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
- patrimonio.tsx
- size-report.cjs
- presupuesto.tsx
- run-golden.cjs
- p3Intents.ts
- p3-store.cjs
- NetWorthTrendChart.tsx
- ChatPlanCard.tsx
- previsto.cjs
- AiOrb.tsx
- 0023_p3_forecast_recurring_reminders.sql
- ChatSidebar.tsx
- scripts
- run-planes.cjs
- usePressToTalk.ts
- deudas.cjs
- P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)
- accounts.ts
- ics.ts
- golden/README.md
- createClient.ts
- planExecutor.ts
- smoke-web.cjs
- P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos
- ref_assert
- 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)
- react-native
- tarjeta-store.cjs
- P2 — Planificador multi-acción, fechas y catálogo en segundo plano
- surveyRepository.ts
- virtualIds.ts
- 0022_category_mappings.sql
- ThemeContextValue
- stub-native.cjs
- p3Validation.ts
- AccountDropdown.tsx
- themeRegistry.ts
- budgetPeriods.ts
- fechas.cjs
- fechas-sellado.cjs
- LLMAIInterpreterProvider.ts
- @react-native-async-storage/async-storage
- stub-async-storage.cjs
- keywordPacks/index.ts
- AppTabBar.tsx
- localCopilot.ts
- public.liabilities
- public.liabilities
- providers/types.ts
- registry.ts
- classifyNormalized
- ts-hook.cjs
- formatDateDMY
- tarjeta.cjs
- AppBackground.tsx
- AppearancePreview.tsx
- catalogo.cjs
- Tarjeta de crédito — que no se te pase ni el corte ni el pago
- staticExchangeRateProvider.ts
- onboardingSurvey.ts
- financialInsights.ts
- metro.config.js
- devDependencies
- public.accounts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 192 edges
2. `useAppStore` - 132 edges
3. `react-native` - 105 edges
4. `react` - 104 edges
5. `formatCurrency()` - 82 edges
6. `GlassCard()` - 80 edges
7. `@expo/vector-icons` - 68 edges
8. `Currency` - 63 edges
9. `Dashboard()` - 48 edges
10. `normalize()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `Estado de implementación (P3, 2026-10-04)` --references--> `resolveCandidate()`  [INFERRED]
  docs/03_fase2_contratos_v1.md → src/ai/actionCatalog.ts
- `0. El principio de arquitectura ya está vigente — con una precisión` --references--> `ResolvedAction`  [INFERRED]
  docs/03_fase2_contratos_v1.md → src/ai/chatTypes.ts
- `Aclaraciones (§2)` --references--> `MissingField`  [INFERRED]
  docs/memoria-proyecto/09-p2-planificador-fechas-y-catalogo-en-segundo-plano.md → src/ai/chatTypes.ts
- `Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo)` --references--> `warmUpLocalParser()`  [INFERRED]
  docs/memoria-proyecto/03-motor-clasificacion.md → src/ai/localParser.ts
- `4.3 Seguridad del sistema de escritura por IA (resumen operativo)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/components/HoldToConfirmButton.tsx

## Import Cycles
- None detected.

## Communities (179 total, 40 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.05
Nodes (40): ACCOUNT_DECREMENT_WORDS, ACCOUNT_INCREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, ARTICLE_AMBIGUOUS, __auditNumberVariants(), buildKeywordIndexSteps() (+32 more)

### Community 1 - "dates.ts"
Cohesion: 0.06
Nodes (53): D, fails, sealed, addDays(), DateMention, DatePrefer, DateRelation, DAY_WORDS (+45 more)

### Community 2 - "avisos.tsx"
Cohesion: 0.16
Nodes (23): Avisos(), Kind, KINDS, Recurrentes(), STATUS_LABEL, ChipOption, ChipRow(), RecurrenceEditor() (+15 more)

### Community 3 - "actionCatalogP3.ts"
Cohesion: 0.09
Nodes (29): activeAccounts(), AddForecastCandidate, AddRecurringCandidate, AddRecurringContributionCandidate, AddReminderCandidate, askForecast(), CancelReminderCandidate, eligibleAccounts() (+21 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.05
Nodes (39): addFresh(), AMBIG, amountText(), by, C, cases, catOf(), F (+31 more)

### Community 5 - "repositories.ts"
Cohesion: 0.06
Nodes (50): CategoryMappingRecord, Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow() (+42 more)

### Community 6 - "privacidad.tsx"
Cohesion: 0.23
Nodes (11): Index(), Privacidad(), styles, signOut(), deleteAccountPermanently(), AuthState, useAuthSession(), useProfileReconciliation() (+3 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.12
Nodes (32): Dashboard(), GROUP_LABELS, Scope, styles, DonutChart(), DonutChartProps, DonutSlice, useBreakpoint() (+24 more)

### Community 8 - "planner.ts"
Cohesion: 0.08
Nodes (42): Estado de implementación (P2, 2026-10-04), assert, base, ctx, oneAccount, { planFromText, answerClarification, previewPlan, splitPlanSegments }, { resolveAddTransaction }, InterpretedMessage (+34 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.17
Nodes (20): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, buildProfileRow(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable, ALL_TABLES, getSessionCreds() (+12 more)

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
Cohesion: 0.06
Nodes (53): RFC-8291, RFC-8292, assert, C, T0, claimAttempt(), claimOnce(), CORS_HEADERS (+45 more)

### Community 14 - "appearance.tsx"
Cohesion: 0.23
Nodes (12): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, approvedImagesIn() (+4 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.07
Nodes (45): Razones históricas de por qué se pausó originalmente (2026-09-02), ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate, BUDGET_CONCEPT_SYNONYMS (+37 more)

### Community 17 - "useAppStore.ts"
Cohesion: 0.07
Nodes (54): AddAccountArgs, AddForecastArgs, AddGoalArgs, AddLiabilityArgs, AddRecurringArgs, AddRecurringContributionArgs, AddReminderArgs, AddTransactionArgs (+46 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (23): main, name, private, version, expo-clipboard, expo-constants, expo-font, expo-image-picker (+15 more)

### Community 19 - "finance.ts"
Cohesion: 0.13
Nodes (18): CategorySpendSlice, FinancialHealth, HealthFactor, HealthFactorStatus, incomeByConceptInRange(), inDateRange(), InvestmentTxInput, InvestmentTxResult (+10 more)

### Community 20 - "useTheme"
Cohesion: 0.09
Nodes (41): Instalar(), Step(), InstitutionScreen(), styles, AGE_OPTIONS, Perfil(), SEX_OPTIONS, styles (+33 more)

### Community 21 - "BudgetTemplateList.tsx"
Cohesion: 0.22
Nodes (11): Bucket, BUCKET_LABELS, BUCKET_ORDER, styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON, KIND_LABELS (+3 more)

### Community 22 - "budget-template/[id].tsx"
Cohesion: 0.09
Nodes (38): BudgetTemplateEdit(), GROUP_COLOR_KEY, GROUP_ICON, GROUPS, PendingSave, Scope, styles, Onboarding() (+30 more)

### Community 23 - "LLMActionAgentProvider.ts"
Cohesion: 0.23
Nodes (32): Mapa de piezas, resolveCandidate(), resolveContributeToGoal(), resolveDeleteAccount(), resolveDeleteTransaction(), resolveSetBudgetLine(), resolveTransferBetweenAccounts(), resolveUpdateGoalTarget() (+24 more)

### Community 24 - "materialize.ts"
Cohesion: 0.14
Nodes (24): cyrb128(), deterministicId(), buildForecast(), buildOccurrence(), dateOfIso(), DEFAULT_CATEGORY, eventDatesFor(), FORECAST_HORIZON_DAYS (+16 more)

### Community 25 - "data/types.ts"
Cohesion: 0.11
Nodes (39): Section, Presupuestos (16 operaciones), 3. Avisos (recordatorios), ForecastGroup, ActionValidationContext, Segment, Account, AuditAction (+31 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "chatIntentParser.ts"
Cohesion: 0.11
Nodes (23): base, ctx, { detectChatIntent }, NOW, out, PHRASES, src_ai_actioncatalog_actionvalidationcontext, resolveDeleteBudgetLine() (+15 more)

### Community 29 - "actions.ts"
Cohesion: 0.18
Nodes (20): Auth(), Mode, styles, ForgotPassword(), styles, ResetPassword(), Status, styles (+12 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "[product].tsx"
Cohesion: 0.06
Nodes (102): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), Inversiones(), styles (+94 more)

### Community 32 - "catalogLoader.ts"
Cohesion: 0.14
Nodes (20): 2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil, Rendimiento y robustez, 1. El «túnel» del catálogo: qué es y qué no es, Cómo se comporta, De dónde sale el resto del peso (atribución por mapa de fuentes, antes de quitar reanimated), Peso medido (descarga comprimida al abrir la app, versión web; KB = 1,024 bytes), Qué NO se hizo, y por qué, warmUpLocalParser() (+12 more)

### Community 33 - "visualStyles.ts"
Cohesion: 0.17
Nodes (14): darkColors, lightColors, palette, ThemeColors, BUILT_IN_VISUAL_STYLES, DEFAULT_VISUAL_STYLE_ID, glassmorphism, LIQUID_GLASS_STYLE_ID (+6 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "useAppStore"
Cohesion: 0.11
Nodes (53): Tarjetas(), AttentionWidget(), CardPanel(), TIMES, SmallButton(), DebtCard(), ForecastView(), OccurrenceCard() (+45 more)

### Community 38 - "Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1)"
Cohesion: 0.18
Nodes (13): Avisos (8 operaciones), Catálogo de chat confirmado (única fuente de verdad para "¿está en el chat?"), Condición de la puerta P0 (según `Fases`: *"100% del inventario identificado y divergencias resueltas"*), Cuentas (8 operaciones), De dónde sale el "65", Deudas (9 operaciones), Divergencias resueltas frente al inventario original, Fase 2 — Auditoría real de las 65 operaciones candidatas (P0, Semana 1) (+5 more)

### Community 39 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, description, display, icons, id, lang, name, orientation (+4 more)

### Community 40 - "0005_audit_log.sql"
Cohesion: 0.24
Nodes (9): public.audit_balance_change, accounts_audit_balance, audit_log_entity_idx, audit_log_set_timestamps, audit_log_user_id_idx, liabilities_audit_balance, public.audit_log, auth.users (+1 more)

### Community 41 - "Bitácora de cambios"
Cohesion: 0.10
Nodes (20): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03/04 — P2: planificador multi-acción, fechas, catálogo en segundo plano y lo aprendido en la nube, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, 2026-10-04 — P3: previsto vs. real, pagos recurrentes, avisos, deudas y dividendos, 2026-10-04 — Tarjeta de crédito: corte, pago y avisos que no se pasan (+12 more)

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

### Community 46 - "recurrence.ts"
Cohesion: 0.12
Nodes (29): LiabilityDirection, parseDay(), applyPayment(), installmentProgress, isOpenLiability(), PAYMENT_SUBCATEGORY, PaymentEffect, round2() (+21 more)

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

### Community 52 - "ia.tsx"
Cohesion: 0.20
Nodes (17): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+9 more)

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

### Community 62 - "ejecutor.cjs"
Cohesion: 0.07
Nodes (24): ref_module, ref_path, assert, { executePlan, recoverInterruptedPlan }, Module, path, { planFromText, previewPlan }, { useAppStore } (+16 more)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "sync-mapeo.cjs"
Cohesion: 0.13
Nodes (13): assert, { categoryMappingToRow, categoryMappingFromRow }, Module, path, plainRepo(), queued(), repositoryByTable, { runSync } (+5 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.15
Nodes (16): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 5. Contrato de confirmación y ejecución idempotente, 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0 (+8 more)

### Community 87 - "client.ts"
Cohesion: 0.23
Nodes (5): getRegistration(), NotificationPermission, supabase, supabaseAnonPublicKey, supabaseProjectUrl

### Community 88 - "formatCurrency"
Cohesion: 0.14
Nodes (32): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, groupByDay(), Movimientos(), styles (+24 more)

### Community 89 - "app/_layout.tsx"
Cohesion: 0.39
Nodes (7): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, usePushProfileOnChange(), useMaterialization(), selectActiveLiabilities(), ThemeProvider()

### Community 90 - "concepts.ts"
Cohesion: 0.19
Nodes (11): Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03), Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo), Cómo se evita el relleno (la parte que más importa), Dónde vive cada cosa, Golden set y resultados, Tamaño real (medido, no estimado), Conjuntos nuevos, detectConcepts() (+3 more)

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "ActionAgentProvider"
Cohesion: 0.13
Nodes (18): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.4 Capa de proveedores intercambiables (`src/providers/`), 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, 1. Estado Actual y Componentes Activos (The Core), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), isWebSpeechAvailable() (+10 more)

### Community 94 - "extractAmount"
Cohesion: 0.15
Nodes (18): Ajuste de saldo y separación de varios movimientos, Coincidencia por límite de palabra (bug corregido 2026-09-02), Desambiguación de "gas", Extracción del monto (`extractAmount`), Fechas, planes y catálogo en segundo plano (P2, 2026-10-03/04), Memoria de correcciones (mapeo personal), Montos: decimales, miles y abreviaturas (2026-10-03), Motor de clasificación (registro por voz/texto) (+10 more)

### Community 95 - "p3-chat.cjs"
Cohesion: 0.14
Nodes (23): acc(), assert, bal(), ctx(), expectAction(), expectClar(), expectNot(), meta() (+15 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.24
Nodes (12): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, webPushNotificationProvider, NotificationSupport, DEFAULT_NOTIFICATION_SETTINGS (+4 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "audit-catalog.cjs"
Cohesion: 0.33
Nodes (5): COMMON, { DEFAULT_CATEGORIES }, map, NON_EXPENSE, { normalize }

### Community 99 - "metas.tsx"
Cohesion: 0.24
Nodes (12): Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage(), pacingMessage(), styles, DateField() (+4 more)

### Community 100 - "Pendientes y decisiones abiertas"
Cohesion: 0.14
Nodes (14): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (actualizada 2026-10-04), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — ahora viaja con la cuenta (2026-10-04) (+6 more)

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
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "Golden set del motor local — resultados (P1, P1b y P2)"
Cohesion: 0.17
Nodes (12): Cifras que se pueden creer (primera y única corrida), Conjuntos nuevos, Contaminación (para no engañarse), Cómo seguir, Golden set del motor local — resultados (P1, P1b y P2), Límites conocidos (no se arreglan a propósito), P2 — fechas y planificador (2026-10-03/04), Qué aprendimos (patrones de falla en frases nuevas) (+4 more)

### Community 110 - "3. Deuda Técnica y Parches"
Cohesion: 0.11
Nodes (18): 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs), 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real, 3. Deuda Técnica y Parches (+10 more)

### Community 111 - "fuzz.cjs"
Cohesion: 0.11
Nodes (18): argv, assert, base, ctx, D, { detectChatIntent }, { findRecurrence }, hostile (+10 more)

### Community 112 - "patrimonio.tsx"
Cohesion: 0.14
Nodes (19): Draft, LIABILITY_TYPES, LiabilityForm(), Patrimonio(), SectionHeader(), styles, AccountForm(), ALL_ACCOUNT_TYPES (+11 more)

### Community 113 - "size-report.cjs"
Cohesion: 0.12
Nodes (14): ref_child_process, ref_os, ref_zlib, BUDGETS, dirArg, { execSync }, fs, initial (+6 more)

### Community 114 - "presupuesto.tsx"
Cohesion: 0.13
Nodes (44): monthEndIso(), monthStartIso(), Presupuesto(), styles, shiftMonths(), BudgetActionPanel(), BudgetCalendar(), BudgetTemplateLegend() (+36 more)

### Community 115 - "run-golden.cjs"
Cohesion: 0.11
Nodes (18): allRows, args, { cases }, cl, eq(), evaluate(), GOLDEN_NOW, knownRows (+10 more)

### Community 116 - "p3Intents.ts"
Cohesion: 0.13
Nodes (32): { DEFAULT_CATEGORIES }, { normalize, parseCaptureText }, text, askRule(), liveRules(), namedForecasts(), namedInvestments(), namedOpenLiabilities() (+24 more)

### Community 117 - "p3-store.cjs"
Cohesion: 0.15
Nodes (17): acc(), assert, bal(), fcs(), live(), Module, occsOf(), pad() (+9 more)

### Community 118 - "NetWorthTrendChart.tsx"
Cohesion: 0.13
Nodes (27): react-native-svg, AssetsLiabilitiesTrendChart(), BarTrend(), BarTrendProps, pickLabelIndices(), BudgetProgressChart(), BudgetProgressItem, capItems() (+19 more)

### Community 119 - "ChatPlanCard.tsx"
Cohesion: 0.19
Nodes (15): 2.1 Rediseños completos por rechazo explícito del usuario, expo-haptics, ChatActionCard(), styles, styles, ChatPlanCard(), styles, AnimatedCircle (+7 more)

### Community 120 - "previsto.cjs"
Cohesion: 0.12
Nodes (13): { accountDeltasForTransaction }, accounts, assert, { deterministicId }, F, L, M, meta() (+5 more)

### Community 121 - "AiOrb.tsx"
Cohesion: 0.33
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 122 - "0023_p3_forecast_recurring_reminders.sql"
Cohesion: 0.17
Nodes (18): public.transactions, public.recurring_rules, public.reminder_occurrences, public.reminders, recurring_rules_set_timestamps, recurring_rules_user_updated_idx, reminder_occurrences_due_idx, reminder_occurrences_reminder_idx (+10 more)

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

### Community 127 - "deudas.cjs"
Cohesion: 0.18
Nodes (11): acc(), assert, { computeNetWorth, upcomingLiabilityReminders }, D, lb(), meta, Module, path (+3 more)

### Community 128 - "P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)"
Cohesion: 0.22
Nodes (9): Cifras que se pueden creer (primera y única corrida de cada sellado), Contaminación (para no engañarse), Experimentos descartados (no se adoptaron), P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03), Próximo paso de medición, Qué fallaba en Fresco 5 (clases, no frases sueltas), extractCategory(), stripPaymentInstruments() (+1 more)

### Community 129 - "accounts.ts"
Cohesion: 0.27
Nodes (13): resolveBudgetConcept(), findInvestment(), findBudgetConceptForCategory(), findIncomeConceptForCategory(), matchesCategory(), accountsForCategory(), activeAccounts(), allowedExpenseAccounts() (+5 more)

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
Cohesion: 0.18
Nodes (10): ref_http, fs, http, meta, now, path, routes, server (+2 more)

### Community 136 - "P3 — Previsto vs. real, pagos recurrentes, avisos, deudas y dividendos"
Cohesion: 0.18
Nodes (11): 1. Previsto vs. real, 2. Pagos recurrentes, 4. Deudas ampliadas y dividendos, 5. Chat: 15 acciones nuevas, Cómo se midió (y qué NO prueba), En una frase, Lo que NO está hecho (y por qué), Mapa de piezas (+3 more)

### Community 137 - "ref_assert"
Cohesion: 0.13
Nodes (9): ref_assert, assert, I, NOW, assert, P, R, ri() (+1 more)

### Community 138 - "2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`)"
Cohesion: 0.20
Nodes (10): 2. Planificador multi-acción (contratos §1–§5 de `docs/03_fase2_contratos_v1.md`), Acciones del chat (17 tipos, catálogo cerrado), Aclaraciones (§2), Con una IA conectada (BYOK), Ejecutor (§5), Límites conocidos, Qué hace (ejemplos reales de las pruebas), Reconocimiento local: errores de siempre que se corrigieron (+2 more)

### Community 139 - "react-native"
Cohesion: 0.09
Nodes (42): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, ONBOARDING_GROUP_EXPLANATIONS, Step, styles, @expo/vector-icons (+34 more)

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
Cohesion: 0.28
Nodes (8): ThemeContextValue, radius, spacing, TextWeight, typography, TypographyScale, TypographyToken, StyleSurface

### Community 146 - "stub-native.cjs"
Cohesion: 0.40
Nodes (4): ref_crypto, crypto, handler, proxy

### Community 147 - "p3Validation.ts"
Cohesion: 0.31
Nodes (8): validTimeOfDay(), normalizeIntervalMinutes(), REMINDER_DEFAULTS, ReminderDraft, RuleDraft, validateReminderDraft(), validateRuleDraft(), validateRecurrence()

### Community 148 - "AccountDropdown.tsx"
Cohesion: 0.17
Nodes (18): AccountCard(), AccountCardVisual(), styles, AccountCardStack(), AccountStackItem, StackedCard(), styles, AccountDropdown() (+10 more)

### Community 149 - "themeRegistry.ts"
Cohesion: 0.19
Nodes (16): 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`), fetchRemoteVisualStyles(), useRemoteVisualStyles(), BASE_VARIANT, isExpired(), isRecord(), mergeVisualStyles(), parseRemoteVisualStyle() (+8 more)

### Community 150 - "budgetPeriods.ts"
Cohesion: 0.15
Nodes (18): comparePeriodKeys(), DateRange, isDateInPeriodKey(), isEndingSoon(), makePeriodKey(), MONTH_NAMES, pad(), ParsedPeriod (+10 more)

### Community 151 - "fechas.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 152 - "fechas-sellado.cjs"
Cohesion: 0.50
Nodes (3): DEV, PERIODS, TIMES

### Community 153 - "LLMAIInterpreterProvider.ts"
Cohesion: 0.33
Nodes (4): ParsedCapture, TransactionType, CATEGORY_CATALOG, AIInterpreterProvider

### Community 154 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 157 - "keywordPacks/index.ts"
Cohesion: 0.50
Nodes (3): PACK_BASE, CORE_PACKS, EXTRA_KEYWORDS

### Community 158 - "AppTabBar.tsx"
Cohesion: 0.21
Nodes (14): TabsLayout(), AppTabBar(), HIT_SLOP, MORE_TABS, MoreMenu(), PRIMARY_TABS, styles, SWIPE_ORDER (+6 more)

### Community 159 - "localCopilot.ts"
Cohesion: 0.20
Nodes (13): 1.3 Esquema de datos — jerarquía y clasificación exacta, 4. Contrato de cálculo y presentación de efectos, answerQuestion(), CopilotContext, Rule, rules, SUGGESTED_QUESTIONS, UserProfile (+5 more)

### Community 162 - "providers/types.ts"
Cohesion: 0.19
Nodes (9): unavailableMarketDataProvider, registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), CetesRates, MarketDataProvider (+1 more)

### Community 163 - "registry.ts"
Cohesion: 0.28
Nodes (9): createLLMAIInterpreterProvider(), registerConfiguredLLMProvider(), getLLMProviderConfig(), localActionAgentProvider, localAIInterpreterProvider, localCopilotProvider, setActionAgentProvider(), setAIInterpreterProvider() (+1 more)

### Community 164 - "classifyNormalized"
Cohesion: 0.27
Nodes (11): Corrección difusa (typos de dictado/tecleo), __auditBestExact(), __auditKeywordIndex(), bestExactMatch(), categoryAllowed(), classifyNormalized(), fixParentsWord(), fuzzyMatchCategory() (+3 more)

### Community 165 - "ts-hook.cjs"
Cohesion: 0.20
Nodes (9): ref_fs, typescript, fs, Module, path, ROOT, ts, CATALOG_VERSION (+1 more)

### Community 166 - "formatDateDMY"
Cohesion: 0.51
Nodes (10): resolveAddGoal(), resolveUpdateGoalDate(), resolveUpdateLiabilityDueDate(), resolveAddReminder(), resolvePostponeForecast(), toRecurrenceArgs(), askDate(), dateOnly() (+2 more)

### Community 167 - "tarjeta.cjs"
Cohesion: 0.28
Nodes (6): assert, base(), C, meta, pay(), tx()

### Community 168 - "AppBackground.tsx"
Cohesion: 0.39
Nodes (7): AppBackground(), GradientLayer(), resolveBackgroundPhoto(), styles, BackgroundPhotoLayer(), focalKeyword(), findBackgroundImage()

### Community 169 - "AppearancePreview.tsx"
Cohesion: 0.31
Nodes (7): AppearancePreview(), clamp01(), styles, ACCENT_PALETTES, AccentPalette, DEFAULT_ACCENT_PALETTE_ID, findAccentPalette()

### Community 170 - "catalogo.cjs"
Cohesion: 0.25
Nodes (6): assert, cat, ext, loader, parser, sub()

### Community 171 - "Tarjeta de crédito — que no se te pase ni el corte ni el pago"
Cohesion: 0.29
Nodes (7): Cómo funciona (reglas), Decisiones que tomé por defecto (cámbialas si no te gustan), Dónde está, En una frase, Lo que falta, Lo que garantiza que no se te pase, Tarjeta de crédito — que no se te pase ni el corte ni el pago

### Community 172 - "staticExchangeRateProvider.ts"
Cohesion: 0.38
Nodes (5): ExchangeRateInfo, getUsdMxnRate(), REFERENCE_USD_MXN_RATE, staticExchangeRateProvider, ExchangeRateInfo

### Community 173 - "onboardingSurvey.ts"
Cohesion: 0.29
Nodes (6): CASUAL_SURVEY, FORMAL_SURVEY, getOnboardingSurvey(), SurveyOption, SurveyQuestion, SurveyTone

### Community 174 - "financialInsights.ts"
Cohesion: 0.40
Nodes (4): FinancialInsight, InsightInputs, InsightTone, PRIORITY_WEIGHT

### Community 175 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

### Community 176 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

## Knowledge Gaps
- **881 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+876 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1043 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `avisos.tsx`, `privacidad.tsx`, `(tabs)/index.tsx`, `react-native`, `appearance.tsx`, `AccountDropdown.tsx`, `BudgetTemplateList.tsx`, `budget-template/[id].tsx`, `actions.ts`, `AppTabBar.tsx`, `[product].tsx`, `useAppStore`, `AppBackground.tsx`, `ia.tsx`, `ai-settings.tsx`, `formatCurrency`, `app/_layout.tsx`, `notificaciones.tsx`, `metas.tsx`, `patrimonio.tsx`, `presupuesto.tsx`, `NetWorthTrendChart.tsx`, `ChatPlanCard.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `useAppStore` connect `useAppStore` to `avisos.tsx`, `actionCatalogP3.ts`, `privacidad.tsx`, `(tabs)/index.tsx`, `planExecutor.ts`, `SyncEngine.ts`, `planner.ts`, `react-native`, `tarjeta-store.cjs`, `appearance.tsx`, `virtualIds.ts`, `surveyRepository.ts`, `useAppStore.ts`, `p3Validation.ts`, `useTheme`, `AccountDropdown.tsx`, `budget-template/[id].tsx`, `BudgetTemplateList.tsx`, `themeRegistry.ts`, `budgetPeriods.ts`, `materialize.ts`, `[product].tsx`, `AppBackground.tsx`, `recurrence.ts`, `ia.tsx`, `ejecutor.cjs`, `sync-mapeo.cjs`, `formatCurrency`, `app/_layout.tsx`, `extractAmount`, `p3-chat.cjs`, `metas.tsx`, `patrimonio.tsx`, `presupuesto.tsx`, `p3-store.cjs`, `deudas.cjs`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `avisos.tsx`, `createClient.ts`, `privacidad.tsx`, `(tabs)/index.tsx`, `SyncEngine.ts`, `appearance.tsx`, `surveyRepository.ts`, `package.json`, `useTheme`, `AccountDropdown.tsx`, `budget-template/[id].tsx`, `BudgetTemplateList.tsx`, `@react-native-async-storage/async-storage`, `actions.ts`, `AppTabBar.tsx`, `[product].tsx`, `useAppStore`, `AppBackground.tsx`, `AppearancePreview.tsx`, `ia.tsx`, `ai-settings.tsx`, `client.ts`, `formatCurrency`, `app/_layout.tsx`, `ActionAgentProvider`, `notificaciones.tsx`, `metas.tsx`, `patrimonio.tsx`, `presupuesto.tsx`, `NetWorthTrendChart.tsx`, `ChatPlanCard.tsx`, `AiOrb.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _881 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053426248548199766 - nodes in this community are weakly interconnected._
- **Should `dates.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._
- **Should `actionCatalogP3.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09247311827956989 - nodes in this community are weakly interconnected._