import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const email = process.argv[2];
const role = process.argv[3] ?? "admin";

if (!email) {
  console.error("Usage: node scripts/bootstrap-admin.mjs <email> [role]");
  process.exit(1);
}

function loadEnv() {
  const path = fileURLToPath(new URL("../.env.local", import.meta.url));
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

// Les variables d'environnement priment (node --env-file=.env.production.local
// pour la production) ; à défaut, la base de test de .env.local.
const env =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env
    : loadEnv();
console.log(`Projet Supabase visé : ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname}`);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const user = (list?.users ?? []).find((u) => u.email === email);
if (!user) {
  console.error(`Aucun utilisateur avec l'email ${email}. Inscrivez-vous d'abord.`);
  process.exit(1);
}

const { error } = await admin.from("platform_admins").upsert(
  { user_id: user.id, role },
  { onConflict: "user_id" },
);
if (error) {
  console.error("Erreur:", error.message);
  process.exit(1);
}

console.log(`Administrateur activé : ${email} (rôle ${role}, id ${user.id})`);
