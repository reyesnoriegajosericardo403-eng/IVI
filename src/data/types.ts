// Tipos centrales del dominio financiero de VALU.
// Todo monto se guarda como número en la moneda original de la transacción/cuenta.
//
// Todas las entidades sincronizables comparten SyncMeta: un id único global
// (UUID, nunca fecha+monto+categoría), createdAt/updatedAt para resolver
// conflictos de sincronización (last-write-wins) y deletedAt como borrado
// suave — nunca se elimina un registro financiero de verdad, solo se marca
// como eliminado, para poder auditar y recuperar (spec secciones 73-85).

export interface SyncMeta {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string; // ISO — presente si el registro fue "eliminado" (soft delete)
}

// Una palabra que la persona le enseñó a VALU ("lo que aprendió de ti"). La llave es la propia palabra
// (ya normalizada): `id` = `keyword`, así dos dispositivos que aprenden lo mismo nunca duplican.
export interface CategoryMappingRecord extends SyncMeta {
  keyword: string;
  categoryId: string;
  subcategoryId: string;
}

export type Currency = 'MXN' | 'USD' | 'EUR' | 'CAD' | 'GBP';

export type TransactionType =
  | 'expense' // gasto
  | 'income' // ingreso
  | 'transfer' // transferencia entre cuentas propias
  | 'saving' // aportación a ahorro
  | 'investment_buy' // compra de inversión
  | 'investment_sell'; // venta de inversión

export type TransactionOrigin = 'voice' | 'manual' | 'import' | 'broker' | 'automatic';

// Estado de un movimiento (P3, contrato §6 de docs/03_fase2_contratos_v1.md). Sin valor = 'posted' (real), así todo lo
// guardado antes de P3 sigue siendo real sin migrar nada.
//  - 'posted'   real: mueve saldos y cuenta en gasto/ingreso/presupuesto.
//  - 'forecast' previsto: NUNCA mueve saldos ni cuenta en nada real; solo aparece en proyecciones y avisos.
//  - 'skipped'  un previsto que NO ocurrió (o una ocurrencia omitida): se conserva como historia, no cuenta.
//  - 'paused'   un previsto de una regla recurrente en pausa: vuelve a 'forecast' al reanudar la regla.
export type TransactionStatus = 'posted' | 'forecast' | 'skipped' | 'paused';
import type { Recurrence } from '@/utils/recurrence';
export type { Recurrence };

export interface CategoryDef {
  id: string;
  name: string;
  icon: keyof typeof import('./iconMap').CATEGORY_ICONS;
  subcategories: SubcategoryDef[];
}

export interface SubcategoryDef {
  id: string;
  name: string;
  keywords: string[]; // sinónimos/palabras clave para clasificación por voz/texto
  // Solo aplica a las subcategorías de "income" — separa ingresos fijos
  // (salario, mesada) de variables/eventuales (spec: presupuesto por
  // ingresos fijos vs. variables).
  incomeKind?: 'fixed' | 'variable';
  // Esta subcategoría no pertenece a ningún concepto de Presupuesto
  // (Necesidades/Deseos/Ahorro) a propósito — el gasto se sigue guardando
  // normal en Movimientos, solo no cuenta en las barras de presupuesto.
  // Se usa como valor por defecto de "excluir de presupuesto" al registrar
  // manualmente (spec: catálogo v7, "afecta_presupuesto"/"excluido_presupuesto").
  excludedFromBudget?: boolean;
}

export interface Transaction extends SyncMeta {
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string;
  subcategoryId: string;
  merchant?: string;
  accountId?: string;
  toAccountId?: string; // para transferencias
  date: string; // ISO — fecha financiera del movimiento (distinta de createdAt/updatedAt)
  notes?: string;
  origin: TransactionOrigin;
  isDemo?: boolean;
  // El usuario puede excluir un movimiento puntual de todos los cálculos de
  // presupuesto (ej. algo que le van a reembolsar) sin dejar de registrarlo
  // — sigue apareciendo en Movimientos, solo no cuenta en sumas/gráficas de
  // presupuesto.
  excludeFromBudget?: boolean;
  // ---- P3: previsto vs. real ----
  status?: TransactionStatus; // sin valor = 'posted'
  // Fecha en que se había previsto (un previsto que se pospone cambia `date` pero conserva la original aquí).
  plannedDate?: string; // ISO
  confirmedAt?: string; // ISO — cuándo se confirmó que ocurrió (previsto → real)
  recurringRuleId?: string; // la regla recurrente que lo generó
  liabilityId?: string; // el pago de deuda al que corresponde (pagar una deuda)
}

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'investment' | 'savings';

