# AssoShop ↔ Control Plane GSG — Contrat d'interface

> Statut : **proposition AssoShop, à valider par l'équipe Kernel.**
> Origine : directive d'architecture « Mutation du rôle du Kernel GSG » (oct. 2026).
> Le Kernel devient exclusivement un **Control Plane centralisé (super-admin / hub de tableaux de bord)**.

## 1. Ce qui change pour AssoShop

| Avant | Après |
| --- | --- |
| Authentification, sessions et identité fédérée attendues du Kernel (GSG ID) | **Internes** : Supabase Auth (OTP SMS / WhatsApp / e-mail) + PIN haché, dans AssoShop |
| Référentiels pays / devises / langues fournis par le Kernel | **Internes** : tables `admin_countries`, `admin_operators`, `admin_config` gérées depuis le back-office AssoShop |
| `lib/kernel/adapter.ts` + `NEXT_PUBLIC_KERNEL_API_URL/KEY` (clé exposée au navigateur) | **Supprimés** |
| — | **Nouveau** : AssoShop **pousse** ses métriques et journaux d'audit vers le Kernel, et l'autorise à **interroger** ses instances via jeton inter-services |

AssoShop fonctionne entièrement sans le Kernel : si le Control Plane est indisponible, les envois restent en file et sont rejoués.

## 2. Flux sortant : AssoShop → Kernel (push)

### 2.1 Mécanisme
- Pattern **outbox** : table `control_plane_outbox` (migration `0016`).
- Les journaux d'audit (`admin_audit_logs`, `admin_security_audit`, et `audit_events` pour les actions métier — migration `0018`) sont mis en file **automatiquement par trigger SQL**, sans dépendre du code applicatif.
- Un instantané de métriques est mis en file à chaque déclenchement de l'Edge Function `control-plane-push` (tâche pg_cron toutes les 15 minutes, voir §4.1).
- Envoi par lots de 100, **rejeu exponentiel** (30 s → 6 h max), abandon après 10 tentatives (statut `failed`, visible dans `/health`).
- En-tête `Idempotency-Key` (SHA-256 des identifiants du lot) et `outbox_id` sur chaque élément : **le Kernel doit dédoublonner** (livraison « au moins une fois »).

### 2.2 Endpoints attendus côté Kernel (configurables)

| Variable | Contenu reçu | Scope du jeton |
| --- | --- | --- |
| `CONTROL_PLANE_AUDIT_URL` | `POST` lot de journaux d'audit | `audit:write` |
| `CONTROL_PLANE_METRICS_URL` | `POST` lot d'instantanés de métriques | `metrics:write` |

Réponse attendue : tout code `2xx` = accepté. Tout autre code ou délai > 10 s = rejeu.

### 2.3 Jeton sortant (signé par AssoShop)

```
Authorization: Bearer <JWT>
iss = CONTROL_PLANE_SERVICE_ID     (ex. "assoshop")
sub = CONTROL_PLANE_INSTANCE_ID    (ex. "assoshop-gn-prod")
aud = CONTROL_PLANE_KERNEL_ISSUER  (ex. "gsg-kernel")
scope = "audit:write" | "metrics:write"
durée de vie = 120 s, jti unique
```
Algorithme selon la clé fournie : HS256 (secret partagé ≥ 32 caractères) ou RS256 / ES256 / EdDSA (clé privée PEM — **recommandé** : le Kernel ne détient alors que la clé publique).

### 2.4 Formats

**Audit** (`schema: gsg.audit.v1`)
```json
{
  "schema": "gsg.audit.v1",
  "service": "assoshop",
  "instance": "assoshop-gn-prod",
  "sent_at": "2026-10-11T14:00:00.000Z",
  "events": [
    {
      "outbox_id": "uuid",
      "source": "admin | security | activity",
      "id": "uuid de l'entrée d'audit",
      "occurred_at": "2026-10-11T13:59:12.000Z",
      "record": { "actor": "…", "action": "toggle_country:…", "module": "config", "severity": "info" }
    }
  ]
}
```

