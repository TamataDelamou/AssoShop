# Architecture – AssoShop

## Décision d'architecture (octobre 2026)

**AssoShop n'a pas d'application web.**

| Besoin | Réponse |
| --- | --- |
| Application des membres | **Flutter**, mobile et desktop |
| Back-office Global Service Groupe | **Mode administrateur** de l'application Flutter desktop, réservé aux comptes de `platform_admins` |
| Supervision globale | **Kernel GSG**, en tant que Control Plane (tableaux de bord, journaux) |
| Logique serveur | **Supabase** : fonctions SQL, politiques d'accès, Edge Functions, tâches planifiées (pg_cron) |

L'application Next.js de ce dépôt (`app/`, `components/`, `hooks/`, `services/`…) devient la **référence fonctionnelle** : écrans, libellés, enchaînements, règles de gestion. Elle sert au développement et aux tests ; elle n'est pas déployée en production et sera archivée quand l'application Flutter sera prête. Rien n'en est supprimé pour l'instant.

## Vue d'ensemble

```
   Application Flutter                                  Kernel GSG
 (membres + mode admin)                               (Control Plane)
          │                                                  ▲   │
          │ clé anon + jeton de l'utilisateur                │   │ JWT inter-services
          ▼                                                  │   ▼
┌───────────────────────────────── Supabase ─────────────────────────────────┐
│                                                                            │
│  Auth                  API de données              Edge Functions          │
│  code à 6 chiffres     tables sous RLS             ai-assistant            │
│  (e-mail, SMS,         fonctions SQL (RPC) :       pay-topup-confirm  ◄─── opérateur
│   WhatsApp)            PIN, portefeuille,          investments-settle      Mobile Money
│                        marché, investissement,     control-plane           │
│                        compte, back-office         control-plane-push ─────┼──► Kernel
│                                                         ▲                  │
│  PostgreSQL ── triggers d'audit ── file d'envoi         │ toutes les       │
│       └── pg_cron : dénouement des séquestres ──────────┘ 15 minutes       │
└────────────────────────────────────────────────────────────────────────────┘
```

Il n'y a aucun serveur applicatif entre l'application et la base. C'est donc **la base qui décide de tout** : ce qu'un utilisateur peut lire, ce qu'une opération a le droit de faire, combien elle coûte.

## Où vit la logique

| Nature | Emplacement | Exemples |
| --- | --- | --- |
| Lecture | Tables + politiques d'accès (RLS) | « un membre lit les données de ses organisations », « chacun lit son portefeuille » |
| Écriture sensible | Fonctions SQL `security definer` (`supabase/migrations/`) | `pay_transfer`, `market_pay_order`, `market_invest`, `pin_verify`, `account_close_self`, `admin_*` |
| Journal d'audit | Triggers SQL | `audit_events` (actions métier), `admin_audit_logs` (back-office) |
| Tâches planifiées | pg_cron (migration `0026`) | dénouement des séquestres, déclenchement de l'envoi au Kernel |
| Secret ou appel sortant | Edge Functions (`supabase/functions/`) | clé du fournisseur d'IA, webhook de l'opérateur, envoi au Kernel |

Règles de conception du backend :