export interface Account extends SyncMeta {
  name: string;
  institution?: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  isLiability?: boolean;
  isDemo?: boolean;
  // Color de la ficha en Cuentas/Patrimonio — el efectivo siempre es verde
  // fijo, las demás cuentas eligen entre una paleta de colores (spec:
  // "en el caso de efectivo debe ser un verde").
  color?: string;
  // Marca la cuenta a la que se cargan por default los gastos de transporte
  // público (metro, camión, microbús...) al registrar por voz o manual —
  // spec: "importantísima para que... los primeros a los que se deben
  // realizar los cargos".
  isTransportCard?: boolean;
}

export type BudgetPeriodicity = 'day' | 'week' | 'month';
export type BudgetFrequency = 'all_days' | 'weekdays' | 'weekends' | 'custom' | 'one_time';

export interface Budget extends SyncMeta {
  // Puede ser el id de una categoría (esquema anterior) o el id de un
  // concepto de presupuesto (esquema nuevo, spec 41) — buildBudgetLines
  // reconoce ambos, así que un presupuesto ya guardado nunca se pierde.
  categoryId: string;
  monthlyAmount: number;
  currency: Currency;
  thresholds: {
    attention: number; // ej. 70
    warning: number; // ej. 90
    exceeded: number; // ej. 100
  };
  // Metadatos de cómo se calculó monthlyAmount, para poder reabrir el
  // formulario con los mismos controles — monthlyAmount sigue siendo la
  // única cifra que el resto de la app necesita leer.
  periodicity?: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  baseAmount?: number;
  // Día del mes en que normalmente llega/se cobra (periodicidad "Mes") —
  // aplica tanto a ingresos como a gastos (ej. "la renta se carga el 5 de
  // cada mes"). Nunca mayor al número real de días de ese mes.
  dayOfMonth?: number;
  // Día de la semana en que normalmente llega/se cobra (periodicidad
  // "Semana") — 0 = domingo … 6 = sábado (mismo criterio que Date#getDay).
  dayOfWeek?: number;
  // Fecha exacta del gasto/ingreso único (periodicidad "Día" + frecuencia
  // "Extemporáneo") — ISO AAAA-MM-DD, nunca un día de mes reciclado entre
  // meses porque es un evento de una sola vez.
  oneTimeDate?: string;
  // Solo aplica a conceptos de INGRESO: a qué cuenta entra ese dinero — se
  // usa para preseleccionar la cuenta al registrar ese ingreso por voz o
  // manual (spec: "hacia dónde va a ir ese ingreso").
  targetAccountId?: string;
  // Solo aplica a conceptos de GASTO: cuentas con las que normalmente se
  // paga este tipo de gasto (opcional) — se usan como opciones al
  // registrar y para la preselección automática (spec: "seleccionar las
  // cuentas con las que normalmente pagas eso"). Vacío/undefined = todas
  // las cuentas activas son válidas.
  includedAccountIds?: string[];
}

// ============================================================
// Presupuestos con nombre ("plantillas") aplicables a periodos
// específicos del calendario — spec: "puedes armar un presupuesto...
// para tus días en clases... pero aparte puedes armar un presupuesto
// para cuando estés en vacaciones".
//
// Modelo: una BudgetTemplate agrupa sus renglones (TemplateBudgetLine).
// Una BudgetAssignment dice qué plantilla se carga en qué periodo del
// calendario. Un PeriodBudgetOverride es el ajuste de UN renglón para UN
// periodo, cuando la persona lo editó ahí sin querer cambiar la
// plantilla completa (spec: "no va a ser inamovible... solo una carga
// automática que puedes modificar").
// ============================================================

export type BudgetTemplateKind = 'week' | 'month' | 'day';

