import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REF = "fpxgbykozzyybwhlltlo";
const BASE_URL = "http://localhost:3100";
const EMAIL = "e2e.org@assoshop.local";
const PASSWORD = "AssoShopE2E!2026";

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

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const b64url = (s) => Buffer.from(s, "utf8").toString("base64url");

function buildCookies(session) {
  const value = "base64-" + b64url(JSON.stringify(session));
  const key = `sb-${REF}-auth-token`;
  if (encodeURIComponent(value).length <= 3180) return [{ name: key, value }];
  throw new Error("session trop longue (chunking non géré ici)");
}

async function req(path, { method = "GET", cookie = "", body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non JSON */
  }
  return { status: res.status, json };
}

async function main() {
  console.log("1. Préparation utilisateur + session");
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of list?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
  const { data: created } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  const userId = created.user.id;
  const { data: signIn } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  const cookie = buildCookies(signIn.session)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  console.log("2. Attente du serveur");
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASE_URL + "/api/organizations");
      if (r.status === 200 || r.status === 401) {
        ready = true;
        break;
      }
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("serveur non démarré");

  console.log("3. Création d'une organisation");
  const createdOrg = await req("/api/organizations", {
    method: "POST",
    cookie,
    body: { name: "Org E2E", type: "association", city: "Conakry" },
  });
  const orgId = createdOrg.json?.id;
  if (createdOrg.status !== 201 || !orgId) {
    console.error("   échec création org:", createdOrg.status, JSON.stringify(createdOrg.json));
    process.exit(1);
  }
  console.log("   orgId:", orgId);

  console.log("4. Batterie GET (org-scoped)");
  const routes = [
    "/api/organizations",
    `/api/organizations/${orgId}`,
    `/api/organizations/${orgId}/members`,
    `/api/organizations/${orgId}/treasury`,
    `/api/organizations/${orgId}/contributions`,
    `/api/organizations/${orgId}/financial-groups`,
    `/api/organizations/${orgId}/loans`,
    `/api/organizations/${orgId}/projects`,
    `/api/organizations/${orgId}/meetings`,
    `/api/organizations/${orgId}/announcements`,
    `/api/organizations/${orgId}/documents`,
    `/api/organizations/${orgId}/social-cases`,
    `/api/organizations/${orgId}/solidarity`,
    `/api/organizations/${orgId}/accounting`,
    `/api/organizations/${orgId}/sponsorship`,
    `/api/organizations/${orgId}/tasks`,
    `/api/organizations/${orgId}/staff`,
    `/api/organizations/${orgId}/events`,
  ];

  const results = [];
  for (const path of routes) {
    const r = await req(path, { cookie });
    results.push({ path, status: r.status, error: r.json?.error ?? null });
  }

  let failures = 0;
  for (const r of results) {
    const ok = r.status < 400;
    if (!ok) failures++;
    console.log(
      `  [${ok ? "PASS" : "FAIL"}] GET ${r.path} (HTTP ${r.status})${r.error ? " — " + r.error : ""}`,
    );
  }

  console.log("5. Liaison nom -> auth.users (situation Pay + groupes Hub)");
  const linkResults = [];

  const group = await req(`/api/organizations/${orgId}/financial-groups`, {
    method: "POST",
    cookie,
    body: {
      name: "Groupe E2E",
      type: "savings",
      amount: 10000,
      periodicity: "weekly",
      max_members: 10,
    },
  });
  const groupId = group.json?.id;
  linkResults.push([
    "création groupe",
    group.status === 201 && !!groupId,
    group.status,
  ]);

  if (groupId) {
    const hub = await req("/api/hub/bundle", { cookie });
    linkResults.push([
      "hub groups_count = 1",
      hub.status === 200 && hub.json?.home?.groups_count === 1,
      hub.status,
    ]);

    const payment = await req(
      `/api/organizations/${orgId}/financial-groups/${groupId}/payments`,
      {
        method: "POST",
        cookie,
        body: {
          member_id: group.json?.members?.[0]?.id,
          amount: 10000,
          method: "cash",
        },
      },
    );
    linkResults.push([
      "déclaration paiement groupe",
      payment.status === 200,
      payment.status,
    ]);

    const hub2 = await req("/api/hub/bundle", { cookie });
    const hasSync = (hub2.json?.sync_queue ?? []).some(
      (s) => s.action === "Déclaration de paiement en espèces",
    );
    linkResults.push([
      "synchro paiement enregistrée",
      hub2.status === 200 && hasSync,
      hub2.status,
    ]);
  }

  const member = await req(`/api/organizations/${orgId}/members`, {
    method: "POST",
    cookie,
    body: { role: "member", email: EMAIL, user_id: userId },
  });
  const memberId = member.json?.id;
  linkResults.push([
    "création membre lié",
    member.status === 201 && !!memberId,
    member.status,
  ]);

  if (memberId) {
    const contrib = await req(`/api/organizations/${orgId}/contributions`, {
      method: "POST",
      cookie,
      body: {
        beneficiary_member_id: memberId,
        amount: 50000,
        method: "online",
      },
    });
    linkResults.push([
      "cotisation enregistrée",
      contrib.status === 201,
      contrib.status,
    ]);

    const pay = await req("/api/pay/bundle", { cookie });
    linkResults.push([
      "situation.contributions = 50000",
      pay.status === 200 && pay.json?.situation?.contributions === 50000,
      pay.status,
    ]);

    const beneficiaryName = member.json?.user?.name;
    const sc = await req(`/api/organizations/${orgId}/social-cases`, {
      method: "POST",
      cookie,
      body: {
        title: "Aide E2E",
        description: "",
        type: "other",
        beneficiary_name: beneficiaryName,
        target_amount: 20000,
        contributors_visible: true,
      },
    });
    const caseId = sc.json?.id;
    linkResults.push([
      "création cas social",
      sc.status === 201 && !!caseId,
      sc.status,
    ]);

    if (caseId) {
      const { data: dbCase } = await admin
        .from("social_cases")
        .select("beneficiary_user_id")
        .eq("id", caseId)
        .single();
      linkResults.push([
        "bénéficiaire lié au compte",
        dbCase?.beneficiary_user_id === userId,
        200,
      ]);

      await admin
        .from("social_cases")
        .update({ status: "disbursed", collected_amount: 20000 })
        .eq("id", caseId);

      const pay2 = await req("/api/pay/bundle", { cookie });
      linkResults.push([
        "situation.aids_received = 20000",
        pay2.status === 200 && pay2.json?.situation?.aids_received === 20000,
        pay2.status,
      ]);
    }
  }

  for (const [label, ok, status] of linkResults) {
    if (!ok) failures++;
    console.log(`  [${ok ? "PASS" : "FAIL"}] ${label} (HTTP ${status})`);
  }

  console.log("6. Nettoyage");
  await admin.from("organizations").delete().eq("id", orgId);
  await admin.auth.admin.deleteUser(userId);
  console.log("   org + utilisateur supprimés");

  console.log(failures === 0 ? "\nE2E ORG OK" : `\nE2E ORG ÉCHEC (${failures} route(s) en erreur)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERREUR:", e?.message ?? e);
  process.exit(1);
});
