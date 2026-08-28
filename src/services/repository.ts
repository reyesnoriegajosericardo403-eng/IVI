// Contrato genérico que cualquier backend debe cumplir para guardar una
// entidad del dominio. Hoy solo existe una implementación (Supabase), pero
// el resto de la app nunca importa `@supabase/supabase-js` directamente —
// siempre habla con esta interfaz (spec 70, 80, 81): así, cambiar de
// Supabase a otro backend en el futuro no toca ni una pantalla.
export interface Repository<T> {
  // Todos los registros del usuario actualizados después de `updatedSince`
  // (o todos, si se omite) — incluye los borrados suavemente, para que el
  // motor de sincronización pueda reflejar el borrado localmente.
  list(userId: string, updatedSince?: string): Promise<T[]>;
  upsert(userId: string, record: T): Promise<void>;
}
