# Inventaire des routes de l'application web de référence

AssoShop n'a plus d'application web : l'application Flutter parle directement à Supabase. Ce document passe en revue chaque route `app/api/**` de l'application Next.js de référence et dit où se trouve désormais sa logique.

| Statut | Signification |
| --- | --- |
| **déjà en base** | La route ne fait que relayer : une fonction SQL (RPC) ou une lecture / écriture simple protégée par les politiques d'accès (RLS). Flutter appelle la base directement. |
| **passé en base (0025 / 0027 / 0028)** | La logique était dans la route (ou exigeait la clé `service_role`) ; elle est maintenant une fonction SQL, créée par la migration indiquée. |
| **reste serveur → Edge Function** | Exige un secret ou un appel sortant : la logique vit dans une Supabase Edge Function (`supabase/functions/`). |
| **à passer en base** | La route enchaîne plusieurs écritures depuis le serveur web. **Il n'en reste aucune.** |
| sans objet | Propre à l'application web. |

Le tableau est produit par `scripts/generate-backend-reference.mjs` à partir du code des routes : ne le modifiez pas à la main.

## Ce qui a été passé en base

Plus aucune route n'enchaîne d'écritures depuis le serveur web. Les deux derniers lots :

- **Migration 0027 — écritures réservées aux personnes autorisées.** L'inventaire avait montré que la clé `anon` et le jeton d'un membre suffisaient à modifier des tables qui ne devaient pas l'être. C'est fermé :

| Table | Ce que la base laissait faire | Règle appliquée désormais |
| --- | --- | --- |
| `election_candidates` | Tout membre pouvait modifier le nombre de voix d'un candidat | Un vote par membre et par scrutin (`election_votes`), compté en base ; scrutin clôturé figé, même pour le serveur (RG-C06) |
| `signature_signatories`, `signature_requests` | Tout membre pouvait signer à la place d'un autre ou clore la demande | Chaque ligne désigne un compte ; lui seul la signe ; la demande se clôt d'elle-même |
| `social_cases`, `social_case_contributors` | Tout membre pouvait changer le statut ou le montant collecté | Validation par le bureau, décaissement par le président ou la trésorerie une fois l'objectif atteint, montant collecté calculé à partir des contributions (RG-C05) |
| `market_reviews`, `market_service_reviews`, `market_services` | Tout utilisateur connecté pouvait publier un avis ; un prestataire pouvait fixer sa propre note | Avis après une sollicitation confirmée (service) ou une commande livrée (revendeur) ; note recalculée en base (RG-M04) |
| `pay_withdraw` | Tout utilisateur connecté pouvait débiter son portefeuille sans aucun versement réel | Fonction réservée au serveur ; seul chemin : l'Edge Function `pay-withdraw`, derrière le garde-fou `PAY_REAL_MONEY` |

- **Migration 0028 — opérations atomiques.** Les 20 opérations en plusieurs écritures (groupes financiers, versements, parrainage, prêts, fonds de garantie, cotisations, projets, réunions, transferts, comptabilité, Hub) sont chacune une fonction SQL : une transaction, des verrous de ligne, un contrôle du rôle de l'appelant. Les écritures directes correspondantes sont fermées.

Trois choix faits en passant ces opérations en base, à connaître :

1. **Rien n'est « payé » sans la trésorerie.** L'application web marquait payée une cotisation « en ligne » et confirmait un versement « mobile » dès sa déclaration, sans qu'aucun argent ne bouge. Ces opérations restent désormais `pending` jusqu'à la validation par la trésorerie, quelle que soit la méthode.
2. **Le rôle vient de la base.** Bureau = administrateur de l'organisation, ou membre actif dont la fiche porte le rôle de président, secrétaire, trésorier ou adjoint. Personne ne décide de sa propre demande (prêt, indemnisation, cas social dont il est bénéficiaire).
3. **Ces opérations tiennent toujours des registres** : elles ne déplacent aucun argent du portefeuille. Le cahier prévoit que cotisations, versements de tontine et remboursements de prêt soient « exécutés et tracés dans le portefeuille » : ce branchement reste à faire, dans ces mêmes fonctions.

### Ce qui reste ouvert

