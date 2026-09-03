import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

// Normalise un chemin (route ou service) : segments dynamiques -> :p
function norm(path) {
  return path
    .replace(/\\/g, "/")
    .replace(/\[([^\]]+)\]/g, ":p") // [orgId] -> :p
    .replace(/\$\{[^}]*\}/g, ":p") // ${orgId} -> :p
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

// Extrait les appels base44Client : méthode + URL (chaîne ou template literal)
const serviceCalls = [];
for (const f of walk("services")) {
  if (!f.endsWith(".ts")) continue;
  const src = readFileSync(f, "utf8");
  const re =
    /base44Client\.(get|post|put|delete|patch)(?:<[^>]*>)?\(\s*((?:`[^`]*`|"[^"]*"|'[^']*'))/g;
  let m;
  while ((m = re.exec(src))) {
    const method = m[1];
    const url = m[2].replace(/[`'"]/g, "");
    serviceCalls.push({ method, url, file: f.replace(/\\/g, "/") });
  }
}

// Routes réelles
const routes = new Set();
for (const f of walk("app/api")) {
  if (!f.endsWith("route.ts")) continue;
  const rel = f.replace(/\\/g, "/").replace(/^app\/api\//, "").replace(/\/route\.ts$/, "");
  routes.add(norm(rel));
}

console.log(`Appels service : ${serviceCalls.length} | Routes : ${routes.size}\n`);

const missing = [];
const seen = new Set();
for (const c of serviceCalls) {
  const n = norm(c.url);
  if (seen.has(n)) continue;
  seen.add(n);
  if (!routes.has(n)) missing.push({ ...c, normalized: n });
}

if (missing.length === 0) {
  console.log("Aucun trou : tous les appels service ont une route.");
} else {
  console.log(`Trous détectés (${missing.length}) :`);
  for (const m of missing) {
    console.log(`  [${m.method.toUpperCase()}] ${m.url}  (${m.file})`);
  }
}
