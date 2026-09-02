import {
  AnnouncementAudience,
  AttendanceStatus,
  ContributionMethod,
  ContributionStatus,
  DocumentCategory,
  MeetingStatus,
  MemberRole,
  MemberStatus,
  ProjectStatus,
  SocialCaseStatus,
  SocialCaseType,
} from "@/types/modules/community";
import {
  ClaimStatus,
  EngagementLevel,
  FinancialGroupStatus,
  FinancialGroupType,
  GroupMemberRole,
  GroupPaymentMethod,
  GroupPaymentStatus,
  GroupPeriodicity,
  InstallmentStatus,
  InsuranceEnrollmentStatus,
  LoanStatus,
} from "@/types/modules/finance";
import {
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingEntryType,
  TreasuryAccountType,
} from "@/types/modules/accounting";
import {
  DeliveryMethod,
  GroupOrderStatus,
  InvestmentProjectStatus,
  OrderStatus,
  ResellerApplicationStatus,
} from "@/types/modules/market";
import {
  ReconciliationStatus,
  TransactionStatus,
  TransactionType,
  WalletType,
} from "@/types/modules/pay";
import {
  FavoriteType,
  KycStatus,
  NotificationChannel,
  SyncStatus,
} from "@/types/modules/hub";
import {
  AuditSeverity,
  DisputeStatus,
  PlatformUserStatus,
  ReviewStatus,
} from "@/types/modules/admin";

// ============================================
// 1. MESSAGES D'AUTHENTIFICATION
// ============================================
export const AUTH_MESSAGES = {
  TITLE: "Bienvenue sur AssoShop",
  SUBTITLE: "Connectez-vous à votre écosystème communautaire",
  PHONE_PLACEHOLDER: "Votre numéro de téléphone",
  EMAIL_PLACEHOLDER: "Votre adresse e-mail",
  OTP_PLACEHOLDER: "Code à 6 chiffres",
  PIN_PLACEHOLDER: "Code PIN (4 chiffres)",
  PIN_UNLOCK_BUTTON: "Déverrouiller",
  LOGIN_BUTTON: "Recevoir le code",
  VERIFY_BUTTON: "Vérifier et se connecter",
  RESEND_OTP: "Renvoyer le code",
  RESEND_COUNTDOWN: "Renvoyer dans {seconds}s",
  SWITCH_TO_EMAIL: "Utiliser l'e-mail à la place",
  SWITCH_TO_PHONE: "Utiliser le téléphone à la place",
};

// ============================================
// 2. MESSAGES D'ERREUR ET DE VALIDATION
// ============================================
export const ERROR_MESSAGES = {
  INVALID_PHONE: "Numéro de téléphone invalide (ex: +224 600 00 00 00)",
  INVALID_EMAIL: "Adresse e-mail invalide",
  INVALID_OTP: "Code à 6 chiffres requis",
  INVALID_PIN: "Code PIN à 4 chiffres requis",
  PIN_INCORRECT: "Code PIN incorrect, veuillez réessayer",
  OTP_EXPIRED: "Le code a expiré, veuillez en demander un nouveau",
  OTP_INCORRECT: "Code incorrect, veuillez réessayer",
  NETWORK_ERROR: "Erreur réseau, vérifiez votre connexion",
  UNKNOWN_ERROR: "Une erreur est survenue, réessayez plus tard",
};

// ============================================
// 3. VALEURS NUMÉRIQUES ET DÉLAIS
// ============================================
export const AUTH_CONFIG = {
  OTP_LENGTH: 6,
  PIN_LENGTH: 4,
  RESEND_COOLDOWN_SECONDS: 60, // Délai avant de pouvoir renvoyer un OTP
  SESSION_TIMEOUT_MINUTES: 30, // Durée de validité de la session
};

// ============================================
// 4. LABELS GÉNÉRIQUES (réutilisables)
// ============================================
export const COMMON_LABELS = {
  CANCEL: "Annuler",
  CONFIRM: "Confirmer",
  SAVE: "Enregistrer",
  DELETE: "Supprimer",
  CLOSE: "Fermer",
  BACK: "Retour",
  NEXT: "Suivant",
  LOADING: "Chargement...",
  SIGN_OUT: "Déconnexion",
};

// ============================================
// 5. ORGANISATIONS (Module Community)
// ============================================
export const ORGANIZATION_LABELS = {
  PAGE_TITLE: "Associations",
  LIST_TITLE: "Liste des organisations",
  SEARCH_PLACEHOLDER: "Rechercher une association...",
  CREATE_BUTTON: "Créer",
  CREATE_DIALOG_TITLE: "Créer une association",
  NAME_LABEL: "Nom",
  TYPE_LABEL: "Type",
  CITY_LABEL: "Ville",
  OBJECT_LABEL: "Objet social",
  TYPE_PLACEHOLDER: "Choisir le type",
  STATUS_LABEL: "Statut",
  STATUS_ACTIVE: "Active",
  STATUS_PENDING: "En attente",
  MEMBERS_COUNT: "Membres",
  ACTIONS_LABEL: "Actions",
  VIEW_BUTTON: "Membres",
  CONTRIBUTIONS_BUTTON: "Cotisations",
  SOCIAL_CASES_BUTTON: "Cas sociaux",
  MEETINGS_BUTTON: "Réunions",
  ANNOUNCEMENTS_BUTTON: "Annonces",
  DOCUMENTS_BUTTON: "Documents",
  PROJECTS_BUTTON: "Projets",
  FINANCE_BUTTON: "Finance",
  FINANCE_LOANS_BUTTON: "Prêts",
  FINANCE_SOLIDARITY_BUTTON: "Solidarité",
  ACCOUNTING_BUTTON: "Comptabilité",
  EDIT_BUTTON: "Modifier",
  NO_DATA: "Aucune association trouvée",
  NO_SEARCH_RESULTS: "Aucun résultat pour cette recherche",
  CREATE_SUCCESS: "Association créée avec succès",
  CREATE_ERROR: "Erreur lors de la création",
  LOADING: "Chargement des associations...",
  BACK_TO_ORGANIZATIONS: "Retour aux associations",
  MISSING_ORG_ID: "ID d'organisation manquant",
};

// Types d'organisations (valeurs métier, centralisées)
export const ORGANIZATION_TYPES = [
  { value: "association", label: "Association" },
  { value: "union", label: "Union" },
  { value: "federation", label: "Fédération" },
  { value: "confederation", label: "Confédération" },
  { value: "ong", label: "ONG" },
  { value: "cooperative", label: "Coopérative" },
  { value: "reseau_national", label: "Réseau national" },
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]["value"];

// ============================================
// 6. MEMBRES (Module Community)
// ============================================
export const MEMBER_LABELS = {
  PAGE_TITLE: "Membres",
  SEARCH_PLACEHOLDER: "Rechercher un membre...",
  ADD_BUTTON: "Ajouter un membre",
  STATUS_LABEL: "Statut",
  ROLE_LABEL: "Rôle",
  JOINED_AT: "Date d'adhésion",
  ACTIONS_LABEL: "Actions",
  VIEW_BUTTON: "Voir",
  EDIT_BUTTON: "Modifier",
  REMOVE_BUTTON: "Retirer",
  NO_DATA: "Aucun membre trouvé",
  ADD_MEMBER_TITLE: "Ajouter un membre",
  ADD_MEMBER_DESCRIPTION: "Invitez un utilisateur à rejoindre l'association",
  EMAIL_PLACEHOLDER: "Email de l'utilisateur",
  PHONE_PLACEHOLDER: "Numéro de téléphone",
  ROLE_SELECT_PLACEHOLDER: "Choisir un rôle",
  SUCCESS_ADD: "Membre ajouté avec succès",
  ERROR_ADD: "Erreur lors de l'ajout",
  SUCCESS_UPDATE: "Membre mis à jour",
  ERROR_UPDATE: "Erreur lors de la mise à jour",
  CONFIRM_REMOVE: "Êtes-vous sûr de vouloir retirer ce membre ?",
};

export const MEMBER_ROLES: { value: MemberRole; label: string }[] = [
  { value: MemberRole.PRESIDENT, label: "Président" },
  { value: MemberRole.VICE_PRESIDENT, label: "Vice-Président" },
  { value: MemberRole.SECRETARY, label: "Secrétaire" },
  { value: MemberRole.VICE_SECRETARY, label: "Vice-Secrétaire" },
  { value: MemberRole.TREASURER, label: "Trésorier" },
  { value: MemberRole.VICE_TREASURER, label: "Vice-Trésorier" },
  { value: MemberRole.AUDITOR, label: "Commissaire aux comptes" },
  { value: MemberRole.COMMITTEE_HEAD, label: "Responsable de commission" },
  { value: MemberRole.MEMBER, label: "Membre" },
];

export const MEMBER_STATUS_OPTIONS: {
  value: MemberStatus;
  label: string;
  color: string;
}[] = [
  {
    value: MemberStatus.PENDING,
    label: "En attente",
    color: "bg-yellow-500/20 text-yellow-500",
  },
  {
    value: MemberStatus.ACTIVE,
    label: "Actif",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: MemberStatus.INACTIVE,
    label: "Inactif",
    color: "bg-gray-500/20 text-gray-500",
  },
  {
    value: MemberStatus.EXPELLED,
    label: "Exclu",
    color: "bg-red-500/20 text-red-500",
  },
  {
    value: MemberStatus.LEFT,
    label: "Parti",
    color: "bg-blue-500/20 text-blue-500",
  },
];

