import { darkColors, lightColors, type ThemeColors } from './colors';
import {
  BUILT_IN_VISUAL_STYLES,
  DEFAULT_VISUAL_STYLE_ID,
  type StyleSurface,
  type VisualStyleDefinition,
  type VisualStyleStatus,
  type VisualStyleVariant,
} from './visualStyles';

// ---------------------------------------------------------------------------
// Registro de estilos: junta los que vienen dentro de la app con los que el
// desarrollador publica en Supabase, y decide cuál se le aplica al usuario.
// ---------------------------------------------------------------------------

const STATUSES: VisualStyleStatus[] = ['permanent', 'temporary', 'archived'];

// Base sobre la que se aplican los estilos remotos: así un tema publicado
// solo necesita declarar LO QUE CAMBIA, y nunca puede quedar ilegible por
// haber olvidado un color.
const BASE_VARIANT: Record<'light' | 'dark', VisualStyleVariant> = {
  light: BUILT_IN_VISUAL_STYLES[0].light,
  dark: BUILT_IN_VISUAL_STYLES[0].dark,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickStrings(patch: Record<string, unknown>, base: ThemeColors): ThemeColors {
  const out = { ...base };
  (Object.keys(base) as (keyof ThemeColors)[]).forEach((key) => {
    const value = patch[key];
    if (typeof value === 'string' && value.length > 0) out[key] = value;
  });
  return out;
}

function pickSurface(patch: Record<string, unknown>, base: StyleSurface): StyleSurface {
  const out = { ...base };
  (Object.keys(base) as (keyof StyleSurface)[]).forEach((key) => {
    const value = patch[key];
    const current = base[key];
    if (typeof current === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      (out[key] as number) = value;
    } else if (typeof current === 'boolean' && typeof value === 'boolean') {
      (out[key] as boolean) = value;
    } else if (key === 'shadowColor' && typeof value === 'string' && value.length > 0) {
      out.shadowColor = value;
    } else if (key === 'backgroundGradient') {
      if (value === null) out.backgroundGradient = null;
      else if (Array.isArray(value) && value.every((c) => typeof c === 'string' && c.length > 0)) {
        out.backgroundGradient = value as string[];
      }
    }
  });
  return out;
}

function parseVariant(raw: unknown, scheme: 'light' | 'dark'): VisualStyleVariant {
  const base = BASE_VARIANT[scheme];
  if (!isRecord(raw)) return base;
  const colors = isRecord(raw.colors)
    ? pickStrings(raw.colors, scheme === 'light' ? lightColors : darkColors)
    : base.colors;
  const surface = isRecord(raw.surface) ? pickSurface(raw.surface, base.surface) : base.surface;
  return { colors, surface };
}

// Una fila de la tabla `ui_themes`. Es información externa: si viene mal
// formada se descarta en silencio en vez de romper la app.
export function parseRemoteVisualStyle(row: unknown): VisualStyleDefinition | null {
  if (!isRecord(row)) return null;
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  if (!id) return null;
  const tokens = isRecord(row.tokens) ? row.tokens : {};
  const status = STATUSES.includes(row.status as VisualStyleStatus) ? (row.status as VisualStyleStatus) : 'permanent';

  return {
    id,
    name: typeof row.name === 'string' && row.name.trim() ? row.name.trim() : id,
    description: typeof row.description === 'string' ? row.description : '',
    status,
    version: typeof row.version === 'string' ? row.version : '1.0',
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    light: parseVariant(tokens.light, 'light'),
    dark: parseVariant(tokens.dark, 'dark'),
  };
}

export function isExpired(style: VisualStyleDefinition, now: Date = new Date()): boolean {
  if (!style.expiresAt) return false;
  const end = Date.parse(style.expiresAt);
  return Number.isFinite(end) && end <= now.getTime();
}

// Los remotos ganan por id, para poder corregir un estilo ya publicado sin
// sacar una versión nueva de la app.
export function mergeVisualStyles(remote: VisualStyleDefinition[]): VisualStyleDefinition[] {
  const byId = new Map(BUILT_IN_VISUAL_STYLES.map((s) => [s.id, s]));
  remote.forEach((s) => byId.set(s.id, s));
  return [...byId.values()];
}

// Lo que se le ofrece al usuario en Ajustes: permanentes y temporales
// vigentes. Los archivados y los caducados no se ofrecen (spec: "archive
// instead of delete" — siguen existiendo, solo dejan de aparecer).
export function selectableVisualStyles(
  all: VisualStyleDefinition[],
  now: Date = new Date()
): VisualStyleDefinition[] {
  return all.filter((s) => s.status !== 'archived' && !isExpired(s, now));
}

export interface ResolvedSelection {
  style: VisualStyleDefinition;
  // true cuando el estilo que el usuario tenía elegido ya no se puede usar y
  // se le regresó a su último permanente — el llamador aprovecha para
  // guardar ese cambio.
  fellBack: boolean;
}

export function resolveVisualStyle(
  all: VisualStyleDefinition[],
  selectedId: string | undefined,
  lastPermanentId: string | undefined,
  now: Date = new Date()
): ResolvedSelection {
  const byId = new Map(all.map((s) => [s.id, s]));
  const usable = (id: string | undefined) => {
    if (!id) return undefined;
    const found = byId.get(id);
    if (!found || found.status === 'archived' || isExpired(found, now)) return undefined;
    return found;
  };

  const selected = usable(selectedId);
  if (selected) return { style: selected, fellBack: false };

  const previous = usable(lastPermanentId);
  if (previous) return { style: previous, fellBack: true };

  const fallback = byId.get(DEFAULT_VISUAL_STYLE_ID) ?? BUILT_IN_VISUAL_STYLES[0];
  return { style: fallback, fellBack: !!selectedId };
}
