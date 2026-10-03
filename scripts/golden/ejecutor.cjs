// Pruebas del ejecutor de planes (src/ai/planExecutor.ts) y, con el store REAL de la app, de aiApplyPlan:
// idempotencia, orden, fallo a la mitad, auditoría y recuperación tras un cierre inesperado.
//   node scripts/golden/ejecutor.cjs [--show]
require('./ts-hook.cjs');
const Module = require('module');
const path = require('path');
const origResolve = Module._resolveFilename;
// El store guarda en AsyncStorage: en Node se sustituye por memoria.
Module._resolveFilename = function (request, ...rest) {
  if (request === '@react-native-async-storage/async-storage') return path.join(__dirname, 'stub-async-storage.cjs');
  if (/^(expo|react-native|@expo)/.test(request)) return path.join(__dirname, 'stub-native.cjs');
  return origResolve.call(this, request, ...rest);
};
const assert = require('assert');
const { executePlan, recoverInterruptedPlan } = require('@/ai/planExecutor');

let ok = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); ok++; if (process.argv.includes('--show')) console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', e.stack.split('\n').slice(0, 3).join('\n      ')); }
};
const step = (id, extra = {}) => ({ id, type: 'add_goal', args: {}, summary: `paso ${id}`, status: 'proposed', createdAt: 'x', ...extra });
const plan = (n, extra = {}) => ({ id: 'plan-1', contractVersion: 1, steps: Array.from({ length: n }, (_, i) => step(`s${i + 1}`)), status: 'proposed', effects: [], warnings: [], createdAt: 'x', ...extra });
const harness = (failOn = []) => {
  const log = { applied: [], saved: [], audited: [], finished: 0 };
  return {
    log,
    deps: {
      apply: (s) => { if (failOn.includes(s.id)) return { ok: false, error: `falló ${s.id}` }; log.applied.push(s.id); return { ok: true }; },
      persist: (p) => log.saved.push(p.status + ':' + p.steps.map((x) => x.status[0]).join('')),
      onStepApplied: (s) => log.audited.push(s.id),
      onFinished: () => log.finished++,
      now: () => 'T',
    },
  };
};