// ============================================
// 7. COTISATIONS (Module Community)
// ============================================
export const CONTRIBUTION_LABELS = {
  PAGE_TITLE: "Cotisations",
  SEARCH_PLACEHOLDER: "Rechercher un membre...",
  STATUS_FILTER_PLACEHOLDER: "Tous les statuts",
  PAY_BUTTON: "Encaisser une cotisation",
  PAY_SHORT: "Encaisser",
  VALIDATE_BUTTON: "Valider",
  REJECT_BUTTON: "Rejeter",
  MEMBER_LABEL: "Membre",
  AMOUNT_LABEL: "Montant",
  PERIOD_LABEL: "Échéance",
  METHOD_LABEL: "Méthode",
  STATUS_LABEL: "Statut",
  PAYER_LABEL: "Payeur",
  PAID_AT_LABEL: "Payé le",
  ACTIONS_LABEL: "Actions",
  NO_DATA: "Aucune cotisation trouvée",
  LOAD_ERROR: "Erreur lors du chargement des cotisations",
  SUMMARY_DUE: "À payer",
  SUMMARY_PENDING: "En attente",
  SUMMARY_COLLECTED: "Encaissé",
  // Dialogue d'encaissement
  PAY_DIALOG_TITLE: "Encaisser une cotisation",
  BENEFICIARY_LABEL: "Bénéficiaire",
  BENEFICIARY_PLACEHOLDER: "Choisir un membre",
  CASH_PENDING_NOTE:
    "Le paiement en espèces restera en attente de validation par le trésorier.",
  PAY_SUCCESS: "Cotisation enregistrée avec succès",
  PAY_ERROR: "Erreur lors de l'enregistrement de la cotisation",
  // Dialogue de validation
  VALIDATE_DIALOG_TITLE: "Valider un paiement en espèces",
  VALIDATOR_LABEL: "Validateur",
  VALIDATOR_PLACEHOLDER: "Votre nom",
  DOUBLE_VALIDATION_NOTE:
    "Montant supérieur au seuil : double validation requise (président + trésorier).",
  DOUBLE_VALIDATION_CONFIRM: "Je confirme en tant que second validateur",
  VALIDATE_SUCCESS: "Paiement validé avec succès",
  VALIDATE_ERROR: "Erreur lors de la validation",
  REJECT_SUCCESS: "Paiement rejeté",
  REJECT_ERROR: "Erreur lors du rejet",
};

