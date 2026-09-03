// Déclaration hors-ligne par module : quelles lectures sont consultables
// hors connexion et quelles mutations sont différées (rejouées à la reconnexion).
// Les déclarations sont additives : chaque hook déclare sa part et les
// déclarations du même module fusionnent.

export interface OfflineDeclaration {
  module: string;
  cacheableReads: string[];
  deferredMutations: string[];
}

const declarations = new Map<string, OfflineDeclaration>();

export function declareOffline(declaration: OfflineDeclaration): void {
  const existing = declarations.get(declaration.module);
  if (!existing) {
    declarations.set(declaration.module, {
      module: declaration.module,
      cacheableReads: [...declaration.cacheableReads],
      deferredMutations: [...declaration.deferredMutations],
    });
    return;
  }
  existing.cacheableReads = Array.from(
    new Set([...existing.cacheableReads, ...declaration.cacheableReads]),
  );
  existing.deferredMutations = Array.from(
    new Set([
      ...existing.deferredMutations,
      ...declaration.deferredMutations,
    ]),
  );
}

export function getOfflineDeclarations(): OfflineDeclaration[] {
  return Array.from(declarations.values());
}

export function getOfflineDeclaration(
  module: string,
): OfflineDeclaration | undefined {
  return declarations.get(module);
}
