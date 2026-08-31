import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConceptBudgetForm } from '@/components/ConceptBudgetForm';
import { ConceptRow } from '@/components/ConceptRow';
import { IncomeConceptRow } from '@/components/IncomeConceptRow';
import { ProgressBar } from '@/components/ProgressBar';
import { ValuMark } from '@/components/ValuMark';
import { BUDGET_GROUP_LABELS, budgetConceptsByGroup, INCOME_CONCEPTS, type BudgetGroupId, type IncomeConcept } from '@/data/budgetConcepts';
import type { BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { ONBOARDING_SURVEY } from '@/data/onboardingSurvey';
import { useAuthSession } from '@/services/auth/useAuthSession';
import { submitSurveyResponse } from '@/services/supabase/surveyRepository';
import { selectActiveBudgets, selectActiveTransactions } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';
import { computeMonthlyAmount } from '@/utils/budgetCalculator';
import { buildBudgetLines, incomeByConcept, spendByConcept } from '@/utils/finance';

const CURRENCIES: Currency[] = ['MXN', 'USD'];
const GROUPS: BudgetGroupId[] = ['hoy', 'luego', 'compartir'];

// Copia específica del onboarding — más explicativa que la de la
// pantalla normal de Presupuesto, porque aquí es la primera vez que
// alguien ve estos grupos (spec: "en el de hoy debe señalar que ahí
// están tus fijos").
const ONBOARDING_GROUP_EXPLANATIONS: Record<BudgetGroupId, string> = {
  hoy: 'Aquí van tus gastos fijos y del día a día: renta, súper, transporte, salidas.',
  luego: 'Aquí va lo que separas para el futuro: ahorro, fondo de emergencia e inversiones.',
  compartir: 'Aquí va lo que das a otros: regalos, apoyo familiar y donaciones.',
};

type Step = 'profile' | 'survey' | 'budgetAd' | 'budgetIncome' | 'budgetExpenses';

export default function Onboarding() {
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useAppStore((s) => s.profile);
  const rawBudgets = useAppStore((s) => s.budgets);
  const rawTransactions = useAppStore((s) => s.transactions);
  const updateProfileDraft = useAppStore((s) => s.updateProfileDraft);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const loadDemoData = useAppStore((s) => s.loadDemoData);
  const setBudget = useAppStore((s) => s.setBudget);
  const deleteBudget = useAppStore((s) => s.deleteBudget);
  const { userId } = useAuthSession();

  const budgets = useMemo(() => selectActiveBudgets(rawBudgets), [rawBudgets]);
  const transactions = useMemo(() => selectActiveTransactions(rawTransactions), [rawTransactions]);

  const [step, setStep] = useState<Step>('profile');

  // ---------- Paso 1: perfil (nombre, moneda, datos demo) ----------
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('MXN');
  const [wantsDemo, setWantsDemo] = useState(true);

  const handleProfileNext = () => {
    // Se guarda ya (sin marcar onboardingComplete todavía) para que la
    // moneda elegida se refleje de una vez en los pasos que siguen.
    updateProfileDraft({ name: name.trim() || 'Tú', primaryCurrency: currency });
    if (wantsDemo) loadDemoData();
    setStep('survey');
  };

  // ---------- Paso 2: encuesta de bienvenida (6 preguntas) ----------
  const [surveyIndex, setSurveyIndex] = useState(-1); // -1 = pantalla de intro
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});

  const handleSurveyAnswer = (value: string) => {
    const question = ONBOARDING_SURVEY[surveyIndex];
    const next = { ...surveyAnswers, [question.id]: value };
    setSurveyAnswers(next);
    if (surveyIndex < ONBOARDING_SURVEY.length - 1) {
      setSurveyIndex((i) => i + 1);
    } else {
      if (userId) submitSurveyResponse(userId, next);
      setStep('budgetAd');
    }
  };

  const handleSurveyBack = () => {
    if (surveyIndex > 0) setSurveyIndex((i) => i - 1);
    else setSurveyIndex(-1);
  };

  // ---------- Pasos 3-4: presupuesto (mismos datos/componentes que Presupuesto) ----------
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const lines = buildBudgetLines(budgets, transactions, profile.budgetThresholds);
  const lineByConcept = new Map(lines.map((l) => [l.categoryId, l]));
  const conceptSpend = spendByConcept(transactions);
  const incomeConceptActual = incomeByConcept(transactions);
  const scopedBudgeted = (monthlyAmount: number) => monthlyAmount;

  const handleSaveConcept = (
    categoryId: string,
    input: { baseAmount: number; periodicity: BudgetPeriodicity; frequency?: BudgetFrequency; customDaysPerWeek?: number; incomeDayOfMonth?: number }
  ) => {
    const monthlyAmount = computeMonthlyAmount(input);
    if (monthlyAmount <= 0) return;
    setBudget({
      categoryId,
      monthlyAmount,
      currency: profile.primaryCurrency,
      thresholds: profile.budgetThresholds,
      periodicity: input.periodicity,
      frequency: input.frequency,
      customDaysPerWeek: input.customDaysPerWeek,
      baseAmount: input.baseAmount,
      incomeDayOfMonth: input.incomeDayOfMonth,
    });
    setEditingConceptId(null);
  };

  const fixedIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'fixed');
  const variableIncomeConcepts = INCOME_CONCEPTS.filter((c) => c.kind === 'variable');

  const renderIncomeConcept = (concept: IncomeConcept) =>
    editingConceptId === concept.id ? (
      <ConceptBudgetForm
        key={concept.id}
        concept={concept}
        initial={budgets.find((b) => b.categoryId === concept.id)}
        currency={profile.primaryCurrency}
        showDayOfMonth={concept.kind === 'fixed'}
        onCancel={() => setEditingConceptId(null)}
        onSave={(input) => handleSaveConcept(concept.id, input)}
      />
    ) : (
      <IncomeConceptRow
        key={concept.id}
        concept={concept}
        line={lineByConcept.get(concept.id)}
        scope="month"
        scopedBudgeted={scopedBudgeted}
        actualNoBudget={incomeConceptActual[concept.id] ?? 0}
        currency={profile.primaryCurrency}
        onEdit={() => setEditingConceptId(concept.id)}
        onDelete={(budgetId) => deleteBudget(budgetId)}
      />
    );

  const handleFinish = () => {
    // Nombre y moneda ya se guardaron en el paso 1 — aquí solo se marca
    // el onboarding como terminado. Todo lo anotado en Ingresos/Gastos
    // ya quedó guardado como presupuesto real (mismo setBudget que usa
    // la pantalla de Presupuesto), así que aparece ahí tal cual.
    completeOnboarding({});
    router.replace('/(tabs)');
  };

  // ================= Paso 1: perfil =================
  if (step === 'profile') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
          <View style={styles.header}>
            <ValuMark size={56} variant="ai" />
            <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>
              Bienvenido a VALU
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Habla una vez. VALU entiende el resto.
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>¿Cómo te llamas?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { color: colors.textPrimary, borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid },
              ]}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={[typography.headline, { color: colors.textPrimary }]}>Moneda principal</Text>
            <View style={styles.row}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[
                    styles.pill,
                    {
                      borderRadius: radius.pill,
                      borderColor: currency === c ? colors.accentFrom : colors.surfaceBorder,
                      backgroundColor: currency === c ? colors.accentSoft : colors.surfaceSolid,
                    },
                  ]}
                >
                  <Text style={{ color: currency === c ? colors.accentFrom : colors.textSecondary, fontWeight: '600' }}>
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => setWantsDemo((v) => !v)}
            style={[
              styles.demoToggle,
              { borderRadius: radius.md, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceSolid },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline, { color: colors.textPrimary }]}>Explorar con datos de ejemplo</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Verás movimientos y cifras ficticias, claramente marcadas como demo, para conocer la app.
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  borderRadius: radius.sm,
                  borderColor: colors.accentFrom,
                  backgroundColor: wantsDemo ? colors.accentFrom : 'transparent',
                },
              ]}
            />
          </Pressable>

          <Pressable onPress={handleProfileNext} style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}>
            <Text style={[typography.headline, { color: '#FFFFFF' }]}>Listo</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ================= Paso 2: encuesta =================
  if (step === 'survey') {
    if (surveyIndex === -1) {
      return (
        <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
          <Pressable
            accessibilityLabel="Regresar"
            onPress={() => setStep('profile')}
            style={{ padding: spacing.lg }}
          >
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
            <Text style={[typography.display, { color: colors.textPrimary, textAlign: 'center' }]}>
              Antes, 6 preguntitas para hacer más chingona tu app y que tengas un mejor control de tus finanzas
            </Text>
            <Pressable
              accessibilityLabel="Empezar encuesta"
              onPress={() => setSurveyIndex(0)}
              style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
            >
              <Text style={[typography.headline, { color: '#FFFFFF' }]}>Empezar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    const question = ONBOARDING_SURVEY[surveyIndex];
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={styles.surveyHeader}>
            <Pressable accessibilityLabel="Regresar pregunta" onPress={handleSurveyBack}>
              <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
            </Pressable>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {surveyIndex + 1} de {ONBOARDING_SURVEY.length}
            </Text>
          </View>
          <ProgressBar percent={((surveyIndex + 1) / ONBOARDING_SURVEY.length) * 100} height={10} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.lg, flexGrow: 1 }}>
          <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.lg }]}>{question.prompt}</Text>
          <View style={{ gap: spacing.sm }}>
            {question.options.map((opt) => (
              <Pressable
                key={opt.value}
                accessibilityLabel={`Respuesta: ${opt.label}`}
                onPress={() => handleSurveyAnswer(opt.value)}
                style={[styles.optionBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid }]}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ================= Paso 3: anuncio del presupuesto =================
  if (step === 'budgetAd') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
          <Text style={[typography.display, { color: colors.textPrimary, textAlign: 'center' }]}>
            Eyy pero antes de entrar a lo mero bueno
          </Text>
          <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic', fontWeight: '400' }]}>
            ¿Te suena esta frase? «No sé en qué se me fue el dinero si según yo ni salí esta semana» o «Siempre digo
            que este mes sí voy a ahorrar y nomás no se da». Es porque no tienes un PRESUPUESTO PERSONAL.
          </Text>
          <Pressable
            accessibilityLabel="Continuar a armar tu presupuesto"
            onPress={() => setStep('budgetIncome')}
            style={[styles.adCard, { backgroundColor: colors.accentFrom, borderRadius: radius.lg }]}
          >
            <Text style={[typography.headline, { color: '#FFFFFF', flex: 1 }]}>Es súper fácil, hazlo en dos pasos</Text>
            <Ionicons name="arrow-forward-circle" size={28} color="#FFFFFF" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ================= Paso 4: presupuesto — parte 1/2 (ingresos) =================
  if (step === 'budgetIncome') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: 0 }}>
          <Pressable accessibilityLabel="Regresar" onPress={() => setStep('budgetAd')} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>PARTE 1/2</Text>
            <Text style={[typography.title, { color: colors.textPrimary }]}>Anota todos tus ingresos</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: 140 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Anota cuánto esperas recibir de cada tipo de ingreso — es opcional, y lo puedes editar cuando quieras.
          </Text>
          <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>Fijos</Text>
          {fixedIncomeConcepts.map(renderIncomeConcept)}
          <Text style={[typography.headline, { color: colors.textPrimary, marginTop: spacing.xs }]}>Variables / eventuales</Text>
          {variableIncomeConcepts.map(renderIncomeConcept)}
        </ScrollView>
        <View style={{ padding: spacing.lg }}>
          <Pressable
            accessibilityLabel="Continuar a gastos"
            onPress={() => setStep('budgetExpenses')}
            style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
          >
            <Text style={[typography.headline, { color: '#FFFFFF' }]}>Continuar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ================= Paso 5: presupuesto — parte 2/2 (gastos) =================
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, paddingBottom: 0 }}>
        <Pressable accessibilityLabel="Regresar" onPress={() => setStep('budgetIncome')} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption, { color: colors.accentFrom, fontWeight: '700' }]}>PARTE 2/2</Text>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Anota todos tus gastos</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 140 }}>
        {GROUPS.map((group) => {
          const concepts = budgetConceptsByGroup(group);
          return (
            <View key={group} style={{ gap: spacing.sm }}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>{BUDGET_GROUP_LABELS[group]}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{ONBOARDING_GROUP_EXPLANATIONS[group]}</Text>
              {concepts.map((concept) =>
                editingConceptId === concept.id ? (
                  <ConceptBudgetForm
                    key={concept.id}
                    concept={concept}
                    initial={budgets.find((b) => b.categoryId === concept.id)}
                    currency={profile.primaryCurrency}
                    onCancel={() => setEditingConceptId(null)}
                    onSave={(input) => handleSaveConcept(concept.id, input)}
                  />
                ) : (
                  <ConceptRow
                    key={concept.id}
                    concept={concept}
                    line={lineByConcept.get(concept.id)}
                    scope="month"
                    scopedBudgeted={scopedBudgeted}
                    actualNoBudget={conceptSpend[concept.id] ?? 0}
                    currency={profile.primaryCurrency}
                    onEdit={() => setEditingConceptId(concept.id)}
                    onDelete={(budgetId) => deleteBudget(budgetId)}
                  />
                )
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={{ padding: spacing.lg }}>
        <Pressable
          accessibilityLabel="Ahora sí comenzamos"
          onPress={handleFinish}
          style={[styles.cta, { borderRadius: radius.pill, backgroundColor: colors.accentFrom }]}
        >
          <Text style={[typography.headline, { color: '#FFFFFF' }]}>Ahora sí comenzamos</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', marginTop: 24 },
  input: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  pill: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
  demoToggle: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, gap: 12 },
  checkbox: { width: 24, height: 24, borderWidth: 2 },
  cta: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  surveyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionBtn: { borderWidth: 1, paddingVertical: 16, paddingHorizontal: 18 },
  adCard: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
});