export const CONTRIBUTION_STATUS_OPTIONS: {
  value: ContributionStatus;
  label: string;
  color: string;
}[] = [
  {
    value: ContributionStatus.DUE,
    label: "À payer",
    color: "bg-yellow-500/20 text-yellow-500",
  },
  {
    value: ContributionStatus.PENDING,
    label: "En attente",
    color: "bg-orange-500/20 text-orange-500",
  },
  {
    value: ContributionStatus.PAID,
    label: "Payée",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: ContributionStatus.OVERDUE,
    label: "En retard",
    color: "bg-red-500/20 text-red-500",
  },
  {
    value: ContributionStatus.REJECTED,
    label: "Rejetée",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const CONTRIBUTION_METHOD_OPTIONS: {
  value: ContributionMethod;
  label: string;
}[] = [
  { value: ContributionMethod.ONLINE, label: "En ligne (AssoShop Pay)" },
  { value: ContributionMethod.CASH, label: "En espèces" },
];

export const CONTRIBUTION_CONFIG = {
  CURRENCY: "GNF",
  DEFAULT_AMOUNT: 50000,
  // RG-C04 : double validation (président + trésorier) au-delà du seuil.
  DOUBLE_VALIDATION_THRESHOLD: 5000000,
};

export const CONTRIBUTION_MESSAGES = {
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
  MEMBER_REQUIRED: "Veuillez sélectionner un bénéficiaire",
  VALIDATOR_REQUIRED: "Veuillez indiquer le nom du validateur",
  SECOND_VALIDATION_REQUIRED: "Double validation requise pour ce montant",
};

// ============================================
// 8. CAS SOCIAUX (Module Community)
// ============================================
export const SOCIAL_CASE_LABELS = {
  PAGE_TITLE: "Cas sociaux",
  SEARCH_PLACEHOLDER: "Rechercher un cas social...",
  STATUS_FILTER_PLACEHOLDER: "Tous les statuts",
  DECLARE_BUTTON: "Déclarer un cas social",
  DETAILS_BUTTON: "Suivi",
  VALIDATE_BUTTON: "Valider",
  REJECT_BUTTON: "Rejeter",
  CONTRIBUTE_BUTTON: "Contribuer",
  DISBURSE_BUTTON: "Décaisser",
  TITLE_LABEL: "Titre",
  BENEFICIARY_LABEL: "Bénéficiaire",
  TYPE_LABEL: "Type",
  STATUS_LABEL: "Statut",
  TARGET_LABEL: "Objectif",
  COLLECTED_LABEL: "Collecté",
  PROGRESS_LABEL: "Progression",
  COMMITTEE_NOTE_LABEL: "Décision du comité",
  CONTRIBUTORS_LABEL: "Contributeurs",
  CREATED_AT_LABEL: "Déclaré le",
  ACTIONS_LABEL: "Actions",
  NO_DATA: "Aucun cas social trouvé",
  LOAD_ERROR: "Erreur lors du chargement des cas sociaux",
  SUMMARY_ACTIVE: "Collectes en cours",
  SUMMARY_FUNDED: "Objectifs atteints",
  SUMMARY_COLLECTED: "Total collecté",
  // Dialogue de déclaration
  DECLARE_DIALOG_TITLE: "Déclarer un cas social",
  DESCRIPTION_LABEL: "Description",
  TITLE_PLACEHOLDER: "Ex : soutien médical",
  DESCRIPTION_PLACEHOLDER: "Décrivez la situation...",
  BENEFICIARY_PLACEHOLDER: "Nom du bénéficiaire",
  VISIBILITY_LABEL: "Afficher la liste des contributeurs",
  VISIBILITY_HELP: "Selon la confidentialité définie par l'association",
  DECLARE_SUCCESS: "Cas social déclaré et soumis au comité",
  DECLARE_ERROR: "Erreur lors de la déclaration",
  // Dialogue de validation
  VALIDATE_DIALOG_TITLE: "Étude du cas par le comité",
  COMMITTEE_NOTE_PLACEHOLDER: "Motif ou décision motivée",
  VALIDATE_SUCCESS: "Cas approuvé, la collecte est ouverte",
  VALIDATE_ERROR: "Erreur lors de la validation",
  REJECT_SUCCESS: "Cas rejeté",
  REJECT_ERROR: "Erreur lors du rejet",
  // Détails / suivi
  DETAILS_DIALOG_TITLE: "Suivi du cas social",
  CONTRIBUTORS_HIDDEN: "Liste des contributeurs masquée (confidentialité)",
  NO_CONTRIBUTORS: "Aucune contribution pour le moment",
  FUNDED_NOTE: "Objectif atteint : le décaissement est autorisé.",
  DISBURSE_SUCCESS: "Aide décaissée",
  DISBURSE_ERROR: "Erreur lors du décaissement",
  // Dialogue de contribution
  CONTRIBUTE_DIALOG_TITLE: "Contribuer au cas social",
  CONTRIBUTOR_NAME_LABEL: "Votre nom",
  CONTRIBUTOR_NAME_PLACEHOLDER: "Nom du contributeur",
  ANONYMOUS_LABEL: "Contribuer anonymement",
  CONTRIBUTE_SUCCESS: "Contribution enregistrée avec succès",
  CONTRIBUTE_ERROR: "Erreur lors de la contribution",
};

export const SOCIAL_CASE_STATUS_OPTIONS: {
  value: SocialCaseStatus;
  label: string;
  color: string;
}[] = [
  {
    value: SocialCaseStatus.SUBMITTED,
    label: "Soumise",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: SocialCaseStatus.UNDER_REVIEW,
    label: "En étude",
    color: "bg-yellow-500/20 text-yellow-500",
  },
  {
    value: SocialCaseStatus.APPROVED,
    label: "En collecte",
    color: "bg-orange-500/20 text-orange-500",
  },
  {
    value: SocialCaseStatus.FUNDED,
    label: "Objectif atteint",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: SocialCaseStatus.DISBURSED,
    label: "Décaissé",
    color: "bg-emerald-500/20 text-emerald-500",
  },
  {
    value: SocialCaseStatus.REJECTED,
    label: "Rejeté",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const SOCIAL_CASE_TYPES: { value: SocialCaseType; label: string }[] = [
  { value: SocialCaseType.ILLNESS, label: "Maladie" },
  { value: SocialCaseType.DEATH, label: "Décès" },
  { value: SocialCaseType.DISASTER, label: "Sinistre" },
  { value: SocialCaseType.OTHER, label: "Autre" },
];

export const SOCIAL_CASE_CONFIG = {
  CURRENCY: "GNF",
  DEFAULT_TARGET: 1000000,
};

export const SOCIAL_CASE_MESSAGES = {
  TITLE_REQUIRED: "Veuillez indiquer un titre",
  BENEFICIARY_REQUIRED: "Veuillez indiquer le nom du bénéficiaire",
  AMOUNT_REQUIRED: "Veuillez indiquer un objectif valide",
  NOTE_REQUIRED: "Veuillez motiver la décision du comité",
  CONTRIBUTOR_REQUIRED: "Veuillez indiquer le nom du contributeur",
  CONTRIBUTION_AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
};

// ============================================
// 9. RÉUNIONS (Module Community)
// ============================================
export const MEETING_LABELS = {
  PAGE_TITLE: "Réunions",
  SEARCH_PLACEHOLDER: "Rechercher une réunion...",
  STATUS_FILTER_PLACEHOLDER: "Tous les statuts",
  PLAN_BUTTON: "Planifier une réunion",
  PLAN_SHORT: "Planifier",
  DETAILS_BUTTON: "Suivi",
  MINUTES_BUTTON: "Compte-rendu",
  TITLE_LABEL: "Titre",
  DATE_LABEL: "Date",
  LOCATION_LABEL: "Lieu",
  AGENDA_LABEL: "Ordre du jour",
  STATUS_LABEL: "Statut",
  ACTIONS_LABEL: "Actions",
  ATTENDEES_LABEL: "Participants",
  NO_ATTENDEES: "Aucun participant enregistré",
  REMINDER_LABEL: "Activer le rappel",
  MINUTES_EMPTY: "Aucun compte-rendu rédigé pour cette réunion",
  NO_DATA: "Aucune réunion trouvée",
  LOAD_ERROR: "Erreur lors du chargement des réunions",
  OFFLINE_NOTICE: "Hors ligne — données issues du cache local",
  SYNC_PENDING_NOTICE: "Création en attente de synchronisation",
  SUMMARY_PLANNED: "À venir",
  SUMMARY_COMPLETED: "Tenues",
  SUMMARY_CANCELLED: "Annulées",
  // Dialogue de planification
  PLAN_DIALOG_TITLE: "Planifier une réunion",
  TITLE_PLACEHOLDER: "Ex : Assemblée générale",
  LOCATION_PLACEHOLDER: "Ex : Siège de l'association",
  AGENDA_PLACEHOLDER: "Points à aborder, séparés par des lignes",
  PLAN_SUCCESS: "Réunion planifiée avec succès",
  PLAN_ERROR: "Erreur lors de la planification",
  // Dialogue de compte-rendu
  MINUTES_DIALOG_TITLE: "Compte-rendu de réunion",
  MINUTES_LABEL: "Compte-rendu",
  MINUTES_PLACEHOLDER: "Rédigez le compte-rendu ou collez vos notes...",
  SAVE_MINUTES_BUTTON: "Enregistrer",
  MINUTES_SUCCESS: "Compte-rendu enregistré",
  MINUTES_ERROR: "Erreur lors de l'enregistrement",
  // Pointage (QR / présences)
  CHECK_IN_LABEL: "Pointage des présences",
  QR_PLACEHOLDER: "QR Code d'invitation",
  CHECK_IN_SUCCESS: "Présence mise à jour",
  CHECK_IN_ERROR: "Erreur lors du pointage",
  INVITE_TOKEN_LABEL: "Jeton d'invitation",
};

export const MEETING_STATUS_OPTIONS: {
  value: MeetingStatus;
  label: string;
  color: string;
}[] = [
  {
    value: MeetingStatus.PLANNED,
    label: "Planifiée",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: MeetingStatus.COMPLETED,
    label: "Tenue",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: MeetingStatus.CANCELLED,
    label: "Annulée",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const ATTENDANCE_STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
  color: string;
}[] = [
  {
    value: AttendanceStatus.INVITED,
    label: "Invité",
    color: "bg-gray-500/20 text-gray-500",
  },
  {
    value: AttendanceStatus.PRESENT,
    label: "Présent",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: AttendanceStatus.ABSENT,
    label: "Absent",
    color: "bg-red-500/20 text-red-500",
  },
  {
    value: AttendanceStatus.EXCUSED,
    label: "Excusé",
    color: "bg-yellow-500/20 text-yellow-500",
  },
];

export const MEETING_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour la liste
  CACHE_KEY_PREFIX: "meetings:",
  SYNC_MODULE: "meetings",
};

export const MEETING_MESSAGES = {
  TITLE_REQUIRED: "Veuillez indiquer un titre",
  DATE_REQUIRED: "Veuillez indiquer une date",
  LOCATION_REQUIRED: "Veuillez indiquer un lieu",
  MINUTES_REQUIRED: "Veuillez rédiger un compte-rendu",
};

export const AI_LABELS = {
  ASSIST_BUTTON: "Assister par l'IA",
  GENERATING: "Génération en cours...",
  DRAFT_NOTICE: "Brouillon généré par l'assistant IA — à relire et valider.",
  ERROR: "L'assistant IA est indisponible pour le moment",
};

// ============================================
// 10. ANNONCES (Module Community)
// ============================================
export const ANNOUNCEMENT_LABELS = {
  PAGE_TITLE: "Annonces",
  SEARCH_PLACEHOLDER: "Rechercher une annonce...",
  PUBLISH_BUTTON: "Publier une annonce",
  TITLE_LABEL: "Titre",
  CONTENT_LABEL: "Message",
  AUDIENCE_LABEL: "Diffusion",
  PINNED_LABEL: "Épingler en tête de fil",
  RELAYED_FROM_PREFIX: "Relayé depuis",
  PINNED_INDICATOR: "Épinglée",
  NO_DATA: "Aucune annonce trouvée",
  LOAD_ERROR: "Erreur lors du chargement des annonces",
  OFFLINE_NOTICE: "Hors ligne — fil issu du cache local",
  SYNC_PENDING_NOTICE: "Publication en attente de synchronisation",
  // Dialogue de publication
  PUBLISH_DIALOG_TITLE: "Publier une annonce",
  TITLE_PLACEHOLDER: "Ex : Assemblée générale reportée",
  CONTENT_PLACEHOLDER:
    "Rédigez votre message ou collez vos notes, puis utilisez l'assistant IA.",
  AFFILIATES_NOTE:
    "Cette annonce sera automatiquement relayée aux associations affiliées.",
  PUBLISH_SUCCESS: "Annonce publiée avec succès",
  PUBLISH_ERROR: "Erreur lors de la publication",
};

export const ANNOUNCEMENT_AUDIENCE_OPTIONS: {
  value: AnnouncementAudience;
  label: string;
  color: string;
}[] = [
  {
    value: AnnouncementAudience.MEMBERS,
    label: "Membres de l'association",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: AnnouncementAudience.AFFILIATES,
    label: "Membres + affiliées",
    color: "bg-purple-500/20 text-purple-500",
  },
];

export const ANNOUNCEMENT_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour le fil
  CACHE_KEY_PREFIX: "announcements:",
  SYNC_MODULE: "announcements",
  DEFAULT_AUTHOR: "Bureau de l'association",
};

export const ANNOUNCEMENT_MESSAGES = {
  TITLE_REQUIRED: "Veuillez indiquer un titre",
  CONTENT_REQUIRED: "Veuillez rédiger un message",
};

// ============================================
// 11. DOCUMENTS (Module Community)
// ============================================
export const DOCUMENT_LABELS = {
  PAGE_TITLE: "Documents",
  SEARCH_PLACEHOLDER: "Rechercher un document...",
  CATEGORY_FILTER_PLACEHOLDER: "Toutes les catégories",
  UPLOAD_BUTTON: "Importer un document",
  NAME_LABEL: "Nom",
  DESCRIPTION_LABEL: "Description",
  CATEGORY_LABEL: "Catégorie",
  FILE_LABEL: "Fichier",
  TYPE_LABEL: "Type",
  SIZE_LABEL: "Taille",
  UPLOADED_BY_LABEL: "Importé par",
  DATE_LABEL: "Date",
  ACTIONS_LABEL: "Actions",
  DOWNLOAD_BUTTON: "Télécharger",
  NO_DATA: "Aucun document trouvé",
  LOAD_ERROR: "Erreur lors du chargement des documents",
  OFFLINE_NOTICE: "Hors ligne — liste issue du cache local",
  SYNC_PENDING_NOTICE: "Import en attente de synchronisation",
  SUMMARY_TOTAL: "Documents",
  SUMMARY_SIZE: "Taille totale",
  SUMMARY_CATEGORIES: "Catégories",
  UPLOAD_DIALOG_TITLE: "Importer un document",
  NAME_PLACEHOLDER: "Ex : Statuts de l'association",
  DESCRIPTION_PLACEHOLDER: "Description ou notes sur ce document...",
  FILE_PLACEHOLDER: "Choisir un fichier",
  NO_FILE_SELECTED: "Aucun fichier sélectionné",
  UPLOAD_SUCCESS: "Document importé avec succès",
  UPLOAD_ERROR: "Erreur lors de l'import",
};

export const DOCUMENT_CATEGORY_OPTIONS: {
  value: DocumentCategory;
  label: string;
  color: string;
}[] = [
  {
    value: DocumentCategory.STATUTES,
    label: "Statuts",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: DocumentCategory.INTERNAL_RULES,
    label: "Règlement intérieur",
    color: "bg-purple-500/20 text-purple-500",
  },
  {
    value: DocumentCategory.MEETING_MINUTES,
    label: "Procès-verbaux",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: DocumentCategory.FINANCIAL,
    label: "Documents financiers",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: DocumentCategory.OTHER,
    label: "Autres",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const DOCUMENT_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour la liste
  CACHE_KEY_PREFIX: "documents:",
  SYNC_MODULE: "documents",
  DEFAULT_UPLOADER: "Bureau de l'association",
};

export const DOCUMENT_MESSAGES = {
  NAME_REQUIRED: "Veuillez indiquer un nom",
  FILE_REQUIRED: "Veuillez sélectionner un fichier",
};

// ============================================
// 12. PROJETS (Module Community)
// ============================================
export const PROJECT_LABELS = {
  PAGE_TITLE: "Projets",
  SEARCH_PLACEHOLDER: "Rechercher un projet...",
  STATUS_FILTER_PLACEHOLDER: "Tous les statuts",
  CREATE_BUTTON: "Créer un projet",
  CONTRIBUTE_BUTTON: "Contribuer",
  DETAILS_BUTTON: "Détails",
  NAME_LABEL: "Nom",
  DESCRIPTION_LABEL: "Description",
  GOAL_LABEL: "Objectif",
  RAISED_LABEL: "Collecté",
  PROGRESS_LABEL: "Progression",
  STATUS_LABEL: "Statut",
  ACTIONS_LABEL: "Actions",
  CONTRIBUTIONS_LABEL: "Contributions",
  NO_CONTRIBUTIONS: "Aucune contribution pour le moment",
  RELAYED_FROM_PREFIX: "Relayé depuis",
  RELAYED_TO_AFFILIATES: "Diffusé aux associations affiliées",
  NO_DATA: "Aucun projet trouvé",
  LOAD_ERROR: "Erreur lors du chargement des projets",
  OFFLINE_NOTICE: "Hors ligne — données issues du cache local",
  SYNC_PENDING_NOTICE: "Création en attente de synchronisation",
  CONTRIBUTE_SYNC_PENDING: "Contribution en attente de synchronisation",
  SUMMARY_IN_PROGRESS: "En cours",
  SUMMARY_COMPLETED: "Terminés",
  SUMMARY_RAISED: "Total collecté",
  // Dialogue de création
  CREATE_DIALOG_TITLE: "Créer un projet",
  NAME_PLACEHOLDER: "Ex : Forage d'un puits",
  DESCRIPTION_PLACEHOLDER: "Décrivez l'objectif du projet...",
  GOAL_PLACEHOLDER: "Montant à atteindre",
  RELAY_CHECKBOX: "Diffuser aux associations affiliées",
  CREATE_SUCCESS: "Projet créé avec succès",
  CREATE_ERROR: "Erreur lors de la création",
  // Dialogue de contribution
  CONTRIBUTE_DIALOG_TITLE: "Contribuer au projet",
  CONTRIBUTOR_LABEL: "Nom du contributeur",
  AMOUNT_LABEL: "Montant",
  ANONYMOUS_LABEL: "Contribution anonyme",
  CONTRIBUTE_SUCCESS: "Contribution enregistrée",
  CONTRIBUTE_ERROR: "Erreur lors de la contribution",
};

export const PROJECT_STATUS_OPTIONS: {
  value: ProjectStatus;
  label: string;
  color: string;
}[] = [
  {
    value: ProjectStatus.IN_PROGRESS,
    label: "En cours",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: ProjectStatus.COMPLETED,
    label: "Terminé",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: ProjectStatus.CANCELLED,
    label: "Annulé",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const PROJECT_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour la liste
  CACHE_KEY_PREFIX: "projects:",
  SYNC_MODULE: "projects",
};

export const PROJECT_MESSAGES = {
  NAME_REQUIRED: "Veuillez indiquer un nom",
  GOAL_REQUIRED: "Veuillez indiquer un objectif valide",
  CONTRIBUTOR_REQUIRED: "Veuillez indiquer le nom du contributeur",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
};

// ============================================
// 13. FINANCE (Module Finance — Groupes financiers)
// ============================================
export const FINANCE_LABELS = {
  PAGE_TITLE: "Groupes financiers",
  SEARCH_PLACEHOLDER: "Rechercher un groupe...",
  TYPE_FILTER_PLACEHOLDER: "Tous les types",
  CREATE_BUTTON: "Créer un groupe",
  DETAILS_BUTTON: "Détails",
  NAME_LABEL: "Nom",
  TYPE_LABEL: "Type",
  STATUS_LABEL: "Statut",
  AMOUNT_LABEL: "Montant",
  PERIODICITY_LABEL: "Périodicité",
  MAX_MEMBERS_LABEL: "Membres max",
  GOAL_LABEL: "Objectif",
  INTEREST_RATE_LABEL: "Taux d'intérêt (prêts)",
  MEMBERS_LABEL: "Membres",
  RAISED_LABEL: "Collecté",
  PROGRESS_LABEL: "Avancement",
  PAYMENTS_LABEL: "Versements",
  NO_PAYMENTS: "Aucun versement pour le moment",
  NO_MEMBERS: "Aucun membre",
  NO_DATA: "Aucun groupe trouvé",
  LOAD_ERROR: "Erreur lors du chargement des groupes",
  OFFLINE_NOTICE: "Hors ligne — données issues du cache local",
  SYNC_PENDING_NOTICE: "Création en attente de synchronisation",
  SUMMARY_TOTAL: "Groupes",
  SUMMARY_RAISED: "Total collecté",
  SUMMARY_MEMBERS: "Membres actifs",
  CREATE_DIALOG_TITLE: "Créer un groupe financier",
  NAME_PLACEHOLDER: "Ex : Tontine du marché",
  AMOUNT_PLACEHOLDER: "Montant par versement",
  MAX_MEMBERS_PLACEHOLDER: "Ex : 20",
  GOAL_PLACEHOLDER: "Objectif financier",
  INTEREST_RATE_PLACEHOLDER: "Ex : 5",
  CREATE_SUCCESS: "Groupe créé avec succès",
  CREATE_ERROR: "Erreur lors de la création",
  // Analyse IA (FIN-29, RG-F09)
  AI_RISK_BUTTON: "Analyser les membres",
  AI_RISK_TITLE: "Membres à risque",
  AI_RISK_NONE: "Aucun membre à risque détecté.",
  AI_RISK_NOTICE: "Analyse indicative — aucune décision automatique (RG-F09).",
  // Versements (FIN-16 → 19)
  DECLARE_PAYMENT_BUTTON: "Déclarer un versement",
  VALIDATE_BUTTON: "Valider",
  DECLARE_DIALOG_TITLE: "Déclarer un versement",
  PAYER_LABEL: "Payeur",
  BENEFICIARY_LABEL: "Bénéficiaire (optionnel)",
  BENEFICIARY_PLACEHOLDER: "Pour soi-même",
  METHOD_LABEL: "Moyen de paiement",
  METHOD_NOTE_CASH:
    "Les versements en espèces restent « en attente » jusqu'à validation (RG-F05).",
  SYNC_PENDING_PAYMENT: "Versement en attente de synchronisation",
  SYNC_PENDING_VALIDATION: "Validation en attente de synchronisation",
  DECLARE_SUCCESS: "Versement enregistré",
  DECLARE_ERROR: "Erreur lors du versement",
  VALIDATE_ERROR: "Erreur lors de la validation",
  // Calendrier des tours (FIN-14)
  TURNS_TITLE: "Calendrier des tours",
  TURNS_EMPTY: "Aucun tour planifié",
  TURN_RECEIVED: "Reçu",
  TURN_PENDING: "À venir",
  PAYMENT_FOR: "pour",
  // Création tontine (FIN-3)
  START_DATE_LABEL: "Date de début",
  TURN_ORDER_LABEL: "Ordre de passage (un nom par ligne)",
  TURN_ORDER_PLACEHOLDER: "Mamadou Sow\nAminata Diallo",
  // Administration du groupe (FIN-21, FIN-30, FIN-31, FIN-32)
  HISTORY_BUTTON: "Historique",
  STATS_BUTTON: "Statistiques",
  SETTINGS_BUTTON: "Paramètres",
  CLOSE_BUTTON: "Clôturer le cycle",
  TRANSACTIONS_TITLE: "Historique des transactions",
  TRANSACTIONS_EMPTY: "Aucune transaction",
  STATS_TITLE: "Statistiques du groupe",
  STATS_REGULARITY: "Régularité",
  STATS_PENDING: "En attente",
  STATS_CONFIRMED: "Confirmés",
  STATS_TURNS: "Tours reçus",
  STATS_LAST_PAYMENT: "Dernier versement",
  SETTINGS_TITLE: "Paramètres du groupe",
  SETTINGS_VISIBILITY: "Visibilité",
  SETTINGS_JOIN_REQUESTS: "Autoriser les demandes d'adhésion",
  SETTINGS_REMINDERS: "Rappels de versement",
  SETTINGS_SAVE: "Enregistrer",
  CLOSE_TITLE: "Clôturer le cycle",
  CLOSE_CONFIRM: "Confirmer la clôture",
  CLOSE_SUMMARY_RAISED: "Montant collecté",
  CLOSE_SUMMARY_TURNS: "Tours reçus",
  CLOSE_SUMMARY_MEMBERS: "Membres",
  CLOSE_NOTICE:
    "Cette action archive le groupe : plus aucun versement ne pourra être déclaré.",
  // Parrainage (FIN-7..11, RG-F02)
  SPONSORSHIP_BUTTON: "Parrainage",
  SPONSORSHIP_TITLE: "Parrainage du groupe",
  SPONSORSHIP_TAB_REQUESTS: "Demandes",
  SPONSORSHIP_TAB_NEW: "Nouvelle demande",
  SPONSORSHIP_TAB_GROUPS: "Groupes ouverts",
  SPONSORSHIP_EMPTY: "Aucune demande de parrainage",
  SPONSORSHIP_INVITEE: "Personne invitée",
  SPONSORSHIP_SPONSOR: "Parrain",
  SPONSORSHIP_GROUP: "Groupe",
  SPONSORSHIP_PHONE: "Téléphone (optionnel)",
  SPONSORSHIP_PHONE_PLACEHOLDER: "+224 6XX XX XX XX",
  SPONSORSHIP_SEND: "Envoyer la demande",
  SPONSORSHIP_ACCEPT: "Accepter",
  SPONSORSHIP_DECLINE: "Refuser",
  SPONSORSHIP_CONFIRM: "Confirmer l'adhésion",
  SPONSORSHIP_JOIN: "Rejoindre via un parrain",
  SPONSORSHIP_OPEN_GROUPS_EMPTY: "Aucun groupe ouvert à l'adhésion",
};

export const FINANCIAL_GROUP_TYPE_OPTIONS: {
  value: FinancialGroupType;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: FinancialGroupType.TONTINE,
    label: "Tontine",
    description:
      "Redistribution à tour de rôle : chaque membre reçoit la cagnotte à son tour.",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: FinancialGroupType.SAVINGS_GOAL,
    label: "Cotisation à objectif",
    description:
      "Collecte régulière pour atteindre un objectif commun (projet, mariage...).",
    color: "bg-purple-500/20 text-purple-500",
  },
  {
    value: FinancialGroupType.SAVINGS,
    label: "Épargne",
    description:
      "Mise en commun avec partage final et prêts internes à intérêt.",
    color: "bg-green-500/20 text-green-500",
  },
];

export const FINANCIAL_GROUP_STATUS_OPTIONS: {
  value: FinancialGroupStatus;
  label: string;
  color: string;
}[] = [
  {
    value: FinancialGroupStatus.FORMING,
    label: "En constitution",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: FinancialGroupStatus.ACTIVE,
    label: "Actif",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: FinancialGroupStatus.CLOSED,
    label: "Clôturé",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const GROUP_PERIODICITY_OPTIONS: {
  value: GroupPeriodicity;
  label: string;
}[] = [
  { value: GroupPeriodicity.WEEKLY, label: "Hebdomadaire" },
  { value: GroupPeriodicity.MONTHLY, label: "Mensuelle" },
];

export const GROUP_MEMBER_ROLE_OPTIONS: {
  value: GroupMemberRole;
  label: string;
}[] = [
  { value: GroupMemberRole.CREATOR, label: "Créateur" },
  { value: GroupMemberRole.SPONSOR, label: "Parrain" },
  { value: GroupMemberRole.MEMBER, label: "Membre" },
];

export const ENGAGEMENT_LEVEL_OPTIONS: {
  value: EngagementLevel;
  label: string;
  color: string;
}[] = [
  {
    value: EngagementLevel.AT_RISK,
    label: "À risque",
    color: "bg-red-500/20 text-red-500",
  },
  {
    value: EngagementLevel.IRREGULAR,
    label: "Irrégulier",
    color: "bg-orange-500/20 text-orange-500",
  },
  {
    value: EngagementLevel.RELIABLE,
    label: "Fiable",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: EngagementLevel.EXEMPLARY,
    label: "Exemplaire",
    color: "bg-blue-500/20 text-blue-500",
  },
];

export const GROUP_PAYMENT_STATUS_OPTIONS: {
  value: GroupPaymentStatus;
  label: string;
  color: string;
}[] = [
  {
    value: GroupPaymentStatus.PENDING,
    label: "En attente",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: GroupPaymentStatus.CONFIRMED,
    label: "Confirmé",
    color: "bg-green-500/20 text-green-500",
  },
];

export const GROUP_PAYMENT_METHOD_OPTIONS: {
  value: GroupPaymentMethod;
  label: string;
}[] = [
  { value: GroupPaymentMethod.MOBILE, label: "Mobile Money" },
  { value: GroupPaymentMethod.CASH, label: "Espèces" },
];

export const FINANCE_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour la liste
  CACHE_KEY_PREFIX: "finance:groups:",
  SYNC_MODULE: "finance",
};

export const FINANCE_MESSAGES = {
  NAME_REQUIRED: "Veuillez indiquer un nom",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
  MAX_MEMBERS_REQUIRED: "Veuillez indiquer un nombre de membres valide",
  GOAL_REQUIRED: "Veuillez indiquer un objectif valide",
  INTEREST_RATE_REQUIRED: "Veuillez indiquer un taux valide",
};

// ============================================
// 14. PRÊTS INTERNES (Module Finance — FIN-23 → 28)
// ============================================
export const LOAN_LABELS = {
  PAGE_TITLE: "Prêts internes",
  SEARCH_PLACEHOLDER: "Rechercher un prêt...",
  STATUS_FILTER_PLACEHOLDER: "Tous les statuts",
  REQUEST_BUTTON: "Nouvelle demande",
  DETAILS_BUTTON: "Détails",
  MEMBER_LABEL: "Membre",
  GROUP_LABEL: "Groupe",
  SPONSOR_LABEL: "Parrain",
  AMOUNT_LABEL: "Montant",
  SUGGESTED_LABEL: "Suggestion IA",
  INTEREST_LABEL: "Taux d'intérêt",
  TOTAL_DUE_LABEL: "Total à rembourser",
  REPAID_LABEL: "Remboursé",
  STATUS_LABEL: "Statut",
  ACTIONS_LABEL: "Actions",
  NO_DATA: "Aucun prêt trouvé",
  LOAD_ERROR: "Erreur lors du chargement des prêts",
  OFFLINE_NOTICE: "Hors ligne — données issues du cache local",
  SUMMARY_ACTIVE: "En cours",
  SUMMARY_REQUESTED: "Demandes",
  SUMMARY_REPAID: "Remboursés",
  // Dialogue de demande (FIN-23)
  REQUEST_DIALOG_TITLE: "Demande de prêt",
  GROUP_PLACEHOLDER: "Sélectionner un groupe d'épargne",
  AMOUNT_PLACEHOLDER: "Montant demandé",
  NO_ELIGIBLE_GROUPS: "Aucun groupe d'épargne n'autorise les prêts",
  REQUEST_SUCCESS: "Demande de prêt enregistrée",
  REQUEST_ERROR: "Erreur lors de la demande",
  REQUEST_SYNC_PENDING: "Demande en attente de synchronisation",
  // Suggestion IA (FIN-26)
  AI_SUGGEST_BUTTON: "Suggérer (IA)",
  AI_SUGGEST_NOTE:
    "Montant indicatif selon l'historique d'épargne et le score de confiance (RG-F07) — le comité conserve la décision finale.",
  // Workflow (FIN-24 / FIN-25)
  CONFIRM_SPONSOR_BUTTON: "Confirmer (parrain)",
  APPROVE_BUTTON: "Approuver",
  REJECT_BUTTON: "Refuser",
  ACTION_SYNC_PENDING: "Action en attente de synchronisation",
  CONFIRM_ERROR: "Erreur lors de la confirmation",
  DECIDE_ERROR: "Erreur lors de la décision",
  REPAY_ERROR: "Erreur lors du remboursement",
  // Échéancier (FIN-27 / FIN-28)
  SCHEDULE_TITLE: "Échéancier de remboursement",
  NO_INSTALLMENTS: "Aucune échéance générée",
  REPAY_BUTTON: "Rembourser",
};

export const LOAN_STATUS_OPTIONS: {
  value: LoanStatus;
  label: string;
  color: string;
}[] = [
  {
    value: LoanStatus.REQUESTED,
    label: "Demande soumise",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: LoanStatus.SPONSOR_CONFIRMED,
    label: "Parrain confirmé",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: LoanStatus.APPROVED,
    label: "Décaissé",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: LoanStatus.REJECTED,
    label: "Refusé",
    color: "bg-red-500/20 text-red-500",
  },
  {
    value: LoanStatus.REPAID,
    label: "Remboursé",
    color: "bg-gray-500/20 text-gray-500",
  },
];

export const INSTALLMENT_STATUS_OPTIONS: {
  value: InstallmentStatus;
  label: string;
  color: string;
}[] = [
  {
    value: InstallmentStatus.PENDING,
    label: "À payer",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: InstallmentStatus.PAID,
    label: "Payée",
    color: "bg-green-500/20 text-green-500",
  },
];

export const LOAN_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local pour la liste
  CACHE_KEY_PREFIX: "finance:loans:",
  SYNC_MODULE: "loans",
};

export const LOAN_MESSAGES = {
  GROUP_REQUIRED: "Veuillez sélectionner un groupe d'épargne",
  MEMBER_REQUIRED: "Veuillez sélectionner un membre",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
};

// ============================================
// 15. ASSURANCE COMMUNAUTAIRE & SOLIDARITÉ (FIN-33 → 35)
// ============================================
export const INSURANCE_LABELS = {
  PAGE_TITLE: "Assurance communautaire",
  SUMMARY_ENROLLED: "Adhérents",
  SUMMARY_CLAIMS: "Sinistres en cours",
  FUND_TITLE: "Fonds de Garantie Solidaire",
  FUND_BALANCE: "Solde",
  FUND_LEVY_RATE: "Taux de prélèvement",
  FUND_CAP: "Plafond par cotisation",
  FUND_COLLECTED: "Total collecté",
  FUND_USED: "Total utilisé",
  FUND_NOTE:
    "Prélèvement transparent et plafonné sur les cotisations, dans le respect de la réglementation du pays (RG-F08).",
  ENROLLMENTS_TITLE: "Adhésions",
  ENROLL_BUTTON: "Adhérer",
  CLAIMS_TITLE: "Sinistres",
  DECLARE_CLAIM_BUTTON: "Déclarer un sinistre",
  DETAILS_BUTTON: "Détails",
  MEMBER_LABEL: "Membre",
  DESCRIPTION_LABEL: "Description",
  AMOUNT_LABEL: "Montant",
  INDEMNITY_LABEL: "Indemnité",
  STATUS_LABEL: "Statut",
  ACTIONS_LABEL: "Actions",
  NO_DATA: "Aucune donnée",
  LOAD_ERROR: "Erreur lors du chargement",
  OFFLINE_NOTICE: "Hors ligne — données issues du cache local",
  ENROLL_DIALOG_TITLE: "Adhésion à l'assurance",
  ENROLL_SUCCESS: "Adhésion enregistrée",
  ENROLL_ERROR: "Erreur lors de l'adhésion",
  CLAIM_DIALOG_TITLE: "Déclarer un sinistre",
  DESCRIPTION_PLACEHOLDER: "Décrire le sinistre...",
  CLAIM_SUCCESS: "Sinistre déclaré",
  CLAIM_ERROR: "Erreur lors de la déclaration",
  APPROVE_BUTTON: "Indemniser",
  REJECT_BUTTON: "Refuser",
  DECIDE_ERROR: "Erreur lors de la décision",
  ACTION_SYNC_PENDING: "Action en attente de synchronisation",
  SYNC_PENDING_ENROLL: "Adhésion en attente de synchronisation",
  SYNC_PENDING_CLAIM: "Déclaration en attente de synchronisation",
  NO_MEMBERS: "Aucun membre disponible",
};

export const CLAIM_STATUS_OPTIONS: {
  value: ClaimStatus;
  label: string;
  color: string;
}[] = [
  {
    value: ClaimStatus.SUBMITTED,
    label: "Déclaré",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: ClaimStatus.UNDER_REVIEW,
    label: "En examen",
    color: "bg-blue-500/20 text-blue-500",
  },
  {
    value: ClaimStatus.APPROVED,
    label: "Indemnisé",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: ClaimStatus.REJECTED,
    label: "Refusé",
    color: "bg-red-500/20 text-red-500",
  },
];

export const INSURANCE_STATUS_OPTIONS: {
  value: InsuranceEnrollmentStatus;
  label: string;
  color: string;
}[] = [
  {
    value: InsuranceEnrollmentStatus.ACTIVE,
    label: "Actif",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: InsuranceEnrollmentStatus.SUSPENDED,
    label: "Suspendu",
    color: "bg-red-500/20 text-red-500",
  },
];

export const INSURANCE_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local
  CACHE_KEY_PREFIX: "finance:solidarity:",
  SYNC_MODULE: "solidarity",
};

export const INSURANCE_MESSAGES = {
  MEMBER_REQUIRED: "Veuillez sélectionner un membre",
  DESCRIPTION_REQUIRED: "Veuillez décrire le sinistre",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
};

// ============================================
// 16. SCORE DE CONFIANCE (FIN-36)
// ============================================
export const TRUST_SCORE_LABELS = {
  TITLE: "Score de confiance",
  SCORE_BUTTON: "Score",
  REGULARITY: "Régularité des cotisations",
  REPAYMENTS: "Remboursements",
  PARTICIPATION: "Participation",
  SENIORITY: "Ancienneté",
  TOTAL: "Score global",
  NOTICE:
    "Recalculé automatiquement — aide à la décision, jamais une décision (RG-F09).",
};

// ============================================
// 17. COMPTABILITÉ D'ASSOCIATION (COM-41)
// ============================================
export const ACCOUNTING_LABELS = {
  PAGE_TITLE: "Comptabilité de l'association",
  SUMMARY_BALANCE: "Solde total",
  SUMMARY_PENDING: "Écritures à valider",
  ACCOUNTS_TITLE: "Comptes de trésorerie",
  ACCOUNT_BALANCE: "Solde",
  ACCOUNT_PENDING_IN: "Recettes en attente",
  ACCOUNT_PENDING_OUT: "Dépenses en attente",
  JOURNAL_TITLE: "Journal",
  LEDGER_TITLE: "Grand livre",
  NEW_ENTRY_BUTTON: "Nouvelle écriture",
  VALIDATE_BUTTON: "Valider",
  REJECT_BUTTON: "Rejeter",
  DATE_LABEL: "Date",
  ACCOUNT_LABEL: "Compte",
  TYPE_LABEL: "Type",
  LABEL_LABEL: "Libellé",
  AMOUNT_LABEL: "Montant",
  PAYER_LABEL: "Payeur",
  BENEFICIARY_LABEL: "Bénéficiaire",
  JUSTIFICATION_LABEL: "Justificatif",
  STATUS_LABEL: "Statut",
  ACTIONS_LABEL: "Actions",
  VALIDATORS_LABEL: "Signataires",
  PENDING_SECTION_TITLE: "À valider",
  NO_DATA: "Aucune écriture",
  NO_PENDING: "Aucune écriture en attente de validation",
  LOAD_ERROR: "Erreur lors du chargement de la comptabilité",
  OFFLINE_NOTICE: "Hors ligne — trésorerie issue du cache local",
  // Dialogue de saisie (écriture comptable)
  ENTRY_DIALOG_TITLE: "Nouvelle écriture comptable",
  LABEL_PLACEHOLDER: "Ex : Achat de fournitures",
  PAYER_PLACEHOLDER: "Qui paie ?",
  BENEFICIARY_PLACEHOLDER: "Qui reçoit ?",
  JUSTIFICATION_PLACEHOLDER: "Pièce justificative (facultatif)",
  ENTRY_SUCCESS: "Écriture enregistrée",
  ENTRY_ERROR: "Erreur lors de l'enregistrement",
  ENTRY_SYNC_PENDING: "Écriture en attente de synchronisation",
  CASH_PENDING_NOTE:
    "Cette écriture sur la caisse restera en attente de validation (RG-F05).",
  DOUBLE_VALIDATION_NOTE:
    "Dépense supérieure au seuil : double signature requise (trésorier + président) (RG-C04).",
  // Dialogue de validation
  VALIDATE_DIALOG_TITLE: "Valider une écriture",
  VALIDATOR_LABEL: "Signataire",
  VALIDATOR_PLACEHOLDER: "Votre nom",
  SECOND_VALIDATION_NOTE:
    "Première signature enregistrée — en attente de la seconde signature (président).",
  VALIDATE_SUCCESS: "Écriture validée",
  VALIDATE_ERROR: "Erreur lors de la validation",
  REJECT_SUCCESS: "Écriture rejetée",
  REJECT_ERROR: "Erreur lors du rejet",
  ACTION_SYNC_PENDING: "Action en attente de synchronisation",
  // Consolidation automatique
  CONSOLIDATE_BUTTON: "Consolidation",
  CONSOLIDATE_DIALOG_TITLE: "Consolidation automatique",
  CONSOLIDATE_NOTE:
    "Générez les écritures comptables à partir des flux déjà validés dans les autres modules (cotisations, cas sociaux, tontines, prêts, solidarité).",
  CONSOLIDATE_EMPTY: "Aucun flux à consolider",
  CONSOLIDATE_GENERATE_BUTTON: "Générer les écritures",
  CONSOLIDATE_SUCCESS: "Écritures générées avec succès",
  CONSOLIDATE_ERROR: "Erreur lors de la consolidation",
  CONSOLIDATE_SYNC_PENDING: "Consolidation en attente de synchronisation",
  SOURCE_LABEL: "Origine",
  SELECT_ALL: "Tout sélectionner",
  SELECT_NONE: "Tout désélectionner",
  // États financiers
  STATEMENTS_TITLE: "États financiers",
  BALANCE_SHEET_TITLE: "Bilan",
  INCOME_STATEMENT_TITLE: "Compte de résultat",
  ASSETS_LABEL: "Actif",
  LIABILITIES_LABEL: "Passif",
  TREASURY_LABEL: "Trésorerie",
  RESERVES_LABEL: "Réserves antérieures",
  RESULT_LABEL: "Résultat de l'exercice",
  TOTAL_LABEL: "Total",
  INCOME_LABEL: "Recettes",
  EXPENSE_LABEL: "Dépenses",
  NET_RESULT_LABEL: "Résultat net",
  // Rapprochement bancaire
  RECONCILIATION_TITLE: "Rapprochement bancaire",
  RECONCILED_LABEL: "Rapproché",
  TO_RECONCILE_LABEL: "À rapprocher",
  RECONCILE_BUTTON: "Rapprocher",
  RECONCILE_EMPTY: "Aucune ligne de relevé",
  RECONCILE_NO_CANDIDATE: "Aucune écriture correspondante",
  RECONCILE_SUCCESS: "Ligne rapprochée",
  RECONCILE_ERROR: "Erreur lors du rapprochement",
  RECONCILE_SYNC_PENDING: "Rapprochement en attente de synchronisation",
  RECONCILIATION_LOAD_ERROR:
    "Erreur lors du chargement du rapprochement bancaire",
  MATCH_LABEL: "Écriture correspondante",
  // Budget prévisionnel
  BUDGET_TITLE: "Budget prévisionnel",
  BUDGET_PLANNED_LABEL: "Prévu",
  BUDGET_ACTUAL_LABEL: "Réalisé",
  BUDGET_VARIANCE_LABEL: "Écart",
  BUDGET_INCOME_SECTION: "Recettes",
  BUDGET_EXPENSE_SECTION: "Dépenses",
  BUDGET_LOAD_ERROR: "Erreur lors du chargement du budget",
};

export const TREASURY_ACCOUNT_OPTIONS: {
  value: TreasuryAccountType;
  label: string;
}[] = [
  { value: TreasuryAccountType.CASH, label: "Caisse" },
  { value: TreasuryAccountType.BANK, label: "Banque" },
  { value: TreasuryAccountType.MOBILE_MONEY, label: "Mobile Money" },
];

export const ACCOUNTING_ENTRY_TYPE_OPTIONS: {
  value: AccountingEntryType;
  label: string;
}[] = [
  { value: AccountingEntryType.INCOME, label: "Recette" },
  { value: AccountingEntryType.EXPENSE, label: "Dépense" },
];

export const ACCOUNTING_ENTRY_STATUS_OPTIONS: {
  value: AccountingEntryStatus;
  label: string;
  color: string;
}[] = [
  {
    value: AccountingEntryStatus.PENDING,
    label: "En attente",
    color: "bg-amber-500/20 text-amber-500",
  },
  {
    value: AccountingEntryStatus.CONFIRMED,
    label: "Validé",
    color: "bg-green-500/20 text-green-500",
  },
  {
    value: AccountingEntryStatus.REJECTED,
    label: "Rejeté",
    color: "bg-red-500/20 text-red-500",
  },
];

export const ACCOUNTING_ENTRY_SOURCE_OPTIONS: {
  value: AccountingEntrySource;
  label: string;
}[] = [
  { value: AccountingEntrySource.MANUAL, label: "Saisie manuelle" },
  { value: AccountingEntrySource.CONTRIBUTION, label: "Cotisation" },
  { value: AccountingEntrySource.SOCIAL_CASE, label: "Cas social" },
  { value: AccountingEntrySource.TONTINE, label: "Tontine" },
  { value: AccountingEntrySource.LOAN, label: "Prêt interne" },
  { value: AccountingEntrySource.SOLIDARITY, label: "Solidarité" },
];

export const ACCOUNTING_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local
  CACHE_KEY_PREFIX: "accounting:",
  SYNC_MODULE: "accounting",
  // RG-C04 : double validation (trésorier + président) au-delà du seuil.
  DOUBLE_VALIDATION_THRESHOLD: 5000000,
};

export const ACCOUNTING_MESSAGES = {
  ACCOUNT_REQUIRED: "Veuillez choisir un compte",
  TYPE_REQUIRED: "Veuillez choisir un type (recette / dépense)",
  LABEL_REQUIRED: "Veuillez indiquer un libellé",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide",
  PAYER_REQUIRED: "Veuillez indiquer le payeur",
  BENEFICIARY_REQUIRED: "Veuillez indiquer le bénéficiaire",
  VALIDATOR_REQUIRED: "Veuillez indiquer le nom du signataire",
};

// ============================================
// MARKET (AssoShop Market — Marketplace)
// ============================================
export const MARKET_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local
  CACHE_KEY_PREFIX: "market:",
  SYNC_MODULE: "market",
};

export const MARKET_LABELS = {
  PAGE_TITLE: "Marketplace",
  PAGE_SUBTITLE: "Catalogue B2B de produits et services",
  TAB_CATALOG: "Catalogue",
  TAB_ORDERS: "Commandes",
  TAB_RESELLER: "Espace revendeur",
  TAB_SERVICES: "Services",
  TAB_INVESTMENTS: "Investissement",
  SEARCH_PLACEHOLDER: "Rechercher un produit…",
  CATEGORIES_TITLE: "Catégories",
  ALL_CATEGORIES: "Toutes les catégories",
  COUNTRY_FILTER: "Pays",
  ALL_COUNTRIES: "Tous les pays",
  CITY_FILTER: "Ville",
  ALL_CITIES: "Toutes les villes",
  MIN_ORDER: "Qté min.",
  WHOLESALE_PRICE: "Prix de gros",
  RETAIL_PRICE: "Prix de détail",
  STOCK: "Stock",
  RESELLER: "Revendeur",
  NO_PRODUCTS: "Aucun produit trouvé",
  NO_SERVICES: "Aucun service trouvé",
  NO_PROJECTS: "Aucun projet trouvé",
  SEARCH_PROVIDER_PLACEHOLDER: "Rechercher un service ou un prestataire…",
  EMPTY_CATALOG: "Le catalogue est vide.",
  RESULTS_COUNT: "produit(s) affiché(s)",
  VIEW_DETAILS: "Voir la fiche produit",
  OFFLINE_BADGE: "Hors-ligne",
  CACHED_BADGE: "Données en cache",
  ADD_TO_CART: "Ajouter au panier",
  ADD_SHORT: "Ajouter",
  DETAILS: "Détails",
  REMOVE: "Retirer",
  CART_TITLE: "Panier",
  CART_EMPTY: "Votre panier est vide.",
  QUANTITY: "Quantité",
  TOTAL: "Total",
  CHECKOUT: "Passer commande",
  DELIVERY_METHOD: "Mode de livraison",
  DELIVERY_DATE: "Date de livraison",
  DELIVERY_CITY: "Ville de livraison",
  PAY: "Payer",
  ORDER_CONFIRMED: "Commande confirmée",
  ORDER_CONFIRMED_TEXT:
    "Votre commande a été réglée via le portefeuille AssoShop Pay.",
  WALLET_BALANCE: "Solde portefeuille",
  MY_ORDERS: "Mes commandes",
  GROUP_ORDERS: "Commandes groupées",
  JOIN: "Rejoindre",
  CREATE_GROUP_ORDER: "Créer une commande groupée",
  MIN_PARTICIPANTS: "Participants min.",
  DEADLINE: "Date limite",
  PARTICIPANTS: "Participants",
  GROUP_PRICE: "Prix groupé",
  ORDER_NUMBER: "Commande",
  JOINED: "Rejoint",
  ORDER_DATE: "Date de commande",
  BECOME_RESELLER: "Devenir revendeur",
  RESELLER_APPLICATION_TITLE: "Demande de compte revendeur",
  RESELLER_APPLICATION_DESC:
    "Renseignez les informations de votre société, une pièce d'identité et votre secteur d'activité.",
  ID_DOCUMENT: "Pièce d'identité",
  COMPANY_NAME: "Raison sociale",
  CONTACT_NAME: "Nom du contact",
  SECTOR: "Secteur d'activité",
  SUBMIT: "Envoyer la demande",
  APPLICATION_PENDING: "Demande en attente de validation",
  APPLICATION_PENDING_TEXT:
    "Votre demande a été transmise. Un administrateur GSG doit valider votre compte avant que vous puissiez publier des produits (RG-M01).",
  SIMULATE_APPROVAL: "Simuler la validation administrateur",
  DASHBOARD: "Tableau de bord",
  RESELLER_PRODUCTS: "Mes produits",
  ADD_PRODUCT: "Ajouter un produit",
  EDIT_PRODUCT: "Modifier le produit",
  RECEIVED_ORDERS: "Commandes reçues",
  PARCELS: "Réception & retraits",
  REVIEWS: "Avis",
  SALES_STATS: "Statistiques de vente",
  SETTINGS: "Paramètres",
  AI_DESCRIPTION: "Description assistée par IA",
  GENERATE: "Générer",
  KEYWORDS: "Mots-clés",
  CATEGORY: "Catégorie",
  SUBCATEGORY: "Sous-catégorie",
  SCAN_PARCEL: "Scanner le colis (QR code)",
  SIMULATE_SCAN: "Simuler le scan",
  DELIVER: "Remise au client",
  RECIPIENT: "Nom du destinataire",
  TRACKING_CODE: "Code de suivi",
  DELIVERY_ZONES: "Zones de livraison",
  DELIVERY_SLOTS: "Créneaux de livraison",
  PAYMENT_DETAILS: "Coordonnées de paiement",
  SAVE: "Enregistrer",
  REVENUE: "Chiffre d'affaires",
  ORDERS_COUNT: "Commandes",
  AVERAGE_RATING: "Note moyenne",
  CURRENCY: "Devise",
  DESCRIPTION: "Description",
  PICKUP_SCANNED: "Scanné",
  PICKUP_DELIVERED: "Remis",
  NO_REVIEWS: "Aucun avis pour le moment.",
  MONTHLY_REVENUE: "Chiffre d'affaires — 3 derniers mois",
  SERVICES_TITLE: "Services communautaires",
  PUBLISH_SERVICE: "Publier une offre de service",
  TITLE: "Titre",
  SERVICE_TYPE: "Type de service",
  PROVIDER_NAME: "Prestataire",
  PRICE: "Prix",
  PROVIDER_MEMBER: "Membre d'association",
  ADD_REVIEW: "Évaluer ce service",
  SOLICITED_LABEL: "J'ai effectivement sollicité ce service",
  INVESTMENTS_TITLE: "Projets d'investissement communautaire",
  CREATE_PROJECT: "Créer un projet d'investissement",
  TARGET_AMOUNT: "Montant recherché",
  RAISED_AMOUNT: "Montant collecté",
  PROFIT_SHARING_RULES: "Règles de répartition des bénéfices",
  RULES_LOCKED: "Règles verrouillées",
  MY_CONTRIBUTION: "Ma contribution",
  INVEST: "Investir",
  PROJECT_NAME: "Nom du projet",
  AMOUNT: "Montant",
  CLOSED: "Clôturé",
  COMPLETED: "Terminé",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: "En attente de paiement",
  [OrderStatus.CONFIRMED]: "Confirmée",
  [OrderStatus.SHIPPED]: "Expédiée",
  [OrderStatus.ARRIVED]: "Arrivée à destination",
  [OrderStatus.READY_FOR_PICKUP]: "Prête à être récupérée",
  [OrderStatus.DELIVERED]: "Remise effectuée",
  [OrderStatus.CANCELLED]: "Annulée",
};

export const DELIVERY_METHOD_OPTIONS: {
  value: DeliveryMethod;
  label: string;
}[] = [
  { value: DeliveryMethod.PICKUP, label: "Retrait au point de vente" },
  { value: DeliveryMethod.SCHEDULED, label: "Livraison programmée" },
];

export const GROUP_ORDER_STATUS_LABELS: Record<GroupOrderStatus, string> = {
  [GroupOrderStatus.OPEN]: "Ouverte",
  [GroupOrderStatus.CONFIRMED]: "Facturée",
  [GroupOrderStatus.CLOSED]: "Clôturée",
};

export const RESELLER_APPLICATION_STATUS_LABELS: Record<
  ResellerApplicationStatus,
  string
> = {
  [ResellerApplicationStatus.PENDING]: "En attente",
  [ResellerApplicationStatus.APPROVED]: "Validée",
  [ResellerApplicationStatus.REJECTED]: "Refusée",
};

export const SERVICE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "plomberie", label: "Plomberie" },
  { value: "couture", label: "Couture" },
  { value: "transport", label: "Transport" },
  { value: "informatique", label: "Informatique" },
  { value: "agriculture", label: "Agriculture" },
  { value: "formation", label: "Formation" },
];

