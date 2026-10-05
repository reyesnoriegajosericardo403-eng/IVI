// Tipos mínimos de Deno para revisar las Edge Functions con tsc (npm run typecheck); en Supabase corre Deno de verdad.
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown;
}
