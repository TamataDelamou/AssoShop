// lib/base44/client.ts (mocks de développement : membres + cotisations + cas sociaux)
import axios from "axios";
import { ENV_CONFIG } from "@/lib/env.config";
import { adminMockAdapter } from "@/lib/base44/mocks/admin";
import { affiliationsMockAdapter } from "@/lib/base44/mocks/affiliations";
import { announcementsMockAdapter } from "@/lib/base44/mocks/announcements";
import { antennasMockAdapter } from "@/lib/base44/mocks/antennas";
import { assetsMockAdapter } from "@/lib/base44/mocks/assets";
import { beneficiariesMockAdapter } from "@/lib/base44/mocks/beneficiaries";
import { accountingMockAdapter } from "@/lib/base44/mocks/accounting";
import { contributionsMockAdapter } from "@/lib/base44/mocks/contributions";
import { documentsMockAdapter } from "@/lib/base44/mocks/documents";
import { eventsMockAdapter } from "@/lib/base44/mocks/events";
import { financeMockAdapter } from "@/lib/base44/mocks/finance";
import { governanceMockAdapter } from "@/lib/base44/mocks/governance";
import { hubMockAdapter } from "@/lib/base44/mocks/hub";
import { hrMockAdapter } from "@/lib/base44/mocks/hr";
import { loansMockAdapter } from "@/lib/base44/mocks/loans";
import { marketMockAdapter } from "@/lib/base44/mocks/market";
import { marketInvestmentsMockAdapter } from "@/lib/base44/mocks/marketInvestments";
import { marketOrdersMockAdapter } from "@/lib/base44/mocks/marketOrders";
import { marketResellerMockAdapter } from "@/lib/base44/mocks/marketReseller";
import { marketServicesMockAdapter } from "@/lib/base44/mocks/marketServices";
import { meetingsMockAdapter } from "@/lib/base44/mocks/meetings";
import { memberProfilesMockAdapter } from "@/lib/base44/mocks/memberProfiles";
import { membersMockAdapter } from "@/lib/base44/mocks/members";
import { mobilityMockAdapter } from "@/lib/base44/mocks/mobility";
import { organizationsMockAdapter } from "@/lib/base44/mocks/organizations";
import { payMockAdapter } from "@/lib/base44/mocks/pay";
import { projectsMockAdapter } from "@/lib/base44/mocks/projects";
import { relocationsMockAdapter } from "@/lib/base44/mocks/relocations";
import { sanctionsMockAdapter } from "@/lib/base44/mocks/sanctions";
import { settingsMockAdapter } from "@/lib/base44/mocks/settings";
import { sharedMembershipsMockAdapter } from "@/lib/base44/mocks/sharedMemberships";
import { signaturesMockAdapter } from "@/lib/base44/mocks/signatures";
import { socialCasesMockAdapter } from "@/lib/base44/mocks/socialCases";
import { solidarityMockAdapter } from "@/lib/base44/mocks/solidarity";
import { tasksMockAdapter } from "@/lib/base44/mocks/tasks";
import { treasuryMockAdapter } from "@/lib/base44/mocks/treasury";

export const base44Client = axios.create({
  baseURL: ENV_CONFIG.BASE44_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mock interceptor pour le développement.
// Désactivable via NEXT_PUBLIC_USE_REAL_API=1 pour tester le backend réel.
const useMocks =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_REAL_API !== "1";

if (useMocks) {
  base44Client.interceptors.request.use((config) => {
    console.log(
      `[API Mock] ${config.method?.toUpperCase()} ${config.url}`,
      config.params || config.data,
    );

    const adapter =
      accountingMockAdapter(config) ??
      adminMockAdapter(config) ??
      affiliationsMockAdapter(config) ??
      announcementsMockAdapter(config) ??
      antennasMockAdapter(config) ??
      assetsMockAdapter(config) ??
      beneficiariesMockAdapter(config) ??
      contributionsMockAdapter(config) ??
      documentsMockAdapter(config) ??
      eventsMockAdapter(config) ??
      financeMockAdapter(config) ??
      governanceMockAdapter(config) ??
      hubMockAdapter(config) ??
      hrMockAdapter(config) ??
      loansMockAdapter(config) ??
      marketMockAdapter(config) ??
      marketInvestmentsMockAdapter(config) ??
      marketOrdersMockAdapter(config) ??
      marketResellerMockAdapter(config) ??
      marketServicesMockAdapter(config) ??
      meetingsMockAdapter(config) ??
      memberProfilesMockAdapter(config) ??
      membersMockAdapter(config) ??
      mobilityMockAdapter(config) ??
      organizationsMockAdapter(config) ??
      payMockAdapter(config) ??
      projectsMockAdapter(config) ??
      relocationsMockAdapter(config) ??
      sanctionsMockAdapter(config) ??
      settingsMockAdapter(config) ??
      sharedMembershipsMockAdapter(config) ??
      signaturesMockAdapter(config) ??
      socialCasesMockAdapter(config) ??
      solidarityMockAdapter(config) ??
      tasksMockAdapter(config) ??
      treasuryMockAdapter(config);
    if (adapter) {
      config.adapter = adapter;
    }
    return config;
  });

  base44Client.interceptors.response.use((response) => {
    // Simuler des données si le backend n'est pas disponible
    if (response.status === 200 && response.config.url?.includes("/members")) {
      // Si la réponse est vide, renvoyer des données mockées
      if (response.data.length === 0) {
        response.data = [
          {
            id: "1",
            organization_id: "org-1",
            user_id: "user-1",
            status: "active",
            role: "member",
            joined_at: new Date().toISOString(),
            user: {
              id: "user-1",
              name: "Jean Dupont",
              email: "jean@example.com",
              phone: "+224 600 00 00 00",
            },
          },
        ];
      }
    }
    return response;
  });
}