export const INVESTMENT_SECTOR_OPTIONS: { value: string; label: string }[] = [
  { value: "agriculture", label: "Agriculture" },
  { value: "elevage", label: "Élevage" },
  { value: "commerce", label: "Commerce" },
];

export const INVESTMENT_PROJECT_STATUS_LABELS: Record<
  InvestmentProjectStatus,
  string
> = {
  [InvestmentProjectStatus.OPEN]: "Ouvert",
  [InvestmentProjectStatus.CLOSED]: "Clôturé",
  [InvestmentProjectStatus.COMPLETED]: "Terminé",
};

export const MARKET_MESSAGES = {
  LOAD_ERROR: "Impossible de charger le catalogue.",
  ORDERS_LOAD_ERROR: "Impossible de charger vos commandes.",
  QUANTITY_REQUIRED: "Veuillez indiquer une quantité valide",
  DELIVERY_CITY_REQUIRED: "Veuillez indiquer la ville de livraison",
  DELIVERY_DATE_REQUIRED: "Veuillez choisir une date de livraison",
  ORDER_CREATE_ERROR: "Impossible de créer la commande.",
  PAYMENT_ERROR: "Le paiement a échoué.",
  APPLICATION_SUBMIT_ERROR: "Impossible d'envoyer la demande.",
  PRODUCT_CREATE_ERROR: "Impossible d'enregistrer le produit.",
  PRODUCT_UPDATE_ERROR: "Impossible de modifier le produit.",
  SCAN_ERROR: "Le scan du colis a échoué.",
  DELIVER_ERROR: "La remise a échoué.",
  SETTINGS_SAVE_ERROR: "Impossible d'enregistrer les paramètres.",
  SERVICES_LOAD_ERROR: "Impossible de charger les services.",
  SERVICE_CREATE_ERROR: "Impossible de publier l'offre de service.",
  REVIEW_CREATE_ERROR: "Impossible d'enregistrer l'évaluation.",
  PROJECTS_LOAD_ERROR: "Impossible de charger les projets d'investissement.",
  PROJECT_CREATE_ERROR: "Impossible de créer le projet d'investissement.",
  INVEST_ERROR: "Impossible d'investir dans ce projet.",
};

