# Architecture – AssoShop Web

## Vue d'ensemble

`assoshop-web` est une application Next.js 16 (App Router) organisée en modules
métier isolés : Community, Finance, Market, Pay et Hub. Chaque module dispose de
ses propres composants, hooks, services et types.

## Arborescence

```
assoshop-web/
├── app/                        # Routes (App Router)
│   ├── api/                    # Route handlers (health check, auth/check-pin, auth/set-pin)
│   ├── auth/login/             # Page de connexion (OTP + PIN)
│   ├── dashboard/              # Layout protégé (vérification serveur) + pages
│   └── layout.tsx / page.tsx   # Layout racine + page d'accueil
├── components/
│   ├── ui/                     # Primitives shadcn/ui uniquement
│   ├── layout/                 # Sidebar, Header
│   └── <module>/               # Composants métier (community, finance, market, pay, hub)
├── hooks/
│   ├── <module>/               # Hooks métier (état, chargement, erreurs, refetch)
│   └── useAuth.ts, ...         # Hooks transverses
├── lib/
│   ├── supabase/               # Clients Supabase (client.ts navigateur, server.ts serveur)
│   ├── contexts/               # AuthContext (session côté client)
│   ├── base44/                 # Client HTTP vers l'API métier
│   ├── env.config.ts           # Accès centralisé aux variables d'environnement
│   ├── pin.ts                  # Hachage du PIN (scrypt)
│   └── utils.ts                # Fonctions utilitaires (cn, getErrorMessage)
├── proxy.ts                    # Rafraîchissement de session Supabase (ex-middleware)
├── services/
│   └── <module>/               # Appels API bruts (via base44Client)
├── supabase/
│   └── migrations/             # Migrations SQL (tables, RLS)
├── types/
│   └── modules/                # Interfaces et enums par module
└── utils/
    ├── constants.ts            # Messages, libellés, valeurs (zéro valeur en dur)
    ├── formatters.ts           # Formatage (dates, montants)
    └── validators.ts           # Validation de saisie
```

## Règles de conception

- **Zéro valeur en dur** : textes, valeurs numériques et URLs centralisés dans
  `utils/constants.ts` et `lib/env.config.ts`. Couleurs exclusivement via les
  classes Tailwind sémantiques (`bg-background`, `text-foreground`, etc.).
- **Séparation des responsabilités** : les composants ne font que la présentation ;
  les hooks gèrent l'état et appellent les services ; les services effectuent les
  appels API via `base44Client` ; les utils restent des fonctions pures.
- **Typage strict** : interfaces et enums dans `types/modules/`, dates converties
  en `Date` dès la réception.
- **Gestion d'état** : chaque hook expose `loading`, `error` et `refetch` (si
  applicable) ; les composants affichent un `Skeleton` et une alerte en cas d'erreur.

## Authentification

- Connexion OTP (SMS, WhatsApp, email OTP, magic link) via Supabase.
- Vérification de session côté serveur dans `app/dashboard/layout.tsx` avec
  `createSupabaseServerClient()` (`getUser()`).
- Le `proxy.ts` rafraîchit la session Supabase à chaque requête.
- Le PIN (4 chiffres) est haché (scrypt) et stocké dans `public.user_profiles` ;
  l'existence du PIN est vérifiée via `GET /api/auth/check-pin`, la création via
  `POST /api/auth/set-pin`.

## Control Plane GSG (Kernel)

Depuis la directive « Mutation du rôle du Kernel » (oct. 2026), le Kernel GSG
n'est plus un fournisseur de services : c'est un **Control Plane** (super-admin,
hub de tableaux de bord). AssoShop ne lui délègue plus rien :

- **Authentification et sessions** : internes (Supabase Auth + PIN).
- **Référentiels pays / opérateurs / configuration** : internes (`admin_countries`,
  `admin_operators`, `admin_config`).
- **Reporting sortant** (`lib/control-plane/exporter.ts`) : métriques agrégées et
  journaux d'audit envoyés via une file `control_plane_outbox` (trigger SQL sur
  les journaux d'audit, rejeu exponentiel, idempotence).
- **Accès entrants** (`app/api/control-plane/*`) : `health`, `metrics`,
  `audit-logs`, `push`, protégés par JWT inter-services à usage unique
  (`lib/control-plane/jwt.ts`, `guard.ts`) et mTLS optionnel.

Contrat d'interface : [docs/CONTROL_PLANE.md](./docs/CONTROL_PLANE.md).

## Modules restants (à implémenter)

- Community : cotisations, cas sociaux, réunions, gouvernance, projets.
- Finance, Market, Pay, Hub : à construire.