- **Lecture par les simples membres.** Les politiques de lecture reposent sur `memberships`, alimentée seulement pour le créateur d'une organisation. Un membre actif agit par les fonctions mais ne lit pas encore les tables de son organisation.
- **Écritures simples encore réservées à l'administrateur de l'organisation**, sans fonction dédiée : création d'un scrutin, enregistrement et acceptation d'un parrainage, demande de prêt, confirmation du parrain d'un prêt, validation d'une cotisation. Elles sont protégées par les politiques d'accès, mais ne distinguent pas encore les rôles du bureau.
- **Clé d'idempotence** pour le rejeu hors connexion : absente.

## Routes

<!-- généré:routes:début -->
**153 routes** : 98 déjà en base, 19 passées en base par la migration 0025, 11 par la migration 0027, 15 par la migration 0028, 7 en Edge Function, 0 restent à passer en base, 3 sans objet.

### Authentification et compte

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `account/delete` | POST | passé en base (0025) | `account_close_self` |
| `auth/check-pin` | GET | passé en base (0025) | `pin_status` |
| `auth/set-pin` | POST | passé en base (0025) | `pin_set` |
| `auth/verify-pin` | POST | passé en base (0025) | `pin_verify` |

### Hub

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `hub/bundle` | GET | déjà en base | lecture des tables sous RLS |
| `hub/conversations/[conversationId]/messages` | GET | déjà en base | lecture des tables sous RLS |
| `hub/conversations` | POST | déjà en base | écriture simple sous RLS : `hub_conversations` |
| `hub/favorites/toggle` | POST | passé en base (0028) | `hub_toggle_favorite` |
| `hub/kyc/submit` | POST | passé en base (0025) | `kyc_submit` |
| `hub/messages` | POST | passé en base (0028) | `hub_send_message` |
| `hub/notifications/read` | POST | déjà en base | écriture simple sous RLS : `hub_notifications` |
| `hub/preferences` | POST | passé en base (0028) | `hub_set_preferences` |
| `hub/profile` | POST | passé en base (0025) | `profile_update` |
| `hub/referrals/[id]/convert` | POST | déjà en base | écriture simple sous RLS : `hub_referrals` |
| `hub/referrals` | POST | déjà en base | écriture simple sous RLS : `hub_referrals` |
| `hub/sync/retry` | POST | déjà en base | écriture simple sous RLS : `hub_sync_queue` |
| `hub/sync` | POST | déjà en base | écriture simple sous RLS : `hub_sync_queue` |
| `hub/vault` | POST | déjà en base | écriture simple sous RLS : `hub_vault` |