// ============================================
// PAY (AssoShop Pay — orchestration des paiements)
// ============================================
export const PAY_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local
  CACHE_KEY_PREFIX: "pay:",
  SYNC_MODULE: "pay",
  // RG-P03 : commission de service (0,5 % ici, bornée entre 0,5 et 1 %).
  SERVICE_FEE_RATE: 0.005,
};

export const PAY_LABELS = {
  PAGE_TITLE: "AssoShop Pay",
  PAGE_SUBTITLE: "Paiements, portefeuilles et réconciliation",
  TAB_WALLET: "Portefeuille",
  TAB_TRANSACTIONS: "Transactions",
  TAB_RECONCILIATION: "Réconciliation",
  TAB_CONVERSION: "Conversion",
  TAB_SITUATION: "Situation financière",
  TAB_SETTINGS: "Paramètres",
  WALLET_SELECTOR: "Portefeuille actif",
  BALANCE: "Solde",
  LAST_KNOWN_BALANCE: "Dernier solde connu",
  TOPUP: "Recharger",
  WITHDRAW: "Retirer",
  TRANSFER: "Transférer",
  PROVIDER: "Opérateur",
  PHONE: "Numéro Mobile Money",
  AMOUNT: "Montant",
  SERVICE_FEE: "Frais de service",
  RECIPIENT: "Bénéficiaire",
  PAYMENT_METHODS: "Moyens de paiement enregistrés",
  ADD_METHOD: "Ajouter un moyen de paiement",
  DEFAULT: "Par défaut",
  TRANSACTIONS_TITLE: "Historique global des transactions",
  REFERENCE: "Référence",
  RECEIPT: "Reçu",
  COUNTERPARTY: "Contrepartie",
  DATE: "Date",
  STATUS: "Statut",
  RECONCILIATION_TITLE: "Réconciliation des paiements",
  OPERATOR_REFERENCE: "Référence opérateur",
  AI_CHECK: "Vérifier les écarts avec l'IA",
  MATCH: "Rapprocher",
  MATCHED: "Rapproché",
  CONVERSION_TITLE: "Conversion de devise",
  CONVERSION_NOTE:
    "Montants indicatifs — la transaction réelle s'effectue dans la devise du pays.",
  SITUATION_TITLE: "Ma situation financière globale",
  CONTRIBUTIONS: "Cotisations",
  SAVINGS: "Épargne",
  TONTINE: "Tontine",
  AIDS_RECEIVED: "Aides reçues",
  LOANS_OUTSTANDING: "Prêts en cours",
  NET_WORTH: "Patrimoine net",
  SETTINGS_TITLE: "Paramètres de paiement",
  DEFAULT_PROVIDER: "Opérateur par défaut",
  MAX_TRANSACTION_AMOUNT: "Plafond de transaction",
  ALERTS_ENABLED: "Alertes de transaction",
  SAVE: "Enregistrer",
  CLOSE: "Fermer",
  NO_TRANSACTIONS: "Aucune transaction",
  NO_RECONCILIATION: "Aucune opération à rapprocher",
  OFFLINE_BADGE: "Hors-ligne",
  CACHED_BADGE: "Données en cache",
};

