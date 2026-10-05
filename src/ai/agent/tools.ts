import { findBudgetConcept, findIncomeConcept } from '@/data/budgetConcepts';
import { findCategory, findSubcategory } from '@/data/categories';
import type {
  Account,
  Budget,
  BudgetAssignment,
  BudgetTemplate,
  Currency,
  Goal,
  InvestmentPosition,
  Liability,
  PeriodBudgetOverride,
  RecurringRule,
  Reminder,
  TemplateBudgetLine,
  Transaction,
  UserProfile,
} from '@/data/types';
import type { MarketQuote } from '@/providers/types';
import { HIDDEN_NAME } from '@/services/privacy/aiPrivacy';
import { makePeriodKey } from '@/utils/budgetPeriods';
import { cardDue, isCreditCard } from '@/utils/creditCard';
import { toISODate } from '@/utils/date';
import { installmentProgress } from '@/utils/debts';
import { buildBudgetLines, computeNetWorth, investmentCurrentValue, resolveBudgetForPeriod, spendInPeriod, sumByTypeInPeriod, toBaseCurrency } from '@/utils/finance';
import { firstShortfall } from '@/utils/forecast';
import { describeRecurrence, nextOccurrence } from '@/utils/recurrence';

import { ACTION_GUIDE, ACTION_ITEM_SCHEMA } from './modelActions';
import type { AgentMemoryItem } from './memory';
import type { ToolSpec } from './protocol';

// Herramientas del agente. Todas LEEN los datos de este dispositivo (nada viaja salvo el resultado que la IA pidió);
// las únicas que cambian algo son proponer_acciones (que solo PROPONE: la persona confirma) y recordar (memoria local).

