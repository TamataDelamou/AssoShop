const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/api-keys`,
  { headers: { Authorization: `Bearer ${token}` } },
);

if (!res.ok) {
  console.error(`HTTP ${res.status} : ${await res.text()}`);
  process.exit(1);
}

const keys = await res.json();
const anon = keys.find(
  (k) => k.name === "anon" || k.type === "publishable" || k.type === "anon",
);

if (!anon || !anon.api_key) {
  console.error(
    "Clé anon introuvable. Noms disponibles : " +
      JSON.stringify(keys.map((k) => `${k.name}/${k.type}`)),
  );
  process.exit(1);
}

console.log(anon.api_key);