export const PAY_MESSAGES = {
  LOAD_ERROR: "Impossible de charger le portefeuille.",
  TOPUP_ERROR: "La recharge a échoué.",
  WITHDRAW_ERROR: "Le retrait a échoué.",
  TRANSFER_ERROR: "Le transfert a échoué.",
  METHOD_ADD_ERROR: "Impossible d'ajouter le moyen de paiement.",
  MATCH_ERROR: "Impossible de rapprocher l'opération.",
  SETTINGS_SAVE_ERROR: "Impossible d'enregistrer les paramètres.",
  AMOUNT_REQUIRED: "Veuillez indiquer un montant valide.",
  PHONE_REQUIRED: "Veuillez indiquer un numéro Mobile Money.",
  MEMBER_REQUIRED: "Veuillez indiquer le membre destinataire.",
  INSUFFICIENT_BALANCE: "Solde insuffisant.",
};

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  [WalletType.PERSONAL]: "Personnel",
  [WalletType.ASSOCIATION]: "Association",
  [WalletType.COOPERATIVE]: "Coopérative",
  [WalletType.FAMILY]: "Famille",
  [WalletType.COMPANY]: "Entreprise",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.TOPUP]: "Recharge",
  [TransactionType.WITHDRAWAL]: "Retrait",
  [TransactionType.TRANSFER]: "Transfert",
  [TransactionType.PAYMENT]: "Paiement",
  [TransactionType.RECEIPT]: "Encaissement",
  [TransactionType.COMMISSION]: "Commission",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: "En attente",
  [TransactionStatus.CONFIRMED]: "Confirmée",
  [TransactionStatus.FAILED]: "Échouée",
};

