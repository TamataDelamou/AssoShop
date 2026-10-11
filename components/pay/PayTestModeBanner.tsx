import { PAY_LABELS } from "@/utils/constants";
import { FlaskConical } from "lucide-react";

// Bandeau affiché tant que l'interrupteur serveur PAY_REAL_MONEY est
// désactivé : aucune opération en argent réel n'est ouverte.
export function PayTestModeBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-400"
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">{PAY_LABELS.TEST_MODE_BANNER}</span>
      <span className="hidden sm:inline">{PAY_LABELS.TEST_MODE_BANNER_HINT}</span>
    </div>
  );
}
