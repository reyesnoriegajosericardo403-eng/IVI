# Graph Report - IVI  (2026-10-03)

## Corpus Check
- 260 files · ~296,344 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .example 1, .css 1)

## Summary
- 1886 nodes · 5448 edges · 133 communities (95 shown, 38 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 144 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `725909cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- localParser.ts
- HoldToConfirmButton.tsx
- budget-template/[id].tsx
- providers/types.ts
- build-golden.cjs
- repositories.ts
- settings.tsx
- (tabs)/index.tsx
- movimientos.tsx
- SyncEngine.ts
- keywordPacks/index.ts
- app.js
- dependencies
- push-notify/index.ts
- useAppStore
- expo
- actionCatalog.ts
- Currency
- package.json
- finance.ts
- AccountDropdown.tsx
- BudgetTemplateList.tsx
- onboarding.tsx
- investmentModels.ts
- inversiones.tsx
- data/types.ts
- 0014_budget_templates.sql
- VALU Finance AI
- BudgetTemplateEdit
- actions.ts
- 0001_core_profiles_accounts_transactions.sql
- useTheme
- run-golden.cjs
- ThemeProvider.tsx
- Selector Interactivo de Técnicas de Diagnóstico Organizacional
- market-data/index.ts
- useAppStore.ts
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
- bench.cjs
- 0004_net_worth_snapshots.sql
- diagnostico-organizacional/vercel.json
- ia.tsx
- public.survey_responses
- 0015_ui_themes.sql
- 2.1 Rediseños completos por rechazo explícito del usuario
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
- institutions.ts
- Fase 2 P0-S2 — Contratos versionados del motor local
- @react-native-async-storage/async-storage
- capture.tsx
- [product].tsx
- normalize
- Migraciones de Supabase
- Instituciones de inversión y modelos de cálculo
- client.ts
- Motor de clasificación (registro por voz/texto)
- presupuesto.tsx
- notificaciones.tsx
- Memoria del proyecto VALU Finance AI
- audit-catalog.cjs
- react-native
- Account
- packs.cjs
- 0020_push_notifications.sql
- categories.ts
- AGENTS.md
- Migraciones de VALU Finance AI
- public.investments
- public.investments
- P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)
- 3. Deuda Técnica y Parches
- 5. Punto de Partida para la Fase 2
- format.ts
- investmentActions.ts
- date.ts
- perfil.tsx
- parseCaptureText
- ts-hook.cjs
- BudgetProgressChart.tsx
- ChatActionCard.tsx
- handwritten.cjs
- AiOrb.tsx
- extractAmount
- ChatSidebar.tsx
- scripts
- rnd
- usePressToTalk.ts
- devDependencies
- fresh.cjs
- fresh2.cjs
- fresh3.cjs
- golden/README.md

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
- `Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo)` --references--> `warmUpLocalParser()`  [INFERRED]
  docs/memoria-proyecto/03-motor-clasificacion.md → src/ai/localParser.ts
- `2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil` --references--> `warmUpLocalParser()`  [INFERRED]
  docs/memoria-proyecto/05-bitacora-cambios.md → src/ai/localParser.ts
- `Rendimiento y robustez` --references--> `warmUpLocalParser()`  [INFERRED]
  docs/memoria-proyecto/08-golden-set-resultados.md → src/ai/localParser.ts
- `4.3 Seguridad del sistema de escritura por IA (resumen operativo)` --references--> `HoldToConfirmButton()`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/components/HoldToConfirmButton.tsx
- `3.3 Código temporal / soluciones rápidas pendientes de refactor` --references--> `SyncMeta`  [INFERRED]
  docs/01_project_blueprint_fase1.md → src/data/types.ts

## Import Cycles
- None detected.

## Communities (133 total, 38 thin omitted)

### Community 0 - "localParser.ts"
Cohesion: 0.06
Nodes (36): ACCOUNT_DECREMENT_WORDS, AccountAdjustment, AccountAdjustmentDirection, AmountCandidate, ARTICLE_AMBIGUOUS, __auditNumberVariants(), buildKeywordIndexSteps(), CURRENCY_WORDS (+28 more)

### Community 1 - "HoldToConfirmButton.tsx"
Cohesion: 0.22
Nodes (9): 5. Contrato de confirmación y ejecución idempotente, Chat de IA con acciones + Apariencia (Vidrio líquido, fondo de foto), Chat de IA con acciones sobre datos + rediseño visual, AnimatedCircle, HoldState, HoldToConfirmButton(), HoldToConfirmButtonProps, noSelectStyle (+1 more)

### Community 2 - "budget-template/[id].tsx"
Cohesion: 0.13
Nodes (21): GROUP_COLOR_KEY, GROUP_ICON, GROUPS, Scope, styles, CUSTOM_OPTIONS, PropagateChoice, PropagateChoiceSheet() (+13 more)

### Community 3 - "providers/types.ts"
Cohesion: 0.05
Nodes (61): AiSettings(), PROVIDERS, Status, styles, 1.4 Capa de proveedores intercambiables (`src/providers/`), 7. Interfaces de adaptadores — cuáles ya existen y cuáles son solo contrato todavía, Capa de proveedores intercambiables (`src/providers/`), answerQuestion() (+53 more)

### Community 4 - "build-golden.cjs"
Cohesion: 0.08
Nodes (21): addFresh(), AMBIG, by, C, cases, catOf(), F, F2 (+13 more)

### Community 5 - "repositories.ts"
Cohesion: 0.07
Nodes (37): Repository, accountFromRow(), accountToRow(), auditLogFromRow(), auditLogToRow(), budgetAssignmentFromRow(), budgetAssignmentToRow(), budgetFromRow() (+29 more)

### Community 6 - "settings.tsx"
Cohesion: 0.27
Nodes (9): CURRENCIES, Settings(), styles, THEME_OPTIONS, formatExpiry(), StylePicker(), StylePreview(), styles (+1 more)

### Community 7 - "(tabs)/index.tsx"
Cohesion: 0.11
Nodes (49): SaludFinanciera(), STATUS_ICON, STATUS_TO_BAR, Dashboard(), GROUP_LABELS, Scope, styles, Draft (+41 more)

### Community 8 - "movimientos.tsx"
Cohesion: 0.19
Nodes (18): groupByDay(), Movimientos(), Section, styles, NewTransaction(), normalize(), SearchEntry, styles (+10 more)

### Community 9 - "SyncEngine.ts"
Cohesion: 0.22
Nodes (17): 1.6 Motor de sincronización (`src/services/sync/SyncEngine.ts`), 3.1 ✅ Resuelto — fuga de sincronización de una sola vía en 4 tablas de presupuesto, supabase, buildProfileRow(), pushRemoteProfile(), pushRemoteProfileKeepalive(), repositoryByTable, ALL_TABLES (+9 more)

### Community 10 - "keywordPacks/index.ts"
Cohesion: 0.09
Nodes (17): PACK_BANCOS, PACK_BASE, PACK_COMIDA, PACK_COMPLEMENTOS, PACK_COMPRAS, PACK_DINERO, PACK_FAMILIA, PACK_HOGAR (+9 more)

### Community 11 - "app.js"
Cohesion: 0.13
Nodes (29): animateCounter(), closeFichaModal(), copyResults(), detailCardHTML(), exportPDF(), finishQuiz(), goBack(), highlightTechnique() (+21 more)

### Community 12 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, expo, expo-clipboard, expo-constants, expo-crypto, expo-font, expo-haptics, expo-image-picker (+22 more)

### Community 13 - "push-notify/index.ts"
Cohesion: 0.10
Nodes (32): RFC-8291, RFC-8292, claimOnce(), CORS_HEADERS, daysBetween(), DEBT_OFFSETS, deliver(), Env (+24 more)

### Community 14 - "useAppStore"
Cohesion: 0.30
Nodes (12): RootLayout(), RootStack(), TRANSPARENT_NAVIGATION_THEME, AppBackground(), GradientLayer(), resolveBackgroundPhoto(), styles, usePushProfileOnChange() (+4 more)

### Community 15 - "expo"
Cohesion: 0.07
Nodes (27): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, typedRoutes (+19 more)

### Community 16 - "actionCatalog.ts"
Cohesion: 0.09
Nodes (54): Razones históricas de por qué se pausó originalmente (2026-09-02), Resuelto (2026-09-27) — Motor de intenciones financieras por voz/chat (transferencias, deudas, metas), ACCOUNT_TYPE_SYNONYMS, ACCOUNT_TYPES, AddAccountCandidate, AddGoalCandidate, AddLiabilityCandidate, AddTransactionCandidate (+46 more)

### Community 17 - "Currency"
Cohesion: 0.12
Nodes (24): Movimientos (11 operaciones), AddAccountArgs, AddGoalArgs, AddLiabilityArgs, AddTransactionArgs, ContributeToGoalArgs, DeleteAccountArgs, DeleteBudgetLineArgs (+16 more)

### Community 18 - "package.json"
Cohesion: 0.08
Nodes (24): main, name, private, version, expo, expo-clipboard, expo-constants, expo-crypto (+16 more)

### Community 19 - "finance.ts"
Cohesion: 0.09
Nodes (34): 4. Contrato de cálculo y presentación de efectos, bucketOf(), Bucket, BUCKET_LABELS, BUCKET_ORDER, bucketOf(), Segment, styles (+26 more)

### Community 20 - "AccountDropdown.tsx"
Cohesion: 0.07
Nodes (46): TabsLayout(), AccountCard(), AccountCardVisual(), AccountCardVisualProps, styles, AccountDropdown(), MenuItem, MiniSwitch() (+38 more)

### Community 21 - "BudgetTemplateList.tsx"
Cohesion: 0.16
Nodes (16): Bucket, BUCKET_LABELS, BUCKET_ORDER, BudgetTemplateList(), styles, TemplateDragHandle(), BUDGET_TEMPLATE_ICON_CHOICES, DEFAULT_TEMPLATE_ICON (+8 more)

### Community 22 - "onboarding.tsx"
Cohesion: 0.09
Nodes (26): AGE_OPTIONS, BANK_ACCOUNT_TYPES, CURRENCIES, GROUPS, ONBOARDING_GROUP_EXPLANATIONS, Step, styles, AccountForm() (+18 more)

### Community 23 - "investmentModels.ts"
Cohesion: 0.19
Nodes (20): Institution, findLiquidityPosition(), InvestmentPosition, InstitutionSummary, ValuedPosition, CETES_FACE_VALUE, cetesAccruedValue(), dailyYieldEstimate() (+12 more)

### Community 24 - "inversiones.tsx"
Cohesion: 0.16
Nodes (22): InstitutionScreen(), styles, Inversiones(), styles, InstitutionCard(), InstitutionMonogram(), styles, ScreenHeader() (+14 more)

### Community 25 - "data/types.ts"
Cohesion: 0.14
Nodes (25): 1.1 Stack técnico verificado, 1.2 Inventario de pantallas activas (`app/`), 1.3 Esquema de datos — jerarquía y clasificación exacta, 1.5 Mecánica de interacción del usuario — dos vías de entrada SEPARADAS, 1. Estado Actual y Componentes Activos (The Core), ActionValidationContext, CopilotContext, Rule (+17 more)

### Community 26 - "0014_budget_templates.sql"
Cohesion: 0.18
Nodes (21): budget_assignments_period_idx, budget_assignments_set_timestamps, budget_assignments_updated_at_idx, budget_assignments_user_id_idx, budget_templates_set_timestamps, budget_templates_updated_at_idx, budget_templates_user_id_idx, period_budget_overrides_assignment_idx (+13 more)

### Community 27 - "VALU Finance AI"
Cohesion: 0.15
Nodes (12): Arquitectura (resumen), Cómo conectar tu propio Supabase (para activar la nube), Cómo correrlo en desarrollo (si tuvieras Node.js instalado), Cómo probarlo ahora mismo (sin computadora, desde el navegador), Estado actual, Incluido en la Fase 1 (producto), Incluido en la Fase 2 (arquitectura), Incluido en la Fase 3 adelantada (IA propia del usuario — BYOK) (+4 more)

### Community 28 - "BudgetTemplateEdit"
Cohesion: 0.21
Nodes (19): BudgetTemplateEdit(), Onboarding(), ConceptBudgetForm(), ConceptRow(), ConceptSubBudgets(), styles, SubcategoryAddDropdown(), SubcategoryOption (+11 more)

### Community 29 - "actions.ts"
Cohesion: 0.18
Nodes (19): Auth(), Mode, styles, ForgotPassword(), styles, ResetPassword(), Status, styles (+11 more)

### Community 30 - "0001_core_profiles_accounts_transactions.sql"
Cohesion: 0.18
Nodes (15): public.handle_new_user, accounts_set_timestamps, accounts_updated_at_idx, accounts_user_id_idx, on_auth_user_created, profiles_set_timestamps, public.accounts, public.profiles (+7 more)

### Community 31 - "useTheme"
Cohesion: 0.37
Nodes (21): ChipRow(), Field(), FormActions(), parseAmount(), styles, SummaryLine(), BuyForm(), CashForm() (+13 more)

### Community 32 - "run-golden.cjs"
Cohesion: 0.12
Nodes (16): allRows, args, { cases }, cl, eq(), evaluate(), knownRows, lines (+8 more)

### Community 33 - "ThemeProvider.tsx"
Cohesion: 0.05
Nodes (62): Appearance(), BackgroundMode, BackgroundOptionRow(), blobUriToPersistentDataUri(), CategoryPickerModal(), SimpleSlider(), styles, 1.7 Apariencia — Vidrio líquido, paletas y fondo de foto (`app/appearance.tsx`) (+54 more)

### Community 34 - "Selector Interactivo de Técnicas de Diagnóstico Organizacional"
Cohesion: 0.20
Nodes (9): Aviso legal, Cómo funciona, Despliegue en GitHub Pages, Despliegue en Vercel, Ejecutarlo en local, Estructura del proyecto, Generar el código QR para el tríptico impreso, Metodología y fuentes (+1 more)

### Community 35 - "market-data/index.ts"
Cohesion: 0.18
Nodes (14): banxicoDateToISO(), CachedQuote, CETES_SERIES, CetesRatesResult, CORS_HEADERS, fetchBanxicoSeries(), fetchFinnhubQuote(), fetchQuote() (+6 more)

### Community 36 - "useAppStore.ts"
Cohesion: 0.12
Nodes (22): AIActionStatus, ChatConversation, ChatMessage, CustomCategoryMapping, CetesRates, MarketQuote, SyncOp, SyncQueueEntry (+14 more)

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
Cohesion: 0.11
Nodes (18): 2026-09-02 — Motor de clasificación más inteligente + memoria de correcciones, 2026-09-27 (antes) — Apariencia: Vidrio líquido, paletas y fondo de foto, 2026-09-27 — Transferencias entre cuentas + endurecimiento de sync + limpieza de estilos, 2026-09-28 — Arranque formal de Fase 2: auditoría de 65 operaciones + contratos v1, 2026-10-02 — Despliegue de push en Supabase (avance) + explorador ordenado del grafo, 2026-10-03 (noche) — P1b: catálogo de palabras de 3 mil a ≈19 mil, 2026-10-03 — P1 (semana 3): golden set + motor local más preciso, Autenticación real (+10 more)

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

### Community 46 - "ConceptBudgetForm.tsx"
Cohesion: 0.30
Nodes (12): PendingSave, BudgetFormInitial, styles, BudgetFrequency, BudgetPeriodicity, BudgetCalcInput, computeMonthlyAmount(), FREQUENCY_LABELS (+4 more)

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
Cohesion: 0.18
Nodes (17): AnimatedDot, AnimatedLinearGradient, ChatBackground(), EmptyHero(), ENGINE_LABELS, FadeInRow(), Ia(), MessageBody() (+9 more)

### Community 53 - "public.survey_responses"
Cohesion: 0.67
Nodes (3): public.survey_responses, auth.users, survey_responses_user_id_idx

### Community 54 - "0015_ui_themes.sql"
Cohesion: 0.50
Nodes (3): public.ui_themes, public.set_sync_timestamps, ui_themes_set_timestamps

### Community 55 - "2.1 Rediseños completos por rechazo explícito del usuario"
Cohesion: 0.50
Nodes (4): 2.1 Rediseños completos por rechazo explícito del usuario, 2.2 Decisiones de arquitectura evaluadas y rechazadas (ADRs negativos), 2.3 Trabajo pausado deliberadamente (no fallido — diferido con razón documentada), 2. El Cementerio de Ideas y Decisiones (Lessons Learned & ADRs)

### Community 61 - "Catálogo de categorías"
Cohesion: 0.22
Nodes (9): Ahorro — ahorro e inversión, Ampliación P1b (2026-10-03): áreas de finanzas personales que faltaban, Catálogo de categorías, Cómo se agrupan los gastos en el Presupuesto, Deseos — gustos, salidas y estilo de vida, Gastos — 11 categorías, Ingresos (10 subcategorías), Necesidades — gastos indispensables para vivir (+1 more)

### Community 84 - "build.py"
Cohesion: 0.19
Nodes (12): collections, datetime, json, os, pathlib, re, kind_of(), layer_of() (+4 more)

### Community 85 - "institutions.ts"
Cohesion: 0.12
Nodes (18): formatAsOf(), InfoLine(), MONTHS, ProductInfo(), styles, ALL_INSTITUTIONS, CommissionTier, EQUITY_CLASSES (+10 more)

### Community 86 - "Fase 2 P0-S2 — Contratos versionados del motor local"
Cohesion: 0.19
Nodes (11): 0. El principio de arquitectura ya está vigente — con una precisión, 1. Contrato de interpretación (`interpretMessage` → v2), 2. Contrato de datos faltantes, 3. Contrato de plan multi-operación (`ActionPlan`), 6. Contrato previsto vs. real, 8. Compatibilidad hacia atrás, Condición de la puerta P0, Fase 2 P0-S2 — Contratos versionados del motor local (+3 more)

### Community 87 - "@react-native-async-storage/async-storage"
Cohesion: 0.33
Nodes (4): expo-secure-store, @react-native-async-storage/async-storage, localStorage, secureSessionStorage

### Community 88 - "capture.tsx"
Cohesion: 0.17
Nodes (22): Capture(), noSelectStyle, QUICK_CATEGORIES, Stage, styles, applyCustomMapping(), detectAccountAdjustment(), ParsedCapture (+14 more)

### Community 89 - "[product].tsx"
Cohesion: 0.17
Nodes (17): money(), Panel, ProductScreen(), shortDate(), styles, trimNumber(), HoldingsCell, HoldingsColumn (+9 more)

### Community 90 - "normalize"
Cohesion: 0.15
Nodes (16): Catálogo ampliado y cómo se mide (P1 y P1b, 2026-10-03), Correcciones de lógica que salieron de las pruebas (valen para cualquier tamaño de catálogo), Cómo se evita el relleno (la parte que más importa), Dónde vive cada cosa, Golden set y resultados, Memoria de correcciones (mapeo personal), Tamaño real (medido, no estimado), Conjuntos nuevos (+8 more)

### Community 91 - "Migraciones de Supabase"
Cohesion: 0.40
Nodes (5): Cómo correr una migración nueva (recordatorio para explicarle a la persona), Edge Functions, Estado actual del esquema (tablas principales), Historial, Migraciones de Supabase

### Community 92 - "Instituciones de inversión y modelos de cálculo"
Cohesion: 0.40
Nodes (5): Cómo mantener el catálogo "siempre actualizado", Instituciones de inversión y modelos de cálculo, Instituciones del catálogo (revisado septiembre 2026), Migración 0021, Modelos de cálculo

### Community 93 - "client.ts"
Cohesion: 0.19
Nodes (12): Privacidad(), styles, registerMarketDataProvider(), RawCetesRates, RawQuote, relayMarketDataProvider, setMarketDataProvider(), deleteAccountPermanently() (+4 more)

### Community 94 - "Motor de clasificación (registro por voz/texto)"
Cohesion: 0.18
Nodes (18): Coincidencia por límite de palabra (bug corregido 2026-09-02), Corrección difusa (typos de dictado/tecleo), Desambiguación de "gas", Motor de clasificación (registro por voz/texto), Pipeline (orden en que se resuelve una frase), Qué se evaluó y NO se implementó (y por qué), __auditBestExact(), __auditKeywordIndex() (+10 more)

### Community 95 - "presupuesto.tsx"
Cohesion: 0.11
Nodes (42): monthEndIso(), monthStartIso(), Presupuesto(), styles, BudgetActionPanel(), CategoryRow, CollapsibleRow(), styles (+34 more)

### Community 96 - "notificaciones.tsx"
Cohesion: 0.14
Nodes (14): Notificaciones(), REMINDER_HOURS, styles, ToggleRow(), UNSUPPORTED_COPY, getRegistration(), webPushNotificationProvider, NotificationPermission (+6 more)

### Community 97 - "Memoria del proyecto VALU Finance AI"
Cohesion: 0.50
Nodes (4): Cómo usar esta memoria en una conversación nueva de Claude, Datos rápidos del proyecto, Memoria del proyecto VALU Finance AI, Índice

### Community 98 - "audit-catalog.cjs"
Cohesion: 0.33
Nodes (5): COMMON, { DEFAULT_CATEGORIES }, map, NON_EXPENSE, { normalize }

### Community 99 - "react-native"
Cohesion: 0.12
Nodes (30): Instalar(), Step(), Draft, GoalCard(), GoalEditForm(), Metas(), milestoneMessage(), pacingMessage() (+22 more)

### Community 100 - "Account"
Cohesion: 0.16
Nodes (14): Abierto (2026-09-28) — Hallazgos concretos de la auditoría de las 65 operaciones de Fase 2, Auditoría de Android — pendiente de confirmar en un dispositivo real, Campos de fecha del presupuesto — solo locales, Checklist de pendientes (actualizada 2026-10-03), Decisiones y deuda de producto abiertas, Hoja de ruta de Fase 2, Inversiones por institución, Memoria de correcciones — solo en este dispositivo (+6 more)

### Community 101 - "packs.cjs"
Cohesion: 0.12
Nodes (14): AMBIG_NORM, AMBIGUOUS_BARE, { DEFAULT_CATEGORIES: D }, DIR, dry, fs, includeBase, NEVER_PRUNE (+6 more)

### Community 102 - "0020_push_notifications.sql"
Cohesion: 0.43
Nodes (6): auth, public.notification_log, public.notification_settings, public.push_subscriptions, push_subscriptions_user_id_idx, auth.users

### Community 103 - "categories.ts"
Cohesion: 0.14
Nodes (12): B, covered, { DEFAULT_CATEGORIES: D }, dup, ids, subs, { DEFAULT_CATEGORIES }, BASE_CATEGORIES (+4 more)

### Community 105 - "Migraciones de VALU Finance AI"
Cohesion: 0.33
Nodes (5): Cómo aplicarlas (cuando tengas tu proyecto Supabase), Función `ai-relay` (necesaria solo para usar tu propia IA desde la versión web), Función `push-notify` (notificaciones al celular), Migraciones de VALU Finance AI, Principios aplicados (spec 69-88)

### Community 109 - "P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03)"
Cohesion: 0.17
Nodes (12): Cifras que se pueden creer (primera y única corrida de cada sellado), Contaminación (para no engañarse), Cómo seguir, Experimentos descartados (no se adoptaron), Golden set del motor local — resultados (P1 y P1b), Límites conocidos (no se arreglan a propósito), P1b — catálogo ampliado a ≈19 mil palabras (2026-10-03), Próximo paso de medición (+4 more)

### Community 110 - "3. Deuda Técnica y Parches"
Cohesion: 0.18
Nodes (10): 3.2 La conexión de IA — qué es bug real y qué es diseño esperado, 3.3 Código temporal / soluciones rápidas pendientes de refactor, 3.4 Tareas abiertas en el backlog (estado real, no aspiracional), 3.5 Validación pendiente en hardware real, 3. Deuda Técnica y Parches, 4.1 Cómo se conectan las piezas, de punta a punta, 4.2 Las dos superficies de lenguaje natural, en paralelo, 4.3 Seguridad del sistema de escritura por IA (resumen operativo) (+2 more)

### Community 111 - "5. Punto de Partida para la Fase 2"
Cohesion: 0.40
Nodes (5): 5.1 Dónde estamos parados, en una frase, 5.2 Estado de los 3 pasos originales + lo que sigue, 5.3 Otros dos hilos abiertos, fuera del roadmap original, 5.3bis Fase 2 ya arrancó formalmente (28 sep 2026) — reemplaza el "Paso 2" de arriba, 5. Punto de Partida para la Fase 2

### Community 112 - "format.ts"
Cohesion: 0.19
Nodes (12): styles, TransactionDetail(), CategoryIcon(), CategoryIconProps, styles, ACCOUNT_TYPE_ICONS, LIABILITY_TYPE_LABELS, CATEGORY_ICONS (+4 more)

### Community 113 - "investmentActions.ts"
Cohesion: 0.26
Nodes (15): InstitutionProduct, LIQUIDITY_TICKER, AssetClass, active(), adjustProductCash(), buyAsset(), BuyInput, CetesInput (+7 more)

### Community 114 - "date.ts"
Cohesion: 0.29
Nodes (12): LiabilityForm(), CalendarPicker(), CalendarPickerProps, styles, DateField(), DateFieldProps, addMonths(), CalendarCell (+4 more)

### Community 115 - "perfil.tsx"
Cohesion: 0.23
Nodes (10): Index(), AGE_OPTIONS, Perfil(), SEX_OPTIONS, styles, updateEmail(), AuthState, useAuthSession() (+2 more)

### Community 116 - "parseCaptureText"
Cohesion: 0.18
Nodes (10): Qué fallaba en Fresco 5 (clases, no frases sueltas), { DEFAULT_CATEGORIES }, { normalize, parseCaptureText }, text, extractCategory(), extractCurrency(), extractType(), parseCaptureText() (+2 more)

### Community 117 - "ts-hook.cjs"
Cohesion: 0.20
Nodes (9): ref_fs, ref_module, ref_path, typescript, fs, Module, path, ROOT (+1 more)

### Community 118 - "BudgetProgressChart.tsx"
Cohesion: 0.27
Nodes (8): react-native-svg, BudgetProgressChart(), BudgetProgressItem, capItems(), styles, ThermometerBar(), YAxisRuler(), HealthGradientBarProps

### Community 119 - "ChatActionCard.tsx"
Cohesion: 0.39
Nodes (6): expo-haptics, ChatActionCard(), styles, styles, chatGlass(), ChatPalette

### Community 120 - "handwritten.cjs"
Cohesion: 0.22
Nodes (8): AJUSTES, GAS, MONTOS, MULTI_NUMERO, SEGMENTOS, SIN_CATEGORIA, TIPOS, TYPOS

### Community 121 - "AiOrb.tsx"
Cohesion: 0.33
Nodes (6): assets_icon, AiOrb(), AnimatedSvgCircle, logoSource, styles, CHAT_PALETTE

### Community 122 - "extractAmount"
Cohesion: 0.33
Nodes (7): Ajuste de saldo y separación de varios movimientos, Extracción del monto (`extractAmount`), Montos: decimales, miles y abreviaturas (2026-10-03), amountTokens(), extractAmount(), joinSep(), splitCaptureSegments()

### Community 123 - "ChatSidebar.tsx"
Cohesion: 0.43
Nodes (6): ChatSidebar(), dateGroup(), GROUP_ORDER, MobileDrawer(), normalize(), styles

### Community 124 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, android, build:web, ios, start, web

### Community 125 - "rnd"
Cohesion: 0.40
Nodes (5): amountText(), int(), pick(), rnd, words()

### Community 126 - "usePressToTalk.ts"
Cohesion: 0.40
Nodes (4): PressToTalkStatus, usePressToTalk(), UsePressToTalkResult, providers

### Community 127 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

## Knowledge Gaps
- **605 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+600 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 706 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `useTheme` to `HoldToConfirmButton.tsx`, `budget-template/[id].tsx`, `providers/types.ts`, `settings.tsx`, `(tabs)/index.tsx`, `movimientos.tsx`, `useAppStore`, `finance.ts`, `AccountDropdown.tsx`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `inversiones.tsx`, `BudgetTemplateEdit`, `actions.ts`, `ThemeProvider.tsx`, `ConceptBudgetForm.tsx`, `ia.tsx`, `institutions.ts`, `capture.tsx`, `[product].tsx`, `client.ts`, `presupuesto.tsx`, `notificaciones.tsx`, `react-native`, `format.ts`, `date.ts`, `perfil.tsx`, `BudgetProgressChart.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `HoldToConfirmButton.tsx`, `budget-template/[id].tsx`, `providers/types.ts`, `settings.tsx`, `(tabs)/index.tsx`, `movimientos.tsx`, `SyncEngine.ts`, `useAppStore`, `package.json`, `finance.ts`, `AccountDropdown.tsx`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `inversiones.tsx`, `BudgetTemplateEdit`, `actions.ts`, `useTheme`, `ThemeProvider.tsx`, `ConceptBudgetForm.tsx`, `ia.tsx`, `institutions.ts`, `@react-native-async-storage/async-storage`, `capture.tsx`, `[product].tsx`, `client.ts`, `presupuesto.tsx`, `notificaciones.tsx`, `format.ts`, `date.ts`, `perfil.tsx`, `BudgetProgressChart.tsx`, `ChatActionCard.tsx`, `AiOrb.tsx`, `ChatSidebar.tsx`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `react` connect `react-native` to `HoldToConfirmButton.tsx`, `budget-template/[id].tsx`, `providers/types.ts`, `settings.tsx`, `(tabs)/index.tsx`, `movimientos.tsx`, `SyncEngine.ts`, `useAppStore`, `package.json`, `finance.ts`, `AccountDropdown.tsx`, `BudgetTemplateList.tsx`, `onboarding.tsx`, `investmentModels.ts`, `inversiones.tsx`, `BudgetTemplateEdit`, `actions.ts`, `useTheme`, `ThemeProvider.tsx`, `ConceptBudgetForm.tsx`, `ia.tsx`, `institutions.ts`, `capture.tsx`, `[product].tsx`, `client.ts`, `presupuesto.tsx`, `notificaciones.tsx`, `format.ts`, `date.ts`, `perfil.tsx`, `BudgetProgressChart.tsx`, `ChatActionCard.tsx`, `AiOrb.tsx`, `ChatSidebar.tsx`, `usePressToTalk.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _605 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `localParser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05832147937411095 - nodes in this community are weakly interconnected._
- **Should `budget-template/[id].tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12681159420289856 - nodes in this community are weakly interconnected._
- **Should `providers/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054199328107502796 - nodes in this community are weakly interconnected._