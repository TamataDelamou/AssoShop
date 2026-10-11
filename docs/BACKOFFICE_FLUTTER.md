# Back-office dans Flutter desktop

Liste des écrans administrateur à reproduire dans l'application Flutter desktop, à partir du back-office web actuel (`app/admin/`, `components/admin/`), avec pour chacun les données à lire et les fonctions à appeler.

À lire avec `docs/CONTRAT_BACKEND_FLUTTER.md` (connexion, erreurs, règles absolues).

## 1. Principes

- **Pas d'application séparée ni de connexion séparée.** Le back-office est un *mode* de l'application desktop. Après la connexion ordinaire (code à 6 chiffres puis PIN), appeler `rpc('is_platform_admin')` : si la réponse est `true`, proposer le mode administrateur.
- **Qui est administrateur.** Les comptes inscrits dans la table `platform_admins`. L'inscription se fait par un script d'exploitation (`scripts/bootstrap-admin.mjs`), jamais depuis l'application : il n'existe volontairement aucune fonction pour nommer un administrateur.
- **Aucune clé `service_role` dans l'application.** Le back-office web l'utilisait côté serveur ; le back-office Flutter n'en a pas besoin : les lectures passent par des politiques réservées aux administrateurs, les écritures par les fonctions `admin_*`.
- **Lecture** : les tables `admin_*` se lisent directement (`from('admin_kyc').select()`). Un compte non administrateur obtient une liste vide, sans erreur.
- **Écriture** : uniquement par fonction. Une écriture directe dans une table `admin_*` est refusée (`42501`), même pour un administrateur.
- **Tout est journalisé en base.** Chaque fonction `admin_*` écrit elle-même dans `admin_audit_logs` (auteur, action, module, gravité), ce qui remonte au Control Plane. L'application n'a rien à journaliser.
- **Un administrateur ne décide pas pour lui-même** : sa propre candidature revendeur, sa propre demande KYC, les bénéfices de son propre projet et sa propre suspension lui sont refusés (`PY006`). Prévoir le message « Cette décision doit être prise par un autre administrateur ».
- **Toujours en ligne.** Aucune décision du back-office ne va dans la file de synchronisation. Hors connexion, le mode administrateur est en lecture seule sur le dernier état chargé.
- Après chaque action réussie, recharger la liste concernée : la fonction renvoie la ligne modifiée, pas la liste.

Codes d'erreur fréquents ici : `PY006` (pas administrateur, ou décision sur soi-même), `PY009` (valeur invalide), `PY018` (élément introuvable), `PY019` (déjà traité).

## 2. Écrans

« État » indique si la base fournit déjà tout ce qu'il faut. Les numéros WEB renvoient au cahier des charges (§10, 26 écrans).

