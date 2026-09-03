// Gestionnaires de rejeu centralisés pour les mutations différées hors-ligne.
// Chaque `enqueueSync({ module, action, payload })` doit avoir ici un handler
// qui rejoue l'appel service à la reconnexion. Enregistré une fois au
// démarrage de l'app (OfflineSyncProvider).

import { registerReplayHandler } from "./syncQueue";
import { declareOffline } from "./manifest";
import { accountingService } from "@/services/accounting/accounting";
import { projectsService } from "@/services/community/projects";
import { meetingsService } from "@/services/community/meetings";
import { announcementsService } from "@/services/community/announcements";
import { documentsService } from "@/services/community/documents";
import { loansService } from "@/services/finance/loans";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { solidarityService } from "@/services/finance/solidarity";

export function registerAllReplayHandlers(): void {
  // Comptabilité
  registerReplayHandler("accounting", "consolidate", async (op) => {
    const { organizationId, movementIds } = op as {
      organizationId: string;
      movementIds: string[];
    };
    return accountingService.consolidate(organizationId, movementIds);
  });

  registerReplayHandler("accounting", "create_entry", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof accountingService.createEntry>[1];
    return accountingService.createEntry(organizationId, payload);
  });

  registerReplayHandler("accounting", "reconcile_line", async (op) => {
    const { organizationId, lineId, entryId } = op as {
      organizationId: string;
      lineId: string;
      entryId: string;
    };
    return accountingService.reconcileLine(organizationId, lineId, entryId);
  });

  registerReplayHandler("accounting", "validate_entry", async (op) => {
    const { organizationId, entryId, ...payload } = op as {
      organizationId: string;
      entryId: string;
    } & Parameters<typeof accountingService.validateEntry>[2];
    return accountingService.validateEntry(organizationId, entryId, payload);
  });

  // Projets
  registerReplayHandler("projects", "contribute", async (op) => {
    const { organizationId, projectId, ...payload } = op as {
      organizationId: string;
      projectId: string;
    } & Parameters<typeof projectsService.contribute>[2];
    return projectsService.contribute(organizationId, projectId, payload);
  });

  registerReplayHandler("projects", "create", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof projectsService.createProject>[1];
    return projectsService.createProject(organizationId, payload);
  });

  // Réunions
  registerReplayHandler("meetings", "plan", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof meetingsService.planMeeting>[1];
    return meetingsService.planMeeting(organizationId, payload);
  });

  // Annonces
  registerReplayHandler("announcements", "publish", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof announcementsService.publishAnnouncement>[1];
    return announcementsService.publishAnnouncement(organizationId, payload);
  });

  // Documents
  registerReplayHandler("documents", "upload", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof documentsService.uploadDocument>[1];
    return documentsService.uploadDocument(organizationId, payload);
  });

  // Prêts
  registerReplayHandler("loans", "confirm_sponsor", async (op) => {
    const { organizationId, loanId } = op as {
      organizationId: string;
      loanId: string;
    };
    return loansService.confirmSponsor(organizationId, loanId);
  });

  registerReplayHandler("loans", "decide_loan", async (op) => {
    const { organizationId, loanId, approved } = op as {
      organizationId: string;
      loanId: string;
      approved: boolean;
    };
    return loansService.decideLoan(organizationId, loanId, approved);
  });

  registerReplayHandler("loans", "repay_installment", async (op) => {
    const { organizationId, loanId, installmentId } = op as {
      organizationId: string;
      loanId: string;
      installmentId: string;
    };
    return loansService.repayInstallment(organizationId, loanId, installmentId);
  });

  registerReplayHandler("loans", "request_loan", async (op) => {
    const { organizationId, groupId, ...payload } = op as {
      organizationId: string;
      groupId: string;
    } & Parameters<typeof loansService.requestLoan>[2];
    return loansService.requestLoan(organizationId, groupId, payload);
  });

  // Groupes financiers
  registerReplayHandler("finance", "create_group", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof financialGroupsService.createFinancialGroup>[1];
    return financialGroupsService.createFinancialGroup(organizationId, payload);
  });

  registerReplayHandler("finance", "declare_payment", async (op) => {
    const { organizationId, groupId, ...payload } = op as {
      organizationId: string;
      groupId: string;
    } & Parameters<typeof financialGroupsService.declarePayment>[2];
    return financialGroupsService.declarePayment(
      organizationId,
      groupId,
      payload,
    );
  });

  registerReplayHandler("finance", "validate_payment", async (op) => {
    const { organizationId, groupId, paymentId } = op as {
      organizationId: string;
      groupId: string;
      paymentId: string;
    };
    return financialGroupsService.validatePayment(
      organizationId,
      groupId,
      paymentId,
    );
  });

  // Solidarité / assurance
  registerReplayHandler("solidarity", "decide_claim", async (op) => {
    const { organizationId, claimId, approved } = op as {
      organizationId: string;
      claimId: string;
      approved: boolean;
    };
    return solidarityService.decideClaim(organizationId, claimId, approved);
  });

  registerReplayHandler("solidarity", "declare_claim", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof solidarityService.declareClaim>[1];
    return solidarityService.declareClaim(organizationId, payload);
  });

  registerReplayHandler("solidarity", "enroll_insurance", async (op) => {
    const { organizationId, ...payload } = op as { organizationId: string } &
      Parameters<typeof solidarityService.enrollInsurance>[1];
    return solidarityService.enrollInsurance(organizationId, payload);
  });

  // Déclare les mutations différées par module (manifest hors-ligne).
  declareOffline({
    module: "accounting",
    cacheableReads: [],
    deferredMutations: [
      "consolidate",
      "create_entry",
      "reconcile_line",
      "validate_entry",
    ],
  });
  declareOffline({
    module: "projects",
    cacheableReads: [],
    deferredMutations: ["contribute", "create"],
  });
  declareOffline({
    module: "meetings",
    cacheableReads: [],
    deferredMutations: ["plan"],
  });
  declareOffline({
    module: "announcements",
    cacheableReads: [],
    deferredMutations: ["publish"],
  });
  declareOffline({
    module: "documents",
    cacheableReads: [],
    deferredMutations: ["upload"],
  });
  declareOffline({
    module: "loans",
    cacheableReads: [],
    deferredMutations: [
      "confirm_sponsor",
      "decide_loan",
      "repay_installment",
      "request_loan",
    ],
  });
  declareOffline({
    module: "finance",
    cacheableReads: [],
    deferredMutations: ["create_group", "declare_payment", "validate_payment"],
  });
  declareOffline({
    module: "solidarity",
    cacheableReads: [],
    deferredMutations: ["decide_claim", "declare_claim", "enroll_insurance"],
  });
}
