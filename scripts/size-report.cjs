// Reporte de peso de la versión web (lo que descarga quien abre la app) con presupuestos.
//   npm run size            (hace `expo export` en una carpeta temporal y mide)
//   node scripts/size-report.cjs --dir <carpeta ya exportada>
// Falla (código 1) si algún trozo se pasa de su presupuesto: así un cambio que infle la app se nota antes de publicar.
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

// Presupuestos en bytes COMPRIMIDOS (gzip -9, parecido a lo que sirve el hosting). Subirlos es una decisión, no un descuido.
const BUDGETS = {
  entry: 1_000_000, // paquete inicial (lo que bloquea abrir la app); a 2026-10-03: ≈933 KB
  extended: 130_000, // vocabulario ampliado del motor (se descarga en segundo plano); a 2026-10-03: ≈90 KB
  other: 150_000, // cualquier otro trozo diferido
};

const dirArg = process.argv.indexOf('--dir');
let dir = dirArg > -1 ? process.argv[dirArg + 1] : null;
if (!dir) {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'valu-size-'));
  execSync(`npx expo export -p web --output-dir "${dir}"`, { stdio: 'ignore', cwd: path.join(__dirname, '..') });
}
const jsDir = path.join(dir, '_expo/static/js/web');
const rows = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).map((f) => {
  const buf = fs.readFileSync(path.join(jsDir, f));
  const kind = f.startsWith('entry') ? 'entry' : f.startsWith('extended') ? 'extended' : 'other';
  return { f, kind, raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length };
});
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
let bad = 0;
console.log('Trozo'.padEnd(46), 'crudo'.padStart(9), 'gzip'.padStart(9), 'presupuesto'.padStart(13));
for (const r of rows) {
  const over = r.gz > BUDGETS[r.kind];
  if (over) bad++;
  console.log(r.f.padEnd(46), kb(r.raw).padStart(9), kb(r.gz).padStart(9), `${kb(BUDGETS[r.kind])}${over ? ' ✗ EXCEDE' : ''}`.padStart(13));
}
const total = rows.reduce((n, r) => n + r.gz, 0);
const initial = rows.filter((r) => r.kind === 'entry').reduce((n, r) => n + r.gz, 0);
console.log(`\nDescarga inicial: ${kb(initial)} · diferido en segundo plano: ${kb(total - initial)} · total: ${kb(total)}`);
process.exitCode = bad ? 1 : 0;