### Pay

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `pay/bundle` | GET | déjà en base | lecture des tables sous RLS |
| `pay/methods` | POST | déjà en base | écriture simple sous RLS : `pay_methods` |
| `pay/recipients` | GET | déjà en base | lecture des tables sous RLS |
| `pay/reconciliation/[entryId]/match` | POST | déjà en base | écriture simple sous RLS : `pay_reconciliation` |
| `pay/settings` | POST | déjà en base | écriture simple sous RLS : `pay_settings` |
| `pay/topup/confirm` | POST | reste serveur → Edge Function | Edge Function `pay-topup-confirm` |
| `pay/topup` | POST | déjà en base | `pay_topup`, `pay_confirm_topup` |
| `pay/transfer` | POST | déjà en base | `pay_transfer` |
| `pay/withdraw` | POST | passé en base (0027) | Edge Function `pay-withdraw` (la fonction SQL `pay_withdraw` n'est plus appelable par un client) |

### Market

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `market/catalog` | GET | déjà en base | lecture des tables sous RLS |
| `market/investments/[projectId]/invest` | POST | déjà en base | `market_invest` |
| `market/investments/[projectId]/profit` | POST | déjà en base | `market_declare_investment_profit` |
| `market/investments` | GET, POST | déjà en base | `market_investment_commission_rate`, `market_create_investment_project` |
| `market/orders/[orderId]/cancel` | POST | déjà en base | `market_cancel_order` |
| `market/orders/[orderId]/pay` | POST | déjà en base | `market_pay_order` |
| `market/orders/group/[groupId]/join` | POST | déjà en base | `market_join_group_order` |
| `market/orders/group` | GET, POST | déjà en base | `market_create_group_order` |
| `market/orders` | GET, POST | déjà en base | `market_create_order` |
| `market/reseller/application` | POST | déjà en base | `market_submit_reseller_application` |
| `market/reseller/orders/[orderId]/advance` | POST | déjà en base | `market_advance_order` |
| `market/reseller/orders/[orderId]/deliver` | POST | déjà en base | `market_advance_order` |
| `market/reseller/orders/[orderId]/scan` | POST | déjà en base | `market_advance_order` |
| `market/reseller/products/[productId]` | POST | déjà en base | écriture simple sous RLS : `market_products` |
| `market/reseller/products` | POST | déjà en base | écriture simple sous RLS : `market_products` |
| `market/reseller` | GET | déjà en base | lecture des tables sous RLS |
| `market/reseller/settings` | POST | déjà en base | écriture simple sous RLS : `market_reseller_settings` |
| `market/services/[serviceId]/reviews` | POST | passé en base (0027) | `market_request_service`, `market_respond_service_request`, puis `market_review_service` |
| `market/services` | GET, POST | déjà en base | écriture simple sous RLS : `market_services` |
| `market/wallet` | GET | déjà en base | lecture des tables sous RLS |

### Organisations : Community, Finance, comptabilité

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `organizations/[orgId]/accounting/budget` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/accounting/consolidation` | GET, POST | passé en base (0028) | `accounting_consolidate` (POST) ; lecture : table `consolidation_movements` |
| `organizations/[orgId]/accounting/entries/[entryId]/validation` | POST | déjà en base | écriture simple sous RLS : `accounting_entries` |
| `organizations/[orgId]/accounting/entries` | POST | déjà en base | écriture simple sous RLS : `accounting_entries` |
| `organizations/[orgId]/accounting/reconciliation` | GET, POST | déjà en base | écriture simple sous RLS : `reconciliation_lines` |
| `organizations/[orgId]/accounting` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/adhesions` | GET, POST | déjà en base | écriture simple sous RLS : `members` |
| `organizations/[orgId]/affiliations/[affiliationId]` | PATCH, DELETE | déjà en base | écriture simple sous RLS : `affiliations` |
| `organizations/[orgId]/affiliations` | GET, POST | déjà en base | écriture simple sous RLS : `affiliations` |
| `organizations/[orgId]/announcements` | GET, POST | déjà en base | écriture simple sous RLS : `announcements` |
| `organizations/[orgId]/antennas` | GET, POST | déjà en base | écriture simple sous RLS : `antennas` |
| `organizations/[orgId]/assets/[assetId]` | PATCH | déjà en base | écriture simple sous RLS : `assets` |
| `organizations/[orgId]/assets` | GET, POST | déjà en base | écriture simple sous RLS : `assets` |
| `organizations/[orgId]/attendance/[attendanceId]` | PATCH | déjà en base | écriture simple sous RLS : `attendance` |
| `organizations/[orgId]/attendance` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/audit-events` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/beneficiaries/[beneficiaryId]` | PATCH | déjà en base | écriture simple sous RLS : `beneficiaries` |
| `organizations/[orgId]/beneficiaries` | GET, POST | déjà en base | écriture simple sous RLS : `beneficiaries` |
| `organizations/[orgId]/contributions/[contributionId]` | PATCH | déjà en base | écriture simple sous RLS : `contributions` |
| `organizations/[orgId]/contributions` | GET, POST | passé en base (0028) | `contribution_declare` (POST) ; lecture : table `contributions` |
| `organizations/[orgId]/documents` | GET, POST | déjà en base | écriture simple sous RLS : `documents` |
| `organizations/[orgId]/elections/[electionId]/candidates` | POST | passé en base (0027) | `election_declare_candidacy` |
| `organizations/[orgId]/elections/[electionId]` | PATCH | passé en base (0027) | `election_close` |
| `organizations/[orgId]/elections/[electionId]/votes` | POST | passé en base (0027) | `election_cast_vote` |
| `organizations/[orgId]/elections` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/evaluations` | GET, POST | déjà en base | écriture simple sous RLS : `project_evaluations` |
| `organizations/[orgId]/events` | GET, POST | déjà en base | écriture simple sous RLS : `events` |
| `organizations/[orgId]/financial-groups/[groupId]/close` | POST | déjà en base | écriture simple sous RLS : `financial_groups` |
| `organizations/[orgId]/financial-groups/[groupId]/loans` | POST | déjà en base | écriture simple sous RLS : `loans` |
| `organizations/[orgId]/financial-groups/[groupId]/payments/[paymentId]/validate` | POST | passé en base (0028) | `group_validate_payment` |
| `organizations/[orgId]/financial-groups/[groupId]/payments` | POST | passé en base (0028) | `group_declare_payment` |
| `organizations/[orgId]/financial-groups/[groupId]/settings` | GET, POST | déjà en base | écriture simple sous RLS : `group_settings` |
| `organizations/[orgId]/financial-groups/[groupId]/statistics` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/financial-groups/[groupId]/transactions` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/financial-groups` | GET, POST | passé en base (0028) | `group_create` (POST) ; lecture : table `financial_groups` |
| `organizations/[orgId]/leaves/[leaveId]` | PATCH | déjà en base | écriture simple sous RLS : `leaves` |
| `organizations/[orgId]/leaves` | GET, POST | déjà en base | écriture simple sous RLS : `leaves` |
| `organizations/[orgId]/loans/[loanId]/decision` | POST | passé en base (0028) | `loan_decide` |
| `organizations/[orgId]/loans/[loanId]/installments/[installmentId]/repay` | POST | passé en base (0028) | `loan_repay_installment` |
| `organizations/[orgId]/loans/[loanId]/sponsor-confirm` | POST | déjà en base | écriture simple sous RLS : `loans` |
| `organizations/[orgId]/loans` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/mandates` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/meetings/[meetingId]/attendees/[attendeeId]` | PATCH | passé en base (0028) | `meeting_check_in` |
| `organizations/[orgId]/meetings/[meetingId]` | PATCH | déjà en base | écriture simple sous RLS : `meetings` |
| `organizations/[orgId]/meetings` | GET, POST | déjà en base | écriture simple sous RLS : `meetings` |
| `organizations/[orgId]/members/[memberId]/profile` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/members/[memberId]` | PATCH, DELETE | déjà en base | écriture simple sous RLS : `members` |
| `organizations/[orgId]/members` | GET, POST | déjà en base | écriture simple sous RLS : `members` |
| `organizations/[orgId]/mobility` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/projects/[projectId]/contributions` | POST | passé en base (0028) | `project_contribute` |
| `organizations/[orgId]/projects` | GET, POST | déjà en base | écriture simple sous RLS : `projects` |
| `organizations/[orgId]/relocations/[relocationId]/confirm` | PATCH | déjà en base | écriture simple sous RLS : `relocations` |
| `organizations/[orgId]/relocations/[relocationId]/mobility-report` | POST | déjà en base | écriture simple sous RLS : `mobility_reports` |
| `organizations/[orgId]/relocations/[relocationId]/transfer-decision` | POST | passé en base (0028) | `transfer_decide` |
| `organizations/[orgId]/relocations` | GET, POST | déjà en base | écriture simple sous RLS : `relocations` |
| `organizations/[orgId]` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/sanctions/[sanctionId]` | PATCH | déjà en base | écriture simple sous RLS : `sanctions` |
| `organizations/[orgId]/sanctions` | GET, POST | déjà en base | écriture simple sous RLS : `sanctions` |
| `organizations/[orgId]/settings` | GET, PATCH | déjà en base | écriture simple sous RLS : `group_settings` |
| `organizations/[orgId]/shared-memberships/[sharedMembershipId]/approve` | PATCH | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/shared-memberships/[sharedMembershipId]/reject` | PATCH | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/shared-memberships` | GET, POST | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/signatures/[signatureId]/reject` | PATCH | passé en base (0027) | `signature_reject` |
| `organizations/[orgId]/signatures/[signatureId]/sign` | PATCH | passé en base (0027) | `signature_sign` |
| `organizations/[orgId]/signatures` | GET, POST | passé en base (0027) | `signature_create` (POST) ; lecture : tables `signature_requests`, `signature_signatories` |
| `organizations/[orgId]/social-cases/[socialCaseId]/contributions` | POST | passé en base (0027) | `social_case_contribute` |
| `organizations/[orgId]/social-cases/[socialCaseId]` | PATCH | passé en base (0027) | `social_case_review`, `social_case_disburse` |
| `organizations/[orgId]/social-cases` | GET, POST | passé en base (0027) | `social_case_create` (POST) ; lecture : table `social_cases` |
| `organizations/[orgId]/solidarity/claims/[claimId]/decision` | POST | passé en base (0028) | `claim_decide` |
| `organizations/[orgId]/solidarity/claims` | POST | déjà en base | écriture simple sous RLS : `insurance_claims` |
| `organizations/[orgId]/solidarity/enrollments` | POST | déjà en base | écriture simple sous RLS : `insurance_enrollments` |
| `organizations/[orgId]/solidarity` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/sponsorship/requests/[requestId]/confirm` | POST | passé en base (0028) | `sponsorship_confirm` |
| `organizations/[orgId]/sponsorship/requests/[requestId]/respond` | POST | déjà en base | écriture simple sous RLS : `sponsorship_requests` |
| `organizations/[orgId]/sponsorship/requests` | POST | déjà en base | écriture simple sous RLS : `sponsorship_requests` |
| `organizations/[orgId]/sponsorship` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/staff-evaluations` | GET, POST | déjà en base | écriture simple sous RLS : `project_evaluations` |
| `organizations/[orgId]/staff/[staffId]` | PATCH | déjà en base | écriture simple sous RLS : `staff` |
| `organizations/[orgId]/staff` | GET, POST | déjà en base | écriture simple sous RLS : `staff` |
| `organizations/[orgId]/tasks/[taskId]` | PATCH | déjà en base | écriture simple sous RLS : `tasks` |
| `organizations/[orgId]/tasks` | GET, POST | déjà en base | écriture simple sous RLS : `tasks` |
| `organizations/[orgId]/treasury` | GET, POST | déjà en base | écriture simple sous RLS : `treasury_transactions` |
| `organizations` | GET, POST | passé en base (0025) | `org_create` (POST) ; lecture : table `organizations` |

### Back-office

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `admin/bundle` | GET | passé en base (0025) | `admin_overview`, `admin_supervision`, `admin_investment_supervision`, `admin_users`, `admin_funds_summary`, `admin_anonymized_accounts` + lecture des tables `admin_*` |
| `admin/categories` | POST | passé en base (0025) | `admin_create_category` |
| `admin/commissions` | POST | passé en base (0025) | `admin_set_commission` |
| `admin/config` | POST | passé en base (0025) | `admin_update_config` |
| `admin/countries/[id]/toggle` | POST | passé en base (0025) | `admin_toggle_status('country', id)` |
| `admin/disputes/[id]/status` | POST | passé en base (0025) | `admin_set_dispute_status` |
| `admin/integrations/[id]/toggle` | POST | passé en base (0025) | `admin_toggle_status('integration', id)` |
| `admin/investments/distributions/[id]/review` | POST | déjà en base | `market_review_investment_profit` |
| `admin/kyc/[id]/review` | POST | passé en base (0025) | `admin_review_kyc` |
| `admin/moderation/[id]/review` | POST | passé en base (0025) | `admin_review_moderation` |
| `admin/operators/[id]/toggle` | POST | passé en base (0025) | `admin_toggle_status('operator', id)` |
| `admin/plans/[id]` | POST | passé en base (0025) | `admin_update_plan` |
| `admin/resellers/[id]/review` | POST | déjà en base | `market_review_reseller_application` |
| `admin/users/[id]/suspend` | POST | passé en base (0025) | `admin_set_user_suspended` |

### Serveur : planification, Control Plane, IA

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `ai/assist` | POST | reste serveur → Edge Function | Edge Function `ai-assistant` |
| `control-plane/audit-logs` | GET | reste serveur → Edge Function | Edge Function `control-plane` (`/audit-logs`) |
| `control-plane/health` | GET | reste serveur → Edge Function | Edge Function `control-plane` (`/health`) |
| `control-plane/metrics` | GET | reste serveur → Edge Function | Edge Function `control-plane` (`/metrics`) |
| `control-plane/push` | GET, POST | reste serveur → Edge Function | Edge Function `control-plane-push` (appelée par pg_cron) |
| `cron/investments/settle` | GET, POST | reste serveur → Edge Function | pg_cron (0026) + Edge Function `investments-settle` |

### Divers

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `demo-login` | GET | sans objet | propre à l'application web (démonstration, contrôle de vie) |
| `demo-logout` | GET | sans objet | propre à l'application web (démonstration, contrôle de vie) |
| `(racine)` | GET | sans objet | propre à l'application web (démonstration, contrôle de vie) |
<!-- généré:routes:fin -->
