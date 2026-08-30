import { MemberRole, MemberStatus } from "@/types/modules/community";

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
  SEARCH_PLACEHOLDER: "Rechercher une association...",
  CREATE_BUTTON: "Créer",
  CREATE_DIALOG_TITLE: "Créer une association",
  NAME_LABEL: "Nom",
  TYPE_LABEL: "Type",
  CITY_LABEL: "Ville",
  OBJECT_LABEL: "Objet social",
  TYPE_PLACEHOLDER: "Choisir le type",
  STATUS_ACTIVE: "Active",
  STATUS_PENDING: "En attente",
  MEMBERS_COUNT: "Membres",
  ACTIONS_LABEL: "Actions",
  VIEW_BUTTON: "Voir",
  EDIT_BUTTON: "Modifier",
  NO_DATA: "Aucune association trouvée",
  CREATE_SUCCESS: "Association créée avec succès",
  CREATE_ERROR: "Erreur lors de la création",
  LOADING: "Chargement des associations...",
  BACK_TO_ORGANIZATIONS: "Retour aux associations",
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
