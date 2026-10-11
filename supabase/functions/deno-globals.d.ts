// Déclaration minimale de l'API Deno utilisée par les fichiers index.ts, pour
// que le contrôle de types du dépôt (tsc, sous Node) les accepte. Ce fichier
// n'est importé par aucune fonction : sous Deno, le vrai global est utilisé.
declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
  env: { get(name: string): string | undefined };
};
