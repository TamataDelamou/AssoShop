"use client";

import { payService } from "@/services/pay/pay";
import { TransferRecipient } from "@/types/modules/pay";
import { PAY_CONFIG } from "@/utils/constants";
import { declareOffline, useOfflineQuery } from "@/lib/offline";

// Liste consultable hors-ligne ; le transfert lui-même exige une connexion.
declareOffline({
  module: PAY_CONFIG.SYNC_MODULE,
  cacheableReads: [`${PAY_CONFIG.CACHE_KEY_PREFIX}recipients`],
  deferredMutations: [],
});

// Destinataires possibles d'un transfert : membres des organisations de
// l'utilisateur. Chargée seulement quand le dialogue est ouvert.
export function usePayRecipients(enabled: boolean) {
  const { data, loading, error, refetch } = useOfflineQuery<TransferRecipient[]>(
    `${PAY_CONFIG.CACHE_KEY_PREFIX}recipients`,
    () => payService.getRecipients(),
    { ttlMs: PAY_CONFIG.CACHE_TTL_MS, enabled },
  );

  return { recipients: data ?? [], loading, error, refetch };
}
