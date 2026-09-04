// Route serveur d'inférence IA (fournisseur OpenAI-compatible).
// La clé d'API reste côté serveur : le client ne l'expose jamais.
// Compatible OpenAI, Mistral, OpenRouter, Groq, Ollama, etc. via
// AI_BASE_URL (chemin /chat/completions).

const BASE_URL = (
  process.env.AI_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const MAX_TOKENS = 700;

export async function POST(request: Request) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    system?: unknown;
    user?: unknown;
  } | null;
  const system = typeof body?.system === "string" ? body.system : "";
  const user = typeof body?.user === "string" ? body.user : "";

  if (!user.trim()) {
    return Response.json({ error: "EMPTY_PROMPT" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!upstream.ok) {
      return Response.json(
        { error: `PROVIDER_${upstream.status}` },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return Response.json({ error: "EMPTY_RESPONSE" }, { status: 502 });
    }

    return Response.json({ text });
  } catch {
    return Response.json({ error: "PROVIDER_UNREACHABLE" }, { status: 502 });
  }
}
