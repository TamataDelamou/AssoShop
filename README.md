# AssoShop – Web

Plateforme web de gestion des associations et de leur écosystème communautaire :
membres, cotisations, cas sociaux, réunions, gouvernance et marketplace.

## Stack technique

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- TypeScript (mode strict)
- Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (style `radix-nova`)
- [Supabase](https://supabase.com) : authentification (OTP) et base de données
- `@supabase/ssr` : gestion de session en App Router (cookies)
- axios : client HTTP vers l'API métier (Base44)

## Prérequis

- Node.js 20+ (recommandé 22+)
- Un projet Supabase configuré

## Installation

```bash
npm install
```

## Configuration

Copier `.env.example` vers `.env.local` puis renseigner les variables :

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé `anon` du projet Supabase |
| `NEXT_PUBLIC_KERNEL_API_URL` | URL du GSG Platform Kernel (optionnel, mocké par défaut) |
| `NEXT_PUBLIC_KERNEL_API_KEY` | Clé du Kernel (optionnel) |
| `NEXT_PUBLIC_BASE44_API_URL` | URL de l'API métier (défaut : `/api`) |

Appliquer les migrations SQL présentes dans `supabase/migrations/` à la base Supabase
(elles créent notamment la table `user_profiles` pour le PIN).

## Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Lancer le build de production |
| `npm run lint` | ESLint |

## Structure

Voir [ARCHITECTURE.md](./ARCHITECTURE.md).
