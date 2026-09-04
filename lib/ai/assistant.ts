// Point d'entrée unique de l'assistant IA (GSG).
// Les intents rédactionnels appellent le fournisseur IA (route /api/ai/assist,
// clé côté serveur) puis retombent sur la synthèse locale déterministe en cas
// d'indisponibilité. Les intents d'aide à la décision (risque, prêt,
// rapprochement) restent déterministes par conception (RG-H03) : aucun montant
// ni signal de risque n'est généré par un LLM.

const AI_ENDPOINT = "/api/ai/assist";

const SYSTEM_PROMPTS = {
  minutes:
    "Tu es l'assistant de rédaction d'AssoShop. À partir des notes brutes d'une réunion associative, rédige un compte-rendu structuré en français avec trois sections : « Points abordés », « Décisions », « Actions à suivre » (listes à puces). Termine par « Document généré automatiquement par l'assistant IA — à relire et valider. » Ne rien inventer hors des notes.",
  announcement:
    "Rédige une annonce officielle et chaleureuse pour les membres d'une association, en français. Structure : formule d'ouverture, corps en puces à partir du sujet fourni, formule de clôture, puis « L'équipe de communication ».",
  document:
    "Rédige une description courte et formelle (1 à 2 phrases) d'un document officiel d'association, en français.",
  project:
    "Rédige une description (2 à 3 phrases) d'un projet communautaire associatif, en français, en mentionnant l'objectif de mobilisation des membres et des partenaires.",
  product:
    "Rédige une description commerciale courte et attrayante d'un produit de la marketplace AssoShop, en français, à partir du nom et des mots-clés fournis.",
  mobility:
    "Rédige une synthèse de mobilité de membre en français à partir des indicateurs fournis. Restitue uniquement des indicateurs agrégés d'engagement (score de confiance, nombre de cotisations, réunions suivies) sans aucun montant financier. Termine par la mention « Rapport généré automatiquement par l'assistant IA — indicateurs agrégés, sans détail financier brut. »",
  chat: "Tu es l'assistant IA d'AssoShop. Réponds en français de façon concise et utile aux questions sur les cotisations, prêts, tontines, marketplace et vie associative.",
} as const;

async function callAssistant(
  system: string,
  user: string,
): Promise<string | null> {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}

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

// Synthèse locale déterministe en secours du fournisseur d'IA.
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
    const text = await callAssistant(
      SYSTEM_PROMPTS.minutes,
      notes.trim() || "(aucune note)",
    );
    if (text) return { draft: text, source: "ai" };
    return { draft: synthesizeLocally(notes), source: "fallback" };
  },

  async draftAnnouncement(prompt: string): Promise<AnnouncementDraft> {
    const text = await callAssistant(
      SYSTEM_PROMPTS.announcement,
      prompt.trim() || "(aucun sujet)",
    );
    if (text) return { draft: text, source: "ai" };
    return { draft: draftAnnouncementLocally(prompt), source: "fallback" };
  },

  async draftDocumentDescription(
    title: string,
  ): Promise<DocumentDescriptionDraft> {
    const text = await callAssistant(
      SYSTEM_PROMPTS.document,
      title.trim() || "(sans titre)",
    );
    if (text) return { draft: text, source: "ai" };
    return { draft: draftDocumentDescriptionLocally(title), source: "fallback" };
  },

  async draftProjectDescription(name: string): Promise<ProjectDescriptionDraft> {
    const text = await callAssistant(
      SYSTEM_PROMPTS.project,
      name.trim() || "(sans nom)",
    );
    if (text) return { draft: text, source: "ai" };
    return { draft: draftProjectDescriptionLocally(name), source: "fallback" };
  },

  // Analyses déterministes (RG-H03) : aucun appel LLM pour les décisions de
  // risque/crédit/rapprochement — la règle métier reste prévisible et testable.
  async detectAtRiskMembers(
    members: RiskCandidate[],
  ): Promise<RiskAnalysis> {
    return detectAtRiskLocally(members);
  },

  async suggestLoanAmount(
    input: LoanSuggestionInput,
  ): Promise<LoanSuggestion> {
    return suggestLoanLocally(input);
  },

  async draftProductDescription(
    name: string,
    keywords: string,
  ): Promise<ProductDescriptionDraft> {
    const user = `Nom : ${name || "(sans nom)"}\nMots-clés : ${keywords || "(aucun)"}`;
    const text = await callAssistant(SYSTEM_PROMPTS.product, user);
    if (text) return { draft: text, source: "ai" };
    return {
      draft: draftProductDescriptionLocally(name, keywords),
      source: "fallback",
    };
  },

  async flagReconciliationDiscrepancies(
    entries: ReconciliationCandidate[],
  ): Promise<ReconciliationAnalysis> {
    return flagReconciliationDiscrepanciesLocally(entries);
  },

  async ask(question: string): Promise<AssistantAnswer> {
    const text = await callAssistant(SYSTEM_PROMPTS.chat, question.trim());
    if (text) return { answer: text, source: "ai" };
    return { answer: answerLocally(question), source: "fallback" };
  },

  async synthesizeMobilityReport(
    input: MobilitySynthesisInput,
  ): Promise<MobilitySynthesis> {
    const user = [
      `Membre : ${input.memberName}`,
      `Engagement : ${input.engagementLabel}`,
      `Score de confiance : ${input.trustScore}/100`,
      `Cotisations honorées : ${input.contributionsCount}`,
      `Réunions suivies : ${input.meetingsAttended}`,
      `Ancienne ville : ${input.oldCity}`,
      `Nouvelle ville : ${input.newCity}`,
    ].join("\n");
    const text = await callAssistant(SYSTEM_PROMPTS.mobility, user);
    if (text) return { summary: text, source: "ai" };
    return { summary: synthesizeMobilityLocally(input), source: "fallback" };
  },
};
