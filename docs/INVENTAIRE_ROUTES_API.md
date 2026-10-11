# Inventaire des routes de l'application web de référence

AssoShop n'a plus d'application web : l'application Flutter parle directement à Supabase. Ce document passe en revue chaque route `app/api/**` de l'application Next.js de référence et dit où se trouve désormais sa logique.

| Statut | Signification |
| --- | --- |
| **déjà en base** | La route ne fait que relayer : une fonction SQL (RPC) ou une lecture / écriture simple protégée par les politiques d'accès (RLS). Flutter appelle la base directement. |
| **passé en base (0025)** | La logique était dans la route (ou exigeait la clé `service_role`) ; elle est maintenant une fonction SQL, créée par la migration `0025`. |
| **reste serveur → Edge Function** | Exige un secret ou un appel sortant : la logique vit dans une Supabase Edge Function (`supabase/functions/`). |
| **à passer en base** | La route enchaîne plusieurs écritures depuis le serveur web. Les politiques d'accès protègent déjà ces tables, mais l'opération n'est ni atomique ni décrite en base. **Non fait dans ce lot** — voir « Ce qui reste à passer en base ». |
| sans objet | Propre à l'application web. |

Le tableau est produit par `scripts/generate-backend-reference.mjs` à partir du code des routes : ne le modifiez pas à la main.

## Ce qui reste à passer en base

Les routes marquées « à passer en base » concernent surtout la vie associative et la finance communautaire (cotisations, groupes, prêts, comptabilité, signatures), plus trois actions du Hub et les avis sur un service. Le classement est mécanique : une route est « à passer en base » dès que l'une de ses méthodes enchaîne au moins deux écritures. Trois précisions :

1. **La sécurité est déjà en base.** Ces tables n'acceptent une écriture que d'un administrateur de l'organisation concernée (ou d'un membre, pour les quelques actions qui lui reviennent). Une application Flutter qui écrirait directement ne pourrait pas faire plus que ce que ces politiques autorisent.
2. **Ce qui manque est l'atomicité et la règle de calcul.** Aujourd'hui le serveur web enchaîne les écritures (par exemple : décision sur un prêt, puis création de l'échéancier). Sans lui, c'est Flutter qui devrait les enchaîner, avec le risque d'une opération faite à moitié si le réseau tombe au milieu — précisément le cas d'usage hors connexion du cahier (§12). Chacune doit devenir une fonction SQL.
3. **Aucune de ces opérations ne déplace d'argent du portefeuille.** Elles tiennent les registres de l'association (un trésorier déclare et valide des versements). Le cahier prévoit pourtant que cotisations, versements de tontine et remboursements de prêt soient « exécutés et tracés dans le portefeuille » (relations Community / Finance → Pay) : ce branchement n'existe pas encore et se fera dans les mêmes fonctions.

Tant que ces fonctions n'existent pas, l'équipe Flutter ne doit pas reproduire ces enchaînements côté client : elle les attend.

### Faiblesses que cet inventaire a fait apparaître

Elles existaient déjà avec l'application web (la clé `anon` et un jeton d'utilisateur suffisent à écrire dans ces tables), mais deviennent le chemin normal avec Flutter. Elles sont à traiter en priorité, avec les fonctions ci-dessus :

| Table | Ce que la base laisse faire aujourd'hui | Règle attendue |
| --- | --- | --- |
| `election_candidates` | Tout membre de l'organisation peut modifier une candidature, donc son nombre de voix | Un vote par membre, compté en base |
| `signature_signatories`, `signature_requests` | Tout membre peut modifier une ligne de signature ou la demande | Chacun ne signe que sa propre ligne ; la demande se clôt d'elle-même |
| `social_cases` | Tout membre peut modifier un cas social (statut, montant collecté) | Statut par le bureau ; montant collecté calculé à partir des contributions |
| `market_reviews`, `market_service_reviews` | Tout utilisateur connecté peut publier un avis | RG-M04 : seulement après avoir effectivement sollicité le service |

Les modules Pay et Market (commandes, investissement), le compte (PIN, profil, KYC) et le back-office ne sont pas concernés : toutes leurs écritures passent par des fonctions.

