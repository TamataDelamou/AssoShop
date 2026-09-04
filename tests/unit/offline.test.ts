// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCache,
  getCachedKeys,
  isCacheFresh,
  readCache,
  readCacheEntry,
  writeCache,
} from "@/lib/offline/cache";
import {
  clearSyncQueue,
  enqueueSync,
  getSyncQueue,
  hasPendingSync,
  processSyncQueue,
  registerReplayHandler,
} from "@/lib/offline/syncQueue";
import {
  declareOffline,
  getOfflineDeclaration,
  getOfflineDeclarations,
} from "@/lib/offline/manifest";

beforeEach(() => {
  window.localStorage.clear();
  clearSyncQueue();
});

describe("cache (stale-while-revalidate)", () => {
  it("écrit puis relit une entrée fraîche", () => {
    writeCache("fresh", { a: 1 }, 60_000);
    expect(readCache("fresh")).toEqual({ a: 1 });
    expect(typeof readCacheEntry("fresh")?.fetchedAt).toBe("number");
    expect(isCacheFresh("fresh", 60_000)).toBe(true);
  });

  it("purge l'entrée périmée sans allowStale, la sert avec", () => {
    const seedStale = () =>
      window.localStorage.setItem(
        "assoshop:cache:stale",
        JSON.stringify({
          value: { a: 2 },
          expiresAt: Date.now() - 1_000,
          fetchedAt: Date.now() - 120_000,
        }),
      );

    seedStale();
    expect(readCache("stale")).toBeNull();

    seedStale();
    expect(readCache("stale", { allowStale: true })).toEqual({ a: 2 });
    expect(isCacheFresh("stale", 60_000)).toBe(false);
  });

  it("liste et purge les clés", () => {
    writeCache("k1", 1);
    writeCache("k2", 2);
    expect(getCachedKeys().sort()).toEqual(["k1", "k2"]);
    clearCache("k1");
    expect(getCachedKeys()).toEqual(["k2"]);
    clearCache();
    expect(getCachedKeys()).toEqual([]);
  });
});

describe("file de sync + rejeu", () => {
  it("enfile, détecte et purge les opérations", () => {
    enqueueSync({
      module: "finance",
      action: "declare_payment",
      payload: { amount: 100 },
    });
    enqueueSync({ module: "hub", action: "unknown", payload: {} });
    expect(getSyncQueue()).toHaveLength(2);
    expect(hasPendingSync()).toBe(true);
    expect(hasPendingSync("finance")).toBe(true);
    expect(hasPendingSync("market")).toBe(false);

    clearSyncQueue();
    expect(getSyncQueue()).toHaveLength(0);
  });

  it("rejoue via le registre et conserve les opérations sans handler", async () => {
    const calls: unknown[] = [];
    const unregister = registerReplayHandler(
      "finance",
      "declare_payment",
      async (p) => {
        calls.push(p);
        return "ok";
      },
    );

    enqueueSync({
      module: "finance",
      action: "declare_payment",
      payload: { amount: 100 },
    });
    enqueueSync({ module: "hub", action: "unknown", payload: {} });

    const results = await processSyncQueue();
    expect(results.find((r) => r.module === "finance")?.ok).toBe(true);
    expect(calls).toEqual([{ amount: 100 }]);
    expect(results.find((r) => r.action === "unknown")?.ok).toBe(false);
    expect(getSyncQueue()).toHaveLength(1);

    unregister();
    clearSyncQueue();
  });
});

describe("déclaration de module", () => {
  it("enregistre et interroge la déclaration", () => {
    declareOffline({
      module: "test-module",
      cacheableReads: ["test:bundle"],
      deferredMutations: ["test:create"],
    });
    expect(getOfflineDeclarations().length).toBeGreaterThanOrEqual(1);
    expect(getOfflineDeclaration("test-module")?.cacheableReads).toEqual([
      "test:bundle",
    ]);
  });
});
