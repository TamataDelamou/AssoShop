"use client";

import { hubService } from "@/services/hub/hub";
import { HubBundle } from "@/types/modules/hub";
import { HUB_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

// Déclaration hors-ligne du module Hub : le bundle est consultable en cache,
// aucune mutation n'est différée (lecture seule ici).
declareOffline({
  module: "hub",
  cacheableReads: [`${HUB_CONFIG.CACHE_KEY_PREFIX}bundle`],
  deferredMutations: [],
});

function parseBundle(data: HubBundle): HubBundle {
  return {
    profile: {
      ...data.profile,
      joined_at: new Date(data.profile.joined_at),
    },
    home: data.home,
    memberships: data.memberships,
    favorites: data.favorites.map((f) => ({
      ...f,
      created_at: new Date(f.created_at),
    })),
    vault: data.vault.map((v) => ({
      ...v,
      uploaded_at: new Date(v.uploaded_at),
    })),
    kyc: data.kyc.map((k) => ({
      ...k,
      submitted_at: new Date(k.submitted_at),
      reviewed_at: k.reviewed_at ? new Date(k.reviewed_at) : null,
    })),
    notifications: data.notifications.map((n) => ({
      ...n,
      created_at: new Date(n.created_at),
    })),
    preferences: data.preferences,
    conversations: data.conversations.map((c) => ({
      ...c,
      updated_at: new Date(c.updated_at),
    })),
    referrals: data.referrals.map((r) => ({
      ...r,
      joined_at: new Date(r.joined_at),
    })),
    sync_queue: data.sync_queue.map((s) => ({
      ...s,
      created_at: new Date(s.created_at),
    })),
  };
}

export function useHub() {
  const { data, loading, error, fromCache, online, refetch } =
    useOfflineQuery<HubBundle>(
      `${HUB_CONFIG.CACHE_KEY_PREFIX}bundle`,
      () => hubService.getBundle(),
      { ttlMs: HUB_CONFIG.CACHE_TTL_MS, parse: parseBundle },
    );

  return { bundle: data, loading, error, fromCache, online, refetch };
}
