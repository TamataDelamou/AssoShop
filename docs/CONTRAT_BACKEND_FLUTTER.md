# Contrat backend pour l'application Flutter

Référence de l'équipe Flutter (application membres mobile + desktop, et mode administrateur de l'application desktop). Elle décrit ce que l'application peut appeler, avec quoi, et ce qui lui est interdit.

Les sections « Fonctions RPC » et « Tables » sont produites à partir de la base (`scripts/generate-backend-reference.mjs`) : elles reflètent les droits réellement en place, pas une intention.

## Sommaire

1. [Principes](#1-principes)
2. [Règles absolues](#2-règles-absolues)
3. [Connexion : code à usage unique puis PIN](#3-connexion--code-à-usage-unique-puis-pin)
4. [Erreurs](#4-erreurs)
5. [Fonctions RPC](#5-fonctions-rpc)
6. [Tables lisibles et règles d'accès](#6-tables-lisibles-et-règles-daccès)
7. [Edge Functions](#7-edge-functions)
8. [Hors connexion : cache et file de synchronisation](#8-hors-connexion--cache-et-file-de-synchronisation)
9. [Ce qui n'est pas encore prêt](#9-ce-qui-nest-pas-encore-prêt)

---

## 1. Principes

- **Pas de serveur applicatif.** L'application parle directement à Supabase avec la clé `anon` et le jeton de l'utilisateur connecté : lecture des tables par l'API de données, écritures sensibles par fonctions SQL (`supabase.rpc(...)`), et une Edge Function pour l'assistant IA.
- **La base décide.** Prix, totaux, commissions, soldes, statuts, droits : tout est calculé et vérifié en base. Ce que l'application envoie en trop (un prix, un statut, un identifiant d'utilisateur) est ignoré ou refusé.
- **Une seule application, deux modes.** Le mode administrateur de l'application desktop utilise le même compte et le même jeton ; il s'affiche si `rpc('is_platform_admin')` renvoie `true`. La clé `service_role` n'est **jamais** embarquée dans l'application.
- **L'application Next.js (`app/`, `components/`…) est la référence fonctionnelle** : écrans, libellés, enchaînements. Elle sera archivée quand Flutter sera prêt. Ses routes `/api/*` ne sont pas à appeler ; `docs/INVENTAIRE_ROUTES_API.md` donne pour chacune son équivalent.

Projets Supabase : un projet de **test** et un projet de **production**, distincts. Les clés de l'un ne se mélangent jamais avec celles de l'autre.

---

## 2. Règles absolues

1. **Aucune écriture directe dans les tables sensibles.** `pay_wallets`, `pay_transactions`, `market_orders`, `market_order_items`, les tables d'investissement, `market_resellers`, `market_reseller_applications`, les avis (`market_reviews`, `market_service_reviews`), `user_profiles`, `hub_kyc`, `audit_events`, toutes les tables `admin_*`, ainsi que les scrutins (`elections`, `election_candidates`, `election_votes`), les signatures, les cas sociaux, les versements de groupe, les échéances de prêt, les contributions aux projets et les décisions de transfert refusent `insert` / `update` / `delete` venant d'un client (erreur `42501`). Elles ne changent que par les fonctions de la section 5. Ne pas contourner, ne pas « réessayer autrement ». La section 6 donne, table par table, ce qui reste ouvert.
2. **Ne jamais calculer un solde, un total ou une commission dans l'application** pour l'envoyer à la base. On lit le solde (`pay_wallets.balance`), on affiche une commission obtenue de la base (`pay_service_fee`, `market_investment_commission_rate`, table `admin_commissions`), on laisse la fonction calculer.
3. **Montants : entiers, en francs guinéens (GNF).** Pas de décimales, pas de centimes, pas de `double`. Type Dart : `int`. Un montant décimal, nul ou négatif est refusé (`PY001`). Toute conversion de devise affichée est indicative (RG-P05).
4. **Argent réel : `PAY_REAL_MONEY`.** Tant que cet interrupteur serveur est désactivé, la plateforme n'encaisse ni ne décaisse d'argent réel : la confirmation des recharges répond `503` avec `code: "pay_test_mode"`. L'application doit alors :
   - afficher en permanence le bandeau **« Paiements en mode test »** ;
   - ne **pas proposer le retrait** vers Mobile Money : aucun opérateur n'est encore intégré, donc aucun versement réel n'est possible. La fonction SQL `pay_withdraw` n'est plus appelable par l'application ; le seul chemin est l'Edge Function `pay-withdraw` (§7), qui répond `503` hors du projet de test ;
   - présenter une recharge comme « en attente de confirmation de l'opérateur » tant que la transaction est `pending`.

   L'application ne connaît pas la valeur de l'interrupteur : jusqu'à nouvel ordre, elle se comporte **toujours** en mode test.
5. **Le PIN ne se vérifie qu'en base** (`pin_verify`). Ne jamais le stocker, le comparer ni le mettre en cache sur l'appareil, même chiffré (cahier §13). L'empreinte n'est pas lisible.
6. **Pas de donnée personnelle d'un tiers en dehors de ce que la base renvoie.** Les parts d'investisseurs s'affichent sans nom ; la liste des destinataires d'un transfert ne contient ni téléphone ni e-mail.
7. **L'assistant IA informe et prépare des textes ; il n'exécute rien** (RG-H03). Aucune action financière ou de gestion ne doit être déclenchée à partir de sa réponse sans un geste explicite de l'utilisateur.
8. **Une opération métier = un appel de fonction.** Ne jamais enchaîner plusieurs écritures côté client pour réaliser une opération (créer un groupe puis ses membres, valider un versement puis mettre à jour un total…) : chacune a sa fonction SQL, atomique (§5). S'il en manque une, la demander plutôt que la reproduire.
9. **Le rôle se lit en base, il ne se déclare pas.** Aucune fonction n'accepte « qui je suis » ni « quel est mon rôle » en paramètre : la base le déduit du jeton. Pour afficher ou masquer un bouton, appeler `org_is_bureau`, `org_is_treasurer`, `org_is_member` ou `is_platform_admin` ; un bouton affiché à tort donnera de toute façon `PY006`.

---

## 3. Connexion : code à usage unique puis PIN

### 3.1 Code à usage unique (Supabase Auth)

| Étape | Appel | Remarques |
| --- | --- | --- |
| Demander un code par e-mail | `auth.signInWithOtp(email: …, shouldCreateUser: true)` | Crée le compte s'il n'existe pas (inscription). L'e-mail contient un code à 6 chiffres. |
| Demander un code par téléphone | `auth.signInWithOtp(phone: …, channel: sms ou whatsapp, shouldCreateUser: true)` | Numéro au format international E.164, indicatif saisi séparément puis normalisé. Exige un fournisseur SMS configuré sur le projet. |
| Vérifier le code | `auth.verifyOTP(email ou phone: …, token: …, type: email ou sms)` | Ouvre la session. |

- Toujours passer `shouldCreateUser` explicitement : sans lui, Supabase crée le compte par défaut.
- Il n'y a **pas d'écran de connexion distinct pour les administrateurs** dans Flutter : un administrateur est un compte ordinaire inscrit dans `platform_admins` (attribué par un script d'exploitation, jamais depuis l'application).
- Erreur `otp_disabled` / « Signups not allowed for otp » : compte inexistant alors que `shouldCreateUser` est faux.

### 3.2 PIN (4 chiffres)

Après la vérification du code, et à chaque réouverture de l'application :

```
état = rpc('pin_status')            → { has_pin, locked, locked_until }
si état.has_pin est faux            → faire choisir un PIN, puis rpc('pin_set', { p_pin })
sinon                               → demander le PIN, puis rpc('pin_verify', { p_pin })
```

| Réponse de `pin_verify` / `pin_set` | Comportement attendu |
| --- | --- |
| `{ ok: true }` | Accès accordé. |
| `{ ok: false, reason: "incorrect", attempts_left: n }` | « Code PIN incorrect » + essais restants. |
| `{ ok: false, reason: "locked", locked_until }` | Bloquer la saisie jusqu'à `locked_until` (15 minutes après 5 échecs). |
| `{ ok: false, reason: "no_pin" }` | Aucun PIN utilisable : faire choisir un nouveau PIN. C'est aussi le cas des comptes créés dans l'ancienne application web. |
| `{ ok: false, reason: "invalid_format" }` | Le PIN doit comporter exactement 4 chiffres. |

Ces fonctions **ne lèvent pas d'erreur** pour un PIN faux : lire `ok`. Le compteur et le verrou sont tenus en base ; l'application ne peut ni les contourner ni les remettre à zéro.

« PIN oublié » : reconnecter l'utilisateur par code, puis `pin_set`.

### 3.3 Profil, KYC, fermeture de compte

- Profil : lecture de `user_profiles` (sa ligne), modification par `profile_update` (ville, langue uniquement). Nom, e-mail et téléphone viennent de la session Supabase.
- KYC : `kyc_submit(p_document_type)` ; suivi dans `hub_kyc` et `user_profiles.kyc_status` (`not_submitted`, `pending`, `verified`, `rejected`). La décision appartient au back-office.
- Fermeture : `account_close_self()`. Le compte est supprimé s'il ne porte aucun engagement, **anonymisé** sinon (solde non nul, contribution en séquestre, commande non livrée, part dans un projet). Prévenir l'utilisateur avant, puis effacer la session locale dans les deux cas.

---

## 4. Erreurs

Une fonction SQL qui refuse une opération renvoie une erreur dont le champ `code` porte l'un des codes ci-dessous. **Se fier au code, pas au texte.** Le message par défaut convient à l'affichage ; les fonctions donnent parfois un message plus précis (colonne « Erreurs levées » de la section 5).

| Code | Message utilisateur conseillé | Nature |
| --- | --- | --- |
| `PY001` | Montant invalide | Saisie |
| `PY002` | Portefeuille introuvable | Donnée |
| `PY003` | Solde insuffisant | Métier |
| `PY004` | Non authentifié | Session expirée : reconnecter |
| `PY005` | Commande introuvable | Donnée |
| `PY006` | Action non autorisée | Droit |
| `PY007` | Commande déjà payée | État |
| `PY008` | Transition de statut non autorisée | État |
| `PY009` | Demande invalide | Saisie (le message précis de la fonction est préférable) |
| `PY010` | Paiement indisponible pour ce revendeur | Configuration |
| `PY011` | Recharge introuvable | Donnée |
| `PY012` | Recharge non confirmable | État |
| `PY013` | Transfert vers soi-même impossible | Saisie |
| `PY014` | Destinataire introuvable | Donnée (ou destinataire hors de vos organisations) |
| `PY015` | Devises incompatibles | Configuration |
| `PY016` | Stock insuffisant | Métier |
| `PY017` | Quantité minimale de commande non atteinte | Saisie |
| `PY018` | Élément introuvable | Donnée |
| `PY019` | Opération impossible dans l'état actuel | État (déjà traité, verrouillé, échu…) |
| `AC001` | Compte non supprimable : il doit être anonymisé | Levé par la base si l'on tente de supprimer un compte engagé |
| `42501` | — | Écriture directe interdite ou fonction non autorisée : **erreur de développement**, à corriger dans l'application |

Autres cas : statut 401 (jeton expiré : rafraîchir la session), absence de réseau (voir §8). Toute erreur inconnue s'affiche comme « Une erreur est survenue », sans détail technique.

---

## 5. Fonctions RPC

Appel : `supabase.rpc('nom', params: { 'p_x': valeur })`. Les paramètres ayant une valeur `DEFAULT` sont facultatifs. Une fonction qui renvoie le nom d'une table renvoie une ligne de cette table.

<!-- généré:rpc:début -->
#### Compte : PIN, profil, KYC, fermeture

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `account_close_self` | — | `jsonb` | `PY004` Non authentifié<br>`PY018` Compte introuvable | Ferme le compte de l'appelant : `{ action: 'deleted' }` s'il ne porte aucun engagement financier, sinon `{ action: 'anonymized', reasons }`. La session n'est plus valable ensuite. |
| `kyc_submit` | `p_document_type text` | `hub_kyc` | `PY004` Non authentifié<br>`PY009` Type de document requis<br>`PY019` Une demande est déjà en attente | Dépose une demande de vérification d'identité, toujours « pending ». Une seule demande en attente à la fois. |
| `pin_set` | `p_pin text` | `jsonb` | `PY004` Non authentifié | Crée ou remplace le PIN (4 chiffres) après une connexion par code. Renvoie `{ ok }` ou `{ ok: false, reason }` avec `reason` = `invalid_format` ou `locked`. Ne lève pas d'erreur pour ces cas. |
| `pin_status` | — | `jsonb` | `PY004` Non authentifié | État du PIN : `{ has_pin, locked, locked_until }`. |
| `pin_verify` | `p_pin text` | `jsonb` | `PY004` Non authentifié | Vérifie le PIN. Renvoie `{ ok: true }`, ou `{ ok: false, reason }` avec `reason` = `incorrect` (+ `attempts_left`), `locked` (+ `locked_until`) ou `no_pin`. Cinq échecs verrouillent le PIN 15 minutes. Ne lève pas d'erreur pour un PIN faux. |
| `profile_update` | `p_city text DEFAULT NULL::text`<br>`p_language text DEFAULT NULL::text` | `jsonb` | `PY004` Non authentifié | Modifie la ville et / ou la langue (un paramètre à null est inchangé). Renvoie le profil, sans l'empreinte du PIN. |

#### Organisations : création et rôle de l'appelant

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `org_create` | `p_name text`<br>`p_type text`<br>`p_city text DEFAULT NULL::text`<br>`p_object text DEFAULT NULL::text` | `organizations` | `PY004` Non authentifié<br>`PY009` Nom et type requis | Crée une organisation (statut « pending ») et l'adhésion « admin » de son créateur, en une opération. |
| `org_has_role` | `p_organization_id uuid, VARIADIC p_roles text[]` | `boolean` | — | Vrai si l'appelant est administrateur de l'organisation ou porte l'un des rôles donnés (`president`, `secretary`, `treasurer`, …). |
| `org_is_bureau` | `p_organization_id uuid` | `boolean` | — | Vrai si l'appelant est administrateur de l'organisation ou membre du bureau (président, secrétaire, trésorier, adjoints) : sert à afficher les actions du bureau. |
| `org_is_member` | `p_organization_id uuid` | `boolean` | — | Vrai si l'appelant est membre de l'organisation (compte rattaché ou fiche de membre active). |
| `org_is_treasurer` | `p_organization_id uuid` | `boolean` | — | Vrai si l'appelant est administrateur de l'organisation, trésorier ou vice-trésorier : sert à afficher les validations de trésorerie. |
| `org_member_id` | `p_organization_id uuid` | `uuid` | — | Identifiant de la fiche de membre active de l'appelant dans l'organisation, ou null. |

#### Community : votes, signatures, cas sociaux, projets, réunions, mobilité

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `election_cast_vote` | `p_election_id uuid`<br>`p_candidate_id uuid` | `election_votes` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Scrutin introuvable / Candidat introuvable<br>`PY019` Scrutin fermé au vote / Vote déjà enregistré | Vote : un seul par membre et par scrutin, définitif. Le décompte est tenu en base ; le bulletin n'est lisible que par son auteur. |
| `election_close` | `p_election_id uuid` | `elections` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Scrutin introuvable<br>`PY019` Scrutin déjà clôturé | Clôture par le président, le secrétaire ou leurs adjoints. Définitive : un scrutin clôturé n'est plus modifiable (RG-C06). |
| `election_declare_candidacy` | `p_election_id uuid`<br>`p_member_id uuid DEFAULT NULL::uuid` | `election_candidates` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Scrutin introuvable / Membre introuvable<br>`PY019` Scrutin clôturé / Candidature déjà déclarée | Candidature à un scrutin ouvert. Sans `p_member_id` : l'appelant se déclare lui-même. Avec : réservé au bureau. |
| `meeting_check_in` | `p_attendee_id uuid`<br>`p_status text` | `meeting_attendees` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Statut invalide<br>`PY018` Participant introuvable | Pointage d'un participant (`invited`, `present`, `absent`, `excused`) par le président, le secrétaire ou leurs adjoints. |
| `project_contribute` | `p_project_id uuid`<br>`p_amount integer`<br>`p_anonymous boolean DEFAULT false` | `projects` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Projet introuvable<br>`PY019` Ce projet n'est plus ouvert aux contributions | Contribution d'un membre à un projet en cours. Le montant collecté est calculé en base. Registre : aucun mouvement de portefeuille. |
| `signature_create` | `p_organization_id uuid`<br>`p_type text`<br>`p_title text`<br>`p_signatory_member_ids uuid[]`<br>`p_description text DEFAULT ''::text`<br>`p_amount integer DEFAULT NULL::integer` | `signature_requests` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Type et titre requis / Au moins un signataire requis / Signataire invalide : membre actif disposant d'un compte requis | Ouvre une demande de signature (bureau). `p_signatory_member_ids` : fiches de membres actifs disposant d'un compte. |
| `signature_reject` | `p_request_id uuid` | `signature_requests` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Demande introuvable<br>`PY019` Cette demande n'est plus en attente de signature | Refus par l'un des signataires désignés : la demande passe à `rejected`. |
| `signature_sign` | `p_request_id uuid` | `signature_requests` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Demande introuvable<br>`PY019` Cette demande n'est plus en attente de signature / Déjà signé | L'appelant signe SA ligne. La demande passe à `signed` quand toutes les lignes sont signées. |
| `social_case_contribute` | `p_case_id uuid`<br>`p_amount integer`<br>`p_anonymous boolean DEFAULT false` | `social_cases` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Cas social introuvable<br>`PY019` Ce cas social n'est pas ouvert aux contributions | Contribution d'un membre à un cas validé. Le montant collecté est calculé en base ; le cas passe à `funded` quand l'objectif est atteint. Registre : aucun mouvement de portefeuille. |
| `social_case_create` | `p_organization_id uuid`<br>`p_title text`<br>`p_target_amount integer`<br>`p_description text DEFAULT ''::text`<br>`p_type text DEFAULT 'other'::text`<br>`p_beneficiary_name text DEFAULT ''::text`<br>`p_beneficiary_user_id uuid DEFAULT NULL::uuid`<br>`p_contributors_visible boolean DEFAULT true` | `social_cases` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Titre requis<br>`PY018` Bénéficiaire introuvable dans l'organisation | Déclare un cas social (tout membre). Toujours `submitted` ; visible des autres membres seulement après validation (RG-C05). |
| `social_case_disburse` | `p_case_id uuid` | `social_cases` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Cas social introuvable<br>`PY019` Décaissement impossible : objectif non atteint ou cas déjà décaissé | Décaissement par le président ou la trésorerie, uniquement quand le cas est `funded`. |
| `social_case_review` | `p_case_id uuid`<br>`p_approve boolean`<br>`p_note text DEFAULT NULL::text` | `social_cases` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Cas social introuvable<br>`PY019` Cas social déjà traité | Décision du comité (bureau) : `p_approve` vrai → `approved`, faux → `rejected`. Jamais par le bénéficiaire. |
| `transfer_decide` | `p_organization_id uuid`<br>`p_relocation_id text`<br>`p_status text`<br>`p_sponsorship text DEFAULT NULL::text`<br>`p_note text DEFAULT NULL::text` | `transfer_decisions` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Statut invalide<br>`PY018` Déménagement introuvable<br>`PY019` Décision déjà prise | Décision du bureau de l'association d'accueil sur un transfert (`pending`, `accepted`, `rejected`). Une fois prise, elle n'est plus modifiable. |

#### Finance : cotisations, groupes, parrainage, prêts, solidarité, comptabilité

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `accounting_consolidate` | `p_organization_id uuid`<br>`p_movement_ids uuid[]` | `SETOF accounting_entries` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Consolidation par la trésorerie : mouvements marqués consolidés et écritures créées ensemble. Rejouable sans doublon. |
| `claim_decide` | `p_claim_id uuid`<br>`p_approve boolean` | `insurance_claims` | `PY003` Solde insuffisant<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Demande introuvable<br>`PY019` Demande déjà traitée | Décision du bureau sur une demande d'indemnisation. L'indemnité est prélevée sur le fonds de garantie dans la même transaction ; refusée si le fonds ne la couvre pas. |
| `contribution_declare` | `p_organization_id uuid`<br>`p_member_id uuid`<br>`p_amount integer`<br>`p_method text`<br>`p_contribution_id uuid DEFAULT NULL::uuid` | `contributions` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Méthode invalide / Cette cotisation concerne un autre membre<br>`PY018` Membre introuvable / Cotisation introuvable<br>`PY019` Cotisation déjà déclarée ou payée | Déclare le paiement d'une cotisation, pour soi ou pour un tiers. Toujours `pending` : la cotisation n'est payée qu'après validation par la trésorerie. |
| `group_create` | `p_organization_id uuid`<br>`p_name text`<br>`p_type text`<br>`p_amount integer`<br>`p_periodicity text`<br>`p_max_members integer`<br>`p_goal_amount integer DEFAULT NULL::integer`<br>`p_interest_rate integer DEFAULT NULL::integer`<br>`p_start_date date DEFAULT NULL::date`<br>`p_turn_member_names text[] DEFAULT '{}'::text[]` | `financial_groups` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Nom du groupe requis / Type de groupe invalide / Périodicité invalide / Nombre de membres invalide / Taux d'intérêt invalide | Crée un groupe financier (bureau) : groupe, créateur, membres et ordre de passage (tontine), réglages — ou rien. |
| `group_declare_payment` | `p_group_id uuid`<br>`p_member_id uuid`<br>`p_amount integer`<br>`p_method text`<br>`p_paid_for_member_id uuid DEFAULT NULL::uuid` | `group_payments` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Méthode invalide<br>`PY018` Groupe introuvable / Membre du groupe introuvable / Bénéficiaire introuvable dans le groupe<br>`PY019` Groupe clôturé | Déclare un versement, pour soi (ou pour un autre membre si l'appelant est trésorier ou créateur du groupe). Toujours `pending` ; le total du groupe ne bouge qu'à la validation (RG-F05). |
| `group_is_creator` | `p_group_id uuid` | `boolean` | — | Vrai si l'appelant est le créateur (administrateur) du groupe. |
| `group_validate_payment` | `p_payment_id uuid` | `group_payments` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Versement introuvable<br>`PY019` Versement déjà validé | Validation par la trésorerie ou le créateur du groupe : versement confirmé et total du groupe mis à jour ensemble. |
| `loan_decide` | `p_loan_id uuid`<br>`p_approve boolean` | `loans` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Prêt introuvable<br>`PY019` Prêt non décidable : confirmation du parrain requise, ou décision déjà prise | Décision du bureau sur un prêt confirmé par le parrain (RG-F06). L'approbation crée les trois échéances. Jamais sur son propre prêt. |
| `loan_repay_installment` | `p_installment_id uuid` | `loans` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Échéance introuvable<br>`PY019` Échéance déjà remboursée | Enregistre le remboursement d'une échéance (trésorerie). Le prêt passe à `repaid` quand tout est remboursé. |
| `sponsorship_confirm` | `p_request_id uuid` | `sponsorship_requests` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Demande introuvable<br>`PY019` Demande non confirmable dans son état actuel / Groupe clôturé / Groupe complet | Le nouveau membre confirme LUI-MÊME son adhésion après l'accord du parrain (RG-F02). Il est reconnu par son compte ou par le numéro de téléphone vérifié de son compte. |

#### Hub : favoris, messages, préférences

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `hub_send_message` | `p_conversation_id uuid`<br>`p_body text` | `hub_messages` | `PY004` Non authentifié<br>`PY009` Message invalide<br>`PY018` Conversation introuvable | Ajoute un message à une conversation de l'appelant et met à jour son aperçu. |
| `hub_set_preferences` | `p_preferences jsonb` | `SETOF hub_preferences` | `PY004` Non authentifié<br>`PY009` Préférences invalides | Remplace d'un bloc les préférences de notification. `p_preferences` = `[{ "channel": "in_app", "event_type": "…", "enabled": true }]`. |
| `hub_toggle_favorite` | `p_type text`<br>`p_label text`<br>`p_detail text DEFAULT ''::text` | `SETOF hub_favorites` | `PY004` Non authentifié<br>`PY009` Type et libellé requis | Ajoute le favori s'il est absent, le retire sinon. Renvoie la liste à jour. |

#### Pay : portefeuille

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `pay_ensure_wallet` | — | `pay_wallets` | `PY004` Non authentifié | Renvoie le portefeuille personnel de l'appelant, en le créant s'il n'existe pas. |
| `pay_generate_reference` | — | `text` | — | Utilitaire interne (référence de transaction). Sans intérêt côté client. |
| `pay_service_fee` | `p_amount integer` | `integer` | — | Commission de service d'une recharge ou d'un retrait pour un montant donné : à afficher AVANT validation (RG-P03). |
| `pay_topup` | `p_amount integer`<br>`p_wallet_id uuid DEFAULT NULL::uuid`<br>`p_provider text DEFAULT ''::text` | `pay_transactions` | `PY001` Montant invalide<br>`PY002` Portefeuille introuvable<br>`PY004` Non authentifié | Demande de recharge : crée une transaction « pending », sans crédit. Le portefeuille n'est crédité qu'à la confirmation de l'opérateur (Edge Function `pay-topup-confirm`). |
| `pay_transfer` | `p_amount integer`<br>`p_to_user_id uuid DEFAULT NULL::uuid`<br>`p_to_member_id uuid DEFAULT NULL::uuid`<br>`p_from_wallet_id uuid DEFAULT NULL::uuid` | `pay_transactions` | `PY001` Montant invalide<br>`PY002` Portefeuille introuvable<br>`PY003` Solde insuffisant<br>`PY004` Non authentifié<br>`PY013` Transfert vers soi-même impossible<br>`PY014` Destinataire introuvable<br>`PY015` Devises incompatibles | Transfert vers un membre d'une organisation commune, désigné par sa fiche membre (`p_to_member_id`) ou son identifiant utilisateur (`p_to_user_id`). Débit et crédit dans la même transaction, sans commission. Un compte sans organisation commune donne la même erreur qu'un compte inconnu. |

#### Market : commandes

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `market_advance_order` | `p_order_id uuid`<br>`p_status text`<br>`p_recipient_name text DEFAULT NULL::text` | `market_orders` | `PY004` Non authentifié<br>`PY005` Commande introuvable<br>`PY006` Action non autorisée<br>`PY008` Transition de statut non autorisée | Avancement logistique par le revendeur, une étape à la fois : `shipped` → `arrived` → `ready_for_pickup` (scan du colis, RG-M03) → `delivered` (remise, avec `p_recipient_name`). |
| `market_cancel_order` | `p_order_id uuid` | `market_orders` | `PY004` Non authentifié<br>`PY005` Commande introuvable<br>`PY006` Action non autorisée<br>`PY008` Une commande payée ne peut plus être annulée | Annulation par l'acheteur, tant que la commande n'est pas payée. |
| `market_close_group_order` | `p_group_id uuid` | `market_group_orders` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Commande groupée introuvable<br>`PY019` Commande groupée déjà clôturée | Clôture par le créateur ou le revendeur concerné. |
| `market_create_group_order` | `p_product_id uuid`<br>`p_min_participants integer DEFAULT 1`<br>`p_deadline date DEFAULT NULL::date` | `market_group_orders` | `PY004` Non authentifié<br>`PY009` Nombre minimal de participants invalide<br>`PY018` Produit introuvable | Crée une commande groupée ; le prix et le revendeur viennent du produit. |
| `market_create_order` | `p_items jsonb`<br>`p_delivery_method text DEFAULT 'pickup'::text`<br>`p_delivery_date date DEFAULT NULL::date`<br>`p_delivery_city text DEFAULT ''::text` | `market_orders` | `PY004` Non authentifié<br>`PY009` Commande vide / Commande invalide / Produit indisponible ou quantité invalide / Une commande ne peut porter que sur un seul revendeur / Montant de commande invalide<br>`PY016` Stock insuffisant<br>`PY017` Quantité minimale de commande non atteinte | Crée une commande. `p_items` = `[{ "product_id": uuid, "quantity": entier }]`. Prix et total sont calculés en base ; un seul revendeur par commande. Le stock n'est décrémenté qu'au paiement. |
| `market_join_group_order` | `p_group_id uuid` | `market_group_orders` | `PY004` Non authentifié<br>`PY018` Commande groupée introuvable | Rejoint une commande groupée ouverte. Elle est confirmée dès le minimum de participants atteint (RG-M02). |
| `market_pay_order` | `p_order_id uuid` | `market_orders` | `PY003` Solde insuffisant<br>`PY004` Non authentifié<br>`PY005` Commande introuvable<br>`PY006` Action non autorisée<br>`PY007` Commande déjà payée<br>`PY008` Transition de statut non autorisée<br>`PY009` Montant de commande invalide / Produit indisponible<br>`PY010` Revendeur sans compte : paiement indisponible / Commission revendeur non configurée / Devise du portefeuille différente de celle de la commande<br>`PY016` Stock insuffisant | Paiement par l'acheteur : débit du portefeuille, crédit du revendeur moins la commission, décrément du stock. |

#### Market : revendeur

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `market_review_reseller_application` | `p_application_id uuid`<br>`p_status text`<br>`p_review_notes text DEFAULT NULL::text` | `market_reseller_applications` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Candidature introuvable<br>`PY019` Candidature déjà approuvée | Back-office : approuve ou refuse une candidature (`approved` / `rejected`). L'approbation crée le compte revendeur. Jamais sur sa propre candidature. |
| `market_submit_reseller_application` | `p_company_name text`<br>`p_contact_name text`<br>`p_id_document text DEFAULT ''::text`<br>`p_sector text DEFAULT ''::text`<br>`p_country text DEFAULT ''::text`<br>`p_city text DEFAULT ''::text` | `market_reseller_applications` | `PY004` Non authentifié<br>`PY009` Candidature invalide<br>`PY019` Candidature déjà approuvée | Dépose (ou redépose après un refus) une candidature revendeur, toujours « pending ». |

#### Market : services et avis

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `market_request_service` | `p_service_id uuid`<br>`p_message text DEFAULT ''::text` | `market_service_requests` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Service introuvable | Sollicite un service. Rejouable : renvoie la sollicitation en attente si elle existe. |
| `market_respond_service_request` | `p_request_id uuid`<br>`p_confirm boolean` | `market_service_requests` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Demande introuvable<br>`PY019` Demande déjà traitée | Réponse du prestataire à une sollicitation : `p_confirm` vrai → `confirmed`, faux → `declined`. |
| `market_review_reseller` | `p_reseller_id uuid`<br>`p_rating integer`<br>`p_comment text DEFAULT ''::text` | `market_reviews` | `PY004` Non authentifié<br>`PY006` Seuls les clients livrés peuvent évaluer ce revendeur<br>`PY009` Note invalide (1 à 5)<br>`PY018` Revendeur introuvable<br>`PY019` Avis déjà publié | Avis sur un revendeur (note de 1 à 5). Réservé à qui a reçu une commande livrée de ce revendeur ; un avis par utilisateur. |
| `market_review_service` | `p_service_id uuid`<br>`p_rating integer`<br>`p_comment text DEFAULT ''::text` | `market_service_reviews` | `PY004` Non authentifié<br>`PY006` Seuls les bénéficiaires du service peuvent l'évaluer<br>`PY009` Note invalide (1 à 5)<br>`PY018` Service introuvable<br>`PY019` Avis déjà publié | Avis sur un service (note de 1 à 5). Réservé à qui a une sollicitation confirmée par le prestataire (RG-M04) ; un avis par utilisateur. La note du service est recalculée en base. |

#### Market : investissement

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `market_close_investment_project` | `p_project_id uuid` | `market_investment_projects` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Projet introuvable<br>`PY019` Le projet n'est plus ouvert | Abandon par le porteur avant le dénouement : les investisseurs sont remboursés aussitôt. |
| `market_create_investment_project` | `p_name text`<br>`p_description text DEFAULT ''::text`<br>`p_sector text DEFAULT ''::text`<br>`p_target_amount integer DEFAULT 0`<br>`p_currency text DEFAULT 'GNF'::text`<br>`p_profit_sharing_rules text DEFAULT ''::text`<br>`p_deadline date DEFAULT NULL::date` | `market_investment_projects` | `PY004` Non authentifié<br>`PY009` Projet invalide / Date limite invalide | Crée un projet d'investissement. Date limite obligatoire et future, montant recherché > 0. |
| `market_declare_investment_profit` | `p_project_id uuid`<br>`p_amount integer` | `market_investment_distributions` | `PY001` Montant invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Projet introuvable<br>`PY019` Le projet n'est pas financé / Une déclaration est déjà en attente de validation | Le porteur d'un projet financé déclare un bénéfice à distribuer. Aucun mouvement de fonds avant validation par un administrateur. |
| `market_invest` | `p_project_id uuid`<br>`p_amount integer` | `market_investment_projects` | `PY001` Montant invalide<br>`PY003` Solde insuffisant<br>`PY004` Non authentifié<br>`PY015` Devises incompatibles<br>`PY018` Projet introuvable<br>`PY019` Le projet n'est plus ouvert à l'investissement / La date limite de collecte est dépassée | Investit : débite le portefeuille et crédite le séquestre du projet. Refusé après la date limite. |
| `market_investment_commission_rate` | — | `numeric` | — | Taux (en %) de la commission prélevée au versement d'un séquestre : à afficher avant tout investissement (RG-P03). |
| `market_review_investment_profit` | `p_distribution_id uuid`<br>`p_status text`<br>`p_review_notes text DEFAULT NULL::text` | `market_investment_distributions` | `PY001` Montant trop faible pour être réparti<br>`PY003` Solde insuffisant<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY015` Devises incompatibles<br>`PY018` Déclaration introuvable<br>`PY019` Déclaration déjà traitée / Le projet n'est pas financé / Aucune mise à rémunérer | Back-office : valide (`approved`) ou refuse (`rejected`) un bénéfice déclaré. La validation débite le porteur et crédite chaque investisseur au prorata de sa mise. |
| `market_update_investment_rules` | `p_project_id uuid`<br>`p_profit_sharing_rules text` | `market_investment_projects` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Projet introuvable<br>`PY019` Règles de répartition verrouillées depuis le premier investissement | Modifie les règles de répartition : porteur uniquement, et seulement avant le premier investissement (RG-M05). |

#### Back-office (administrateurs de la plateforme)

| Fonction | Paramètres | Retour | Erreurs levées (message conseillé) | Rôle |
| --- | --- | --- | --- | --- |
| `admin_anonymized_accounts` | — | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Comptes anonymisés avec le solde et les mises restant à restituer. |
| `admin_create_category` | `p_name text`<br>`p_parent_id uuid DEFAULT NULL::uuid` | `market_product_categories` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Nom de catégorie requis<br>`PY018` Catégorie parente introuvable | Crée une catégorie de produits (avec ou sans catégorie parente). |
| `admin_funds_summary` | — | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Rapprochement du compte marchand : total des portefeuilles, des séquestres et du portefeuille plateforme, recharges en attente. |
| `admin_investment_supervision` | — | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Projets (porteur, séquestre, investisseurs) et bénéfices déclarés : `{ escrow_total, projects, distributions }`. |
| `admin_overview` | — | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Tableau de bord : compteurs, volume du mois, validations en attente. |
| `admin_review_kyc` | `p_kyc_id uuid`<br>`p_status text` | `admin_kyc` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Demande introuvable<br>`PY019` Demande déjà traitée | Approuve ou refuse une demande KYC (`approved` / `rejected`) ; reporte la décision sur le profil de l'utilisateur. |
| `admin_review_moderation` | `p_item_id uuid`<br>`p_status text` | `admin_moderation` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Signalement introuvable | Traite un signalement : `pending`, `approved`, `rejected`. |
| `admin_set_commission` | `p_service text`<br>`p_rate numeric` | `admin_commissions` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Commission invalide | Crée ou modifie un taux de commission (0 à 100 %). Journalisé avec l'ancien et le nouveau taux. |
| `admin_set_dispute_status` | `p_dispute_id uuid`<br>`p_status text` | `admin_disputes` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Statut invalide<br>`PY018` Litige introuvable | Change le statut d'un litige : `open`, `in_progress`, `resolved`. |
| `admin_set_user_suspended` | `p_user_id uuid`<br>`p_suspended boolean` | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Décision invalide<br>`PY018` Utilisateur introuvable<br>`PY019` Un compte anonymisé ne peut pas être rétabli | Suspend ou rétablit un compte. Jamais soi-même ; un compte anonymisé ne se rétablit pas. |
| `admin_supervision` | — | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Toutes les associations et tous les groupes financiers : `{ organizations, financial_groups }`. |
| `admin_toggle_status` | `p_kind text`<br>`p_id uuid` | `text` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY009` Élément invalide<br>`PY018` Élément introuvable | Active / désactive un pays (`country`), un opérateur (`operator`) ou une intégration (`integration`). Renvoie le nouveau statut. |
| `admin_update_config` | `p_platform_name text DEFAULT NULL::text`<br>`p_support_email text DEFAULT NULL::text`<br>`p_maintenance_mode boolean DEFAULT NULL::boolean`<br>`p_cgu_version text DEFAULT NULL::text`<br>`p_legal_text text DEFAULT NULL::text` | `admin_config` | `PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Configuration introuvable | Modifie la configuration générale ; un paramètre à null est inchangé. |
| `admin_update_plan` | `p_plan_id uuid`<br>`p_monthly_price integer` | `admin_plans` | `PY001` Prix invalide<br>`PY004` Non authentifié<br>`PY006` Action non autorisée<br>`PY018` Formule introuvable | Modifie le prix mensuel d'une formule. |
| `admin_users` | `p_search text DEFAULT NULL::text`<br>`p_limit integer DEFAULT 50`<br>`p_offset integer DEFAULT 0` | `jsonb` | `PY004` Non authentifié<br>`PY006` Action non autorisée | Liste paginée des comptes : `{ total, users: [{ id, name, email, phone, status, is_admin, kyc_status, created_at }] }`. |
| `is_platform_admin` | — | `boolean` | — | Vrai si l'appelant est administrateur de la plateforme : sert à afficher le mode administrateur. |

#### Prédicats et fonctions utilitaires

Utilisés par les politiques d'accès ; rarement utiles à appeler directement.

| Fonction | Paramètres | Retour |
| --- | --- | --- |
| `is_org_admin` | `org_id uuid` | `boolean` |
| `is_org_member` | `org_id uuid` | `boolean` |
| `market_commission` | `p_total integer, p_rate numeric` | `integer` |
| `market_is_reseller` | `reseller_id uuid` | `boolean` |
| `org_creator_can_join` | `org_id uuid` | `boolean` |

84 fonctions sont appelables avec le jeton d'un utilisateur connecté. Appelables aussi sans connexion, où elles renvoient toujours faux : `is_org_admin`, `is_org_member`, `market_is_reseller`.
<!-- généré:rpc:fin -->

### Formes de réponse `jsonb` utiles

```
account_close_self   → { "action": "deleted" | "anonymized",
                         "reasons": ["wallet_balance", "escrow_contribution", "undelivered_order", "project_share"] }
admin_overview       → { users_total, organizations_total, financial_groups_total, monthly_volume, commissions_total,
                         pending_resellers, pending_kyc, pending_moderation, pending_profit_distributions,
                         disputes_open, anonymized_accounts, currency }
admin_funds_summary  → { user_wallets_total, user_wallets_count, escrow_total, platform_wallet_balance, funds_total,
                         anonymized_wallets_total, pending_topups_count, pending_topups_amount,
                         confirmed_topups_amount, withdrawals_amount, negative_wallets, currency, generated_at }
admin_anonymized_accounts → [ { user_id, anonymized_at, reasons, wallet_balance, invested_amount, blockers } ]
```

---

## 6. Tables lisibles et règles d'accès

Lecture : `supabase.from('table').select(...)`. Les politiques d'accès (RLS) filtrent les lignes : une requête ne renvoie que ce que l'utilisateur a le droit de voir, sans erreur. « **aucune** » en écriture signifie que la table ne change que par les fonctions de la section 5 (ou pas du tout depuis un client).

Vocabulaire : *sa propre ligne* = `user_id` est l'utilisateur connecté ; *membre de l'organisation* = l'utilisateur a une adhésion (`memberships`) dans l'organisation de la ligne ; *admin de l'organisation* = cette adhésion a le rôle `admin` ; *admin plateforme* = compte inscrit dans `platform_admins` ; *connecté* = tout utilisateur connecté.

<!-- généré:tables:début -->
#### Compte et Hub

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `account_anonymizations` | admin plateforme | **aucune** (fonctions uniquement) |
| `hub_conversations` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_favorites` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_kyc` | sa propre ligne | **aucune** (fonctions uniquement) |
| `hub_messages` | ses propres conversations | ajout : ses propres conversations |
| `hub_notifications` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_preferences` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_referrals` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_sync_queue` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `hub_vault` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne<br>suppression : sa propre ligne |
| `user_profiles` | colonnes limitées — sa propre ligne | **aucune** (fonctions uniquement) |

#### Organisations et membres

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `affiliations` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation<br>suppression : admin de l'organisation |
| `antennas` | membre de l'organisation | ajout : admin de l'organisation |
| `members` | membre de l'organisation | ajout : admin de l'organisation OU connecté AND (status = 'pending') AND sa propre ligne<br>modification : admin de l'organisation<br>suppression : admin de l'organisation |
| `memberships` | sa propre ligne | ajout : sa propre ligne AND org_creator_can_join(organization_id)<br>suppression : sa propre ligne |
| `organization_settings` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `organizations` | membre de l'organisation | ajout : connecté AND créateur<br>modification : admin de l'organisation |
| `shared_memberships` | membre de l'organisation | ajout : membre de l'organisation<br>modification : admin de l'organisation |

#### Pay

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `pay_methods` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne |
| `pay_reconciliation` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne |
| `pay_settings` | sa propre ligne | ajout : sa propre ligne<br>modification : sa propre ligne |
| `pay_transactions` | sa propre ligne | **aucune** (fonctions uniquement) |
| `pay_wallets` | sa propre ligne | **aucune** (fonctions uniquement) |

#### Market

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `market_group_order_participants` | connecté | **aucune** (fonctions uniquement) |
| `market_group_orders` | connecté | **aucune** (fonctions uniquement) |
| `market_investment_contributions` | connecté | **aucune** (fonctions uniquement) |
| `market_investment_distribution_shares` | admin plateforme OU sa propre ligne OR (EXISTS ( SELECT 1 FROM (market_investment_distributions d JOIN market_investment_projects p ON ((p.id = d.project_id))) WHERE (… | **aucune** (fonctions uniquement) |
| `market_investment_distributions` | connecté | **aucune** (fonctions uniquement) |
| `market_investment_projects` | connecté | **aucune** (fonctions uniquement) |
| `market_order_items` | EXISTS ( SELECT 1 FROM market_orders o WHERE ((o.id = market_order_items.order_id) AND ((o.buyer_id = auth.uid()) OR revendeur propriétaire))) | **aucune** (fonctions uniquement) |
| `market_orders` | acheteur OR revendeur propriétaire | **aucune** (fonctions uniquement) |
| `market_pickup_records` | EXISTS ( SELECT 1 FROM market_orders o WHERE ((o.id = market_pickup_records.order_id) AND revendeur propriétaire)) | **aucune** (fonctions uniquement) |
| `market_product_categories` | connecté | **aucune** (fonctions uniquement) |
| `market_products` | connecté | ajout : revendeur propriétaire<br>modification : revendeur propriétaire |
| `market_reseller_applications` | admin plateforme OU sa propre ligne | **aucune** (fonctions uniquement) |
| `market_reseller_settings` | revendeur propriétaire | ajout : revendeur propriétaire<br>modification : revendeur propriétaire |
| `market_resellers` | connecté | **aucune** (fonctions uniquement) |
| `market_reviews` | connecté | **aucune** (fonctions uniquement) |
| `market_service_requests` | sa propre ligne OR (EXISTS ( SELECT 1 FROM market_services s WHERE ((s.id = market_service_requests.service_id) AND (s.provider_user_id = auth.uid(… | **aucune** (fonctions uniquement) |
| `market_service_reviews` | connecté | **aucune** (fonctions uniquement) |
| `market_services` | connecté | **aucune** (fonctions uniquement) |

#### Finance (groupes, prêts, solidarité)

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `financial_groups` | membre de l'organisation | modification : admin de l'organisation |
| `group_members` | membre de l'organisation (via financial_groups) | modification : admin de l'organisation (via financial_groups) |
| `group_payments` | membre de l'organisation (via financial_groups) | **aucune** (fonctions uniquement) |
| `group_settings` | membre de l'organisation (via financial_groups) | modification : admin de l'organisation (via financial_groups) |
| `group_turns` | membre de l'organisation (via financial_groups) | modification : admin de l'organisation (via financial_groups) |
| `guarantee_fund` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `insurance_claims` | membre de l'organisation | ajout : admin de l'organisation |
| `insurance_enrollments` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `loan_installments` | membre de l'organisation (via loans) | **aucune** (fonctions uniquement) |
| `loans` | membre de l'organisation (via financial_groups) | ajout : admin de l'organisation (via financial_groups)<br>modification : admin de l'organisation (via financial_groups) |
| `sponsorship_requests` | membre de l'organisation (via financial_groups) | ajout : admin de l'organisation (via financial_groups) |

#### Comptabilité et trésorerie

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `accounting_entries` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `budget_lines` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `consolidation_movements` | membre de l'organisation | ajout : admin de l'organisation |
| `reconciliation_lines` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `treasury_transactions` | membre de l'organisation | ajout : admin de l'organisation |

#### Journal d'audit

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `audit_events` | (organization_id IS NOT NULL) AND admin de l'organisation | **aucune** (fonctions uniquement) |

#### Back-office et référentiels

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `admin_audit_logs` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_commissions` | connecté | **aucune** (fonctions uniquement) |
| `admin_config` | connecté | **aucune** (fonctions uniquement) |
| `admin_countries` | connecté | **aucune** (fonctions uniquement) |
| `admin_disputes` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_insurance` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_integrations` | colonnes limitées — admin plateforme | **aucune** (fonctions uniquement) |
| `admin_invoices` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_kyc` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_moderation` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_operators` | connecté | **aucune** (fonctions uniquement) |
| `admin_plans` | connecté | **aucune** (fonctions uniquement) |
| `admin_roles` | admin plateforme | **aucune** (fonctions uniquement) |
| `admin_security_audit` | admin plateforme | **aucune** (fonctions uniquement) |
| `platform_admins` | admin plateforme | **aucune** (fonctions uniquement) |

#### Technique (jamais accessibles aux clients)

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `app_migrations` | non | **aucune** (fonctions uniquement) |
| `control_plane_access_log` | non | **aucune** (fonctions uniquement) |
| `control_plane_outbox` | non | **aucune** (fonctions uniquement) |

#### Community (vie associative)

| Table | Lecture directe | Écriture directe |
| --- | --- | --- |
| `announcements` | membre de l'organisation | ajout : admin de l'organisation |
| `assets` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `attendance` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `beneficiaries` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `contributions` | membre de l'organisation | modification : admin de l'organisation |
| `documents` | membre de l'organisation | ajout : admin de l'organisation |
| `election_candidates` | membre de l'organisation (via elections) | **aucune** (fonctions uniquement) |
| `election_votes` | voter_id = auth.uid() | **aucune** (fonctions uniquement) |
| `elections` | membre de l'organisation | **aucune** (fonctions uniquement) |
| `events` | membre de l'organisation | ajout : admin de l'organisation |
| `leaves` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `mandate_office_holders` | membre de l'organisation (via mandates) | **aucune** (fonctions uniquement) |
| `mandates` | membre de l'organisation | **aucune** (fonctions uniquement) |
| `meeting_attendees` | membre de l'organisation (via meetings) | ajout : admin de l'organisation (via meetings) |
| `meetings` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `mobility_reports` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `project_contributions` | membre de l'organisation (via projects) | **aucune** (fonctions uniquement) |
| `project_evaluations` | membre de l'organisation | ajout : admin de l'organisation |
| `projects` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `relocations` | membre de l'organisation | ajout : membre de l'organisation<br>modification : admin de l'organisation |
| `sanctions` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `signature_requests` | membre de l'organisation | **aucune** (fonctions uniquement) |
| `signature_signatories` | membre de l'organisation (via signature_requests) | **aucune** (fonctions uniquement) |
| `social_case_contributors` | EXISTS ( SELECT 1 FROM social_cases c WHERE ((c.id = social_case_contributors.case_id) AND is_org_member(c.organization_id) AND (c.contributors_vis… | **aucune** (fonctions uniquement) |
| `social_cases` | membre de l'organisation AND ((status = ANY (ARRAY['approved', 'funded', 'disbursed'])) OR org_is_bureau(organization_id) OR (declared_by = auth.ui… | **aucune** (fonctions uniquement) |
| `staff` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `staff_evaluations` | membre de l'organisation | ajout : admin de l'organisation |
| `tasks` | membre de l'organisation | ajout : admin de l'organisation<br>modification : admin de l'organisation |
| `transfer_decisions` | membre de l'organisation | **aucune** (fonctions uniquement) |

105 tables, dont 50 sans aucune écriture directe possible pour un client.
<!-- généré:tables:fin -->

Précisions :

- `user_profiles` : toutes les colonnes sauf `pin_hash`. Un `select('*')` échoue : nommer les colonnes.
- `admin_integrations` : colonnes `id, name, partner, webhook_url, status` ; la clé d'API n'est jamais lisible.
- `market_investment_contributions` est lisible par tout utilisateur connecté et contient `user_id` : l'application ne doit afficher que des parts **anonymes** (« Investisseur 1 », « Vous »), comme l'application de référence.
- Destinataires d'un transfert : lire `members` (`id, user_id, name, organization_id`) filtré sur `user_id` non nul, statut `active`, et différent de soi. Ne jamais afficher téléphone ou e-mail.
- Le portefeuille plateforme et les comptes de séquestre vivent dans `pay_wallets` sans `user_id` : ils sont invisibles pour tout client, administrateur compris (voir `admin_funds_summary`).

---

## 7. Edge Functions

Adresse : `https://<ref-du-projet>.supabase.co/functions/v1/<nom>`.

### Appelée par l'application

| Fonction | Appel | Réponse |
| --- | --- | --- |
| `ai-assistant` | `supabase.functions.invoke('ai-assistant', body: { 'intent': …, 'input': … })` — le jeton de l'utilisateur est joint automatiquement | `{ "text": "…" }` |

`intent` appartient à une liste fermée ; l'invite système correspondante est fixée côté serveur :

| `intent` | Usage | Contenu de `input` |
| --- | --- | --- |
| `minutes` | Synthèse d'un compte-rendu de réunion | Notes brutes |
| `announcement` | Rédaction d'une annonce | Sujet |
| `document` | Description d'un document | Titre |
| `project` | Description d'un projet associatif | Nom |
| `product` | Description d'un produit | Nom et mots-clés |
| `mobility` | Synthèse du rapport de mobilité | Indicateurs agrégés, sans montant |
| `chat` | Assistant conversationnel | Question |
| `risk` | Membres à risque de retard | Liste JSON de membres ; réponse JSON `{ "flagged": [...] }` |
| `loan` | Suggestion de montant de prêt | Indicateurs JSON ; réponse JSON `{ "suggested": n }` |
| `reconciliation` | Écarts de rapprochement | Liste JSON d'écritures ; réponse JSON `{ "flags": [...] }` |

Erreurs : `401 UNAUTHENTICATED`, `400 UNKNOWN_INTENT` / `EMPTY_PROMPT`, `413 PROMPT_TOO_LONG` (plus de 12 000 caractères), `503 AI_NOT_CONFIGURED`, `502 PROVIDER_*`. **Dans tous les cas d'erreur, retomber sur la synthèse locale déterministe** (voir `lib/ai/assistant.ts` : fonctions `*Locally`), en indiquant que le texte n'est pas produit par l'IA. Pour `risk`, `loan` et `reconciliation`, valider la réponse (identifiants existants, bornes) avant de l'afficher, comme le fait l'application de référence.

### `pay-withdraw` — retrait (appelée par l'application)

`POST {SUPABASE_URL}/functions/v1/pay-withdraw`, avec `Authorization: Bearer <access_token de l'utilisateur>` et `apikey`.

```json
{ "amount": 5000, "provider": "Orange Money", "wallet_id": null }
```

Réponse `200` : la transaction (`type: "withdrawal"`, `commission`, `reference`). Le compte débité est toujours celui du jeton ; un identifiant de compte envoyé dans la requête est ignoré.

Erreurs : `401` (non connecté), `400` (montant invalide, solde insuffisant), `404` (portefeuille introuvable), `503` avec `code: "pay_test_mode"` (argent réel non activé) ou `code: "payout_unavailable"` (argent réel activé mais aucun opérateur intégré). **En pratique, hors du projet de test, cette fonction répond toujours `503`** : ne pas proposer le retrait tant que la règle absolue 4 s'applique. La fonction existe pour que l'intégration de l'opérateur n'ait plus qu'un endroit où se brancher.

### Jamais appelées par l'application

| Fonction | Appelée par | Protection |
| --- | --- | --- |
| `pay-topup-confirm` | Opérateur Mobile Money (webhook) | `PAY_WEBHOOK_SECRET` + garde-fou `PAY_REAL_MONEY` |
| `investments-settle` | Exploitation / planificateur externe | `CRON_SECRET` |
| `control-plane-push` | pg_cron toutes les 15 minutes, ou le Kernel | `CRON_SECRET` ou JWT inter-services |
| `control-plane` (`/health`, `/metrics`, `/audit-logs`) | Kernel GSG | JWT inter-services |

Une recharge se déroule donc ainsi : l'application appelle `pay_topup` (transaction `pending`), l'utilisateur paie chez l'opérateur, l'opérateur appelle `pay-topup-confirm`, le portefeuille est crédité. L'application constate le changement en relisant `pay_transactions` ; elle ne confirme jamais elle-même.

---

## 8. Hors connexion : cache et file de synchronisation

Cahier §12 et §13 : consultation hors ligne du contenu déjà chargé ; actions sans réseau mises en file et rejouées à la reconnexion ; opérations financières irréversibles jamais exécutées localement.

### 8.1 Règles communes

- **Cache local chiffré**, à durée limitée, servi d'abord puis rafraîchi en arrière-plan (« dernier état connu » affiché hors ligne, avec sa date).
- **Jamais en cache** : le PIN, les codes de connexion, les pièces d'identité, les jetons en clair.
- **File de synchronisation** : une action faite hors ligne est enregistrée localement (module, action, paramètres, date), affichée « en attente », puis rejouée dans l'ordre à la reconnexion. Une action refusée par la base au rejeu est retirée de la file et signalée à l'utilisateur avec le message de l'erreur.
- **Conflits** : la première opération horodatée par le serveur l'emporte ; l'autre reçoit `PY008` / `PY019` et doit être signalée pour arbitrage (trésorier, administrateur), jamais rejouée en boucle.
- **Jamais dans la file** : tout mouvement de portefeuille (`pay_topup`, `pay_transfer`, Edge Function `pay-withdraw`, `market_pay_order`, `market_invest`), tout vote et toute signature (`election_cast_vote`, `signature_sign`), toute décision ou validation (`market_review_*`, `admin_*`, `social_case_review`, `social_case_disburse`, `group_validate_payment`, `loan_decide`, `loan_repay_installment`, `claim_decide`, `transfer_decide`, `election_close`, `accounting_consolidate`), la fermeture de compte et le PIN. Ces opérations exigent le réseau : désactiver le bouton hors ligne et le dire.

### 8.2 Par module

| Module | À mettre en cache (lecture hors ligne) | À placer en file de synchronisation | Toujours en ligne |
| --- | --- | --- | --- |
| **Hub** | Profil, favoris, notifications, préférences, conversations et messages reçus, coffre-fort (liste), carte / QR code personnel | Favori ajouté ou retiré, notification lue, préférences, message envoyé | PIN, KYC, fermeture de compte |
| **Pay** | Portefeuilles et **dernier solde connu** (`last_known_balance`), derniers mouvements, moyens de paiement, destinataires | Moyen de paiement ajouté, paramètres | Recharge, transfert, retrait |
| **Market** | Catalogue et catégories consultés, mes commandes, commandes groupées, services, projets d'investissement, espace revendeur | Produit du revendeur créé ou modifié, service publié | Création et paiement de commande, annulation, avancement logistique (scan, remise), investissement, bénéfices, candidature revendeur |
| **Community** | Organisations, membres et badge d'engagement, réunions, annonces, documents, projets, cotisations déjà chargées, cas sociaux, tâches, sanctions, événements | Annonce publiée, réunion planifiée, document ajouté, projet créé, contribution à un projet **déclarée**, présence à une réunion (QR code) | Changement de rôle ou suppression d'un membre, vote, signature |
| **Finance** | Groupes, tours, versements, prêts et échéanciers, solidarité, parrainages | Groupe créé, versement **déclaré**, demande de prêt, déclaration de sinistre, adhésion à l'assurance | Validation d'un versement, décision et remboursement de prêt, décision sur un sinistre, clôture de groupe |
| **Comptabilité** | Écritures, budget, trésorerie, rapprochement | Écriture créée | Validation d'écriture, consolidation, rapprochement |
| **Back-office** | Tableau de bord (lecture seule) | — | Toutes les décisions |

Cette répartition reprend celle de l'application de référence (hooks `declareOffline` / `enqueueSync`), resserrée sur un point : les validations et décisions, que l'application web mettait en file, sont ici « toujours en ligne », conformément au cahier (pas d'opération financière irréversible sans confirmation du serveur).

**Limite connue :** les fonctions SQL n'acceptent pas de clé d'idempotence. Une action rejouée deux fois (réponse perdue puis nouvel essai) peut créer un doublon pour les simples déclarations. À traiter côté base avant d'ouvrir la file à ces actions (§9).

---

## 9. Ce qui n'est pas encore prêt

| Sujet | État | Conséquence pour Flutter |
| --- | --- | --- |
| Lecture des données d'une organisation par un simple membre | Les politiques de lecture reposent sur la table `memberships`, que seule la création d'une organisation alimente (son créateur). Un membre actif (fiche `members` reliée à son compte) peut **agir** par les fonctions — voter, signer, contribuer, déclarer un versement — mais ne **lit** pas encore les tables de l'organisation | Les écrans du bureau et de l'administrateur fonctionnent. Pour un simple membre, s'appuyer sur ce que renvoient les fonctions (chaque fonction renvoie la ligne modifiée) ; les écrans de consultation attendent le rattachement automatique des membres acceptés |
| Création d'un scrutin, enregistrement d'une demande de parrainage, demande de prêt et confirmation du parrain | Écritures simples réservées à l'administrateur de l'organisation (politiques d'accès), sans fonction dédiée | Utilisables par l'administrateur ; pas encore par le bureau ni par le membre concerné |
| Avis : confirmation par le prestataire | Un avis sur un service exige que le prestataire ait confirmé la sollicitation (`market_respond_service_request`). Un prestataire qui ne répond pas bloque donc l'avis | Prévoir l'écran « sollicitations reçues » du prestataire ; règle à réévaluer si elle est détournée |
| Cotisations, tontines, prêts, cas sociaux et projets réglés par le portefeuille | Non branchés : ces modules tiennent des registres, sans mouvement de portefeuille. Un versement ou une cotisation déclarés restent `pending` jusqu'à validation par la trésorerie ; une contribution à un cas social ou à un projet est un engagement, pas un paiement | Ne pas présenter ces opérations comme des paiements ; ne pas afficher « payé » avant la validation |
| Seuil de double signature (RG-C04) | Les signataires sont choisis par le bureau à la création de la demande ; aucun seuil par association n'impose encore « président + trésorier » au-delà d'un montant | Proposer président et trésorier par défaut pour une dépense ou un retrait |
| Retrait réel vers Mobile Money | Aucun opérateur intégré. `pay_withdraw` n'est plus appelable directement ; l'Edge Function `pay-withdraw` refuse hors du projet de test | Ne pas proposer le retrait (règle absolue 4) |
| Webhook de recharge | Secret partagé uniquement ; à remplacer par la signature de l'opérateur retenu | Aucune |
| Clé d'idempotence pour le rejeu hors ligne | Absente | Voir §8 |
| Invalidation ciblée du cache par notification (cahier §13) | Non mise en place (pas de canal temps réel configuré) | Rafraîchir à l'ouverture d'un écran et à la reconnexion |
