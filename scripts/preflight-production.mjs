// Contrôle avant mise en production : toutes les variables d'environnement
// requises sont-elles présentes et plausibles ? Aucune valeur n'est affichée,
// seulement le nom de chaque variable et le résultat du contrôle.
//
//   node --env-file=.env.production.local scripts/preflight-production.mjs [--migrations] [--allow-real-money]
//
// --migrations       vérifie aussi les variables PG* (poste qui applique les
//                    migrations avec apply-migrations.mjs ; inutiles chez l'hébergeur).
// --allow-real-money accepte PAY_REAL_MONEY=1 (sinon c'est une erreur : tant
//                    que le partenaire agréé n'est pas choisi, l'interrupteur
//                    doit rester désactivé).
//
// Code de sortie : 0 si tout est en ordre, 1 s'il manque quelque chose.
import { pathToFileURL } from "node:url";

const PLACEHOLDER = /votre-|example|exemple|changeme|clé-|xxxx|<.*>/i;

function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

// Chaque contrôle renvoie null si tout va bien, sinon la raison (sans valeur).
const rules = {
  required: (value) => (present(value) ? null : "absente"),
  notPlaceholder: (value) =>
    present(value) && PLACEHOLDER.test(value) ? "valeur d'exemple non remplacée" : null,
  httpsUrl: (value) => {
    if (!present(value)) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return "doit commencer par https://";
      if (/localhost|127\.0\.0\.1/.test(url.hostname)) return "pointe vers localhost";
      return null;
    } catch {
      return "n'est pas une adresse valide";
    }
  },
  apiUrl: (value) => {
    if (!present(value)) return null;
    if (/localhost|127\.0\.0\.1/.test(value)) return "pointe vers localhost";
    if (value.startsWith("/")) return null;
    return rules.httpsUrl(value);
  },
  minLength: (length) => (value) =>
    present(value) && value.trim().length < length ? `trop courte (au moins ${length} caractères)` : null,
  equals: (expected) => (value) =>
    present(value) && value.trim() !== expected ? `doit valoir ${expected}` : null,
};

// Renvoie la liste [{ name, level: "ok" | "erreur" | "avertissement" | "info", detail }].
export function runPreflight(env, options = {}) {
  const results = [];
  const add = (name, level, detail = "") => results.push({ name, level, detail });
  const check = (name, checks, { optional = false } = {}) => {
    const value = env[name];
    if (!present(value)) {
      add(name, optional ? "info" : "erreur", optional ? "non renseignée (facultative)" : "absente");
      return false;
    }
    for (const rule of checks) {
      const problem = rule(value);
      if (problem) {
        add(name, "erreur", problem);
        return false;
      }
    }
    add(name, "ok");
    return true;
  };

  // --- Supabase ---
  check("NEXT_PUBLIC_SUPABASE_URL", [rules.notPlaceholder, rules.httpsUrl]);
  check("NEXT_PUBLIC_SUPABASE_ANON_KEY", [rules.notPlaceholder, rules.minLength(30)]);
  if (check("SUPABASE_SERVICE_ROLE_KEY", [rules.notPlaceholder, rules.minLength(30)])) {
    if (env.SUPABASE_SERVICE_ROLE_KEY === env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      results.pop();
      add("SUPABASE_SERVICE_ROLE_KEY", "erreur", "identique à la clé anon : ce doit être la clé service_role");
    }
  }

  // --- Application ---
  check("NEXT_PUBLIC_BASE44_API_URL", [rules.apiUrl]);
  check("NEXT_PUBLIC_USE_REAL_API", [rules.equals("1")]);

  // --- Tâches planifiées ---
  check("CRON_SECRET", [rules.notPlaceholder, rules.minLength(32)]);

  // --- Argent réel ---
  if (present(env.PAY_REAL_MONEY) && env.PAY_REAL_MONEY.trim() === "1") {
    add(
      "PAY_REAL_MONEY",
      options.allowRealMoney ? "avertissement" : "erreur",
      options.allowRealMoney
        ? "ACTIVÉ : la plateforme encaisse et décaisse de l'argent réel"
        : "activé : doit rester désactivé tant que le partenaire agréé n'est pas choisi (ou relancer avec --allow-real-money)",
    );
  } else {
    add("PAY_REAL_MONEY", "ok", "désactivé (paiements en mode test)");
  }
  check("PAY_WEBHOOK_SECRET", [rules.notPlaceholder, rules.minLength(32)], { optional: true });

  // --- Control Plane GSG ---
  if (env.CONTROL_PLANE_ENABLED?.trim() === "1") {
    add("CONTROL_PLANE_ENABLED", "ok", "activé");
    check("CONTROL_PLANE_SERVICE_ID", [rules.notPlaceholder]);
    check("CONTROL_PLANE_INSTANCE_ID", [rules.notPlaceholder]);
    check("CONTROL_PLANE_KERNEL_ISSUER", [rules.notPlaceholder]);
    check("CONTROL_PLANE_METRICS_URL", [rules.notPlaceholder, rules.httpsUrl]);
    check("CONTROL_PLANE_AUDIT_URL", [rules.notPlaceholder, rules.httpsUrl]);
    for (const [secret, pem] of [
      ["CONTROL_PLANE_OUTBOUND_SECRET", "CONTROL_PLANE_OUTBOUND_PRIVATE_KEY"],
      ["CONTROL_PLANE_INBOUND_SECRET", "CONTROL_PLANE_INBOUND_PUBLIC_KEY"],
    ]) {
      if (present(env[pem])) add(pem, "ok");
      else check(secret, [rules.notPlaceholder, rules.minLength(32)]);
    }
  } else {
    add("CONTROL_PLANE_ENABLED", "info", "désactivé : /api/control-plane/push répondra 404 (normal sans Control Plane)");
  }

  // --- Assistant IA ---
  if (present(env.AI_API_KEY) && PLACEHOLDER.test(env.AI_API_KEY)) {
    add("AI_API_KEY", "erreur", "valeur d'exemple non remplacée (la retirer ou mettre la vraie clé)");
  } else {
    check("AI_API_KEY", [], { optional: true });
  }

  // --- Migrations (poste de l'administrateur) ---
  if (options.migrations) {
    for (const name of ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"]) {
      check(name, [rules.notPlaceholder]);
    }
  }

  return results;
}

const SYMBOLS = { ok: "[OK]     ", erreur: "[MANQUE] ", avertissement: "[ATTENTION]", info: "[INFO]   " };

function main() {
  const args = new Set(process.argv.slice(2));
  for (const arg of args) {
    if (arg !== "--migrations" && arg !== "--allow-real-money") {
      console.error(`Option inconnue : ${arg}`);
      process.exit(2);
    }
  }
  const results = runPreflight(process.env, {
    migrations: args.has("--migrations"),
    allowRealMoney: args.has("--allow-real-money"),
  });

  console.log("Contrôle des variables de production (aucune valeur n'est affichée) :\n");
  for (const r of results) {
    console.log(`  ${SYMBOLS[r.level]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  const errors = results.filter((r) => r.level === "erreur").length;
  console.log(
    errors === 0
      ? "\nTout est en ordre."
      : `\n${errors} point(s) à corriger avant la mise en production.`,
  );
  if (errors > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