export interface BudgetTemplate extends SyncMeta {
  name: string;
  kind: BudgetTemplateKind;
  // Color con el que se pintan en el calendario los periodos donde esta
  // plantilla está aplicada.
  color: string;
  // Ícono (nombre de Ionicons) para identificarla de un vistazo en los
  // chips del encabezado de Presupuesto y en el calendario — spec:
  // "marcador legible de presupuesto confirmado". Sin ícono elegido se
  // usa uno por default según `kind` (ver BUDGET_TEMPLATE_ICONS).
  icon?: string;
  // La plantilla "Mi presupuesto" a la que se migró lo que ya existía —
  // se usa como respaldo en cualquier periodo sin plantilla asignada, y
  // nunca se puede borrar (solo renombrar o cambiarle el color).
  isDefault?: boolean;
}

// Un renglón dentro de una plantilla. Mismos campos que Budget, pero
// agrupados por templateId en vez de vivir sueltos por categoryId.
export interface TemplateBudgetLine extends SyncMeta {
  templateId: string;
  categoryId: string;
  monthlyAmount: number;
  currency: Currency;
  periodicity?: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  baseAmount?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  oneTimeDate?: string;
  targetAccountId?: string;
  includedAccountIds?: string[];
}

// Qué plantilla está cargada en qué periodo. periodKey:
// "month:2026-09", "week:2026-09-07" (lunes de esa semana), "day:2026-09-15",
// o "range:2026-09-28:2026-09-30" para un rango de fechas elegido a mano
// (spec v2 "Plan de gastos": "elegir inicio y fin... incluso si el periodo
// cruza semanas, meses o años" — no todo cabe en un día/semana/mes exacto).
export interface BudgetAssignment extends SyncMeta {
  templateId: string;
  periodKey: string;
  // Rango real que cubre esta asignación, en fechas locales inclusivas
  // (AAAA-MM-DD). SIEMPRE presente en asignaciones nuevas — es la única
  // fuente de verdad que usa el motor de resolución (getAssignmentRange en
  // budgetPeriods.ts); periodKey se conserva solo como etiqueta/llave de
  // agrupación legible. Opcional únicamente por compatibilidad con
  // asignaciones ya guardadas antes de este campo, que se siguen
  // resolviendo derivando el rango de su periodKey (day/week/month).
  startDate?: string;
  endDate?: string;
}

// Ajuste de un renglón SOLO para el periodo de ese assignment.
// monthlyAmount === null significa "este renglón no aplica aquí".
export interface PeriodBudgetOverride extends SyncMeta {
  assignmentId: string;
  categoryId: string;
  monthlyAmount: number | null;
  periodicity?: BudgetPeriodicity;
  frequency?: BudgetFrequency;
  customDaysPerWeek?: number;
  baseAmount?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  oneTimeDate?: string;
  targetAccountId?: string;
  includedAccountIds?: string[];
}

export interface Goal extends SyncMeta {
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate?: string;
  isDemo?: boolean;
}

export type AssetClass = 'stock' | 'etf' | 'fibra' | 'cetes' | 'bond' | 'fund' | 'crypto' | 'cash' | 'savings' | 'other';

export interface InvestmentPosition extends SyncMeta {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  avgCostPrice: number;
  currency: Currency;
  amountInvested: number;
  purchaseDate: string; // fecha financiera de compra
  // Institución del catálogo (src/data/institutions.ts), p.ej. "gbm".
  // Sin valor = "Otras inversiones" (todo lo registrado antes del catálogo).
  broker?: string;
  // Producto dentro de la institución, p.ej. "gbm_trading_usa".
  product?: string;
  // Tasa anual (%) antes de impuestos para ahorro, plazo y CETES — la que
  // el usuario ve en su app, no la de referencia del catálogo.
  annualRate?: number;
  termDays?: number;
  maturityDate?: string;
  fees?: number;
  dividendsReceived?: number;
  // Ganancia o pérdida ya realizada al vender parte de la posición —
  // calculada solo con datos reales del usuario (precio de venta vs.
  // costo promedio), nunca con precios de mercado inventados.
  realizedPnL?: number;
  notes?: string;
  isDemo?: boolean;
}

export type LiabilityType = 'credit_card' | 'student_loan' | 'personal_loan' | 'mortgage' | 'other';

// 'owe' = tú debes; 'owed_to_me' = te deben a ti (un amigo te pidió prestado).
export type LiabilityDirection = 'owe' | 'owed_to_me';