export const RECONCILIATION_STATUS_LABELS: Record<
  ReconciliationStatus,
  string
> = {
  [ReconciliationStatus.MATCHED]: "Rapproché",
  [ReconciliationStatus.UNMATCHED]: "Non rapproché",
  [ReconciliationStatus.FLAGGED]: "À vérifier",
};

// RG-P04 : le choix des opérateurs dépend du pays de l'utilisateur.
export const PAY_COUNTRIES = ["Guinée", "Sénégal", "Côte d'Ivoire"];

export const PAY_OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  "Guinée": ["Orange Money", "MTN Mobile Money"],
  "Sénégal": ["Orange Money", "Wave", "Free Money"],
  "Côte d'Ivoire": ["Orange Money", "MTN Mobile Money", "Wave", "Moov Money"],
};

// RG-P05 : taux de conversion indicatifs, exprimés en GNF.
export const PAY_CURRENCIES = ["GNF", "XOF", "USD", "EUR"];

export const PAY_EXCHANGE_RATES: Record<string, number> = {
  GNF: 1,
  XOF: 8.6,
  USD: 8600,
  EUR: 9300,
};

// ============================================
// HUB COMMUNAUTAIRE ET SOCLE TRANSVERSAL
// ============================================
export const HUB_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 60, // 1 heure de cache local
  CACHE_KEY_PREFIX: "hub:",
  SYNC_MODULE: "hub",
};

