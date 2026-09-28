import type { AssetClass, Currency } from './types';

// Catálogo preestablecido de instituciones de inversión en México y sus
// productos. Cada producto trae su propio modelo de cálculo (ver
// src/utils/investmentModels.ts) y datos de referencia — comisiones y
// tasas — con la fuente oficial y el mes en que se revisaron.
//
// Regla: estas cifras son REFERENCIA, no verdad absoluta. Las tasas de
// ahorro cambian cada pocas semanas; por eso cada posición del usuario
// guarda su propia tasa (que puede editar) y la app siempre muestra la
// fecha de revisión y el enlace a la fuente. Para actualizar el catálogo:
// cambiar `referenceAnnualRate`/`commission` y su `asOf`, nunca borrar la
// fuente. Las tasas de CETES sí son en vivo (Banxico vía market-data).
//
// Revisado: septiembre 2026 (ver docs/memoria-proyecto/07-instituciones-inversion.md).

export type ProductModel = 'brokerage' | 'daily_yield' | 'fixed_term' | 'cetes' | 'fund' | 'crypto';

export interface CommissionTier {
  upTo: number | null; // monto operado (MXN) hasta el que aplica; null = sin tope
  percent: number; // 0.0025 = 0.25%
}

export interface ProductCommission {
  description: string;
  // Comisión por compra o venta como fracción del monto operado.
  tradePercent: number | null;
  plusIVA: boolean;
  tiers?: CommissionTier[];
  minimum?: number | null;
  // Cuota anual sobre el saldo (fondos administrados, mantenimiento).
  annualFeePercent?: number | null;
}

export interface InstitutionProduct {
  id: string;
  name: string;
  model: ProductModel;
  currency: Currency;
  howItWorks: string[];
  commission: ProductCommission;
  referenceAnnualRate?: number | null; // % anual antes de impuestos
  rateNotes?: string;
  termDays?: number[];
  capAmount?: number | null;
  protection: string;
  // Qué tipos de activo se pueden registrar dentro de este producto.
  assetClasses: AssetClass[];
  source: string;
  asOf: string | null; // "YYYY-MM" en que se revisó
}

export type InstitutionType = 'casa_de_bolsa' | 'banco' | 'sofipo' | 'gobierno' | 'fintech' | 'exchange' | 'otra';

export interface Institution {
  id: string;
  name: string;
  formerly?: string;
  type: InstitutionType;
  tagline: string;
  // Solo acentos de color para la tarjeta — no son logotipos oficiales.
  color: string;
  monogram: string;
  officialUrl: string | null;
  products: InstitutionProduct[];
}

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  casa_de_bolsa: 'Casa de bolsa',
  banco: 'Banco',
  sofipo: 'SOFIPO',
  gobierno: 'Gobierno de México',
  fintech: 'Fintech',
  exchange: 'Exchange cripto',
  otra: 'Otra',
};

export const PRODUCT_MODEL_LABELS: Record<ProductModel, string> = {
  brokerage: 'Bolsa (acciones, ETFs, FIBRAs)',
  daily_yield: 'Rendimiento diario',
  fixed_term: 'Inversión a plazo',
  cetes: 'Deuda gubernamental',
  fund: 'Fondo de inversión',
  crypto: 'Criptomonedas',
};

// Parámetros fiscales 2026 (Ley de Ingresos de la Federación 2026: retención
// anual de ISR sobre capital sube de 0.50% a 0.90%; IVA 16% sobre comisiones).
export const FISCAL_MX_2026 = {
  isrRetentionAnnualOnCapital: 0.009,
  ivaOnCommissions: 0.16,
  source: 'https://www.cefp.gob.mx/publicaciones/nota/2025/notacefp1472025.pdf',
  asOf: '2026-09',
};

const EQUITY_CLASSES: AssetClass[] = ['stock', 'etf', 'fibra'];