**Métriques** (`schema: gsg.metrics.batch.v1`, chaque instantané en `gsg.metrics.v1`)
```json
{
  "schema": "gsg.metrics.batch.v1",
  "service": "assoshop",
  "instance": "assoshop-gn-prod",
  "sent_at": "…",
  "snapshots": [
    {
      "outbox_id": "uuid",
      "schema": "gsg.metrics.v1",
      "generated_at": "…",
      "currency": "GNF",
      "metrics": {
        "organizations_total": 0, "organizations_active": 0,
        "members_total": 0, "members_active": 0, "users_total": 0,
        "contributions_paid_amount": 0, "contributions_overdue_count": 0,
        "social_cases_open": 0, "social_cases_collected_amount": 0,
        "financial_groups_active": 0,
        "loans_active_count": 0, "loans_outstanding_amount": 0,
        "pay_transactions_24h_count": 0, "pay_transactions_24h_volume": 0, "pay_commissions_24h": 0,
        "platform_wallet_balance": 0,
        "investment_escrow_balance": 0, "investment_distributions_pending": 0,
        "market_orders_24h_count": 0, "market_gmv_24h": 0,
        "kyc_pending": 0, "disputes_open": 0,
        "audit_events_24h": 0,
        "outbox_pending": 0, "outbox_failed": 0
      }
    }
  ]
}
```
Uniquement des **agrégats** : aucune donnée personnelle de membre ne quitte AssoShop par ce canal.

### 2.5 Source `activity` : journal des actions métier

Les événements de la table `audit_events` (migration `0018`) sont écrits par triggers SQL sur les tables métier et remontent avec `"source": "activity"`. Le champ `record` a la forme suivante :

```json
{
  "id": "uuid",
  "organization_id": "uuid | null",
  "actor_id": "uuid | null",
  "event_type": "contribution.validated",
  "entity_type": "contribution",
  "entity_id": "uuid",
  "amount": 50000,
  "currency": "GNF | null",
  "before": { "status": "pending" },
  "after": { "status": "paid" },
  "created_at": "2026-10-11T13:59:12.000Z"
}
```

| Domaine | `event_type` |
| --- | --- |
| Portefeuille (sans organisation) | `pay.payment`, `pay.topup` (demande), `pay.topup_confirmed` (crédit confirmé par le serveur, migration `0019`), `pay.withdrawal`, `pay.transfer` |
| Marché (sans organisation) | `market.order_paid` (migration `0019`) |
| Investissement (sans organisation, migration `0023`) | `investment.released` (séquestre versé au porteur), `investment.refunded` (investisseurs remboursés), `investment.profit_distributed` (bénéfices répartis) |
| Cotisations | `contribution.validated`, `contribution.rejected` |
| Prêts | `loan.approved`, `loan.rejected`, `loan.repaid`, `loan.installment_repaid` |
| Groupes financiers | `group_payment.validated` |
| Cas sociaux | `social_case.under_review`, `social_case.approved`, `social_case.funded`, `social_case.disbursed`, `social_case.rejected` |
| Comptabilité | `accounting_entry.validated`, `accounting_entry.rejected` |
| Membres | `member.role_changed`, `member.status_changed`, `member.removed` |
| Signatures | `signature.signed`, `signature.rejected` |

- `actor_id` est l'identifiant technique de l'utilisateur (`auth.uid()`), `null` pour une action du système.
- `before` / `after` ne portent que le statut, le rôle et des identifiants techniques : **ni nom, ni téléphone, ni pièce KYC**.
- La table est en **ajout seul** : toute modification ou suppression est refusée en base.

## 3. Flux entrant : Kernel → AssoShop (pull)