export interface AgentData {
  today: string; // AAAA-MM-DD local
  profile: UserProfile;
  accounts: Account[];
  transactions: Transaction[]; // reales (posted), vivos
  forecasts: Transaction[]; // previstos abiertos
  investments: InvestmentPosition[];
  liabilities: Liability[];
  goals: Goal[];
  budgets: Budget[];
  budgetTemplates: BudgetTemplate[];
  templateBudgetLines: TemplateBudgetLine[];
  budgetAssignments: BudgetAssignment[];
  periodBudgetOverrides: PeriodBudgetOverride[];
  recurringRules: RecurringRule[];
  reminders: Reminder[];
  liveQuotes: Record<string, MarketQuote>;
  memory: AgentMemoryItem[];
  hideNames: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const localDay = (iso: string) => toISODate(new Date(iso));
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function monthEnd(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return toISODate(new Date(y, m, 0));
}

function dateArg(v: unknown): string | null {
  return typeof v === 'string' && DATE_RE.test(v.trim()) ? v.trim() : null;
}

function numArg(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null;
}

function categoryName(t: Pick<Transaction, 'categoryId' | 'subcategoryId'>): { categoria: string; subcategoria: string } {
  return {
    categoria: findCategory(t.categoryId)?.name ?? t.categoryId,
    subcategoria: findSubcategory(t.categoryId, t.subcategoryId)?.name ?? t.subcategoryId,
  };
}

const TYPE_ES: Record<string, string> = { expense: 'gasto', income: 'ingreso', transfer: 'transferencia', saving: 'ahorro', investment_buy: 'compra_inversion', investment_sell: 'venta_inversion' };
const ES_TYPE: Record<string, string> = { gasto: 'expense', ingreso: 'income', transferencia: 'transfer', ahorro: 'saving' };

function nameOr(value: string | undefined, hide: boolean): string | undefined {
  return hide && value ? HIDDEN_NAME : value;
}

function liabilityName(l: Liability, hide: boolean): string {
  return l.direction === 'owed_to_me' && hide ? HIDDEN_NAME : l.institution;
}

function base(d: AgentData, amount: number, currency: Currency): number {
  return toBaseCurrency(amount, currency, d.profile.primaryCurrency);
}

// ---------------------------------------------------------------- definiciones (lo que ve la IA)

const S = (description: string) => ({ type: 'string' as const, description });

export const AGENT_TOOLS: ToolSpec[] = [
  {
    name: 'resumen_financiero',
    description: 'Panorama completo de hoy: patrimonio, gasto e ingreso del mes, categorías principales, presupuesto, tarjetas, metas y saldos. Úsala primero para preguntas generales ("¿cómo voy?").',
    parameters: { type: 'object', properties: { detalle: { type: 'string', enum: ['normal', 'breve'], description: 'breve = sin listas' } } },
  },
  {
    name: 'buscar_movimientos',
    description: 'Busca movimientos reales (y opcionalmente previstos) con filtros. Devuelve totales y hasta 50 movimientos. Úsala para cualquier pregunta sobre gastos o ingresos específicos.',
    parameters: {
      type: 'object',
      properties: {
        desde: S('AAAA-MM-DD (por defecto: inicio del mes)'),
        hasta: S('AAAA-MM-DD (por defecto: hoy)'),
        texto: S('Palabra a buscar en comercio, categoría o subcategoría (ej. "oxxo", "uber", "comida")'),
        cuenta: S('Nombre de la cuenta'),
        tipo: { type: 'string', enum: ['gasto', 'ingreso', 'transferencia', 'ahorro', 'todos'], description: 'Por defecto: todos' },
        monto_minimo: { type: 'number' },
        monto_maximo: { type: 'number' },
        incluir_previstos: { type: 'boolean', description: 'También lo previsto (aún no pasa)' },
        orden: { type: 'string', enum: ['recientes', 'mayores'] },
        limite: { type: 'integer', description: 'Máximo 50' },
      },
    },
  },
  {
    name: 'gastos_por_categoria',
    description: 'Total por categoría (o subcategoría) en un periodo, con porcentaje y comparación contra el periodo anterior del mismo largo.',
    parameters: {
      type: 'object',
      properties: {
        desde: S('AAAA-MM-DD (por defecto: inicio del mes)'),
        hasta: S('AAAA-MM-DD (por defecto: hoy)'),
        nivel: { type: 'string', enum: ['categoria', 'subcategoria'] },
        tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
      },
    },
  },
  {
    name: 'ver_presupuesto',
    description: 'Presupuesto de un mes: cada concepto con lo presupuestado, lo gastado, el porcentaje y su estado, más el total disponible.',
    parameters: { type: 'object', properties: { mes: S('AAAA-MM (por defecto: este mes)') } },
  },
  { name: 'ver_cuentas', description: 'Cuentas con su saldo actual (las tarjetas de crédito muestran lo que se debe).', parameters: { type: 'object', properties: { incluir_tarjetas: { type: 'boolean' } } } },
  {
    name: 'ver_tarjetas',
    description: 'Tarjetas de crédito: deuda, límite, disponible, fecha de corte, fecha límite de pago, pago para no generar intereses y estado.',
    parameters: { type: 'object', properties: { tarjeta: S('Nombre de una tarjeta (opcional)') } },
  },
  { name: 'ver_deudas', description: 'Deudas (lo que debes) y cuentas por cobrar (lo que te deben), con saldo, fechas y cuotas.', parameters: { type: 'object', properties: { incluir_saldadas: { type: 'boolean' } } } },
  { name: 'ver_metas', description: 'Metas de ahorro: avance, lo que falta, fecha objetivo y cuánto aportar al mes para llegar.', parameters: { type: 'object', properties: { meta: S('Nombre de una meta (opcional)') } } },
  { name: 'ver_inversiones', description: 'Inversiones: monto invertido, valor actual si hay precio de mercado, ganancia y dividendos.', parameters: { type: 'object', properties: { incluir_detalle: { type: 'boolean' } } } },
  {
    name: 'ver_proximos',
    description: 'Lo que viene: previstos (pagos e ingresos esperados), vencidos sin confirmar, pagos recurrentes, avisos, cortes y pagos de tarjeta, y si algún día una cuenta quedaría en negativo.',
    parameters: { type: 'object', properties: { dias: { type: 'integer', description: 'Cuántos días hacia adelante (1-90, por defecto 14)' } } },
  },
  {
    name: 'proponer_acciones',
    description: `Propone cambios a los datos (registrar, crear, pagar, programar, recordar…). NO se aplican solos: la persona revisa y confirma en la app. Usa nombres tal como están en los datos. Máximo 6 acciones, en el orden en que deben aplicarse.\n${ACTION_GUIDE}`,
    parameters: {
      type: 'object',
      properties: {
        acciones: { type: 'array', items: ACTION_ITEM_SCHEMA, description: 'Acciones en orden' },
        mensaje: S('Frase corta y natural para la persona (sin repetir montos: la app muestra el detalle)'),
      },
      required: ['acciones'],
    },
  },
  {
    name: 'recordar',
    description: 'Guarda un dato estable que la persona te contó y que sirve para ayudarla después (ej. "cobra cada quincena", "ahorra para una casa"). Nunca guardes contraseñas, números de tarjeta ni datos de otras personas.',
    parameters: { type: 'object', properties: { dato: S('El dato, en una frase corta') }, required: ['dato'] },
  },
];

// ---------------------------------------------------------------- ejecución

function txView(t: Transaction, d: AgentData) {
  const account = d.accounts.find((a) => a.id === t.accountId);
  const to = t.toAccountId ? d.accounts.find((a) => a.id === t.toAccountId) : undefined;
  return {
    id: t.id,
    fecha: localDay(t.date),
    tipo: TYPE_ES[t.type] ?? t.type,
    monto: r2(t.amount),
    moneda: t.currency,
    ...categoryName(t),
    comercio: nameOr(t.merchant, d.hideNames),
    cuenta: account?.name,
    ...(to ? { a_cuenta: to.name } : {}),
    ...(t.status === 'forecast' ? { estado: 'previsto' } : {}),
  };
}

function inRange(t: Transaction, from: string, to: string): boolean {
  const day = localDay(t.date);
  return day >= from && day <= to;
}

function resumenFinanciero(d: AgentData, args: Record<string, unknown>) {
  const ref = new Date(`${d.today}T12:00:00`);
  const cur = d.profile.primaryCurrency;
  const nw = computeNetWorth(d.accounts, d.investments, d.liabilities, cur, d.liveQuotes);
  const gastado = spendInPeriod(d.transactions, ref);
  const ingresos = sumByTypeInPeriod(d.transactions, 'income', ref);
  const prevRef = new Date(ref);
  prevRef.setDate(1);
  prevRef.setMonth(prevRef.getMonth() - 1);
  const anterior = spendInPeriod(d.transactions, prevRef);
  const presupuesto = verPresupuesto(d, {});
  const brief = args.detalle === 'breve';
  const top = gastosPorCategoria(d, { desde: monthStart(d.today), hasta: d.today }).categorias.slice(0, 5);
  const proximos = verProximos(d, { dias: 7 });
  return {
    fecha_de_hoy: d.today,
    moneda: cur,
    patrimonio: { activos: r2(nw.assets), pasivos: r2(nw.liabilities), neto: r2(nw.netWorth) },
    este_mes: {
      gastado: r2(gastado),
      ingresos: r2(ingresos),
      gasto_mes_anterior_completo: r2(anterior),
      ...(anterior > 0 ? { gastado_vs_mes_anterior_pct: pct(gastado - anterior, anterior) } : {}),
    },
    presupuesto: 'sin_presupuesto' in presupuesto ? 'sin presupuesto definido' : { presupuestado: presupuesto.total_presupuestado_gasto, gastado: presupuesto.total_gastado, disponible: presupuesto.disponible, excedidos: presupuesto.renglones.filter((l) => l.estado === 'excedido').map((l) => l.concepto) },
    ...(brief
      ? {}
      : {
          categorias_principales: top.map((c) => ({ categoria: c.nombre, monto: c.monto, porcentaje: c.porcentaje })),
          proximos_7_dias: { pagos_previstos: proximos.previstos.filter((p) => p.tipo === 'gasto').length, total_por_pagar: proximos.total_gastos_previstos, ingresos_previstos: proximos.total_ingresos_previstos, alerta_saldo: proximos.alerta_saldo },
          tarjetas: verTarjetas(d, {}).tarjetas.map((t) => ('estado' in t ? { nombre: t.nombre, estado: t.estado, fecha_limite: t.fecha_limite, falta_para_no_generar_intereses: t.pago_para_no_generar_intereses } : { nombre: t.nombre, nota: t.nota })),
          metas: d.goals.map((g) => ({ nombre: g.name, avance_pct: pct(g.currentAmount, g.targetAmount) })),
          cuentas: d.accounts.filter((a) => !a.isLiability).slice(0, 12).map((a) => ({ nombre: a.name, saldo: r2(a.balance), moneda: a.currency })),
        }),
    ...(d.transactions.length === 0 ? { nota: 'Todavía no hay movimientos registrados.' } : {}),
  };
}

function buscarMovimientos(d: AgentData, args: Record<string, unknown>) {
  const from = dateArg(args.desde) ?? monthStart(d.today);
  const to = dateArg(args.hasta) ?? (args.incluir_previstos ? addDays(d.today, 60) : d.today);
  const tipo = typeof args.tipo === 'string' ? args.tipo : 'todos';
  const wantType = ES_TYPE[tipo];
  const text = typeof args.texto === 'string' ? norm(args.texto) : '';
  const accountHint = typeof args.cuenta === 'string' ? norm(args.cuenta) : '';
  const min = numArg(args.monto_minimo);
  const max = numArg(args.monto_maximo);
  const limit = Math.max(1, Math.min(50, Math.floor(numArg(args.limite) ?? 25)));
  const pool = args.incluir_previstos ? [...d.transactions, ...d.forecasts] : d.transactions;
  const accountIds = accountHint ? new Set(d.accounts.filter((a) => norm(a.name).includes(accountHint)).map((a) => a.id)) : null;

  const matches = pool.filter((t) => {
    if (!inRange(t, from, to)) return false;
    if (wantType && t.type !== wantType) return false;
    if (accountIds && !(accountIds.has(t.accountId ?? '') || accountIds.has(t.toAccountId ?? ''))) return false;
    if (min !== null && t.amount < min) return false;
    if (max !== null && t.amount > max) return false;
    if (text) {
      const names = categoryName(t);
      const hay = norm([t.merchant ?? '', names.categoria, names.subcategoria].join(' '));
      if (!text.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const sorted = [...matches].sort((a, b) => (args.orden === 'mayores' ? b.amount - a.amount : b.date.localeCompare(a.date)));
  const sum = (type: string) => r2(matches.filter((t) => t.type === type && t.status !== 'forecast').reduce((s, t) => s + base(d, t.amount, t.currency), 0));
  return {
    periodo: { desde: from, hasta: to },
    cantidad: matches.length,
    total_gastos: sum('expense'),
    total_ingresos: sum('income'),
    moneda_de_los_totales: d.profile.primaryCurrency,
    mostrando: Math.min(limit, sorted.length),
    movimientos: sorted.slice(0, limit).map((t) => txView(t, d)),
  };
}

function gastosPorCategoria(d: AgentData, args: Record<string, unknown>) {
  const from = dateArg(args.desde) ?? monthStart(d.today);
  const to = dateArg(args.hasta) ?? d.today;
  const type = args.tipo === 'ingreso' ? 'income' : 'expense';
  const bySub = args.nivel === 'subcategoria';
  const totals = new Map<string, { nombre: string; id: string; monto: number; movimientos: number }>();
  let total = 0;
  for (const t of d.transactions) {
    if (t.type !== type || !inRange(t, from, to)) continue;
    const names = categoryName(t);
    const key = bySub ? `${t.categoryId}/${t.subcategoryId}` : t.categoryId;
    const entry = totals.get(key) ?? { nombre: bySub ? `${names.subcategoria} (${names.categoria})` : names.categoria, id: key, monto: 0, movimientos: 0 };
    const amount = base(d, t.amount, t.currency);
    entry.monto += amount;
    entry.movimientos++;
    total += amount;
    totals.set(key, entry);
  }
  // Periodo anterior del mismo largo, para comparar.
  const lengthDays = Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(lengthDays - 1));
  const prevTotal = d.transactions.filter((t) => t.type === type && inRange(t, prevFrom, prevTo)).reduce((s, t) => s + base(d, t.amount, t.currency), 0);
  return {
    periodo: { desde: from, hasta: to },
    total: r2(total),
    moneda: d.profile.primaryCurrency,
    categorias: [...totals.values()].sort((a, b) => b.monto - a.monto).map((c) => ({ ...c, monto: r2(c.monto), porcentaje: pct(c.monto, total) })),
    periodo_anterior: { desde: prevFrom, hasta: prevTo, total: r2(prevTotal) },
    ...(prevTotal > 0 ? { cambio_pct: pct(total - prevTotal, prevTotal) } : {}),
  };
}

const STATUS_ES: Record<string, string> = { ok: 'bien', attention: 'atencion', warning: 'alerta', exceeded: 'excedido' };

function verPresupuesto(d: AgentData, args: Record<string, unknown>) {
  const month = typeof args.mes === 'string' && /^\d{4}-\d{2}$/.test(args.mes) ? args.mes : d.today.slice(0, 7);
  const ref = new Date(`${month}-15T12:00:00`);
  const resolved = resolveBudgetForPeriod({
    periodKey: makePeriodKey('month', ref),
    templates: d.budgetTemplates,
    templateLines: d.templateBudgetLines,
    assignments: d.budgetAssignments,
    overrides: d.periodBudgetOverrides,
    transactions: d.transactions,
    thresholds: d.profile.budgetThresholds,
  });
  // Sin plantilla asignada: el presupuesto "clásico" del onboarding, si existe.
  const lines = resolved.lines.length ? resolved.lines : buildBudgetLines(d.budgets, d.transactions, d.profile.budgetThresholds, ref, 'month');
  if (lines.length === 0) {
    return { mes: month, sin_presupuesto: true as const, sugerencia: 'La persona no tiene presupuesto para este mes. Puedes proponer set_budget_line con montos razonables según sus gastos.' };
  }
  const renglones = lines.map((l) => {
    const income = !!findIncomeConcept(l.categoryId);
    return {
      concepto: l.categoryName,
      tipo: income ? 'ingreso' : 'gasto',
      grupo: income ? undefined : findBudgetConcept(l.categoryId)?.group,
      presupuestado: r2(l.budgeted),
      real: r2(l.actual),
      porcentaje: Math.round(l.percentUsed),
      estado: STATUS_ES[l.status] ?? l.status,
    };
  });
  const gasto = renglones.filter((l) => l.tipo === 'gasto');
  const totalBudget = gasto.reduce((s, l) => s + l.presupuestado, 0);
  const totalSpent = gasto.reduce((s, l) => s + l.real, 0);
  return {
    mes: month,
    plantilla: resolved.template?.name,
    renglones,
    total_presupuestado_gasto: r2(totalBudget),
    total_gastado: r2(totalSpent),
    disponible: r2(totalBudget - totalSpent),
  };
}

function verCuentas(d: AgentData, args: Record<string, unknown>) {
  const list = d.accounts.filter((a) => args.incluir_tarjetas !== false || !a.isLiability);
  return {
    cuentas: list.map((a) => ({ id: a.id, nombre: a.name, tipo: a.type, saldo: r2(a.balance), moneda: a.currency, ...(a.isLiability ? { nota: 'saldo = lo que se debe' } : {}) })),
    total_disponible: r2(d.accounts.filter((a) => !a.isLiability).reduce((s, a) => s + base(d, a.balance, a.currency), 0)),
    moneda: d.profile.primaryCurrency,
  };
}

const CARD_STATUS_ES: Record<string, string> = { paid: 'pagada', pending: 'pendiente', overdue: 'vencida', nothing_to_pay: 'sin_pago_pendiente' };

function verTarjetas(d: AgentData, args: Record<string, unknown>) {
  const hint = typeof args.tarjeta === 'string' ? norm(args.tarjeta) : '';
  const cards = d.accounts.filter((a) => isCreditCard(a) && (!hint || norm(a.name).includes(hint)));
  if (cards.length === 0) return { tarjetas: [], nota: 'No hay tarjetas de crédito registradas.' };
  return {
    tarjetas: cards.map((c) => {
      const due = cardDue(c, d.transactions, d.today);
      if (!due) return { id: c.id, nombre: c.name, saldo_deuda: r2(c.balance), nota: 'Sin fechas de corte y pago capturadas (se ponen en Tarjetas de crédito o con set_card_dates).' };
      return {
        id: c.id,
        nombre: c.name,
        saldo_deuda: r2(c.balance),
        ...(c.creditLimit ? { limite: c.creditLimit, disponible: r2(due.availableCredit ?? c.creditLimit - c.balance), utilizacion_pct: Math.round((due.utilization ?? 0) * 100) } : {}),
        dia_corte: c.cardCutoffDay,
        dia_pago: c.cardDueDay,
        ultimo_corte: due.cycle.lastCutoff,
        proximo_corte: due.cycle.nextCutoff,
        fecha_limite: due.dueDate,
        dias_para_fecha_limite: due.daysToDue,
        saldo_al_corte: r2(due.statementBalance),
        pagado_desde_el_corte: r2(due.paidSinceCutoff),
        pago_para_no_generar_intereses: r2(due.remaining),
        ...(due.minPayment ? { pago_minimo: due.minPayment } : {}),
        estado: CARD_STATUS_ES[due.status] ?? due.status,
      };
    }),
    nota: 'Calculado con lo registrado en VALU; puede diferir del estado de cuenta del banco.',
  };
}

function verDeudas(d: AgentData, args: Record<string, unknown>) {
  const list = d.liabilities.filter((l) => args.incluir_saldadas || l.status !== 'settled');
  return {
    deudas: list.map((l) => {
      const prog = l.installmentCount ? installmentProgress(l, d.today) : null;
      return {
        id: l.id,
        nombre: liabilityName(l, d.hideNames),
        tipo: l.type,
        sentido: l.direction === 'owed_to_me' ? 'me_deben' : 'yo_debo',
        saldo: r2(l.balance),
        moneda: l.currency,
        ...(l.interestRate ? { tasa_anual_pct: l.interestRate } : {}),
        ...(l.dueDate ? { fecha_pago: l.dueDate } : {}),
        ...(l.minPayment ? { pago_minimo: l.minPayment } : {}),
        ...(prog ? { cuotas: { pagadas: prog.paid, total: prog.total, faltan: prog.remaining, monto: prog.nextAmount, proxima: prog.nextDate, atrasada: prog.overdue } } : {}),
        estado: l.status === 'settled' ? 'saldada' : 'activa',
      };
    }),
    total_que_debes: r2(d.liabilities.filter((l) => l.status !== 'settled' && l.direction !== 'owed_to_me').reduce((s, l) => s + base(d, l.balance, l.currency), 0)),
    total_que_te_deben: r2(d.liabilities.filter((l) => l.status !== 'settled' && l.direction === 'owed_to_me').reduce((s, l) => s + base(d, l.balance, l.currency), 0)),
  };
}

function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm) + (td >= fd ? 0 : -1) + 1);
}

function verMetas(d: AgentData, args: Record<string, unknown>) {
  const hint = typeof args.meta === 'string' ? norm(args.meta) : '';
  const goals = d.goals.filter((g) => !hint || norm(g.name).includes(hint));
  return {
    metas: goals.map((g) => {
      const falta = Math.max(0, g.targetAmount - g.currentAmount);
      const months = g.targetDate ? monthsBetween(d.today, g.targetDate.slice(0, 10)) : null;
      return {
        id: g.id,
        nombre: g.name,
        actual: r2(g.currentAmount),
        objetivo: r2(g.targetAmount),
        falta: r2(falta),
        avance_pct: pct(g.currentAmount, g.targetAmount),
        moneda: g.currency,
        ...(g.targetDate ? { fecha_objetivo: g.targetDate.slice(0, 10), meses_restantes: months } : {}),
        ...(months && falta > 0 ? { aporte_mensual_necesario: r2(falta / months) } : {}),
      };
    }),
  };
}

function verInversiones(d: AgentData, args: Record<string, unknown>) {
  const rows = d.investments.map((i) => {
    const value = investmentCurrentValue(i, d.liveQuotes);
    const quote = d.liveQuotes[i.ticker];
    return {
      id: i.id,
      clave: i.ticker,
      nombre: i.name,
      clase: i.assetClass,
      ...(args.incluir_detalle ? { cantidad: i.quantity, costo_promedio: i.avgCostPrice, institucion: i.broker } : {}),
      invertido: r2(i.amountInvested),
      valor_actual: r2(value),
      ganancia: r2(value - i.amountInvested),
      precio_en_vivo: Boolean(quote && !quote.stale),
      ...(i.dividendsReceived ? { dividendos_recibidos: r2(i.dividendsReceived) } : {}),
      moneda: i.currency,
    };
  });
  return {
    inversiones: rows,
    total_invertido: r2(d.investments.reduce((s, i) => s + base(d, i.amountInvested, i.currency), 0)),
    valor_total: r2(d.investments.reduce((s, i) => s + base(d, investmentCurrentValue(i, d.liveQuotes), i.currency), 0)),
    nota: 'Sin precio en vivo, el valor actual es el monto invertido.',
  };
}

function verProximos(d: AgentData, args: Record<string, unknown>) {
  const days = Math.max(1, Math.min(90, Math.floor(numArg(args.dias) ?? 14)));
  const until = addDays(d.today, days);
  const open = d.forecasts.filter((t) => t.status === 'forecast');
  const upcoming = open.filter((t) => localDay(t.date) >= d.today && localDay(t.date) <= until).sort((a, b) => a.date.localeCompare(b.date));
  const overdue = open.filter((t) => localDay(t.date) < d.today);
  const shortfall = firstShortfall(d.accounts, [...d.transactions, ...open], until);
  const cardEvents = d.accounts
    .filter((a) => isCreditCard(a))
    .flatMap((c) => {
      const due = cardDue(c, d.transactions, d.today);
      if (!due) return [];
      const ev: Array<{ tarjeta: string; evento: string; fecha: string }> = [];
      if (due.cycle.nextCutoff <= until) ev.push({ tarjeta: c.name, evento: 'corte', fecha: due.cycle.nextCutoff });
      if (due.dueDate >= d.today && due.dueDate <= until && due.status !== 'paid' && due.status !== 'nothing_to_pay') ev.push({ tarjeta: c.name, evento: 'fecha_limite_de_pago', fecha: due.dueDate });
      return ev;
    });
  const view = (t: Transaction) => ({ id: t.id, fecha: localDay(t.date), nombre: nameOr(t.merchant, d.hideNames) ?? categoryName(t).subcategoria, tipo: TYPE_ES[t.type] ?? t.type, monto: r2(t.amount), moneda: t.currency, cuenta: d.accounts.find((a) => a.id === t.accountId)?.name });
  const totalOf = (type: string) => r2(upcoming.filter((t) => t.type === type).reduce((s, t) => s + base(d, t.amount, t.currency), 0));
  return {
    desde: d.today,
    hasta: until,
    previstos: upcoming.slice(0, 30).map(view),
    total_gastos_previstos: totalOf('expense'),
    total_ingresos_previstos: totalOf('income'),
    vencidos_sin_confirmar: overdue.slice(0, 15).map(view),
    pagos_recurrentes: d.recurringRules
      .filter((r) => r.status !== 'ended')
      .slice(0, 30)
      .map((r) => ({ nombre: r.name, monto: r2(r.amount), moneda: r.currency, frecuencia: describeRecurrence(r.recurrence), estado: r.status === 'paused' ? 'pausado' : 'activo', proxima: r.status === 'active' ? nextOccurrence(r.recurrence, d.today) : null })),
    avisos: d.reminders
      .filter((r) => r.status === 'active' && r.sourceType !== 'rule' && (!r.date || (r.date >= d.today && r.date <= until)))
      .slice(0, 20)
      .map((r) => ({ titulo: r.title, fecha: r.date ?? (r.recurrence ? nextOccurrence(r.recurrence, d.today) : null), hora: r.timeOfDay })),
    tarjetas: cardEvents,
    deudas_con_fecha: d.liabilities.filter((l) => l.status !== 'settled' && l.dueDate && l.dueDate.slice(0, 10) >= d.today && l.dueDate.slice(0, 10) <= until).map((l) => ({ nombre: liabilityName(l, d.hideNames), fecha: l.dueDate!.slice(0, 10), saldo: r2(l.balance) })),
    alerta_saldo: shortfall ? `La cuenta ${shortfall.name} quedaría en ${r2(shortfall.balance)} el ${shortfall.date} con lo previsto.` : null,
  };
}

export type ToolOutcome =
  | { kind: 'data'; content: unknown }
  | { kind: 'propose'; actions: unknown[]; message: string }
  | { kind: 'remember'; text: string };

// Ejecuta una herramienta de LECTURA, o devuelve la intención (proponer / recordar) para que el bucle la maneje.
export function runTool(name: string, args: Record<string, unknown>, d: AgentData): ToolOutcome {
  const a = args && typeof args === 'object' ? args : {};
  try {
    switch (name) {
      case 'resumen_financiero':
        return { kind: 'data', content: resumenFinanciero(d, a) };
      case 'buscar_movimientos':
        return { kind: 'data', content: buscarMovimientos(d, a) };
      case 'gastos_por_categoria':
        return { kind: 'data', content: gastosPorCategoria(d, a) };
      case 'ver_presupuesto':
        return { kind: 'data', content: verPresupuesto(d, a) };
      case 'ver_cuentas':
        return { kind: 'data', content: verCuentas(d, a) };
      case 'ver_tarjetas':
        return { kind: 'data', content: verTarjetas(d, a) };
      case 'ver_deudas':
        return { kind: 'data', content: verDeudas(d, a) };
      case 'ver_metas':
        return { kind: 'data', content: verMetas(d, a) };
      case 'ver_inversiones':
        return { kind: 'data', content: verInversiones(d, a) };
      case 'ver_proximos':
        return { kind: 'data', content: verProximos(d, a) };
      case 'proponer_acciones':
        return { kind: 'propose', actions: Array.isArray(a.acciones) ? a.acciones : [], message: typeof a.mensaje === 'string' ? a.mensaje : '' };
      case 'recordar':
        return { kind: 'remember', text: typeof a.dato === 'string' ? a.dato : '' };
      default:
        return { kind: 'data', content: { error: `No existe la herramienta "${name}".` } };
    }
  } catch (e) {
    return { kind: 'data', content: { error: `No se pudo calcular: ${e instanceof Error ? e.message : 'error'}` } };
  }
}

// Fecha de fin de mes, expuesta para el prompt.
export const _internal = { monthEnd, addDays };
