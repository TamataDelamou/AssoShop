# AssoShop

Plateforme de gestion des associations et de leur écosystème communautaire : membres, cotisations, cas sociaux, réunions, gouvernance, finance communautaire, marketplace et portefeuille.

## Architecture en bref

AssoShop **n'a pas d'application web** en production.

- **Application des membres** : Flutter (mobile et desktop).
- **Back-office** : mode administrateur de l'application Flutter desktop.
- **Supervision globale** : Kernel GSG (Control Plane).
- **Backend** : Supabase — base PostgreSQL (tables, politiques d'accès, fonctions SQL), authentification, Edge Functions et tâches planifiées.

Ce dépôt contient :

| Dossier | Rôle |
| --- | --- |
| `supabase/migrations/` | Le backend : tables, règles d'accès, fonctions appelées par l'application, tâches planifiées |
| `supabase/functions/` | Les Edge Functions (assistant IA, webhook de recharge, Control Plane) |
| `scripts/` | Exploitation : application des migrations, tests de fumée, parcours de bout en bout |
| `docs/` | Contrats pour l'équipe Flutter et l'équipe Kernel, guide de mise en production |
| `app/`, `components/`, `hooks/`, … | L'application web Next.js de **référence fonctionnelle** : non déployée, à archiver quand Flutter sera prêt |

Détail : [ARCHITECTURE.md](./ARCHITECTURE.md).

## Par où commencer

| Vous êtes… | Lisez |
| --- | --- |
| Développeur Flutter | [docs/CONTRAT_BACKEND_FLUTTER.md](./docs/CONTRAT_BACKEND_FLUTTER.md), puis [docs/BACKOFFICE_FLUTTER.md](./docs/BACKOFFICE_FLUTTER.md) |
| Développeur backend | [ARCHITECTURE.md](./ARCHITECTURE.md), [docs/INVENTAIRE_ROUTES_API.md](./docs/INVENTAIRE_ROUTES_API.md) |
| Équipe Kernel | [docs/CONTROL_PLANE.md](./docs/CONTROL_PLANE.md) |
| Responsable de la mise en production | [docs/PRODUCTION.md](./docs/PRODUCTION.md) |

## Prérequis

- Node.js 22 ou plus récent
- Un projet Supabase de test
- Supabase CLI (pour déployer les Edge Functions)

## Installation

```bash
npm install
```

Copier `.env.example` vers `.env.local` et renseigner les accès au projet Supabase **de test** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, et `PGHOST`… pour les migrations).

## Backend

```bash
# État de la base (lecture seule)
node --env-file=.env.local scripts/db-state.mjs

# Essai à blanc des migrations en attente + tests de fumée (tout est annulé)
node --env-file=.env.local scripts/apply-migrations.mjs --dry-run --smoke

# Application réelle (une transaction, tout ou rien)
node --env-file=.env.local scripts/apply-migrations.mjs --smoke

# Edge Functions
supabase functions deploy --use-api

# Régénérer la référence des fonctions et des tables dans les documents
node --env-file=.env.local scripts/generate-backend-reference.mjs
```

Une migration appliquée ne se modifie jamais : toute correction est une nouvelle migration numérotée.

## Application web de référence

```bash
npm run dev      # http://localhost:3000 — données de démonstration
```

Pour la brancher sur le projet Supabase de test, définir `NEXT_PUBLIC_USE_REAL_API=1`.

## Vérifications

| Commande | Rôle |
| --- | --- |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Contrôle de types (application de référence et Edge Functions) |
| `npm test` | Tests unitaires (logique partagée, migrations, Edge Functions) |
| `npm run build` | Compilation de l'application de référence |
| `node --env-file=.env.local scripts/e2e-security.mjs` | Parcours réel sur la base de **test** (serveur de développement lancé avec `PAY_WEBHOOK_SECRET` et `CRON_SECRET`) |

Les parcours de bout en bout ne se lancent **jamais** sur la base de production : ils laissent des traces dans le journal d'audit, qui ne s'efface pas.