### 2.1 Pilotage

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Connexion administrateur** (WEB-01) | `app/admin/login` | `rpc('is_platform_admin')` après la connexion ordinaire | — | Prêt |
| **Tableau de bord global** (WEB-02) | `pilotage/AdminDashboardView` | `rpc('admin_overview')` : comptes, associations, groupes, volume du mois, commissions, validations en attente, litiges ouverts, comptes anonymisés | Raccourcis vers les files à traiter | Prêt |
| **Statistiques et rapports** (WEB-11) | `pilotage/ReportsView` | `rpc('admin_overview')` | — | **Partiel** : pas de ventilation par module ni par pays en base |
| **Tableau de bord national** (WEB-23) | `pilotage/NationalDashboardView` | — | — | **Non disponible** : aucune agrégation par pays ; ces statistiques relèvent du Control Plane GSG |
| **Journal d'activité** (WEB-13) | `pilotage/AuditLogsView` | Table `admin_audit_logs`, triée par `created_at` décroissant, paginée | — | Prêt |
| **Journal de sécurité** (WEB-26) | `pilotage/SecurityAuditView` | Table `admin_security_audit` | — | Prêt en lecture (rien ne l'alimente encore) |

### 2.2 Utilisateurs

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Utilisateurs** (WEB-03) | `users/UsersView` | `rpc('admin_users', { p_search, p_limit, p_offset })` → `{ total, users }` ; statut `active`, `suspended` ou `anonymized` | `rpc('admin_set_user_suspended', { p_user_id, p_suspended })` | Prêt |
| **File KYC** (WEB-20) | `users/KycQueueView` | Table `admin_kyc` (`status = 'pending'` en tête) | `rpc('admin_review_kyc', { p_kyc_id, p_status })` avec `approved` ou `rejected` ; le profil de l'utilisateur passe à `verified` / `rejected` | Prêt (les pièces elles-mêmes ne sont pas stockées : seul le type de document est connu) |
| **Litiges** (WEB-09) | `users/DisputesView` | Table `admin_disputes` | `rpc('admin_set_dispute_status', { p_dispute_id, p_status })` : `open`, `in_progress`, `resolved` | Prêt en traitement ; **aucun écran membre ne crée encore de litige** |
| **Rôles internes** (WEB-14) | `users/RolesView` | Tables `admin_roles` et `platform_admins` | — | **Lecture seule** : un seul niveau de droit existe (administrateur de la plateforme), attribué par script |
| **Comptes anonymisés avec solde** (nouveau) | — | `rpc('admin_anonymized_accounts')` → pour chaque compte : date, motifs, solde restant, montant investi, engagements encore ouverts | Aucune fonction de restitution pour l'instant | **Lecture seule** : la restitution des fonds d'un compte anonymisé reste une procédure manuelle à définir |

Un compte `anonymized` ne se rétablit pas (`PY019`). Suspendre un compte ferme aussitôt ses sessions.

### 2.3 Market

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Validation des revendeurs** (WEB-04) | `market/ResellersView` | Table `market_reseller_applications` (un administrateur les voit toutes) | `rpc('market_review_reseller_application', { p_application_id, p_status, p_review_notes })` ; l'approbation crée le compte revendeur | Prêt |
| **Catalogue et catégories** (WEB-05) | `market/CatalogView` | Tables `market_product_categories` et `market_products` (pour le nombre de produits) | `rpc('admin_create_category', { p_name, p_parent_id })` | Prêt pour la création ; renommer ou supprimer une catégorie n'existe pas |
| **Modération** (WEB-06) | `market/ModerationView` | Table `admin_moderation` | `rpc('admin_review_moderation', { p_item_id, p_status })` | Prêt en traitement ; **rien n'alimente encore la file** (pas de signalement côté membre) et la décision ne retire pas le contenu |
| **Investissements et bénéfices** (WEB-25) | `market/InvestmentsView` | `rpc('admin_investment_supervision')` → total bloqué en séquestre, projets (porteur, échéance, séquestre, nombre d'investisseurs), bénéfices déclarés avec les règles de répartition du projet | `rpc('market_review_investment_profit', { p_distribution_id, p_status })` | Prêt |

Validation d'un bénéfice : afficher les **règles de répartition** du projet à côté du montant déclaré — c'est à l'administrateur de vérifier que le montant leur est conforme, la base ne les interprète pas. `PY003` signifie que le solde du porteur ne couvre pas le montant : la déclaration reste en attente.

### 2.4 Organisations

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Associations** (WEB-07) | `organizations/AssociationsView` | `rpc('admin_supervision')` → `organizations` (nom, type, statut, nombre de membres) | — | **Partiel** : pas de signalements, pas d'action (activer, suspendre une association) |
| **Groupes financiers** (WEB-08) | `organizations/GroupsView` | `rpc('admin_supervision')` → `financial_groups` | — | **Partiel** : pas de détection d'anomalies |
| **Hiérarchie des organisations** (WEB-19) | `organizations/HierarchyView` | — | — | **Non disponible** : les affiliations existent par organisation, sans vue d'ensemble |
| **Fonds de Garantie Solidaire** (WEB-21) | `organizations/SolidarityFundView` | — | — | **Non disponible** : le fonds est tenu par organisation, sans agrégat plateforme |
| **Partenariats d'assurance** (WEB-22) | `organizations/InsuranceView` | Table `admin_insurance` | — | Lecture seule |

### 2.5 Facturation et fonds

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Commissions et frais** (WEB-10) | `billing/CommissionsView` | Table `admin_commissions` | `rpc('admin_set_commission', { p_service, p_rate })` | Prêt |
| **Rapprochement du compte marchand** (nouveau) | — | `rpc('admin_funds_summary')` | — | Prêt en lecture |
| **Formules d'abonnement** (WEB-17) | `billing/SubscriptionsView` | Table `admin_plans` | `rpc('admin_update_plan', { p_plan_id, p_monthly_price })` | Prêt pour le prix ; pas de tarif par pays |
| **Facturation des abonnements** (WEB-18) | `billing/InvoicesView` | Table `admin_invoices` | — | Lecture seule (rien ne génère encore de facture) |

**Commissions : attention aux noms de service.** Trois d'entre eux sont lus par la base au moment d'un mouvement de fonds et ne doivent être ni renommés ni supprimés : `Commission revendeur B2B` (vente du marché), `Commission investissement` (versement d'un séquestre), et la commission de service des recharges et retraits (fixée dans la fonction `pay_service_fee`, non modifiable depuis l'écran). L'écran doit modifier un taux existant, pas proposer de renommer. Un changement de taux s'applique aux opérations **suivantes** ; il est journalisé avec l'ancien et le nouveau taux.

**Rapprochement du compte marchand.** `admin_funds_summary` donne ce que le partenaire qui détient les fonds doit avoir en caisse :

```
funds_total = user_wallets_total + escrow_total + platform_wallet_balance
```

L'écran compare `funds_total` au solde du relevé du partenaire, saisi par l'administrateur, et affiche l'écart. Indicateurs à mettre en évidence : `negative_wallets` (doit toujours valoir 0), `pending_topups_count` / `pending_topups_amount` (recharges demandées, pas encore confirmées par l'opérateur), `anonymized_wallets_total` (fonds de comptes anonymisés, à restituer). Tant que `PAY_REAL_MONEY` est désactivé, tous ces montants sont fictifs : afficher le bandeau « Paiements en mode test ».

### 2.6 Configuration

| Écran | Référence web | Lire | Agir | État |
| --- | --- | --- | --- | --- |
| **Configuration de la plateforme** (WEB-12) | `config/PlatformConfigView` | Table `admin_config` (ligne `id = 1`) | `rpc('admin_update_config', { p_platform_name, p_support_email, p_maintenance_mode, p_cgu_version, p_legal_text })` — un paramètre omis est inchangé | Prêt (le mode maintenance est enregistré ; c'est à l'application de le respecter) |
| **Pays et paramètres régionaux** (WEB-15) | `config/CountriesView` | Table `admin_countries` | `rpc('admin_toggle_status', { p_kind: 'country', p_id })` | Prêt pour l'activation ; pas de modification des paramètres |
| **Opérateurs Mobile Money** (WEB-16) | `config/OperatorsView` | Table `admin_operators` | `rpc('admin_toggle_status', { p_kind: 'operator', p_id })` | Prêt pour l'activation |
| **API et intégrations** (WEB-24) | `config/ApiView` | Table `admin_integrations` (`id, name, partner, webhook_url, status`) | `rpc('admin_toggle_status', { p_kind: 'integration', p_id })` | Prêt pour l'activation ; **la clé d'API n'est jamais lisible**, ne pas prévoir de l'afficher |

Les tables `admin_commissions`, `admin_plans`, `admin_countries`, `admin_operators` et `admin_config` sont aussi lisibles par l'application membres (taux à afficher avant paiement, opérateurs du pays, mode maintenance, version des CGU).

## 3. Ce que le back-office web faisait et que Flutter ne reprend pas tel quel

| Sujet | Back-office web | Flutter |
| --- | --- | --- |
| Chargement | Un seul appel `/api/admin/bundle` qui renvoyait tout | Chaque écran lit ce dont il a besoin (tables ou fonction) |
| Décisions | Routes `/api/admin/*` avec la clé `service_role` côté serveur | Fonctions `admin_*` avec le jeton de l'administrateur |
| Liste des utilisateurs | API d'administration de l'authentification | `admin_users` (paginée, avec recherche) |
| Décision KYC | Modifiait seulement la file du back-office | `admin_review_kyc` met aussi à jour la demande et le profil de l'utilisateur |
| Statut « pending » comme décision | Accepté pour le KYC | Refusé : seules `approved` et `rejected` sont des décisions |
| Portefeuille plateforme | Lu directement | `admin_funds_summary` |

## 4. Ce qu'il manque en base pour un back-office complet

Par ordre d'utilité :

1. **Restitution des fonds d'un compte anonymisé** (fonction + procédure).
2. **Signalements** : aucun écran membre n'alimente `admin_moderation` ni `admin_disputes` ; la décision de modération ne retire pas le contenu signalé.
3. **Actions sur une association ou un groupe** (activer, suspendre) et détection d'anomalies.
4. **Ventilation des statistiques** par module et par pays.
5. **Rôles internes** : un seul niveau de droit ; support et modérateurs n'ont pas de droits restreints.
6. **Catalogue** : renommer, déplacer, supprimer une catégorie.
7. **Paramètres régionaux et tarifs par pays**, génération des factures d'abonnement.
8. **Vues d'ensemble** : hiérarchie des organisations, Fonds de Garantie Solidaire.
