import React from 'react';
import { View } from 'react-native';

import { makeSubBudgetId, subcategoryOptionsForConcept, type BudgetConcept } from '@/data/budgetConcepts';
import type { Account, BudgetFrequency, BudgetPeriodicity, Currency } from '@/data/types';
import { useTheme } from '@/theme/ThemeProvider';
import type { BudgetLine } from '@/utils/finance';

import { ConceptBudgetForm, type BudgetFormInitial } from './ConceptBudgetForm';
import { ConceptRow } from './ConceptRow';
import { SubcategoryAddDropdown } from './SubcategoryAddDropdown';

// Fichas por subcategoría dentro de un concepto de GASTO — para poder
// trackear cada una por separado (ej. Uber, Microbús, Metro dentro de
// "Transporte cotidiano"), cada una con su propio monto y tarjetas usadas,
// en vez de tener que sumarlas todas mentalmente (spec: "es complicado
// tratar de juntar o hacer las cuentas mentalmente de lo que gastas en
// conjunto... aparte en cada una de ellas uso tarjetas diferentes"). Cada
// ficha reutiliza ConceptRow/ConceptBudgetForm con un "concepto" sintético
// de una sola subcategoría — nunca se agrega a BUDGET_CONCEPTS, así que no
// afecta la categorización ni el concepto original.
export function ConceptSubBudgets({
  concept,
  budgets,
  lineByConcept,
  subcategorySpend,
  scope,
  scopedBudgeted,
  currency,
  accounts,
  editingConceptId,
  setEditingConceptId,
  onSaveConcept,
  onDeleteBudget,
}: {
  concept: BudgetConcept;
  // Los renglones ya guardados — sirven tanto los del esquema anterior
  // (Budget) como los de una plantilla con nombre (TemplateBudgetLine).
  budgets: (BudgetFormInitial & { id: string; categoryId: string })[];
  lineByConcept: Map<string, BudgetLine>;
  subcategorySpend: Record<string, number>;
  scope: 'month' | 'week';
  scopedBudgeted: (monthlyAmount: number) => number;
  currency: Currency;
  accounts: Account[];
  editingConceptId: string | null;
  setEditingConceptId: (id: string | null) => void;
  onSaveConcept: (
    id: string,
    input: {
      baseAmount: number;
      periodicity: BudgetPeriodicity;
      frequency?: BudgetFrequency;
      customDaysPerWeek?: number;
      dayOfWeek?: number;
      dayOfMonth?: number;
      oneTimeDate?: string;
      includedAccountIds?: string[];
    }
  ) => void;
  onDeleteBudget: (budgetId: string) => void;
}) {
  const { spacing } = useTheme();
  const prefix = `${concept.id}::`;

  const allOptions = subcategoryOptionsForConcept(concept);
  const optionBySubId = new Map(allOptions.map((o) => [o.subcategoryId, o]));

  const savedIds = budgets.filter((b) => b.categoryId.startsWith(prefix)).map((b) => b.categoryId);
  // La ficha recién elegida (aún sin guardar) también se muestra, con el
  // formulario ya abierto, igual que al agregar un concepto nuevo.
  const pendingId =
    editingConceptId && editingConceptId.startsWith(prefix) && !savedIds.includes(editingConceptId) ? editingConceptId : null;
  const visibleIds = pendingId ? [...savedIds, pendingId] : savedIds;

  const remainingOptions = allOptions
    .filter((o) => !visibleIds.includes(`${prefix}${o.subcategoryId}`))
    .map((o) => ({ subcategoryId: o.subcategoryId, name: o.name }));

  if (visibleIds.length === 0 && remainingOptions.length === 0) return null;

  return (
    <View style={{ marginLeft: spacing.lg, gap: spacing.sm }}>
      {visibleIds.map((subId) => {
        const subcategoryId = subId.slice(prefix.length);
        const name = optionBySubId.get(subcategoryId)?.name ?? subcategoryId;
        const syntheticConcept = { id: subId, name, group: concept.group, icon: concept.icon, matches: [] };
        return editingConceptId === subId ? (
          <ConceptBudgetForm
            key={subId}
            concept={syntheticConcept}
            initial={budgets.find((b) => b.categoryId === subId)}
            currency={currency}
            accounts={accounts}
            showAccountInclude
            onCancel={() => setEditingConceptId(null)}
            onSave={(input) => onSaveConcept(subId, input)}
          />
        ) : (
          <ConceptRow
            key={subId}
            concept={syntheticConcept}
            line={lineByConcept.get(subId)}
            scope={scope}
            scopedBudgeted={scopedBudgeted}
            actualNoBudget={subcategorySpend[subId] ?? 0}
            currency={currency}
            accounts={accounts}
            onEdit={() => setEditingConceptId(subId)}
            onDelete={onDeleteBudget}
          />
        );
      })}

      {remainingOptions.length > 0 && (
        <SubcategoryAddDropdown
          options={remainingOptions}
          onSelect={(subcategoryId) => setEditingConceptId(makeSubBudgetId(concept.id, subcategoryId))}
        />
      )}
    </View>
  );
}