export const INSTITUTIONS: Institution[] = [
  {
    id: 'gbm',
    name: 'GBM',
    type: 'casa_de_bolsa',
    tagline: 'Acciones MX y USA, Smart Cash y estrategias',
    color: '#1B2A4A',
    monogram: 'GBM',
    officialUrl: 'https://gbm.com',
    products: [
      {
        id: 'gbm_trading_mx',
        name: 'Trading MX',
        model: 'brokerage',
        currency: 'MXN',
        howItWorks: [
          'Compras y vendes acciones, ETFs y FIBRAs de la BMV y BIVA.',
          'La comisión baja según lo que inviertes en los últimos 3 meses.',
          'A la comisión se le suma IVA (16%).',
        ],
        commission: {
          description: '0.25% hasta $1M · 0.20% de $1M a $3M · 0.15% de $3M a $5M · 0.125% de $5M a $10M · 0.10% arriba de $10M, + IVA',
          tradePercent: 0.0025,
          plusIVA: true,
          tiers: [
            { upTo: 1_000_000, percent: 0.0025 },
            { upTo: 3_000_000, percent: 0.002 },
            { upTo: 5_000_000, percent: 0.0015 },
            { upTo: 10_000_000, percent: 0.00125 },
            { upTo: null, percent: 0.001 },
          ],
        },
        protection: 'Valores en custodia de la casa de bolsa (no aplica IPAB).',
        assetClasses: EQUITY_CLASSES,
        source: 'https://gbm.com/faqs/que-comisiones-cobran-al-invertir-en-gbm/',
        asOf: '2026-09',
      },
      {
        id: 'gbm_trading_usa',
        name: 'Trading USA',
        model: 'brokerage',
        currency: 'USD',
        howItWorks: [
          'Acciones, ETFs y ADRs de NYSE y Nasdaq.',
          'Acciones completas: 0.25% por compra o venta.',
          'Fracciones desde MX$20 sin comisión.',
        ],
        commission: {
          description: '0.25% por compra o venta de acciones completas; fracciones sin comisión',
          tradePercent: 0.0025,
          plusIVA: false,
        },
        protection: 'Valores en custodia (no aplica IPAB).',
        assetClasses: ['stock', 'etf'],
        source: 'https://gbm.com/faqs/existe-alguna-comision-por-invertir-en-trading-usa/',
        asOf: '2026-09',
      },
      {
        id: 'gbm_smart_cash',
        name: 'Smart Cash',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'Tu saldo sin invertir se coloca en un fondo de liquidez.',
          'Genera rendimiento todos los días y lo puedes usar cuando quieras.',
          'La tasa depende de tu inversión total en GBM.',
        ],
        commission: { description: 'Sin comisión en pesos', tradePercent: null, plusIVA: false },
        referenceAnnualRate: 4.25,
        rateNotes: 'GBM publica un rango de 4.25% a 5.00% anual según tu inversión total. Pon la tasa que ves en tu app.',
        protection: 'Fondo de inversión (no aplica IPAB).',
        assetClasses: ['savings'],
        source: 'https://gbm.com/faqs/cual-es-la-tasa-de-rendimiento-de-smart-cash/',
        asOf: '2026-09',
      },
      {
        id: 'gbm_estrategias',
        name: 'Fondos y estrategias',
        model: 'fund',
        currency: 'MXN',
        howItWorks: [
          'Portafolios por perfil o metas, administrados por GBM.',
          'Cobran una cuota anual sobre el valor, descontada diario en el precio.',
          'El rendimiento es variable, no garantizado.',
        ],
        commission: {
          description: 'Cuota anual de 1% a 2.75% según el fondo, ya descontada en el precio',
          tradePercent: null,
          plusIVA: true,
          annualFeePercent: 1,
        },
        protection: 'Fondo de inversión (no aplica IPAB).',
        assetClasses: ['fund'],
        source: 'https://gbm.com/faqs/existen-comisiones-en-la-compra-de-fondos/',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'nu',
    name: 'Nu',
    type: 'banco',
    tagline: 'Cajitas con rendimiento diario',
    color: '#820AD1',
    monogram: 'Nu',
    officialUrl: 'https://nu.com.mx',
    products: [
      {
        id: 'nu_cajitas',
        name: 'Cajitas 24/7',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'El rendimiento se calcula y se suma todos los días.',
          'Tu dinero está disponible 24/7, sin monto máximo.',
          'Nu es banco desde julio 2026: protegido por IPAB.',
        ],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
        referenceAnnualRate: 6.5,
        rateNotes: 'GAT nominal 6.72%, real 2.43%. Vigente del 20 de agosto al 7 de octubre de 2026.',
        protection: 'IPAB hasta 400,000 UDIS por persona.',
        assetClasses: ['savings'],
        source: 'https://nu.com.mx/historico-de-rendimientos-cuenta/',
        asOf: '2026-08',
      },
      {
        id: 'nu_cajita_turbo',
        name: 'Cajita Turbo',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'Rendimiento diario más alto, con tope de $25,000.',
          'Requiere al menos una compra al mes con tu tarjeta Nu.',
          'Retiras cuando quieras, sin penalización.',
        ],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
        referenceAnnualRate: 13,
        rateNotes: 'GAT nominal 13.88%, real 9.31%. Tope $25,000. Vigente del 20 de agosto al 7 de octubre de 2026.',
        capAmount: 25_000,
        protection: 'IPAB hasta 400,000 UDIS por persona.',
        assetClasses: ['savings'],
        source: 'https://blog.nu.com.mx/productos-nu/cuenta-nu/cajita-turbo-nu-mexico-cuenta/',
        asOf: '2026-08',
      },
      {
        id: 'nu_ahorro_congelado',
        name: 'Ahorro Congelado',
        model: 'fixed_term',
        currency: 'MXN',
        howItWorks: [
          'Congelas dinero de una Cajita por un plazo fijo.',
          'A más plazo, mayor rendimiento.',
          'No puedes sacarlo antes de que venza.',
        ],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
        referenceAnnualRate: null,
        rateNotes: 'GAT nominal: 7 días 6.77% · 28 días 6.82% · 90 días 6.93% · 180 días 7.04%. Pon la tasa anual que ves en tu app.',
        termDays: [7, 28, 90, 180],
        protection: 'IPAB hasta 400,000 UDIS por persona.',
        assetClasses: ['savings'],
        source: 'https://nu.com.mx/historico-de-rendimientos-cuenta/',
        asOf: '2026-08',
      },
    ],
  },
  {
    id: 'actinver',
    name: 'Actinver Trade',
    formerly: 'Bursanet',
    type: 'casa_de_bolsa',
    tagline: 'Antes Bursanet · acciones BMV y SIC, fondos',
    color: '#0B3C75',
    monogram: 'AT',
    officialUrl: 'https://actinvertrade.actinver.com',
    products: [
      {
        id: 'actinver_capitales',
        name: 'Acciones BMV y SIC',
        model: 'brokerage',
        currency: 'MXN',
        howItWorks: [
          'Acciones nacionales, del SIC (extranjeras en pesos), ETFs y FIBRAs.',
          'La comisión depende de lo que operaste en los 30 días previos.',
          'Sin costo de apertura ni de administración.',
        ],
        commission: {
          description: '0.25% hasta $1M · 0.20% de $1M a $5M · 0.15% de $5M a $10M · 0.10% arriba de $10M, + IVA',
          tradePercent: 0.0025,
          plusIVA: true,
          tiers: [
            { upTo: 1_000_000, percent: 0.0025 },
            { upTo: 5_000_000, percent: 0.002 },
            { upTo: 10_000_000, percent: 0.0015 },
            { upTo: null, percent: 0.001 },
          ],
        },
        protection: 'Valores en custodia (no aplica IPAB).',
        assetClasses: EQUITY_CLASSES,
        source: 'https://actinvertrade.actinver.com/preguntas-frecuentes.html',
        asOf: '2026-09',
      },
      {
        id: 'actinver_fondos',
        name: 'Fondos Actinver',
        model: 'fund',
        currency: 'MXN',
        howItWorks: [
          'Fondos de deuda y de renta variable administrados por Actinver.',
          'Algunos cobran comisión de entrada; otros no.',
        ],
        commission: {
          description: 'Entrada de 0.5% a 1% en algunos fondos; mínimo $200 + IVA en operaciones pequeñas',
          tradePercent: null,
          plusIVA: true,
          minimum: 200,
        },
        protection: 'Fondo de inversión (no aplica IPAB).',
        assetClasses: ['fund'],
        source: 'https://actinvertrade.actinver.com/preguntas-frecuentes.html',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'cetesdirecto',
    name: 'Cetesdirecto',
    type: 'gobierno',
    tagline: 'CETES, BONDDIA y bonos del Gobierno',
    color: '#691C32',
    monogram: 'CD',
    officialUrl: 'https://www.cetesdirecto.com',
    products: [
      {
        id: 'cetes',
        name: 'CETES',
        model: 'cetes',
        currency: 'MXN',
        howItWorks: [
          'Compras con descuento y al vencer recibes $10 por título.',
          'Plazos de 28, 91, 182 y 364 días, desde $100.',
          'Se retiene ISR de 0.90% anual sobre tu capital, proporcional al plazo.',
        ],
        commission: { description: 'Sin comisión por abrir, invertir ni retirar', tradePercent: 0, plusIVA: false, minimum: 100 },
        rateNotes: 'La tasa sale de la subasta semanal de Banxico — VALU la trae en vivo.',
        termDays: [28, 91, 182, 364],
        protection: 'Gobierno Federal (riesgo soberano).',
        assetClasses: ['cetes'],
        source: 'https://www.gob.mx/nafin/acciones-y-programas/cetesdirecto-204296',
        asOf: '2026-09',
      },
      {
        id: 'bonddia',
        name: 'BONDDIA',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'Fondo de deuda gubernamental con liquidez diaria.',
          'El precio y la tasa cambian cada día hábil.',
          'Desde $100, sin comisión.',
        ],
        commission: { description: 'Sin comisión; la administración va incluida en el precio', tradePercent: 0, plusIVA: false, minimum: 100 },
        referenceAnnualRate: 6.44,
        rateNotes: 'Rendimiento anualizado al 22 de septiembre de 2026; cambia a diario.',
        protection: 'Valores gubernamentales (no aplica IPAB).',
        assetClasses: ['fund'],
        source: 'https://www.cetesdirecto.com/tablas/valores_gubernamentales/bonddia.html',
        asOf: '2026-09',
      },
      {
        id: 'bonos_gobierno',
        name: 'Bondes F, Udibonos y Bonos M',
        model: 'fixed_term',
        currency: 'MXN',
        howItWorks: [
          'Bondes F: 5 años, interés variable cada 28 días.',
          'Udibonos: tasa real fija más ajuste por inflación.',
          'Bonos M: tasa fija con cupón semestral.',
        ],
        commission: { description: 'Sin comisión', tradePercent: 0, plusIVA: false, minimum: 100 },
        referenceAnnualRate: null,
        rateNotes: 'Pon la tasa que te muestra Cetesdirecto al comprar.',
        protection: 'Gobierno Federal (riesgo soberano).',
        assetClasses: ['bond'],
        source: 'https://www.cetesdirecto.com/sites/portal/productos.cetesdirecto',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    type: 'fintech',
    tagline: 'Ganancias diarias sobre tu saldo',
    color: '#009EE3',
    monogram: 'MP',
    officialUrl: 'https://www.mercadopago.com.mx',
    products: [
      {
        id: 'mp_ganancias',
        name: 'Ganancias en cuenta',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'Tu saldo se invierte solo en un fondo administrado por GBM.',
          'Las ganancias se abonan cada día hábil, sin plazo.',
          'La tasa más alta pide ingresar al menos $3,000 al mes.',
        ],
        commission: { description: 'Sin comisión publicada', tradePercent: null, plusIVA: false },
        referenceAnnualRate: null,
        rateNotes: 'Hasta 8% anual del fondo, o más con el beneficio de ingresar $3,000+/mes. Pon la tasa que ves en tu app.',
        protection: 'Fondo de inversión (no aplica IPAB).',
        assetClasses: ['savings'],
        source: 'https://www.mercadopago.com.mx/ayuda/Nunca-genere-rendimientos_4843',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'hey',
    name: 'Hey Banco',
    type: 'banco',
    tagline: 'Inversión a plazo fijo',
    color: '#111111',
    monogram: 'hey',
    officialUrl: 'https://banco.hey.inc',
    products: [
      {
        id: 'hey_inversion',
        name: 'Inversión Hey',
        model: 'fixed_term',
        currency: 'MXN',
        howItWorks: [
          'Plazo fijo de 7 o 28 días.',
          'Desde $1,000, con tasa fija anual.',
          'Al vencer recibes tu capital más intereses.',
        ],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false, minimum: 1000 },
        referenceAnnualRate: 7.5,
        rateNotes: '28 días 7.50% · 7 días 7.00% (GAT al 27 de agosto de 2026). Puede variar según tu nivel Hey.',
        termDays: [7, 28],
        protection: 'IPAB hasta 400,000 UDIS por persona.',
        assetClasses: ['savings'],
        source: 'https://banco.hey.inc/universo-hey/ahorra-e-invierte/inversion-hey',
        asOf: '2026-08',
      },
    ],
  },
  {
    id: 'klar',
    name: 'Klar',
    type: 'sofipo',
    tagline: 'Inversión flexible y a plazo',
    color: '#2D2D2D',
    monogram: 'K',
    officialUrl: 'https://www.klar.mx',
    products: [
      {
        id: 'klar_max',
        name: 'Inversión Max',
        model: 'daily_yield',
        currency: 'MXN',
        howItWorks: [
          'Metes o retiras dinero cuando quieras.',
          'Tope de $25,000; solo para niveles Plus y Platino.',
        ],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
        referenceAnnualRate: null,
        rateNotes: 'Tasa promocional que cambia por nivel. Pon la que ves en tu app.',
        capAmount: 25_000,
        protection: 'Prosofipo hasta 25,000 UDIS.',
        assetClasses: ['savings'],
        source: 'https://www.klar.mx/inversion',
        asOf: '2026-09',
      },
      {
        id: 'klar_plazo',
        name: 'Inversión a plazo',
        model: 'fixed_term',
        currency: 'MXN',
        howItWorks: ['Desde $100.', 'La tasa depende del plazo y de tu nivel.', 'Al vencer recibes capital más intereses.'],
        commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false, minimum: 100 },
        referenceAnnualRate: null,
        rateNotes: 'Klar Plus: 7 días 8.10% · 30 días 8.20% · 90 días 8.30% · 180 días 8.40%. Verifica la tuya.',
        termDays: [7, 30, 90, 180],
        protection: 'Prosofipo hasta 25,000 UDIS.',
        assetClasses: ['savings'],
        source: 'https://www.klar.mx/inversion',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'kuspit',
    name: 'Kuspit',
    type: 'casa_de_bolsa',
    tagline: 'Acciones, ETFs y SIC desde $100',
    color: '#00857C',
    monogram: 'Ku',
    officialUrl: 'https://www.kuspit.com',
    products: [
      {
        id: 'kuspit_trading',
        name: 'Acciones, ETFs y SIC',
        model: 'brokerage',
        currency: 'MXN',
        howItWorks: [
          'Inviertes desde $100 en acciones, ETFs y FIBRAs.',
          'Comisión por operación más una cuota de mantenimiento.',
        ],
        commission: {
          description: '0.20% por operación + 0.99% anual de mantenimiento (dato de terceros; confirma en Kuspit)',
          tradePercent: 0.002,
          plusIVA: false,
          annualFeePercent: 0.99,
        },
        protection: 'Valores en custodia (no aplica IPAB).',
        assetClasses: EQUITY_CLASSES,
        source: 'https://www.kuspit.com/',
        asOf: '2026-09',
      },
    ],
  },
  {
    id: 'bitso',
    name: 'Bitso',
    type: 'exchange',
    tagline: 'Compra y venta de cripto',
    color: '#0B7A55',
    monogram: 'B',
    officialUrl: 'https://bitso.com/mx',
    products: [
      {
        id: 'bitso_trading',
        name: 'Cripto',
        model: 'crypto',
        currency: 'MXN',
        howItWorks: [
          'Esquema maker-taker: la orden que se ejecuta al instante paga más.',
          'La comisión baja según tu volumen de 30 días.',
        ],
        commission: { description: 'BTC/MXN base: maker 0.50%, taker 0.65%', tradePercent: 0.0065, plusIVA: false },
        protection: 'Sin protección de depósitos.',
        assetClasses: ['crypto'],
        source: 'https://support.bitso.com/hc/en-us/articles/4414985686036',
        asOf: '2026-09',
      },
    ],
  },
];

// Todo lo que no encaja en una institución del catálogo (y las posiciones
// registradas antes de este rediseño) vive aquí, con productos genéricos.
export const OTHER_INSTITUTION: Institution = {
  id: 'otra',
  name: 'Otras inversiones',
  type: 'otra',
  tagline: 'Cualquier otra institución o lo que registraste antes',
  color: '#5B6475',
  monogram: '+',
  officialUrl: null,
  products: [
    {
      id: 'otra_bolsa',
      name: 'Bolsa',
      model: 'brokerage',
      currency: 'MXN',
      howItWorks: ['Acciones, ETFs, FIBRAs, bonos o fondos en cualquier casa de bolsa.'],
      commission: { description: 'Registra la comisión que te cobraron en cada operación', tradePercent: null, plusIVA: false },
      protection: '—',
      assetClasses: ['stock', 'etf', 'fibra', 'bond', 'fund', 'cetes', 'other'],
      source: '',
      asOf: null,
    },
    {
      id: 'otra_ahorro',
      name: 'Ahorro con rendimiento',
      model: 'daily_yield',
      currency: 'MXN',
      howItWorks: ['Cualquier cuenta que genere rendimiento diario (SOFIPOs, bancos digitales).'],
      commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
      protection: '—',
      assetClasses: ['savings'],
      source: '',
      asOf: null,
    },
    {
      id: 'otra_plazo',
      name: 'Inversión a plazo',
      model: 'fixed_term',
      currency: 'MXN',
      howItWorks: ['Pagarés o depósitos a plazo fijo en cualquier institución.'],
      commission: { description: 'Sin comisión', tradePercent: null, plusIVA: false },
      protection: '—',
      assetClasses: ['savings'],
      source: '',
      asOf: null,
    },
    {
      id: 'otra_cripto',
      name: 'Cripto',
      model: 'crypto',
      currency: 'MXN',
      howItWorks: ['Criptomonedas en cualquier exchange o billetera.'],
      commission: { description: 'Registra la comisión de cada operación', tradePercent: null, plusIVA: false },
      protection: '—',
      assetClasses: ['crypto'],
      source: '',
      asOf: null,
    },
  ],
};

export const ALL_INSTITUTIONS: Institution[] = [...INSTITUTIONS, OTHER_INSTITUTION];

export function findInstitution(id: string | undefined): Institution {
  return ALL_INSTITUTIONS.find((i) => i.id === id) ?? OTHER_INSTITUTION;
}

export function findProduct(institutionId: string | undefined, productId: string | undefined): InstitutionProduct | undefined {
  return findInstitution(institutionId).products.find((p) => p.id === productId);
}
