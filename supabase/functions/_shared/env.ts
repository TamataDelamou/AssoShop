// Accès aux secrets des Edge Functions. En production le code tourne sous
// Deno (Deno.env) ; les tests unitaires le chargent sous Node (process.env).

type EnvSource = { get(name: string): string | undefined };

function source(): EnvSource {
  const g = globalThis as unknown as {
    Deno?: { env: EnvSource };
    process?: { env: Record<string, string | undefined> };
  };
  if (g.Deno?.env) return g.Deno.env;
  return { get: (name) => g.process?.env?.[name] };
}

export function env(name: string): string | undefined {
  return source().get(name);
}

// Valeur non vide, sans espaces autour ; null sinon.
export function secret(name: string): string | null {
  const value = env(name)?.trim();
  return value ? value : null;
}