export const HUB_LABELS = {
  PAGE_TITLE: "Hub Communautaire",
  PAGE_SUBTITLE: "Point d'entrée unique : associations, groupes, finances et services",
  TAB_HOME: "Accueil",
  TAB_PROFILE: "Profil & carte",
  TAB_VAULT: "Coffre-fort",
  TAB_MESSAGING: "Messagerie",
  TAB_NOTIFICATIONS: "Notifications",
  TAB_ASSISTANT: "Assistant IA",
  TAB_SETTINGS: "Paramètres",
  WELCOME: "Bonjour",
  MY_ASSOCIATIONS: "Mes associations",
  MY_GROUPS: "Mes groupes",
  FAVORITES: "Mes favoris",
  INVITATIONS: "Invitations en attente",
  MONTHLY_INCOME: "Recettes du mois",
  MONTHLY_EXPENSES: "Dépenses du mois",
  SYNC_TITLE: "File de synchronisation",
  SYNC_RETRY: "Synchroniser",
  NO_SYNC: "Aucune action en attente de synchronisation.",
  PROFILE_TITLE: "Mon profil",
  MEMBER_SINCE: "Membre depuis",
  TRUST_SCORE: "Score de confiance",
  DIGITAL_CARD: "Carte numérique de membre",
  SHARE: "Partager",
  VAULT_TITLE: "Coffre-fort numérique",
  VAULT_NOTE: "Documents personnels chiffrés, accessibles selon vos autorisations.",
  UPLOAD: "Déposer un document",
  KYC_TITLE: "Vérification d'identité (KYC)",
  KYC_SUBMIT: "Soumettre une pièce d'identité",
  REFERRAL_TITLE: "Programme de parrainage",
  CONVERSATIONS: "Conversations",
  NEW_CONVERSATION: "Nouvelle conversation",
  TYPE_MESSAGE: "Écrire un message…",
  CONTACT: "Contact",
  NOTIFICATIONS_TITLE: "Centre de notifications",
  PREFERENCES_TITLE: "Préférences de notifications",
  MARK_READ: "Tout marquer comme lu",
  RECEIPT_CHANNEL: "Canal de réception",
  ASSISTANT_TITLE: "Assistant IA",
  ASSISTANT_PROMPT: "Posez une question à l'assistant…",
  SECURITY_TITLE: "Paramètres de sécurité",
  GENERAL_TITLE: "Paramètres généraux",
  PRIVACY_TITLE: "Confidentialité et données",
  FAQ_TITLE: "Aide / FAQ",
  ADVISOR_TITLE: "Discuter avec un conseiller",
  ACCESSIBILITY_TITLE: "Mode simplifié / accessibilité",
  SAVE: "Enregistrer",
  OFFLINE_BADGE: "Hors-ligne",
  CACHED_BADGE: "Données en cache",
};

export const HUB_MESSAGES = {
  LOAD_ERROR: "Impossible de charger le Hub.",
  FAVORITE_ERROR: "Impossible de modifier les favoris.",
  SYNC_ERROR: "La synchronisation a échoué.",
  KYC_ERROR: "Impossible de soumettre la pièce d'identité.",
  SEND_ERROR: "Impossible d'envoyer le message.",
  PREF_ERROR: "Impossible d'enregistrer les préférences.",
};

export const ENGAGEMENT_LEVEL_LABELS: Record<EngagementLevel, string> = {
  [EngagementLevel.AT_RISK]: "Engagement à risque",
  [EngagementLevel.IRREGULAR]: "Engagement irrégulier",
  [EngagementLevel.RELIABLE]: "Engagement fiable",
  [EngagementLevel.EXEMPLARY]: "Engagement exemplaire",
};

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  [KycStatus.NOT_SUBMITTED]: "Non soumis",
  [KycStatus.PENDING]: "En cours de vérification",
  [KycStatus.VERIFIED]: "Vérifié",
  [KycStatus.REJECTED]: "Refusé",
};

export const FAVORITE_TYPE_LABELS: Record<FavoriteType, string> = {
  [FavoriteType.PRODUCT]: "Produit",
  [FavoriteType.ASSOCIATION]: "Association",
  [FavoriteType.GROUP]: "Groupe",
  [FavoriteType.PROVIDER]: "Prestataire",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> =
  {
    [NotificationChannel.SMS]: "SMS",
    [NotificationChannel.EMAIL]: "E-mail",
    [NotificationChannel.WHATSAPP]: "WhatsApp",
    [NotificationChannel.IN_APP]: "Dans l'application",
  };

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  [SyncStatus.PENDING]: "En attente",
  [SyncStatus.SYNCED]: "Synchronisé",
  [SyncStatus.CONFLICT]: "Conflit",
};

// ============================================
// BACK-OFFICE WEB (ADMINISTRATION GSG)
// ============================================
export const ADMIN_CONFIG = {
  CACHE_TTL_MS: 1000 * 60 * 30, // 30 minutes de cache local
  CACHE_KEY_PREFIX: "admin:",
  SYNC_MODULE: "admin",
};

export const ADMIN_LABELS = {
  PAGE_TITLE: "Back-office AssoShop",
  PAGE_SUBTITLE: "Supervision des modules, des pays et des abonnements",
  LOGIN_TITLE: "Connexion administrateur",
  LOGIN_SUBTITLE: "Espace réservé aux équipes Global Service Groupe",
  NAV_PILOTAGE: "Pilotage",
  NAV_USERS: "Utilisateurs & support",
  NAV_ORGANIZATIONS: "Organisations & groupes",
  NAV_MARKET: "Marketplace",
  NAV_BILLING: "Monétisation",
  NAV_CONFIG: "Configuration",
  TAB_OVERVIEW: "Vue d'ensemble",
  TAB_REPORTS: "Rapports globaux",
  TAB_NATIONAL: "National / sous-régional",
  TAB_AUDIT_LOGS: "Journal d'activité",
  TAB_SECURITY: "Audit sécurité",
  TAB_USERS: "Utilisateurs",
  TAB_KYC: "Vérification KYC",
  TAB_ROLES: "Rôles internes",
  TAB_DISPUTES: "Litiges",
  TAB_ASSOCIATIONS: "Associations",
  TAB_GROUPS: "Groupes financiers",
  TAB_HIERARCHY: "Hiérarchie",
  TAB_FUND: "Fonds de garantie",
  TAB_INSURANCE: "Assurance",
  TAB_RESELLERS: "Revendeurs",
  TAB_CATALOG: "Catalogue",
  TAB_MODERATION: "Modération",
  TAB_INVESTMENTS: "Investissements",
  TAB_COMMISSIONS: "Commissions & frais",
  TAB_PLANS: "Abonnements & formules",
  TAB_INVOICES: "Facturation",
  TAB_PLATFORM: "Plateforme",
  TAB_COUNTRIES: "Pays & régions",
  TAB_OPERATORS: "Opérateurs Mobile Money",
  TAB_API: "API & intégrations",
  ACTIVE_USERS: "Utilisateurs actifs",
  ACTIVE_ASSOCIATIONS: "Associations actives",
  ACTIVE_GROUPS: "Groupes actifs",
  MONTHLY_VOLUME: "Volume mensuel",
  PENDING_VALIDATIONS: "Validations en attente",
  OPEN_DISPUTES: "Litiges ouverts",
  REVENUE: "Revenus plateforme",
  REJECT: "Refuser",
  APPROVE: "Approuver",
  SUSPEND: "Suspendre",
  REACTIVATE: "Réactiver",
  SAVE: "Enregistrer",
  CACHED_BADGE: "Données en cache",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: "En attente",
  [ReviewStatus.APPROVED]: "Approuvé",
  [ReviewStatus.REJECTED]: "Refusé",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  [DisputeStatus.OPEN]: "Ouvert",
  [DisputeStatus.IN_PROGRESS]: "En cours",
  [DisputeStatus.RESOLVED]: "Résolu",
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  [AuditSeverity.INFO]: "Information",
  [AuditSeverity.WARNING]: "Avertissement",
  [AuditSeverity.CRITICAL]: "Critique",
};

export const PLATFORM_USER_STATUS_LABELS: Record<PlatformUserStatus, string> = {
  [PlatformUserStatus.ACTIVE]: "Actif",
  [PlatformUserStatus.SUSPENDED]: "Suspendu",
};