- **Aucune écriture directe sur les tables sensibles** (portefeuilles, transactions, commandes, investissements, profils, tables du back-office) : elles ne changent que par des fonctions.
- **Rien de ce que le client envoie n'est cru** : prix, totaux, commissions, statuts et identité de l'appelant sont recalculés ou lus en base (`auth.uid()`).
- **Une opération = une transaction.** Débit, crédit, écriture comptable et journal se font ensemble ou pas du tout. Ordre de verrouillage fixe : projet ou commande, portefeuilles des utilisateurs (par identifiant), séquestre, portefeuille plateforme.
- **Idempotence** de tout ce qui peut être rejoué (confirmation de recharge, dénouement des séquestres, validation d'un bénéfice).
- **Montants entiers en francs guinéens.**
- **Argent réel verrouillé** par l'interrupteur `PAY_REAL_MONEY` tant que le partenaire agréé détenant les fonds n'est pas choisi.
- **Une migration appliquée ne se modifie jamais** ; toute correction est une nouvelle migration, appliquée après un essai à blanc et des tests de fumée (`scripts/apply-migrations.mjs`).

## Arborescence

```
assoshop-web/
├── supabase/
│   ├── migrations/             # 0001 → 0028 : tables, RLS, fonctions SQL, triggers, pg_cron
│   ├── functions/              # Edge Functions (Deno)
│   │   ├── _shared/            #   socle : secrets, HTTP, garde-fou argent réel, Control Plane (JWT, file d'envoi)
│   │   ├── ai-assistant/       #   assistant IA, appelé par l'application
│   │   ├── pay-topup-confirm/  #   webhook de recharge de l'opérateur
│   │   ├── pay-withdraw/       #   retrait (jeton utilisateur ; 503 tant qu'aucun opérateur n'est intégré)
│   │   ├── investments-settle/ #   dénouement des séquestres à la demande
│   │   ├── control-plane/      #   health, metrics, audit-logs pour le Kernel
│   │   └── control-plane-push/ #   envoi des métriques et journaux au Kernel
│   └── config.toml             # mode d'authentification de chaque fonction
├── scripts/                    # exploitation : migrations, tests de fumée, parcours e2e, sauvegarde, préflight
├── docs/                       # contrats et guides (voir ci-dessous)
├── tests/unit/                 # tests unitaires (logique partagée, migrations, Edge Functions)
│
│   ── Application web de référence (non déployée) ──
├── app/                        # routes Next.js : écrans, et /api/* qui relaient vers la base
├── components/ hooks/ services/ types/ utils/   # modules Community, Finance, Market, Pay, Hub, admin
└── lib/                        # clients Supabase, logique pure partagée, mocks de démonstration
```

## Documents

| Document | Pour qui | Contenu |
| --- | --- | --- |
| [docs/CONTRAT_BACKEND_FLUTTER.md](./docs/CONTRAT_BACKEND_FLUTTER.md) | Équipe Flutter | Connexion, fonctions RPC, tables et règles d'accès, Edge Functions, hors connexion, règles absolues |
| [docs/BACKOFFICE_FLUTTER.md](./docs/BACKOFFICE_FLUTTER.md) | Équipe Flutter | Écrans du mode administrateur et fonctions utilisées par chacun |
| [docs/INVENTAIRE_ROUTES_API.md](./docs/INVENTAIRE_ROUTES_API.md) | Équipes Flutter et backend | Sort de chaque route de l'application web : toutes ont leur équivalent en base ou en Edge Function |
| [docs/CONTROL_PLANE.md](./docs/CONTROL_PLANE.md) | Équipe Kernel | Contrat d'interface avec le Control Plane GSG |
| [docs/PRODUCTION.md](./docs/PRODUCTION.md) | Exploitant | Mise en production pas à pas |
| [ARCHITECTE_ASSOSHOP.md](./ARCHITECTE_ASSOSHOP.md) | Tous | Cahier des charges (écrans, règles de gestion RG-xxx) |

## Authentification

- Code à usage unique à 6 chiffres par e-mail, SMS ou WhatsApp (Supabase Auth). Demander un code crée le compte s'il n'existe pas.
- Code PIN à 4 chiffres, créé et vérifié **en base** (`pin_set`, `pin_verify`, `pin_status`) : empreinte bcrypt, cinq essais, verrouillage de quinze minutes. L'empreinte n'est pas lisible par les clients.
- Administrateur de la plateforme : compte ordinaire inscrit dans `platform_admins` par un script d'exploitation. Les fonctions `admin_*` et les politiques des tables `admin_*` s'appuient sur `is_platform_admin()`.

## Control Plane GSG (Kernel)

Le Kernel GSG n'est pas un fournisseur de services : c'est un **Control Plane** (super-admin, hub de tableaux de bord). AssoShop ne lui délègue rien et fonctionne sans lui.

- **Authentification, référentiels pays / opérateurs, configuration** : internes à AssoShop.
- **Reporting sortant** : métriques agrégées (`cp_metrics_snapshot`) et journaux d'audit mis en file (`control_plane_outbox`) par triggers SQL, envoyés par l'Edge Function `control-plane-push` (rejeu exponentiel, idempotence), déclenchée par pg_cron.
- **Accès entrants** : Edge Function `control-plane` (`/health`, `/metrics`, `/audit-logs`), protégée par JWT inter-services à usage unique et mTLS optionnel.

Contrat d'interface : [docs/CONTROL_PLANE.md](./docs/CONTROL_PLANE.md).

## Ce qui reste à faire côté backend

Détail dans [docs/INVENTAIRE_ROUTES_API.md](./docs/INVENTAIRE_ROUTES_API.md) et dans la dernière section du contrat Flutter :

- transformer en fonctions SQL les opérations de Community, Finance et comptabilité qui enchaînent plusieurs écritures (20 routes de l'application web) ;
- fermer en base les votes, les signatures électroniques et la modification des cas sociaux, aujourd'hui ouverts à tout membre d'une organisation ;
- brancher cotisations, tontines et prêts sur le portefeuille ;
- retrait réel vers Mobile Money et signature du webhook de l'opérateur, une fois le partenaire agréé choisi.

## Application web de référence

Tant qu'elle existe, elle s'appuie sur le même backend. Pour le compte (PIN, profil, KYC), Pay et Market, ses routes `/api/*` ne font que relayer vers les fonctions SQL appelées par Flutter. Deux exceptions, détaillées dans l'inventaire des routes : les opérations de Community et de Finance qui enchaînent encore plusieurs écritures depuis le serveur web, et le back-office web, qui passe par la clé `service_role` là où Flutter utilise les fonctions `admin_*`. Conventions du code : valeurs et libellés centralisés dans `utils/constants.ts`, typage strict dans `types/modules/`, composants de présentation, hooks pour l'état, services pour les appels.