export interface Liability extends SyncMeta {
  type: LiabilityType;
  institution: string;
  balance: number;
  // ---- P3: deudas ampliadas ----
  direction?: LiabilityDirection; // sin valor = 'owe'
  counterparty?: string; // a quién le debes / quién te debe (nombre libre)
  status?: 'active' | 'settled'; // sin valor = 'active'
  settledAt?: string; // ISO
  installmentCount?: number; // plan de cuotas: cuántas
  installmentAmount?: number; // de cuánto es cada una
  installmentStartDate?: string; // AAAA-MM-DD de la primera
  installmentsPaid?: number; // cuántas van pagadas
  interestRate?: number;
  minPayment?: number;
  dueDate?: string;
  monthlyPayment?: number;
  startDate?: string;
  estimatedPayoffDate?: string;
  currency: Currency;
  notes?: string;
  isDemo?: boolean;
}

export interface UserProfile {
  name: string;
  primaryCurrency: Currency;
  onboardingComplete: boolean;
  themePreference: 'light' | 'dark' | 'system';
  budgetThresholds: {
    attention: number;
    warning: number;
    exceeded: number;
  };
  // Se marca la primera vez que alguien entra a Presupuesto y ve el aviso
  // de los presupuestos con nombre/calendario — después de esa vez ya no
  // se vuelve a mostrar (spec: "debe anunciarse la primera vez... ya
  // después de la primera vez ya no debe volver a aparecer").
  seenBudgetTemplatesIntro?: boolean;
  // Estilo visual elegido (vidrio, degradado suave, brutalista o uno
  // publicado después). Es independiente de claro/oscuro: cada estilo
  // trae sus dos versiones.
  visualStyle?: string;
  // Último estilo PERMANENTE que tuvo puesto: a ese regresa solo si el
  // que eligió era temporal y ya caducó.
  lastPermanentVisualStyle?: string;
  // Datos personales editables desde Perfil — el onboarding ya los pide
  // (sexo/edad, para el tono de la encuesta) pero antes solo se
  // guardaban sueltos en la respuesta de la encuesta, sin forma de
  // editarlos después.
  age?: number;
  sex?: 'hombre' | 'mujer' | 'prefiero_no_decirlo';
  // Color del círculo de iniciales del avatar (Account Dropdown/Perfil).
  avatarColor?: string;

  // ---- Apariencia: paleta de acento y fondo (solo aplica cuando el
  // estilo visual activo trae `supportsBackgroundPhoto`, hoy "Vidrio
  // líquido") ----
  // Una de ACCENT_PALETTES (theme/accentPalettes.ts). Nunca cambia los
  // colores semánticos financieros, solo botón principal/iconos activos.
  accentPaletteId?: string;
  // 'none' = fondo fijo cálido oscuro sin foto; 'catalog' = una de las
  // fotos preestablecidas por la propietaria; 'custom' = foto privada del
  // propio usuario.
  backgroundMode?: 'none' | 'catalog' | 'custom';
  // id de BackgroundImage dentro de backgroundCatalog.ts cuando backgroundMode === 'catalog'.
  backgroundCatalogImageId?: string;
  // Foto propia cuando backgroundMode === 'custom' — un `data:` URI en
  // base64 (ya reescalado a un tamaño manejable antes de guardarse). SÍ
  // viaja con el resto del perfil a Supabase (spec 2026-09-27: debe
  // sobrevivir borrar la app por completo y reinstalarla con la misma
  // cuenta, no solo quedarse en este dispositivo) — sigue siendo privada,
  // nunca un catálogo público, solo visible para su propia cuenta.
  backgroundCustomUri?: string;
  // Punto focal (0 a 1) para recortar la foto sin estirarla — por
  // dispositivo, porque un recorte vertical (celular) y uno horizontal
  // (escritorio) casi nunca comparten el mismo encuadre ideal.
  backgroundFocalXMobile?: number;
  backgroundFocalYMobile?: number;
  backgroundFocalXDesktop?: number;
  backgroundFocalYDesktop?: number;
  // 0 a 1 — "Qué tan oscuro" en Ajustes > Apariencia.
  backgroundDarkness?: number;
  // 0 a 1 — "Qué tan nítido" (a mayor valor, más desenfoque).
  backgroundBlurAmount?: number;
}

export interface NetWorthSnapshot extends SyncMeta {
  date: string; // YYYY-MM-DD — clave natural (una entrada por día)
  assets: number;
  liabilities: number;
  netWorth: number;
  currency: Currency;
  isDemo?: boolean;
}

