// lib/base44/client.ts (avec mock temporaire)
import axios from "axios";
import { ENV_CONFIG } from "@/lib/env.config";

export const base44Client = axios.create({
  baseURL: ENV_CONFIG.BASE44_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Mock interceptor pour le développement
if (process.env.NODE_ENV === "development") {
  base44Client.interceptors.request.use((config) => {
    console.log(
      `[API Mock] ${config.method?.toUpperCase()} ${config.url}`,
      config.params || config.data,
    );
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