## Routes

<!-- généré:routes:début -->
**153 routes** : 104 déjà en base, 19 passées en base par la migration 0025, 7 en Edge Function, 20 restent à passer en base, 3 sans objet.

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
| `hub/favorites/toggle` | POST | **à passer en base** | 2 écritures non atomiques : `hub_favorites` |
| `hub/kyc/submit` | POST | passé en base (0025) | `kyc_submit` |
| `hub/messages` | POST | **à passer en base** | 2 écritures non atomiques : `hub_messages`, `hub_conversations` |
| `hub/notifications/read` | POST | déjà en base | écriture simple sous RLS : `hub_notifications` |
| `hub/preferences` | POST | **à passer en base** | 2 écritures non atomiques : `hub_preferences` |
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
| `pay/withdraw` | POST | déjà en base | `pay_withdraw` |

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
| `market/services/[serviceId]/reviews` | POST | **à passer en base** | 2 écritures non atomiques : `market_service_reviews`, `market_services` |
| `market/services` | GET, POST | déjà en base | écriture simple sous RLS : `market_services` |
| `market/wallet` | GET | déjà en base | lecture des tables sous RLS |

### Organisations : Community, Finance, comptabilité

| Route `/api/…` | Méthodes | Statut | Équivalent pour Flutter |
| --- | --- | --- | --- |
| `organizations/[orgId]/accounting/budget` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/accounting/consolidation` | GET, POST | **à passer en base** | 2 écritures non atomiques : `consolidation_movements`, `accounting_entries` |
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
| `organizations/[orgId]/contributions` | GET, POST | **à passer en base** | 2 écritures non atomiques : `contributions` |
| `organizations/[orgId]/documents` | GET, POST | déjà en base | écriture simple sous RLS : `documents` |
| `organizations/[orgId]/elections/[electionId]/candidates` | POST | déjà en base | écriture simple sous RLS : `election_candidates` |
| `organizations/[orgId]/elections/[electionId]` | PATCH | déjà en base | écriture simple sous RLS : `elections` |
| `organizations/[orgId]/elections/[electionId]/votes` | POST | déjà en base | écriture simple sous RLS : `election_candidates` |
| `organizations/[orgId]/elections` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/evaluations` | GET, POST | déjà en base | écriture simple sous RLS : `project_evaluations` |
| `organizations/[orgId]/events` | GET, POST | déjà en base | écriture simple sous RLS : `events` |
| `organizations/[orgId]/financial-groups/[groupId]/close` | POST | déjà en base | écriture simple sous RLS : `financial_groups` |
| `organizations/[orgId]/financial-groups/[groupId]/loans` | POST | déjà en base | écriture simple sous RLS : `loans` |
| `organizations/[orgId]/financial-groups/[groupId]/payments/[paymentId]/validate` | POST | **à passer en base** | 2 écritures non atomiques : `group_payments`, `financial_groups` |
| `organizations/[orgId]/financial-groups/[groupId]/payments` | POST | **à passer en base** | 3 écritures non atomiques : `group_payments`, `financial_groups`, `hub_sync_queue` |
| `organizations/[orgId]/financial-groups/[groupId]/settings` | GET, POST | déjà en base | écriture simple sous RLS : `group_settings` |
| `organizations/[orgId]/financial-groups/[groupId]/statistics` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/financial-groups/[groupId]/transactions` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/financial-groups` | GET, POST | **à passer en base** | 4 écritures non atomiques : `financial_groups`, `group_members`, `group_turns`, `group_settings` |
| `organizations/[orgId]/leaves/[leaveId]` | PATCH | déjà en base | écriture simple sous RLS : `leaves` |
| `organizations/[orgId]/leaves` | GET, POST | déjà en base | écriture simple sous RLS : `leaves` |
| `organizations/[orgId]/loans/[loanId]/decision` | POST | **à passer en base** | 3 écritures non atomiques : `loans`, `loan_installments` |
| `organizations/[orgId]/loans/[loanId]/installments/[installmentId]/repay` | POST | **à passer en base** | 2 écritures non atomiques : `loan_installments`, `loans` |
| `organizations/[orgId]/loans/[loanId]/sponsor-confirm` | POST | déjà en base | écriture simple sous RLS : `loans` |
| `organizations/[orgId]/loans` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/mandates` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/meetings/[meetingId]/attendees/[attendeeId]` | PATCH | **à passer en base** | 2 écritures non atomiques : `meeting_attendees`, `hub_sync_queue` |
| `organizations/[orgId]/meetings/[meetingId]` | PATCH | déjà en base | écriture simple sous RLS : `meetings` |
| `organizations/[orgId]/meetings` | GET, POST | déjà en base | écriture simple sous RLS : `meetings` |
| `organizations/[orgId]/members/[memberId]/profile` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/members/[memberId]` | PATCH, DELETE | déjà en base | écriture simple sous RLS : `members` |
| `organizations/[orgId]/members` | GET, POST | déjà en base | écriture simple sous RLS : `members` |
| `organizations/[orgId]/mobility` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/projects/[projectId]/contributions` | POST | **à passer en base** | 2 écritures non atomiques : `project_contributions`, `projects` |
| `organizations/[orgId]/projects` | GET, POST | déjà en base | écriture simple sous RLS : `projects` |
| `organizations/[orgId]/relocations/[relocationId]/confirm` | PATCH | déjà en base | écriture simple sous RLS : `relocations` |
| `organizations/[orgId]/relocations/[relocationId]/mobility-report` | POST | déjà en base | écriture simple sous RLS : `mobility_reports` |
| `organizations/[orgId]/relocations/[relocationId]/transfer-decision` | POST | **à passer en base** | 2 écritures non atomiques : `transfer_decisions` |
| `organizations/[orgId]/relocations` | GET, POST | déjà en base | écriture simple sous RLS : `relocations` |
| `organizations/[orgId]` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/sanctions/[sanctionId]` | PATCH | déjà en base | écriture simple sous RLS : `sanctions` |
| `organizations/[orgId]/sanctions` | GET, POST | déjà en base | écriture simple sous RLS : `sanctions` |
| `organizations/[orgId]/settings` | GET, PATCH | déjà en base | écriture simple sous RLS : `group_settings` |
| `organizations/[orgId]/shared-memberships/[sharedMembershipId]/approve` | PATCH | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/shared-memberships/[sharedMembershipId]/reject` | PATCH | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/shared-memberships` | GET, POST | déjà en base | écriture simple sous RLS : `shared_memberships` |
| `organizations/[orgId]/signatures/[signatureId]/reject` | PATCH | déjà en base | écriture simple sous RLS : `signature_requests` |
| `organizations/[orgId]/signatures/[signatureId]/sign` | PATCH | **à passer en base** | 2 écritures non atomiques : `signature_signatories`, `signature_requests` |
| `organizations/[orgId]/signatures` | GET, POST | **à passer en base** | 2 écritures non atomiques : `signature_requests`, `signature_signatories` |
| `organizations/[orgId]/social-cases/[socialCaseId]/contributions` | POST | **à passer en base** | 2 écritures non atomiques : `social_case_contributors`, `social_cases` |
| `organizations/[orgId]/social-cases/[socialCaseId]` | PATCH | **à passer en base** | 2 écritures non atomiques : `social_cases` |
| `organizations/[orgId]/social-cases` | GET, POST | déjà en base | écriture simple sous RLS : `social_cases` |
| `organizations/[orgId]/solidarity/claims/[claimId]/decision` | POST | **à passer en base** | 2 écritures non atomiques : `insurance_claims`, `guarantee_fund` |
| `organizations/[orgId]/solidarity/claims` | POST | déjà en base | écriture simple sous RLS : `insurance_claims` |
| `organizations/[orgId]/solidarity/enrollments` | POST | déjà en base | écriture simple sous RLS : `insurance_enrollments` |
| `organizations/[orgId]/solidarity` | GET | déjà en base | lecture des tables sous RLS |
| `organizations/[orgId]/sponsorship/requests/[requestId]/confirm` | POST | **à passer en base** | 2 écritures non atomiques : `group_members`, `sponsorship_requests` |
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