// Registro de auditoría para cambios importantes (spec sección 84).
// Se genera del lado del cliente al editar saldos/registros sensibles y se
// sincroniza igual que cualquier otra entidad; en Supabase además hay
// triggers que registran cambios de saldo automáticamente por si el
// cliente no lo hizo.
export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLogEntry extends SyncMeta {
  entityType: 'account' | 'transaction' | 'budget' | 'goal' | 'investment' | 'liability';
  entityId: string;
  action: AuditAction;
  summary: string; // ej. "Saldo de cuenta: $20,000 → $25,000"
  previousValue?: number;
  newValue?: number;
}

// ---------- P3: movimientos recurrentes ----------

// Una regla que genera movimientos PREVISTOS cada cierto tiempo (la renta, el sueldo, un streaming) o recuerda una
// aportación periódica a una meta. Los previstos se generan por adelantado con identificadores deterministas
// (src/utils/ids.ts), así dos dispositivos que generan lo mismo no duplican.
export type RecurringRuleKind = 'transaction' | 'goal_contribution';
export type RecurringRuleStatus = 'active' | 'paused' | 'ended';

export interface RecurringRule extends SyncMeta {
  kind: RecurringRuleKind;
  name: string; // "Renta", "Netflix", "Aportación al viaje"
  status: RecurringRuleStatus;
  recurrence: Recurrence;
  amount: number;
  currency: Currency;
  // plantilla del movimiento (kind 'transaction')
  txType?: 'expense' | 'income' | 'transfer' | 'saving';
  categoryId?: string;
  subcategoryId?: string;
  merchant?: string;
  accountId?: string;
  toAccountId?: string;
  // aportación periódica (kind 'goal_contribution')
  goalId?: string;
  pausedAt?: string;
  endedAt?: string;
  generatedUntil?: string; // AAAA-MM-DD hasta donde ya se generaron previstos
  notes?: string;
}

// ---------- P3: avisos (recordatorios) ----------

export type ReminderKind = 'custom' | 'rule' | 'goal' | 'liability' | 'card_cutoff' | 'card_due';
export type ReminderStatus = 'active' | 'paused' | 'cancelled';

// Una SERIE de avisos: una vez, o repetida con una regla de recurrencia.
export interface Reminder extends SyncMeta {
  kind: ReminderKind;
  title: string; // lo que se ve en la notificación: nunca lleva montos ni saldos
  note?: string;
  sourceType?: 'rule' | 'goal' | 'liability' | 'account';
  sourceId?: string;
  recurrence?: Recurrence; // sin valor = una sola vez, en `date`
  date?: string; // AAAA-MM-DD (aviso de una sola vez)
  timeOfDay: string; // 'HH:MM' hora local
  advanceDays: number[]; // avisos previos: [3, 1] = 3 días antes y 1 día antes
  maxAttempts: number; // 1..3 intentos si no se confirma
  attemptIntervalMinutes: number; // entre intentos (múltiplos de 60: el servidor corre cada hora)
  push: boolean; // también como notificación al teléfono
  status: ReminderStatus;
  generatedUntil?: string;
}

// pending → sent (ya se avisó al menos una vez) → confirmed | not_occurred | skipped | dismissed | cancelled | paused
export type OccurrenceStatus = 'pending' | 'sent' | 'confirmed' | 'not_occurred' | 'skipped' | 'dismissed' | 'cancelled' | 'paused';

// Una vez concreta de un aviso. Lleva copia de lo que el servidor necesita (título, intentos) para mandar la
// notificación sin tener que juntar tablas.
export interface ReminderOccurrence extends SyncMeta {
  reminderId: string;
  eventDate: string; // AAAA-MM-DD del evento (el pago, el corte…)
  offsetDays: number; // 0 = el día del evento; 3 = aviso previo "faltan 3 días"
  scheduledFor: string; // ISO — cuándo debe sonar
  status: OccurrenceStatus;
  attemptsMade: number;
  maxAttempts: number;
  attemptIntervalMinutes: number;
  nextAttemptAt?: string; // ISO — el servidor lo mueve tras cada intento
  lastSentAt?: string;
  resolvedAt?: string;
  postponedCount?: number;
  title: string;
  push: boolean;
  sourceType?: 'rule' | 'goal' | 'liability' | 'account';
  sourceId?: string;
}