// ---------- ejecutor puro ----------
t('aplica todos los pasos en orden y queda applied', () => {
  const h = harness();
  const r = executePlan(plan(3), h.deps);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, 'applied');
  assert.deepStrictEqual(h.log.applied, ['s1', 's2', 's3']);
  assert.deepStrictEqual(h.log.audited, ['s1', 's2', 's3']);
  assert.strictEqual(h.log.finished, 1);
});
t('"applying" se guarda ANTES de tocar el primer paso', () => {
  const h = harness();
  executePlan(plan(2), h.deps);
  assert.strictEqual(h.log.saved[0], 'applying:pp');
});
t('guarda el progreso después de cada paso', () => assert.deepStrictEqual((() => { const h = harness(); executePlan(plan(2), h.deps); return h.log.saved; })(), ['applying:pp', 'applying:ap', 'applying:aa', 'applied:aa']));
t('un plan que no está en proposed se rechaza sin tocar nada (idempotencia)', () => {
  for (const status of ['applying', 'applied', 'partially_applied', 'dismissed', 'failed']) {
    const h = harness();
    const r = executePlan(plan(2, { status }), h.deps);
    assert.strictEqual(r.ok, false);
    assert.deepStrictEqual(h.log.applied, []);
    assert.deepStrictEqual(h.log.saved, []);
  }
});
t('aplicar dos veces el mismo plan: la segunda se rechaza', () => {
  const h = harness();
  const first = executePlan(plan(2), h.deps);
  const second = executePlan(first.plan, h.deps);
  assert.strictEqual(second.ok, false);
  assert.deepStrictEqual(h.log.applied, ['s1', 's2']);
});
t('un paso falla a la mitad: no revierte, no sigue, queda partially_applied', () => {
  const h = harness(['s2']);
  const r = executePlan(plan(4), h.deps);
  assert.strictEqual(r.status, 'partially_applied');
  assert.deepStrictEqual(r.plan.steps.map((s) => s.status), ['applied', 'failed', 'skipped', 'skipped']);
  assert.deepStrictEqual(h.log.applied, ['s1']);
  assert.strictEqual(r.error, 'falló s2');
});
t('falla el primer paso: failed y todo omitido', () => {
  const h = harness(['s1']);
  const r = executePlan(plan(3), h.deps);
  assert.strictEqual(r.status, 'failed');
  assert.deepStrictEqual(r.plan.steps.map((s) => s.status), ['failed', 'skipped', 'skipped']);
  assert.strictEqual(r.plan.appliedAt, undefined);
});
t('una excepción al aplicar cuenta como fallo, no tumba el ejecutor', () => {
  const h = harness();
  h.deps.apply = () => { throw new Error('boom'); };
  assert.strictEqual(executePlan(plan(2), h.deps).status, 'failed');
});
t('si la auditoría truena, el plan igual se aplica', () => {
  const h = harness();
  h.deps.onStepApplied = () => { throw new Error('audit'); };
  assert.strictEqual(executePlan(plan(2), h.deps).status, 'applied');
});
t('no muta el plan original', () => {
  const p = plan(2); const copy = JSON.stringify(p);
  executePlan(p, harness().deps);
  assert.strictEqual(JSON.stringify(p), copy);
});
t('recuperación: cierre a la mitad con 1 paso aplicado → partially_applied', () => {
  const p = plan(3, { status: 'applying' }); p.steps[0].status = 'applied';
  const r = recoverInterruptedPlan(p);
  assert.strictEqual(r.status, 'partially_applied');
  assert.deepStrictEqual(r.steps.map((s) => s.status), ['applied', 'skipped', 'skipped']);
});
t('recuperación: cierre antes del primer paso → failed', () => assert.strictEqual(recoverInterruptedPlan(plan(2, { status: 'applying' })).status, 'failed'));
t('recuperación no toca planes ya cerrados', () => { const p = plan(2, { status: 'applied' }); assert.strictEqual(recoverInterruptedPlan(p), p); });

// ---------- con el store real ----------
const { useAppStore } = require('@/store/useAppStore');
const { planFromText, previewPlan } = require('@/ai/planner');
const S = () => useAppStore.getState();

