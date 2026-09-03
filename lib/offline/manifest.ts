// Déclaration hors-ligne par module : quelles lectures sont consultables
// hors connexion et quelles mutations sont différées (rejouées à la reconnexion).

export interface OfflineDeclaration {
  module: string;
  cacheableReads: string[];
  deferredMutations: string[];
}

const declarations = new Map<string, OfflineDeclaration>();

export function declareOffline(declaration: OfflineDeclaration): void {
  declarations.set(declaration.module, declaration);
}

export function getOfflineDeclarations(): OfflineDeclaration[] {
  return Array.from(declarations.values());
}

export function getOfflineDeclaration(
  module: string,
): OfflineDeclaration | undefined {
  return declarations.get(module);
}
