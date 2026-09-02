// Point d'entrée unique de l'assistant IA (GSG).
// En développement : synthèse locale déterministe (stub).
// À brancher sur le vrai fournisseur d'IA (Assistant IA Premium) sans
// modifier les appels consommateurs.

export interface MinutesSynthesis {
  draft: string;
  source: "ai" | "fallback";
}

const DECISION_PATTERN =
  /décision|décidé|valider|validé|accord|retenu|approuvé/i;
const ACTION_PATTERN =
  /action|faire|prévoir|organiser|contacter|préparer|suivre|envoyer/i;

function synthesizeLocally(notes: string): string {
  const lines = notes
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "Aucune note fournie : impossible de générer une synthèse.";
  }

  const decisions = lines.filter((line) => DECISION_PATTERN.test(line));
  const actions = lines.filter((line) => ACTION_PATTERN.test(line));
  const points = lines.filter(
    (line) => !decisions.includes(line) && !actions.includes(line),
  );

  const section = (title: string, items: string[]) =>
    items.length > 0
      ? `${title} :\n${items.map((item) => `- ${item}`).join("\n")}`
      : "";

  return [
    section("Points abordés", points),
    section("Décisions", decisions),
    section("Actions à suivre", actions),
    "Document généré automatiquement par l'assistant IA — à relire et valider.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface AnnouncementDraft {
  draft: string;
  source: "ai" | "fallback";
}

function draftAnnouncementLocally(prompt: string): string {
  const lines = prompt
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "Aucun sujet fourni : impossible de générer un brouillon.";
  }

  const body = lines.map((line) => `- ${line}`).join("\n");

  return [
    "Chers membres,",
    "",
    body,
    "",
    "Merci de votre attention.",
    "",
    "L'équipe de communication",
  ].join("\n");
}

export interface DocumentDescriptionDraft {
  draft: string;
  source: "ai" | "fallback";
}

function draftDocumentDescriptionLocally(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "Document officiel de l'association, conservé dans le classeur.";
  }
  return `Document « ${trimmed} » de l'association, conservé dans le classeur pour référence officielle.`;
}

export interface ProjectDescriptionDraft {
  draft: string;
  source: "ai" | "fallback";
}

function draftProjectDescriptionLocally(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Projet communautaire de l'association.";
  }
  return `Projet communautaire « ${trimmed} » porté par l'association. Objectif : mobiliser les membres et les partenaires autour d'une action collective au bénéfice de la communauté.`;
}

export interface RiskCandidate {
  id: string;
  name: string;
  engagement: string;
  lastPaymentAt: string | null;
}

export interface AtRiskMember {
  id: string;
  name: string;
  reason: string;
}

export interface RiskAnalysis {
  flagged: AtRiskMember[];
  source: "ai" | "fallback";
}

function detectAtRiskLocally(members: RiskCandidate[]): RiskAnalysis {
  const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000;
  const flagged: AtRiskMember[] = [];

  for (const member of members) {
    if (member.engagement === "at_risk") {
      flagged.push({
        id: member.id,
        name: member.name,
        reason: "Irrégularité de paiement détectée",
      });
    } else if (member.engagement === "irregular") {
      flagged.push({
        id: member.id,
        name: member.name,
        reason: "Retards occasionnels constatés",
      });
    } else if (
      member.lastPaymentAt &&
      new Date(member.lastPaymentAt).getTime() < cutoff
    ) {
      flagged.push({
        id: member.id,
        name: member.name,
        reason: "Dernier versement ancien",
      });
    }
  }

  return { flagged, source: "ai" };
}

export interface LoanSuggestionInput {
  totalSaved: number;
  engagement: string;
  monthsActive: number;
}

export interface LoanSuggestion {
  suggested: number;
  source: "ai" | "fallback";
}

function suggestLoanLocally(input: LoanSuggestionInput): LoanSuggestion {
  const factor =
    input.engagement === "exemplary"
      ? 0.5
      : input.engagement === "reliable"
        ? 0.4
        : input.engagement === "irregular"
          ? 0.2
          : 0.1;
  const months = Math.max(input.monthsActive, 1);
  const capacity =
    input.totalSaved * (0.3 + factor) * (Math.min(months, 12) / 12);
  const suggested = Math.max(0, Math.round(capacity / 1000) * 1000);
  return { suggested, source: "ai" };
}

export interface ProductDescriptionDraft {
  draft: string;
  source: "ai" | "fallback";
}

function draftProductDescriptionLocally(
  name: string,
  keywords: string,
): string {
  const trimmedName = name.trim();
  const words = keywords
    .split(/[\s,;]+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 6);

  if (!trimmedName && words.length === 0) {
    return "Description du produit en cours de rédaction.";
  }

  const parts: string[] = [];
  if (trimmedName) parts.push(`Produit « ${trimmedName} »`);
  if (words.length > 0) {
    parts.push(`Caractéristiques principales : ${words.join(", ")}`);
  }
  parts.push("Qualité garantie, disponible à la vente sur la marketplace.");
  return `${parts.join(". ")}.`;
}

export interface ReconciliationCandidate {
  id: string;
  amount: number;
  operator_reference: string;
  status: string;
}

export interface ReconciliationFlag {
  entry_id: string;
  note: string;
}

export interface ReconciliationAnalysis {
  flags: ReconciliationFlag[];
  source: "ai" | "fallback";
}