(async () => {
  S().resetAll();
  const bbva = S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 5000 });
  S().addAccount({ name: 'Nu', type: 'savings', currency: 'MXN', balance: 1200 });
  S().addGoal({ name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN' });
  const accounts = () => S().accounts.filter((a) => !a.deletedAt);
  const bal = (n) => accounts().find((a) => a.name === n).balance;
  const ctxNow = () => ({ accounts: S().accounts, goals: S().goals, liabilities: S().liabilities, templateBudgetLines: S().templateBudgetLines, recentTransactions: S().transactions.slice(0, 20), primaryCurrency: 'MXN', today: '2026-10-03' });

  const makePlanMessage = (text) => {
    const o = planFromText(text, ctxNow());
    assert.strictEqual(o.kind, 'plan', JSON.stringify(o));
    const prev = previewPlan(o.steps, ctxNow());
    const steps = o.steps.map((s, i) => ({ id: `step-${Math.random().toString(36).slice(2)}-${i}`, type: s.action.type, args: s.action.args, summary: s.summary, status: 'proposed', createdAt: 'x' }));
    const conv = S().startConversation();
    S().addChatMessage({ conversationId: conv, role: 'assistant', text: 'plan', plan: { id: `plan-${Math.random().toString(36).slice(2)}`, contractVersion: 1, steps, status: 'proposed', effects: prev.effects, warnings: prev.warnings, createdAt: 'x' } });
    return S().chatMessages[S().chatMessages.length - 1].id;
  };

  t('store: aplica un plan de 3 pasos y los saldos coinciden con la vista previa', () => {
    const id = makePlanMessage('transfiere 500 de BBVA a Nu; aporta 300 a mi meta Viaje; registra 200 de tacos en BBVA');
    const expected = previewPlan(S().chatMessages.find((m) => m.id === id).plan.steps.map((s) => ({ action: { type: s.type, args: s.args }, summary: s.summary })), ctxNow());
    const r = S().aiApplyPlan(id);
    assert.deepStrictEqual({ ok: r.ok, status: r.status }, { ok: true, status: 'applied' });
    assert.strictEqual(bal('BBVA'), 4300);
    assert.strictEqual(bal('Nu'), 1700);
    assert.strictEqual(S().goals[0].currentAmount, 3300);
    for (const e of expected.effects.filter((x) => x.kind === 'account')) assert.strictEqual(accounts().find((a) => a.id === e.id).balance, e.after);
  });
  t('store: doble toque / reintento — el segundo no duplica nada', () => {
    const id = makePlanMessage('transfiere 100 de BBVA a Nu y aporta 50 a mi meta Viaje');
    const before = { txs: S().transactions.length, bbva: bal('BBVA') };
    assert.strictEqual(S().aiApplyPlan(id).ok, true);
    const again = S().aiApplyPlan(id);
    assert.strictEqual(again.ok, false);
    assert.strictEqual(S().transactions.length, before.txs + 1);
    assert.strictEqual(bal('BBVA'), before.bbva - 100);
  });
  t('store: la idempotencia no depende del objeto de la pantalla (otra pestaña con copia vieja)', () => {
    const id = makePlanMessage('transfiere 10 de BBVA a Nu y aporta 5 a mi meta Viaje');
    const stale = JSON.parse(JSON.stringify(S().chatMessages.find((m) => m.id === id)));
    assert.strictEqual(S().aiApplyPlan(id).ok, true);
    assert.strictEqual(stale.plan.status, 'proposed'); // la copia vieja sigue diciendo proposed
    assert.strictEqual(S().aiApplyPlan(id).ok, false); // pero el store sabe la verdad
  });
  t('store: si una cuenta se borró antes de confirmar, queda parcial y no sigue', () => {
    const id = makePlanMessage('aporta 40 a mi meta Viaje; transfiere 100 de BBVA a Nu; aporta 60 a mi meta Viaje');
    const nu = accounts().find((a) => a.name === 'Nu');
    S().deleteAccount(nu.id);
    const goalBefore = S().goals[0].currentAmount;
    const r = S().aiApplyPlan(id);
    assert.strictEqual(r.status, 'partially_applied');
    const stored = S().chatMessages.find((m) => m.id === id).plan;
    assert.deepStrictEqual(stored.steps.map((s) => s.status), ['applied', 'failed', 'skipped']);
    assert.strictEqual(S().goals[0].currentAmount, goalBefore + 40); // lo aplicado NO se revierte; el tercero NO corrió
    assert(stored.steps[1].error.includes('Nu'), stored.steps[1].error);
  });
  t('store: auditoría por paso', () => {
    S().addAccount({ name: 'Efectivo2', type: 'cash', currency: 'MXN', balance: 100 });
    const before = S().auditLog.length;
    const id = makePlanMessage('transfiere 20 de BBVA a Efectivo2 y aporta 5 a mi meta Viaje');
    S().aiApplyPlan(id);
    const planId = S().chatMessages.find((m) => m.id === id).plan.id.slice(0, 8);
    const mine = S().auditLog.slice(0, S().auditLog.length - before).filter((e) => e.summary.includes(planId));
    assert.strictEqual(mine.length, 2, JSON.stringify(mine.map((e) => e.summary)));
    assert(mine.some((e) => e.entityType === 'transaction') && mine.some((e) => e.entityType === 'goal'));
  });
  t('store: recoverInterruptedPlans cierra un plan que quedó en applying', () => {
    const id = makePlanMessage('transfiere 1 de BBVA a Efectivo2 y aporta 1 a mi meta Viaje');
    S().chatMessages.find((m) => m.id === id).plan.steps[0].status = 'applied';
    useAppStore.setState((s) => ({ chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, plan: { ...m.plan, status: 'applying' } } : m)) }));
    S().recoverInterruptedPlans();
    assert.strictEqual(S().chatMessages.find((m) => m.id === id).plan.status, 'partially_applied');
  });

  // ---- acciones nuevas (P2.3) con el store real ----
  await t('store: retirar de meta + fecha de meta + gasto de AYER en un solo plan', () => {
    S().resetAll();
    S().addAccount({ name: 'BBVA', type: 'bank', currency: 'MXN', balance: 5000 });
    S().addAccount({ name: 'Nu', type: 'savings', currency: 'MXN', balance: 1200 });
    S().addGoal({ name: 'Viaje', targetAmount: 20000, currentAmount: 3000, currency: 'MXN', targetDate: '2026-12-01' });
    const id = makePlanMessage('registra 200 de tacos ayer en BBVA; retira 100 de mi meta Viaje; cambia la fecha de mi meta Viaje al 15 de enero');
    const r = S().aiApplyPlan(id);
    assert.deepStrictEqual({ ok: r.ok, status: r.status }, { ok: true, status: 'applied' }, JSON.stringify(r));
    const goal = S().goals[0];
    assert.strictEqual(goal.currentAmount, 2900);
    assert.strictEqual(goal.targetDate, '2027-01-15');
    const tx = S().transactions[S().transactions.length - 1];
    const d = new Date(tx.date);
    const localDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    assert.strictEqual(localDay, '2026-10-02', `el gasto debió quedar en el día de ayer, quedó ${tx.date}`);
    assert.strictEqual(accounts().find((a) => a.name === 'BBVA').balance, 4800);
  });
  await t('store: vencimiento de una deuda y meta nueva con fecha', () => {
    S().addLiability({ institution: 'Banorte', type: 'credit_card', balance: 8000, currency: 'MXN', dueDate: '2026-10-20' });
    const id = makePlanMessage('cambia el vencimiento de la deuda Banorte al 25 de octubre y crea la meta Laptop de 20000 para el 15 de diciembre');
    assert.strictEqual(S().aiApplyPlan(id).status, 'applied');
    assert.strictEqual(S().liabilities[0].dueDate, '2026-10-25');
    const laptop = S().goals.find((g) => g.name === 'Laptop');
    assert(laptop && laptop.targetAmount === 20000 && laptop.targetDate === '2026-12-15', JSON.stringify(laptop));
  });
  await t('store: retirar más de lo que la meta tiene AL APLICAR (cambió después de proponer) → falla ese paso, nada se inventa', () => {
    const goalId = S().goals.find((g) => g.name === 'Viaje').id;
    const id = makePlanMessage('aporta 10 a mi meta Viaje; retira 2000 de mi meta Viaje');
    S().contributeToGoal(goalId, -(S().goals.find((g) => g.id === goalId).currentAmount - 500)); // la meta se vació mientras tanto
    const before = S().goals.find((g) => g.id === goalId).currentAmount;
    const r = S().aiApplyPlan(id);
    assert.strictEqual(r.status, 'partially_applied');
    const stored = S().chatMessages.find((m) => m.id === id).plan;
    assert.deepStrictEqual(stored.steps.map((s) => s.status), ['applied', 'failed']);
    assert(stored.steps[1].error.includes('ya solo tiene'), stored.steps[1].error);
    assert.strictEqual(S().goals.find((g) => g.id === goalId).currentAmount, before + 10);
  });
  await t('store: auditoría de las acciones nuevas', () => {
    const goalId = S().goals.find((g) => g.name === 'Viaje').id;
    const n0 = S().auditLog.length;
    const id = makePlanMessage('retira 20 de mi meta Viaje; cambia la fecha de mi meta Viaje al 20 de febrero');
    S().aiApplyPlan(id);
    const planId = S().chatMessages.find((m) => m.id === id).plan.id.slice(0, 8);
    const mine = S().auditLog.slice(0, S().auditLog.length - n0).filter((e) => e.summary.includes(planId));
    assert.strictEqual(mine.length, 2, JSON.stringify(mine.map((e) => e.summary)));
    assert(mine.every((e) => e.entityType === 'goal' && e.entityId === goalId));
  });

  console.log(`\nEjecutor: ${ok} OK, ${fail} fallan`);
  process.exit(fail ? 1 : 0);
})();
