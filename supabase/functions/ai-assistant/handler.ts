import type { User } from "@supabase/supabase-js";
import { isAiIntent, SYSTEM_PROMPTS } from "../_shared/ai-prompts.ts";
import { env, secret } from "../_shared/env.ts";
import { CORS_HEADERS, json, readJson } from "../_shared/http.ts";
import { userFromRequest } from "../_shared/supabase.ts";

// POST /functions/v1/ai-assistant  { "intent": "minutes", "input": "…" }
// Assistant IA (fournisseur compatible OpenAI : OpenAI, Mistral, OpenRouter…).
//
// - Appel authentifié par le jeton Supabase de l'utilisateur (Authorization:
//   Bearer <access_token>), vérifié auprès du service d'authentification.
// - La clé AI_API_KEY ne quitte jamais le serveur.
// - Le client choisit une INTENTION parmi une liste fermée ; l'invite système
//   correspondante est fixée ici. Il ne peut pas en fournir une autre : la
//   fonction ne sert pas de relais libre vers le fournisseur.
// - L'assistant informe et prépare des textes ; il n'exécute jamais d'action
//   financière ni de gestion (cahier, RG-H03).
//
// Réponse : { "text": "…" }. Sans AI_API_KEY : 503 AI_NOT_CONFIGURED, et
// l'application retombe sur sa synthèse locale.

export const MAX_INPUT_CHARS = 12_000;
const MAX_TOKENS = 700;

export interface Deps {
  getUser: (request: Request) => Promise<User | null>;
  fetchImpl: typeof fetch;
}

const defaults: Deps = { getUser: userFromRequest, fetchImpl: fetch };

const reply = (body: unknown, status = 200) => json(body, status, CORS_HEADERS);

export async function handle(request: Request, deps: Deps = defaults): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);

  const user = await deps.getUser(request);
  if (!user) return reply({ error: "UNAUTHENTICATED" }, 401);

  const body = await readJson<{ intent?: unknown; input?: unknown }>(request);
  if (!isAiIntent(body?.intent)) return reply({ error: "UNKNOWN_INTENT" }, 400);
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  if (!input) return reply({ error: "EMPTY_PROMPT" }, 400);
  if (input.length > MAX_INPUT_CHARS) return reply({ error: "PROMPT_TOO_LONG" }, 413);

  const apiKey = secret("AI_API_KEY");
  if (!apiKey) return reply({ error: "AI_NOT_CONFIGURED" }, 503);
  const baseUrl = (env("AI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env("AI_MODEL") ?? "gpt-4o-mini";

  try {
    const upstream = await deps.fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[body.intent] },
          { role: "user", content: input },
        ],
      }),
    });
    if (!upstream.ok) return reply({ error: `PROVIDER_${upstream.status}` }, 502);

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return reply({ error: "EMPTY_RESPONSE" }, 502);
    return reply({ text });
  } catch {
    return reply({ error: "PROVIDER_UNREACHABLE" }, 502);
  }
}