| Méthode | Chemin | Scope requis | Rôle |
| --- | --- | --- | --- |
| `GET` | `/functions/v1/control-plane/health` | `health:read` | État de l'instance (base, file d'envoi, configuration) |
| `GET` | `/functions/v1/control-plane/metrics` | `metrics:read` | Instantané des métriques calculé à la demande |
| `GET` | `/functions/v1/control-plane/audit-logs?source=admin\|security\|activity&since=ISO&limit=≤500` | `audit:read` | Journaux d'audit paginés (repasser `next_since`) |
| `GET`/`POST` | `/functions/v1/control-plane-push` | `control-plane:push` (ou `CRON_SECRET`) | Force un instantané + envoi de la file |

Ces points d'accès sont des **Supabase Edge Functions** (`supabase/functions/control-plane` et `supabase/functions/control-plane-push`), servies à l'adresse `https://<ref-du-projet>.supabase.co`. AssoShop n'a plus d'application web : les anciens chemins `/api/control-plane/*` de l'application Next.js de référence ne sont pas déployés en production. Le contrat (jetons, scopes, formats, codes de refus) est inchangé.

Les fonctions sont déployées avec `verify_jwt = false` (`supabase/config.toml`) : la passerelle Supabase n'exige pas de jeton d'utilisateur, c'est la fonction qui vérifie le JWT inter-services du Kernel.

### 3.1 Jeton entrant (signé par le Kernel)
```
iss = CONTROL_PLANE_KERNEL_ISSUER  (défaut "gsg-kernel")
aud = CONTROL_PLANE_SERVICE_ID     (défaut "assoshop")
scope = liste séparée par des espaces
exp - iat ≤ 600 s ; tolérance d'horloge 30 s
jti OBLIGATOIRE et à USAGE UNIQUE (anti-rejeu en base) → un jeton par requête
```
Vérification : clé publique PEM du Kernel (`CONTROL_PLANE_INBOUND_PUBLIC_KEY`, recommandé) ou secret partagé. L'algorithme est imposé par la clé configurée (`alg: none` et confusion d'algorithme refusés).

Codes de refus : `401` (`jeton_absent`, `signature_invalide`, `expire`, `aud_refuse`, `jeton_rejoue`, `certificat_client_refuse`…), `403` (`scope_insuffisant`), `404` si l'intégration est désactivée (`CONTROL_PLANE_ENABLED≠1`), `503` si non configurée.

Chaque appel accepté est tracé dans `control_plane_access_log` (jti, émetteur, scope, chemin, IP).

### 3.2 mTLS (optionnel, en complément du JWT)
La poignée de main mTLS se fait sur une terminaison TLS placée devant les Edge Functions (reverse proxy / load balancer), pas dans les fonctions elles-mêmes. Sans une telle terminaison, laisser ces deux variables vides. Celle-ci doit transmettre l'empreinte du certificat client dans un en-tête :
- `CONTROL_PLANE_MTLS_HEADER` = nom de l'en-tête (ex. `x-client-cert-fingerprint`)
- `CONTROL_PLANE_MTLS_FINGERPRINTS` = empreintes SHA-256 autorisées, séparées par des virgules

Le proxy doit **supprimer cet en-tête s'il arrive du client**, sinon il serait falsifiable.

## 4. Configuration (secrets des Edge Functions)

Ces valeurs sont des **secrets des Edge Functions**, posés avec `supabase secrets set NOM=valeur` (ou dans le tableau de bord : *Edge Functions → Secrets*). Elles ne sont jamais embarquées dans l'application Flutter.

```bash
CONTROL_PLANE_ENABLED=1
CONTROL_PLANE_SERVICE_ID=assoshop
CONTROL_PLANE_INSTANCE_ID=assoshop-gn-prod
CONTROL_PLANE_KERNEL_ISSUER=gsg-kernel
CONTROL_PLANE_METRICS_URL=https://<kernel>/ingest/metrics
CONTROL_PLANE_AUDIT_URL=https://<kernel>/ingest/audit
CONTROL_PLANE_OUTBOUND_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…"   # ou CONTROL_PLANE_OUTBOUND_SECRET
CONTROL_PLANE_INBOUND_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…"     # ou CONTROL_PLANE_INBOUND_SECRET
CONTROL_PLANE_MTLS_HEADER=x-client-cert-fingerprint                  # optionnel
CONTROL_PLANE_MTLS_FINGERPRINTS=ab12…,cd34…                          # optionnel
CRON_SECRET=<aléatoire ≥ 32 caractères>
```

