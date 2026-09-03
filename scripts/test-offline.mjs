// scripts/test-offline.mjs
// Vérifie la logique pure du socle hors-ligne (cache stale-while-revalidate,
// file de mutations différées, registre de rejeu, déclaration module).
// Node >= 23.6 exécute les fichiers .ts via le type stripping.

import {
  readCache,
  readCacheEntry,
  isCacheFresh,
  writeCache,
} from "../lib/offline/cache.ts";
import {
  enqueueSync,
  getSyncQueue,
  hasPendingSync,
  clearSyncQueue,
  registerReplayHandler,
  processSyncQueue,
} from "../lib/offline/syncQueue.ts";
import {
  declareOffline,
  getOfflineDeclarations,
  getOfflineDeclaration,
} from "../lib/offline/manifest.ts";

function createFakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const storage = createFakeStorage();
globalThis.window = {
  localStorage: storage,
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
};

let failures = 0;
function check(label, cond) {
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}`);
  if (!cond) failures++;
}

console.log("1. Cache stale-while-revalidate");
writeCache("fresh", { a: 1 }, 60_000);
check("lecture fraîche", readCache("fresh")?.a === 1);
check(
  "entry expose fetchedAt",
  typeof readCacheEntry("fresh")?.fetchedAt === "number",
);
check("isCacheFresh vrai", isCacheFresh("fresh", 60_000) === true);

// Entrée périmée (expiresAt passé) : purgée sans allowStale, servie avec.
storage.setItem(
  "assoshop:cache:stale",
  JSON.stringify({
    value: { a: 2 },
    expiresAt: Date.now() - 1_000,
    fetchedAt: Date.now() - 120_000,
  }),
);
check("périmée sans allowStale → null", readCache("stale") === null);
storage.setItem(
  "assoshop:cache:stale",
  JSON.stringify({
    value: { a: 2 },
    expiresAt: Date.now() - 1_000,
    fetchedAt: Date.now() - 120_000,
  }),
);
check(
  "périmée avec allowStale → servie",
  readCache("stale", { allowStale: true })?.a === 2,
);
check("isCacheFresh faux (vieux)", isCacheFresh("stale", 60_000) === false);

console.log("2. File de mutations différées + registre de rejeu");
enqueueSync({
  module: "finance",
  action: "declare_payment",
  payload: { amount: 100 },
});
enqueueSync({ module: "hub", action: "inconnu", payload: {} });
check("file = 2", getSyncQueue().length === 2);
check("hasPendingSync", hasPendingSync() === true);

const calls = [];
const unregister = registerReplayHandler(
  "finance",
  "declare_payment",
  async (p) => {
    calls.push(p);
    return "ok";
  },
);
const results = await processSyncQueue();
check(
  "rejeu via registre (finance ok)",
  results.find((r) => r.module === "finance")?.ok === true,
);
check("handler appelé avec payload", calls.length === 1 && calls[0].amount === 100);
check(
  "op sans handler non rejouée",
  results.find((r) => r.action === "inconnu")?.ok === false,
);
check("file restante = 1", getSyncQueue().length === 1);

unregister();
clearSyncQueue();
check("file purgée", getSyncQueue().length === 0);

console.log("3. Déclaration module");
declareOffline({
  module: "hub",
  cacheableReads: ["hub:bundle"],
  deferredMutations: [],
});
check("déclaration enregistrée", getOfflineDeclarations().length === 1);
check(
  "lookup module",
  getOfflineDeclaration("hub")?.cacheableReads[0] === "hub:bundle",
);

console.log(failures === 0 ? "\nOFFLINE SOCLE OK" : "\nOFFLINE SOCLE ÉCHEC");
process.exit(failures === 0 ? 0 : 1);