// RG-H03 : l'IA signale les écarts inhabituels mais n'exécute jamais
// d'action financière (le rapprochement reste une décision humaine).
function flagReconciliationDiscrepanciesLocally(
  entries: ReconciliationCandidate[],
): ReconciliationAnalysis {
  const flags: ReconciliationFlag[] = [];

  for (const entry of entries) {
    if (entry.status === "matched") continue;
    if (!entry.operator_reference) {
      flags.push({
        entry_id: entry.id,
        note: "Écart inhabituel : absence de référence opérateur correspondante.",
      });
    } else if (entry.amount > 1000000) {
      flags.push({
        entry_id: entry.id,
        note: "Écart inhabituel : montant élevé à vérifier avec l'opérateur.",
      });
    }
  }

  return { flags, source: "ai" };
}

export interface AssistantAnswer {
  answer: string;
  source: "ai" | "fallback";
}

// Synthèse locale déterministe en attendant le vrai fournisseur d'IA.
function answerLocally(question: string): string {
  const q = question.toLowerCase();

  if (/(cotis|paiement|payer|versement)/.test(q)) {
    return "Pour les cotisations, vous pouvez payer en ligne ou déclarer un paiement en espèces, validé par le trésorier. Consultez l'onglet Cotisations de votre association.";
  }
  if (/(prêt|pret|emprunt|crédit|credit)/.test(q)) {
    return "Les prêts internes suivent un circuit avec parrain et comité de crédit. L'assistant peut vous aider à estimer votre capacité d'emprunt.";
  }
  if (/(tontine|épargne|epargne)/.test(q)) {
    return "Vous pouvez rejoindre une tontine ou un groupe d'épargne depuis le module Finance, et suivre vos tours de versement.";
  }
  if (/(association|adhésion|adhesion|membre)/.test(q)) {
    return "Pour rejoindre une association, recherchez-la puis envoyez une demande d'adhésion. Un gestionnaire validera votre demande.";
  }
  if (/(market|produit|commande|vendre)/.test(q)) {
    return "Sur la marketplace, vous pouvez acheter, devenir revendeur B2B ou proposer un service communautaire.";
  }
  return "Je suis l'assistant IA d'AssoShop. Je peux vous renseigner sur les cotisations, les prêts, les tontines, la marketplace ou vos associations. Comment puis-je vous aider ?";
}

export interface MobilitySynthesisInput {
  memberName: string;
  engagementLabel: string;
  trustScore: number;
  contributionsCount: number;
  meetingsAttended: number;
  oldCity: string;
  newCity: string;
}

export interface MobilitySynthesis {
  summary: string;
  source: "ai" | "fallback";
}

// RG-COM-49 : la synthèse restitue des indicateurs agrégés d'engagement,
// sans détail financier brut (aucun montant de cotisation n'est exposé).
function synthesizeMobilityLocally(input: MobilitySynthesisInput): string {
  return [
    `${input.memberName} présente un engagement communautaire « ${input.engagementLabel} » avec un score de confiance de ${input.trustScore}/100.`,
    `Sur la période, ${input.contributionsCount} cotisation(s) ont été honorée(s) et ${input.meetingsAttended} réunion(s) suivie(s).`,
    `Le déménagement de ${input.oldCity} vers ${input.newCity} est signalé ; le bureau de l'association d'accueil peut engager la procédure d'adhésion sur la base de ce rapport.`,
    "Rapport de mobilité généré automatiquement par l'assistant IA — indicateurs agrégés, sans détail financier brut.",
  ].join("\n\n");
}

export const aiAssistant = {

  async synthesizeMinutes(notes: string): Promise<MinutesSynthesis> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { draft: synthesizeLocally(notes), source: "ai" };
  },

  async draftAnnouncement(prompt: string): Promise<AnnouncementDraft> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { draft: draftAnnouncementLocally(prompt), source: "ai" };
  },

  async draftDocumentDescription(
    title: string,
  ): Promise<DocumentDescriptionDraft> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { draft: draftDocumentDescriptionLocally(title), source: "ai" };
  },

  async draftProjectDescription(name: string): Promise<ProjectDescriptionDraft> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { draft: draftProjectDescriptionLocally(name), source: "ai" };
  },

  async detectAtRiskMembers(
    members: RiskCandidate[],
  ): Promise<RiskAnalysis> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return detectAtRiskLocally(members);
  },

  async suggestLoanAmount(
    input: LoanSuggestionInput,
  ): Promise<LoanSuggestion> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return suggestLoanLocally(input);
  },

  async draftProductDescription(
    name: string,
    keywords: string,
  ): Promise<ProductDescriptionDraft> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { draft: draftProductDescriptionLocally(name, keywords), source: "ai" };
  },

  async flagReconciliationDiscrepancies(
    entries: ReconciliationCandidate[],
  ): Promise<ReconciliationAnalysis> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return flagReconciliationDiscrepanciesLocally(entries);
  },

  async ask(question: string): Promise<AssistantAnswer> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { answer: answerLocally(question), source: "ai" };
  },

  async synthesizeMobilityReport(
    input: MobilitySynthesisInput,
  ): Promise<MobilitySynthesis> {
    // Simule la latence d'un appel serveur.
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { summary: synthesizeMobilityLocally(input), source: "ai" };
  },
};