### 4.1 Planification : pg_cron

L'envoi est déclenché **par la base elle-même**, toutes les 15 minutes (migration `0026`) : la tâche pg_cron `assoshop-control-plane-push` exécute la fonction SQL `cp_trigger_push()`, qui appelle l'Edge Function `control-plane-push` par HTTP (extension `pg_net`) avec `Authorization: Bearer <CRON_SECRET>`.

L'adresse et le secret sont lus dans **Supabase Vault** au moment de l'appel :

| Secret Vault | Valeur |
| --- | --- |
| `assoshop_functions_url` | `https://<ref-du-projet>.supabase.co/functions/v1` |
| `assoshop_cron_secret` | la même valeur que le secret `CRON_SECRET` des Edge Functions |

Tant que ces deux secrets ne sont pas dans Vault, la tâche ne fait rien (`cp_trigger_push()` renvoie `skipped`) : c'est l'état normal d'un projet où le Control Plane n'est pas branché. Les poser : voir `docs/PRODUCTION.md`.

Le Kernel peut aussi déclencher l'envoi lui-même, avec un JWT portant le scope `control-plane:push`.

Le même passage dénoue les séquestres d'investissement échus (idempotent) ; son compte rendu figure sous la clé `investments` de la réponse. Ce dénouement ne dépend pas pour autant du Control Plane : une seconde tâche pg_cron, `assoshop-investments-settle`, l'exécute en SQL direct toutes les 15 minutes, sans appel réseau, et signale tout échec dans `admin_audit_logs` (`investment_settlement_failed:…`, gravité `critical`).

Contrôle : `select jobname, schedule, active from cron.job;` puis `select * from cron.job_run_details order by start_time desc limit 10;`.

## 5. Points à valider avec l'équipe Kernel

1. URLs définitives des endpoints d'agrégation et formats (`gsg.audit.v1`, `gsg.metrics.v1`) — adaptables sans toucher au reste.
2. Choix de clés : paire asymétrique par service (recommandé) ou secret partagé.
3. Jeton à usage unique côté entrant : le Kernel doit émettre un jeton (jti) par requête.
4. Liste des métriques attendues par le tableau de bord central.
5. Rétention et purge de `control_plane_outbox` (`sent`) et `control_plane_access_log`.

## 6. Limite connue

Depuis la migration `0018`, les actions métier demandées par le cahier v6 (§14) — paiements, validations, retraits, changements de rôle — sont journalisées dans `audit_events` et remontent avec la source `activity`. Restent hors du journal :

- **Actions antérieures à la migration** : aucune reprise d'historique, le journal démarre à l'application de `0018`.
- **Créations et versements directs** : seuls les changements de statut sont tracés (validation, rejet, remboursement…). Un versement de groupe ou une cotisation enregistrés directement à l'état final, sans passer par une validation, ne produisent pas d'événement.
- **Modules non couverts** : Market hors paiement de commande (avancement logistique, annulation, revendeurs), sanctions, élections et adhésions aux groupes ne sont pas encore reliés au journal.
- **Auteur** : `actor_id` est vide pour toute écriture faite avec la clé `service_role` ou par une tâche planifiée (dénouement des séquestres), l'identité de l'appelant n'étant alors pas connue de la base.
- **Métriques** : `cp_metrics_snapshot()` expose aussi `platform_wallet_balance`, `investment_escrow_balance` (total bloqué en séquestre) et `investment_distributions_pending`.
