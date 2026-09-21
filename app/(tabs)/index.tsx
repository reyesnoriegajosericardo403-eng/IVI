import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountCardStack, type AccountStackItem } from '@/components/AccountCardStack';
import { AccountDropdown } from '@/components/AccountDropdown';
import { BudgetProgressChart, type BudgetProgressItem } from '@/components/BudgetProgressChart';
import { DonutChart } from '@/components/DonutChart';
import { GlassCard } from '@/components/GlassCard';
import { GlassSheen } from '@/components/GlassSheen';
import { NetWorthTrendChart } from '@/components/NetWorthTrendChart';
import { CASH_ACCOUNT_COLOR } from '@/data/accountColors';
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/data/accountMeta';
import { budgetConceptsByGroup, findBudgetConcept, findIncomeConcept, parseSubBudgetId, type BudgetGroupId } from '@/data/budgetConcepts';
import { useContentMaxWidth } from '@/hooks/useBreakpoint';
import {
  selectActiveAccounts,
  selectActiveBudgetAssignments,
  selectActiveBudgetTemplates,
  selectActiveInvestments,
  selectActiveLiabilities,
  selectActiveNetWorthHistory,
  selectActivePeriodOverrides,
  selectActiveTemplateBudgetLines,
  selectActiveTransactions,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { surfaceBlur, surfaceShadow, withAlpha } from '@/theme/surfaceStyle';
import { useTheme } from '@/theme/ThemeProvider';
import { makePeriodKey } from '@/utils/budgetPeriods';
import { getBudgetBanner, getDailyBudgetTip, greetingIcon } from '@/utils/dashboardCopy';
import { formatCurrency, formatPercent } from '@/utils/format';
import {
  computeNetWorth,
  getNetWorthTrend,
  incomeByKind,
  periodKey,
  previousMonthSpend,
  previousPeriodAvailable,
  resolveBudgetForPeriod,
  spendByConcept,
  spendInPeriod,
  sumByTypeInPeriod,
  topSpendCategories,
  upcomingLiabilityReminders,
} from '@/utils/finance';
import { evaluateFinancialInsights, type FinancialInsight } from '@/utils/financialInsights';

type Scope = 'month' | 'week';

const GROUP_LABELS: Record<BudgetGroupId, string> = { necesidades: 'Necesidades', deseos: 'Deseos', ahorro: 'Ahorro' };

export default function Dashboard() {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const maxWidth = useContentMaxWidth();
  const profile = useAppStore((s) => s.profile);
  const rawAccounts = useAppStore((s) => s.accounts);
  const rawInvestments = useAppStore((s) => s.investments);
  const rawLiabilities = useAppStore((s) => s.liabilities);
  const rawTransactions = useAppStore((s) => s.transactions);
  const rawTemplates = useAppStore((s) => s.budgetTemplates);
  const rawTemplateLines = useAppStore((s) => s.templateBudgetLines);
  const rawAssignments = useAppStore((s) => s.budgetAssignments);
  const rawOverrides = useAppStore((s) => s.periodBudgetOverrides);
  const rawNetWorthHistory = useAppStore((s) => s.netWorthHistory);
  const liveQuotes = useAppStore((s) => s.liveQuotes);
  const budgetPeriods = useAppStore((s) => s.budgetPeriods);
  const ackBudgetPeriod = useAppStore((s) => s.ackBudgetPeriod);
  const ensureDefaultBudgetTemplate = useAppStore((s) => s.ensureDefaultBudgetTemplate);

  // El presupuesto que se edita hoy vive en las plantillas
  // (templateBudgetLines/budgetAssignments), no en el arreglo `budgets`
  // heredado — este efecto solo migra lo viejo la primera vez, para que
  // un presupuesto armado en el onboarding no "desaparezca" aquí si el
  // usuario nunca visitó Presupuesto (mismo efecto que ya corre ahí).
  useEffect(() => {
    ensureDefaultBudgetTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accounts = useMemo(() => selectActiveAccounts(rawAccounts), [rawAccounts]);
  const accountStackItems = useMemo<AccountStackItem[]>(
    () =>
      accounts.map((a) => ({
        id: a.id,
        name: a.name,
        typeLabel: ACCOUNT_TYPE_LABELS[a.type],
        balance: a.balance,
        currency: a.currency,
        color: a.type === 'cash' ? CASH_ACCOUNT_COLOR : a.color ?? colors.accentFrom,
        iconName: ACCOUNT_TYPE_ICONS[a.type],
      })),
    [accounts, colors.accentFrom]
  );
  const investments = useMemo(() => selectActiveInvestments(rawInvestments), [rawInvestments]);
  const liabilities = useMemo(() => selectActiveLiabilities(rawLiabilities), [rawLiabilities]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);
  const templates = useMemo(() => selectActiveBudgetTemplates(rawTemplates), [rawTemplates]);
  const templateLines = useMemo(() => selectActiveTemplateBudgetLines(rawTemplateLines), [rawTemplateLines]);
  const assignments = useMemo(() => selectActiveBudgetAssignments(rawAssignments), [rawAssignments]);
  const overrides = useMemo(() => selectActivePeriodOverrides(rawOverrides), [rawOverrides]);
  const netWorthHistory = useMemo(() => selectActiveNetWorthHistory(rawNetWorthHistory), [rawNetWorthHistory]);

  const [summaryScope, setSummaryScope] = useState<Scope>('month');

  const netWorth = computeNetWorth(accounts, investments, liabilities, profile.primaryCurrency, liveQuotes);
  const monthTrend = getNetWorthTrend(netWorthHistory, 30);

  const monthlySpend = spendInPeriod(transactions);
  const prevSpend = previousMonthSpend(transactions);
  const spendTrend = prevSpend > 0 ? ((monthlySpend - prevSpend) / prevSpend) * 100 : null;

  // ---- "¿En qué gastaste tu dinero?" (siempre del mes en curso) ----
  // Misma resolución que usa Presupuesto (plantilla asignada al periodo
  // real de hoy, con sus ajustes) — así lo que se edita en "Mis
  // presupuestos" se refleja aquí de inmediato, en vez de depender del
  // arreglo `budgets` heredado que solo el onboarding llega a escribir.
  const monthlyBudgetLines = resolveBudgetForPeriod({
    periodKey: makePeriodKey('month', new Date()),
    templates,
    templateLines,
    assignments,
    overrides,
    transactions,
    thresholds: profile.budgetThresholds,
  }).lines;
  // Solo presupuesto de GASTO — el presupuesto de ingresos no tiene nada
  // que ver con "cuánto te queda disponible de tu presupuesto de gastos"
  // (mismo principio que "Tu resumen": nunca mezclar ingreso presupuestado
  // con gasto real).
  const monthBudgeted = monthlyBudgetLines
    .filter((l) => !findIncomeConcept(l.categoryId))
    .reduce((s, b) => s + b.budgeted, 0);
  const hasBudget = monthBudgeted > 0;
  const spendSlices = topSpendCategories(transactions, new Date(), 'month', 3);
  const SLICE_COLORS = [colors.success, colors.danger, colors.info, colors.accentFrom];
  const donutData = spendSlices.map((s, i) => ({ label: s.name, value: s.amount, color: SLICE_COLORS[i % SLICE_COLORS.length] }));
  const available = hasBudget ? Math.max(0, monthBudgeted - monthlySpend) : 0;

  // ---- Banner de presupuesto + tip (cambian por hora/día — spec) ----
  const budgetBanner = getBudgetBanner(hasBudget);
  const dailyTip = getDailyBudgetTip();

  // ---- Barras "termómetro" del presupuesto por grupo (Necesidades/
  // Deseos/Ahorro): presupuestado vs. gastado real — se reutilizan las
  // mismas líneas ya resueltas por resolveBudgetForPeriod, así el número
  // de aquí siempre coincide con el resto de la app (spec: "ver de manera
  // jerárquica cómo están sus gastos respecto a sus presupuestos").
  const budgetProgressItems = useMemo<BudgetProgressItem[]>(() => {
    if (!hasBudget) return [];
    const totals: Record<BudgetGroupId, { budgeted: number; actual: number }> = {
      necesidades: { budgeted: 0, actual: 0 },
      deseos: { budgeted: 0, actual: 0 },
      ahorro: { budgeted: 0, actual: 0 },
    };
    monthlyBudgetLines.forEach((line) => {
      if (findIncomeConcept(line.categoryId)) return;
      const parsed = parseSubBudgetId(line.categoryId);
      const conceptId = parsed ? parsed.conceptId : line.categoryId;
      const group = findBudgetConcept(conceptId)?.group ?? 'necesidades';
      totals[group].budgeted += line.budgeted;
      totals[group].actual += line.actual;
    });
    return (['necesidades', 'deseos', 'ahorro'] as BudgetGroupId[])
      .filter((g) => totals[g].budgeted > 0)
      .map((g) => ({ id: g, label: GROUP_LABELS[g], budgeted: totals[g].budgeted, actual: totals[g].actual }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyBudgetLines, hasBudget]);

  // ---- Insights financieros (nudging empático) — mismo lugar que el
  // banner de presupuesto, pero un aviso de comportamiento real le gana
  // al recordatorio genérico cuando aplica (spec: "esa ficha es donde van
  // a salir los anuncios"). Gastos_Necesidades_Deseos/Gastos_Ahorro = lo
  // que de verdad se ha gastado/ahorrado este mes en esos grupos del
  // presupuesto; Ingreso_Mensual = lo presupuestado como ingreso si
  // existe, si no, lo que ya se recibió realmente este mes — nunca un
  // número inventado.
  const conceptSpendMonth = spendByConcept(transactions, new Date(), 'month');
  const gastosNecesidadesDeseos =
    budgetConceptsByGroup('necesidades').reduce((s, c) => s + (conceptSpendMonth[c.id] ?? 0), 0) +
    budgetConceptsByGroup('deseos').reduce((s, c) => s + (conceptSpendMonth[c.id] ?? 0), 0);
  const gastosAhorro = budgetConceptsByGroup('ahorro').reduce((s, c) => s + (conceptSpendMonth[c.id] ?? 0), 0);
  const plannedIncome = monthlyBudgetLines
    .filter((l) => !!findIncomeConcept(l.categoryId))
    .reduce((s, l) => s + l.budgeted, 0);
  const actualIncome = incomeByKind(transactions, new Date(), 'month');
  const ingresoMensual = plannedIncome > 0 ? plannedIncome : actualIncome.fixed + actualIncome.variable;

  const now = new Date();
  const currentDay = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const financialInsights = evaluateFinancialInsights({
    gastosNecesidadesDeseos,
    gastosAhorro,
    ingresoMensual,
    currentDay,
    totalDaysInMonth,
    currency: profile.primaryCurrency,
  });
  const topInsight: FinancialInsight | undefined = financialInsights[0];
  const insightToneColor: Record<FinancialInsight['tone'], string> = {
    caution: colors.warning,
    opportunity: colors.accentFrom,
    celebration: colors.success,
  };
  const insightToneIcon: Record<FinancialInsight['tone'], keyof typeof Ionicons.glyphMap> = {
    caution: 'alert-circle-outline',
    opportunity: 'rocket-outline',
    celebration: 'trophy-outline',
  };

  // ---- Sobrante del periodo anterior (semana o mes) que sigue contando
  // como Disponible mientras el usuario no diga lo contrario — spec:
  // "¿seguimos con el mismo sobrante de dinero disponible?" ----
  const weekKey = periodKey('week');
  const monthKey = periodKey('month');
  const currentCarryOver = budgetPeriods[summaryScope].lastPeriodKey === (summaryScope === 'week' ? weekKey : monthKey)
    ? budgetPeriods[summaryScope].carryOver
    : 0;

  const pendingRollovers = useMemo(() => {
    const out: Array<{ scope: Scope; key: string; leftover: number }> = [];
    (['week', 'month'] as Scope[]).forEach((s) => {
      const key = s === 'week' ? weekKey : monthKey;
      const state = budgetPeriods[s];
      if (state.lastPeriodKey && state.lastPeriodKey !== key) {
        const leftover = previousPeriodAvailable(transactions, s, new Date());
        if (leftover > 0) out.push({ scope: s, key, leftover });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, monthKey, budgetPeriods.week.lastPeriodKey, budgetPeriods.month.lastPeriodKey, transactions]);

  useEffect(() => {
    (['week', 'month'] as Scope[]).forEach((s) => {
      const key = s === 'week' ? weekKey : monthKey;
      const state = budgetPeriods[s];
      if (state.lastPeriodKey === null) {
        ackBudgetPeriod(s, key, 0);
        return;
      }
      if (state.lastPeriodKey !== key) {
        const leftover = previousPeriodAvailable(transactions, s, new Date());
        if (leftover <= 0) ackBudgetPeriod(s, key, 0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, monthKey]);

  // ---- "Tu resumen" (con toggle semana/mes) — SOLO ingresos reales menos
  // gastos reales del periodo, nunca montos presupuestados (spec: "no le
  // restes ni le sumes los gastos que están en el presupuesto porque eso
  // no tiene sentido"). ----
  const summaryIncomeByKind = incomeByKind(transactions, new Date(), summaryScope);
  const summaryIncome = summaryIncomeByKind.fixed + summaryIncomeByKind.variable;
  const summarySpent = spendInPeriod(transactions, new Date(), summaryScope);
  const summarySaved = sumByTypeInPeriod(transactions, 'saving', new Date(), summaryScope);
  const summaryAvailable = summaryIncome - summarySpent + currentCarryOver;
  const summaryAvailableForBar = Math.max(0, summaryAvailable);
  const summaryTotal = summaryAvailableForBar + summarySpent + summarySaved;

  // ---- Recordatorios reales (deudas por vencer) ----
  const reminders = upcomingLiabilityReminders(liabilities, 14).slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  const reminderLabel = (daysUntil: number) => {
    if (daysUntil < 0) return `Venció hace ${Math.abs(daysUntil)} día${Math.abs(daysUntil) === 1 ? '' : 's'}`;
    if (daysUntil === 0) return 'Vence hoy';
    return `Vence en ${daysUntil} día${daysUntil === 1 ? '' : 's'}`;
  };

  const scopeLabel = (s: Scope) => (s === 'week' ? 'la semana pasada' : 'el mes pasado');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          { padding: spacing.lg, paddingBottom: 140, gap: spacing.lg },
          maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null,
        ]}
      >
        <View style={[styles.greetingRow, { marginBottom: spacing.xs }]}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {greeting}, {profile.name || 'Hola'} {greetingIcon()}
            </Text>
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>
              Así va tu dinero hoy
            </Text>
          </View>
          <AccountDropdown />
        </View>

        {/* ---------- ¿Seguimos con el mismo sobrante disponible? ---------- */}
        {pendingRollovers.map((p) => (
          <View
            key={p.scope}
            style={[
              styles.rolloverCard,
              { backgroundColor: withAlpha(colors.accentFrom, 0.86), borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
              surfaceShadow(surface),
              surfaceBlur(surface),
            ]}
          >
            {surface.blur > 0 && <GlassSheen radius={radius.lg} />}
            <View style={styles.rowCenter}>
              <Ionicons name="help-buoy-outline" size={22} color="#FFFFFF" />
              <Text style={[typography.headline, { color: '#FFFFFF', marginLeft: spacing.sm, flex: 1 }]}>
                Ya terminó {p.scope === 'week' ? 'la semana' : 'el mes'} pasad{p.scope === 'week' ? 'a' : 'o'}
              </Text>
            </View>
            <Text style={[typography.body, { color: 'rgba(255,255,255,0.9)' }]}>
              Te quedaron {formatCurrency(p.leftover, profile.primaryCurrency)} disponibles de {scopeLabel(p.scope)}. ¿Seguimos
              contando ese dinero como disponible para {p.scope === 'week' ? 'esta semana' : 'este mes'}?
            </Text>
            <View style={styles.rolloverActions}>
              <Pressable
                accessibilityLabel={`No mantener sobrante de ${p.scope === 'week' ? 'la semana' : 'el mes'} pasad${p.scope === 'week' ? 'a' : 'o'}`}
                onPress={() => ackBudgetPeriod(p.scope, p.key, 0)}
                style={[styles.rolloverBtnGhost, { borderRadius: radius.pill, borderColor: 'rgba(255,255,255,0.5)' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>No, empezar en $0</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Sí mantener sobrante de ${p.scope === 'week' ? 'la semana' : 'el mes'} pasad${p.scope === 'week' ? 'a' : 'o'}`}
                onPress={() => ackBudgetPeriod(p.scope, p.key, p.leftover)}
                style={[styles.rolloverBtnSolid, { borderRadius: radius.pill }]}
              >
                <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>Sí, sigue conmigo</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* ---------- Ficha de anuncios: insight financiero si aplica, si no
            el recordatorio de presupuesto — spec: "el anuncio... lo pongas
            arriba de la ficha de '¿En qué gastaste tu dinero hoy?'". ---------- */}
        {topInsight ? (
          <Pressable
            accessibilityLabel={topInsight.title}
            onPress={() => router.push('/presupuesto')}
            style={[
              styles.budgetBanner,
              { backgroundColor: withAlpha(insightToneColor[topInsight.tone], 0.86), borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
              surfaceShadow(surface),
              surfaceBlur(surface),
            ]}
          >
            {surface.blur > 0 && <GlassSheen radius={radius.lg} />}
            <Ionicons name={insightToneIcon[topInsight.tone]} size={32} color="rgba(255,255,255,0.85)" />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>{topInsight.title}</Text>
              <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs }]}>
                {topInsight.message}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.budgetInviteBanner,
              { backgroundColor: withAlpha(colors.accentFrom, 0.86), borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
              surfaceShadow(surface),
              surfaceBlur(surface),
            ]}
          >
            {surface.blur > 0 && <GlassSheen radius={radius.lg} />}
            {/* Eyebrow: "PRESUPUESTO" debe ser lo primero y más reconocible
                que se lea — antes quedaba enterrado dentro de la oración
                (spec: "la palabra presupuesto se debe poder ver y
                reconocer"). */}
            <View style={styles.budgetBannerEyebrowRow}>
              <View style={[styles.budgetBannerIconBadge, { borderRadius: 14 }]}>
                <Ionicons name="clipboard-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.budgetBannerEyebrowText}>PRESUPUESTO</Text>
            </View>
            <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600', marginTop: spacing.sm }]}>
              {budgetBanner.title}
            </Text>
            {/* El CTA se ve como un botón real (píldora blanca sólida), no
                solo texto con flecha — spec: "aún más visible". Se queda
                ARRIBA de la gráfica nueva para que nunca se pierda de
                vista (spec: "debe quedar por arriba y mantenerse
                visible"). */}
            <Pressable
              accessibilityLabel={budgetBanner.cta}
              onPress={() => router.push('/presupuesto')}
              style={[styles.budgetBannerCta, { borderRadius: radius.pill, marginTop: spacing.md }]}
            >
              <Text style={{ color: colors.accentFrom, fontWeight: '700' }}>{budgetBanner.cta}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.accentFrom} style={{ marginLeft: 6 }} />
            </Pressable>

            {/* Distribución del presupuesto por grupo — presupuestado en
                azul, gastado real relleno de abajo hacia arriba en rojo
                (spec: "ver de manera jerárquica cómo están sus gastos
                respecto a sus presupuestos"). Solo si ya hay presupuesto
                que mostrar. */}
            {budgetProgressItems.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <BudgetProgressChart items={budgetProgressItems} currency={profile.primaryCurrency} />
              </View>
            )}
          </View>
        )}

        <View style={[styles.tipCard, { backgroundColor: colors.accentSoft, borderRadius: radius.md }]}>
          <Ionicons name="bulb-outline" size={16} color={colors.accentFrom} />
          <Text style={[typography.caption, { color: colors.accentFrom, marginLeft: spacing.sm, flex: 1 }]}>{dailyTip}</Text>
        </View>

        {/* ---------- ¿En qué gastaste tu dinero? ---------- */}
        <GlassCard style={{ gap: spacing.md }}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>¿En qué gastaste tu dinero?</Text>
            <Pressable accessibilityLabel="Ver detalle de gastos" onPress={() => router.push('/(tabs)/movimientos')}>
              <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>Ver detalle →</Text>
            </Pressable>
          </View>

          {spendSlices.length > 0 ? (
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <DonutChart data={donutData} size={140} emptyColor={colors.divider} />
                <View style={styles.donutCenter} pointerEvents="none">
                  <Text style={[typography.micro, { color: colors.textTertiary }]}>
                    {hasBudget ? 'DISPONIBLE' : 'GASTADO'}
                  </Text>
                  <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(hasBudget ? available : monthlySpend, profile.primaryCurrency)}
                  </Text>
                  {hasBudget && (
                    <Text style={[typography.micro, { color: colors.textTertiary }]}>
                      de {formatCurrency(monthBudgeted, profile.primaryCurrency)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ flex: 1, gap: spacing.sm, minWidth: 140 }}>
                {spendSlices.map((slice, i) => (
                  <View key={slice.categoryId} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }]} />
                    <Text style={[typography.caption, { color: colors.textPrimary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
                      {slice.name}
                    </Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
                        {Math.round(slice.percent)}%
                      </Text>
                      <Text style={[typography.micro, { color: colors.textTertiary }]}>
                        {formatCurrency(slice.amount, profile.primaryCurrency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[typography.caption, { color: colors.textTertiary }]}>Aún no registras gastos este mes.</Text>
          )}
        </GlassCard>

        {/* ---------- Tu resumen ---------- */}
        <View style={{ gap: spacing.sm }}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Tu resumen</Text>
            <Pressable
              accessibilityLabel="Cambiar periodo del resumen"
              onPress={() => setSummaryScope((s) => (s === 'month' ? 'week' : 'month'))}
              style={styles.rowCenter}
            >
              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                {summaryScope === 'month' ? 'Este mes' : 'Esta semana'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Disponible</Text>
              <Text
                style={[typography.headline, { color: summaryAvailable >= 0 ? colors.success : colors.danger }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {summaryAvailable < 0 ? '-' : ''}
                {formatCurrency(Math.abs(summaryAvailable), profile.primaryCurrency)}
              </Text>
            </GlassCard>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Gastado</Text>
              <Text style={[typography.headline, { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summarySpent, profile.primaryCurrency)}
              </Text>
            </GlassCard>
            <GlassCard style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Ahorrado</Text>
              <Text style={[typography.headline, { color: colors.info }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(summarySaved, profile.primaryCurrency)}
              </Text>
            </GlassCard>
          </View>

          {summaryTotal > 0 && (
            <View style={[styles.segmentedBar, { borderRadius: radius.pill }]}>
              {summaryAvailableForBar > 0 && <View style={{ flex: summaryAvailableForBar, backgroundColor: colors.success }} />}
              {summarySpent > 0 && <View style={{ flex: summarySpent, backgroundColor: colors.danger }} />}
              {summarySaved > 0 && <View style={{ flex: summarySaved, backgroundColor: colors.info }} />}
            </View>
          )}
        </View>

        {/* ---------- Cuentas (solo lectura) + patrimonio neto, mitad y
            mitad — spec: "ubiques las tarjetas deslizables debajo de tu
            resumen... que ocupe la mitad del espacio... con la ficha de
            patrimonio neto". Tocar una tarjeta aquí NO abre edición (eso
            solo vive en Patrimonio) — nada más deslizar para verlas. ---------- */}
        <View style={styles.halfRow}>
          <View style={{ flex: 1 }}>
            {accountStackItems.length > 0 ? (
              <AccountCardStack items={accountStackItems} variant="glass" compact frontLabelPrefix="Ver" />
            ) : (
              <GlassCard style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[typography.micro, { color: colors.textTertiary, textAlign: 'center' }]}>Aún no tienes cuentas</Text>
              </GlassCard>
            )}
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/(tabs)/patrimonio')} accessibilityLabel="Ver detalle de patrimonio">
            <GlassCard style={{ gap: 4 }} padded={false}>
              <View style={styles.netWorthMiniCard}>
                <Text style={[typography.micro, { color: colors.textSecondary }]}>Patrimonio neto</Text>
                <Text style={[typography.headline, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(netWorth.netWorth, profile.primaryCurrency)}
                </Text>
                {monthTrend !== null && (
                  <Text style={[typography.micro, { color: monthTrend >= 0 ? colors.success : colors.danger }]}>
                    {formatPercent(monthTrend)} en 30 días
                  </Text>
                )}
                <NetWorthTrendChart history={netWorthHistory} color={colors.accentFrom} width={128} height={36} compact />
              </View>
            </GlassCard>
          </Pressable>
        </View>

        {/* ---------- Comparación honesta vs. periodo anterior ---------- */}
        {spendTrend !== null && (
          <View
            style={[
              styles.compareCard,
              { backgroundColor: spendTrend <= 0 ? colors.accentSoft : 'transparent', borderColor: spendTrend > 0 ? colors.surfaceBorder : 'transparent', borderWidth: spendTrend > 0 ? 1 : 0, borderRadius: radius.lg },
            ]}
          >
            <Ionicons
              name={spendTrend <= 0 ? 'sparkles' : 'information-circle-outline'}
              size={28}
              color={spendTrend <= 0 ? colors.success : colors.textSecondary}
            />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.headline, { color: spendTrend <= 0 ? colors.success : colors.textPrimary }]}>
                {spendTrend <= 0 ? '¡Vas bien!' : 'Ojo con esto'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Gastaste {formatCurrency(Math.abs(monthlySpend - prevSpend), profile.primaryCurrency)}{' '}
                {spendTrend <= 0 ? 'menos' : 'más'} que el mes pasado.
              </Text>
            </View>
          </View>
        )}

        {/* ---------- Recordatorios para ti ---------- */}
        {reminders.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Recordatorios para ti</Text>
            {reminders.map((r) => (
              <Pressable key={r.liabilityId} onPress={() => router.push('/(tabs)/patrimonio')}>
                <GlassCard style={styles.reminderRow}>
                  <View style={[styles.reminderIcon, { backgroundColor: colors.accentSoft, borderRadius: radius.pill }]}>
                    <Ionicons name="notifications-outline" size={18} color={colors.accentFrom} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                      Tu pago de {r.institution} {reminderLabel(r.daysUntil).toLowerCase()}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>No olvides pagar a tiempo.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </GlassCard>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // zIndex explícito: el menú de cuenta se despliega hacia abajo y puede
  // terminar sobre el banner de presupuesto que viene después en el
  // ScrollView — sin esto, ese banner (que también tiene su propio vidrio,
  // con backdrop-filter) puede acabar "ganándole" el toque al menú.
  greetingRow: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative', zIndex: 20 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rolloverCard: { padding: 18, gap: 10, overflow: 'hidden' },
  rolloverActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rolloverBtnGhost: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1.5 },
  rolloverBtnSolid: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFFFFF' },
  donutRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  donutWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 100 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  budgetBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, overflow: 'hidden' },
  budgetInviteBanner: { padding: 22, overflow: 'hidden' },
  budgetBannerEyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  budgetBannerIconBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginRight: 8,
  },
  budgetBannerEyebrowText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 1.4 },
  budgetBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, marginTop: -8 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  segmentedBar: { flexDirection: 'row', height: 10, overflow: 'hidden' },
  halfRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  netWorthMiniCard: { padding: 14, gap: 2 },
  compareCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  reminderRow: { flexDirection: 'row', alignItems: 'center' },
  reminderIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
