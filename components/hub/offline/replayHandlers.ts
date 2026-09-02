// Répartiteur de rejeu des opérations hors-ligne (HUB-36).
// Chaque clé `module:action` rejoue l'opération sur le service réel.
// Importé uniquement côté client (utilisé par l'écran de synchronisation).

import { accountingService } from "@/services/accounting/accounting";
import { projectsService } from "@/services/community/projects";
import { meetingsService } from "@/services/community/meetings";
import { announcementsService } from "@/services/community/announcements";
import { documentsService } from "@/services/community/documents";
import { financialGroupsService } from "@/services/finance/financialGroups";
import { loansService } from "@/services/finance/loans";
import { solidarityService } from "@/services/finance/solidarity";
import type {
  CreateAccountingEntryPayload,
  ValidateAccountingEntryPayload,
} from "@/types/modules/accounting";
import type {
  ContributeToProjectPayload,
  CreateProjectPayload,
  PlanMeetingPayload,
  PublishAnnouncementPayload,
  UploadDocumentPayload,
} from "@/types/modules/community";
import type {
  CreateFinancialGroupPayload,
  DeclarePaymentPayload,
  DeclareClaimPayload,
  EnrollInsurancePayload,
  RequestLoanPayload,
} from "@/types/modules/finance";

type Handler = (payload: unknown) => Promise<unknown>;

export function buildReplayHandlers(): Record<string, Handler> {
  return {
    // Comptabilité
    "accounting:consolidate": (p) => {
      const { organizationId, movementIds } = p as {
        organizationId: string;
        movementIds: string[];
      };
      return accountingService.consolidate(organizationId, movementIds);
    },
    "accounting:create_entry": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & CreateAccountingEntryPayload;
      return accountingService.createEntry(organizationId, payload);
    },
    "accounting:reconcile_line": (p) => {
      const { organizationId, lineId, entryId } = p as {
        organizationId: string;
        lineId: string;
        entryId: string;
      };
      return accountingService.reconcileLine(organizationId, lineId, entryId);
    },
    "accounting:validate_entry": (p) => {
      const { organizationId, entryId, ...payload } = p as {
        organizationId: string;
        entryId: string;
      } & ValidateAccountingEntryPayload;
      return accountingService.validateEntry(organizationId, entryId, payload);
    },

    // Projets
    "projects:contribute": (p) => {
      const { organizationId, projectId, ...payload } = p as {
        organizationId: string;
        projectId: string;
      } & ContributeToProjectPayload;
      return projectsService.contribute(organizationId, projectId, payload);
    },
    "projects:create": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & CreateProjectPayload;
      return projectsService.createProject(organizationId, payload);
    },

    // Réunions
    "meetings:plan": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & PlanMeetingPayload;
      return meetingsService.planMeeting(organizationId, payload);
    },

    // Annonces
    "announcements:publish": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & PublishAnnouncementPayload;
      return announcementsService.publishAnnouncement(organizationId, payload);
    },

    // Documents
    "documents:upload": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & UploadDocumentPayload;
      return documentsService.uploadDocument(organizationId, payload);
    },

    // Groupes financiers
    "finance:create_group": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & CreateFinancialGroupPayload;
      return financialGroupsService.createFinancialGroup(
        organizationId,
        payload,
      );
    },
    "finance:declare_payment": (p) => {
      const { organizationId, groupId, ...payload } = p as {
        organizationId: string;
        groupId: string;
      } & DeclarePaymentPayload;
      return financialGroupsService.declarePayment(
        organizationId,
        groupId,
        payload,
      );
    },
    "finance:validate_payment": (p) => {
      const { organizationId, groupId, paymentId } = p as {
        organizationId: string;
        groupId: string;
        paymentId: string;
      };
      return financialGroupsService.validatePayment(
        organizationId,
        groupId,
        paymentId,
      );
    },

    // Prêts
    "loans:confirm_sponsor": (p) => {
      const { organizationId, loanId } = p as {
        organizationId: string;
        loanId: string;
      };
      return loansService.confirmSponsor(organizationId, loanId);
    },
    "loans:decide_loan": (p) => {
      const { organizationId, loanId, approved } = p as {
        organizationId: string;
        loanId: string;
        approved: boolean;
      };
      return loansService.decideLoan(organizationId, loanId, approved);
    },
    "loans:repay_installment": (p) => {
      const { organizationId, loanId, installmentId } = p as {
        organizationId: string;
        loanId: string;
        installmentId: string;
      };
      return loansService.repayInstallment(
        organizationId,
        loanId,
        installmentId,
      );
    },
    "loans:request_loan": (p) => {
      const { organizationId, groupId, ...payload } = p as {
        organizationId: string;
        groupId: string;
      } & RequestLoanPayload;
      return loansService.requestLoan(organizationId, groupId, payload);
    },

    // Solidarité / assurance
    "solidarity:decide_claim": (p) => {
      const { organizationId, claimId, approved } = p as {
        organizationId: string;
        claimId: string;
        approved: boolean;
      };
      return solidarityService.decideClaim(organizationId, claimId, approved);
    },
    "solidarity:declare_claim": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & DeclareClaimPayload;
      return solidarityService.declareClaim(organizationId, payload);
    },
    "solidarity:enroll_insurance": (p) => {
      const { organizationId, ...payload } = p as {
        organizationId: string;
      } & EnrollInsurancePayload;
      return solidarityService.enrollInsurance(organizationId, payload);
    },
  };
}
