# Mettre AssoShop en production

Ce guide s'adresse à la personne qui ouvre le service, sans connaissances techniques particulières. Suivez les étapes dans l'ordre. Chaque commande est à copier telle quelle dans un terminal ouvert dans le dossier du projet (`assoshop-web`).

**AssoShop n'a pas de site web à héberger.** Les membres utilisent l'application Flutter (téléphone et ordinateur) ; le back-office est le mode administrateur de cette même application sur ordinateur. Tout le reste vit chez Supabase : la base de données, la connexion des utilisateurs, cinq petites fonctions serveur (« Edge Functions ») et les tâches automatiques. Il n'y a donc ni hébergeur web, ni nom de domaine à brancher.

Comptez une demi-journée. Vous pouvez vous arrêter après n'importe quelle étape et reprendre plus tard.

> **Deux règles à garder en tête tout du long**
>
> 1. La base de **production** et la base de **test** sont deux projets Supabase différents. On ne mélange jamais leurs clés.
> 2. L'interrupteur `PAY_REAL_MONEY` reste **désactivé**. Tant qu'il l'est, aucun argent réel n'entre ni ne sort, et l'application affiche « Paiements en mode test ». Il ne s'active que lorsque le partenaire agréé qui détiendra les fonds est choisi (cahier des charges, règles RG-P01 et RG-P07).

## Sommaire

1. [Ce qu'il vous faut](#1-ce-quil-vous-faut)
2. [Créer la base de production (Supabase)](#2-créer-la-base-de-production-supabase)
3. [Préparer le fichier des secrets sur votre ordinateur](#3-préparer-le-fichier-des-secrets-sur-votre-ordinateur)
4. [Installer la structure de la base (migrations)](#4-installer-la-structure-de-la-base-migrations)
5. [Régler la connexion des utilisateurs (Supabase Auth)](#5-régler-la-connexion-des-utilisateurs-supabase-auth)
6. [Installer les fonctions serveur (Edge Functions)](#6-installer-les-fonctions-serveur-edge-functions)
7. [Tâches automatiques toutes les 15 minutes](#7-tâches-automatiques-toutes-les-15-minutes)
8. [Créer le premier administrateur](#8-créer-le-premier-administrateur)
9. [Transmettre les accès à l'équipe Flutter](#9-transmettre-les-accès-à-léquipe-flutter)
10. [Liste de vérification avant ouverture](#10-liste-de-vérification-avant-ouverture)
11. [À ne jamais faire en production](#11-à-ne-jamais-faire-en-production)
12. [En cas de problème](#12-en-cas-de-problème)

---

## 1. Ce qu'il vous faut

| Quoi | Pourquoi | Coût |
| --- | --- | --- |
| Un compte **Supabase** (supabase.com) | Base de données, connexion des utilisateurs, fonctions serveur, tâches automatiques | Formule **Pro** nécessaire pour les sauvegardes quotidiennes |
| Un service d'**envoi d'e-mails** (SMTP : Brevo, Resend, Mailjet…) | Envoi des codes de connexion | Souvent gratuit pour de petits volumes |
| Votre ordinateur, avec le projet, Node.js et l'outil **Supabase CLI** installés | Pour lancer les quelques commandes de ce guide | — |

Vérifiez l'outil Supabase avec `supabase --version` : la commande doit afficher un numéro de version.

Les formules et leurs limites changent : vérifiez-les sur le site de Supabase au moment de souscrire.

---

## 2. Créer la base de production (Supabase)

1. Connectez-vous sur supabase.com et cliquez sur **New project**.
2. **Nom** : `assoshop-production` (un nom qui ne peut pas être confondu avec la base de test).
3. **Mot de passe de la base** : cliquez sur **Generate a password** pour obtenir un mot de passe long et aléatoire. Enregistrez-le tout de suite dans un gestionnaire de mots de passe : il ne sera plus affiché.
4. **Région** : choisissez **West EU (Paris)**, la région européenne la plus proche de la Guinée.
5. **Formule** : choisissez **Pro**. C'est elle qui apporte les **sauvegardes quotidiennes automatiques** ; la formule gratuite n'en fait pas et met le projet en pause en cas d'inactivité.
6. Créez le projet et attendez une à deux minutes.
7. Vérifiez les sauvegardes : menu **Database → Backups**. La page doit indiquer des sauvegardes quotidiennes planifiées.
8. Notez la **référence du projet** : c'est la suite de lettres au début de son adresse (`https://xxxxxxxxxxxxxxxxxxxx.supabase.co`). Elle sert aux étapes 6 et 7.

Gardez cette page ouverte : l'étape suivante y prend plusieurs valeurs.

---

## 3. Préparer le fichier des secrets sur votre ordinateur

Dans le dossier du projet, créez un fichier nommé exactement **`.env.production.local`**. Ce fichier reste sur votre ordinateur : il n'est jamais envoyé sur GitHub (le projet l'ignore automatiquement). Ne l'envoyez à personne par e-mail ou messagerie.

Copiez-y ce modèle, puis remplacez chaque valeur :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
PAY_REAL_MONEY=0

PGHOST=
PGPORT=5432
PGUSER=
PGPASSWORD=
PGDATABASE=postgres
```

Où trouver chaque valeur :

| Variable | Où la trouver | Remarque |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → Data API** → *Project URL* | Commence par `https://` et finit par `.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API Keys** → clé `anon` (`public`) | Clé publique : c'est celle que reçoit l'équipe Flutter |
| `SUPABASE_SERVICE_ROLE_KEY` | Même page → clé `service_role` (`secret`) | **Secrète** : elle donne tous les droits sur la base. Elle ne va jamais dans l'application Flutter |
| `CRON_SECRET` | À fabriquer vous-même (commande ci-dessous) | Mot de passe des tâches automatiques |
| `PAY_REAL_MONEY` | Toujours `0` pour l'instant | Voir l'encadré en tête de guide |
| `PGHOST`, `PGUSER` | Supabase → bouton **Connect** (en haut de page) → onglet **Session pooler** | `PGUSER` a la forme `postgres.xxxxxxxx` |
| `PGPASSWORD` | Le mot de passe de la base enregistré à l'étape 2 | — |
| `PGPORT`, `PGDATABASE` | Toujours `5432` et `postgres` | — |

Les deux premiers noms commencent par `NEXT_PUBLIC_` pour une raison historique (les scripts du projet les lisent sous ce nom) ; cela n'implique aucun site web.

Pour fabriquer `CRON_SECRET`, lancez cette commande et copiez la ligne affichée :

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Vérifiez ensuite que rien ne manque. Cette commande **n'affiche aucune valeur**, seulement le nom de chaque variable et « OK » ou « MANQUE » :

```
node --env-file=.env.production.local scripts/preflight-production.mjs --migrations
```

Corrigez jusqu'à lire « Tout est en ordre. »

---

## 4. Installer la structure de la base (migrations)

Les « migrations » sont les 28 fichiers (`0001` à `0028`) qui créent les tables, les règles de sécurité, les fonctions appelées par l'application et les tâches automatiques. Un script les applique toutes d'un coup, et annule tout au moindre problème : la base n'est jamais laissée dans un état intermédiaire.

**4.1 — Regarder l'état de la base (ne modifie rien)**

```
node --env-file=.env.production.local scripts/db-state.mjs
```

Sur un projet neuf, toutes les lignes indiquent `ABSENTE`. Vérifiez sur la première ligne que le serveur est bien celui de **production**.

**4.2 — Essai à blanc (ne modifie rien)**

```
node --env-file=.env.production.local scripts/apply-migrations.mjs --dry-run --smoke
```

Le script applique les 28 migrations, lance 380 tests de sécurité, puis **annule tout**. Vous devez lire :

- `26 migration(s)` en attente, chacune suivie de `OK` ;
- `380/380 tests de fumée verts` ;
- `ESSAI À BLANC TERMINÉ : ROLLBACK effectué, la base n'a pas été modifiée.`

Si une ligne indique `ÉCHEC`, arrêtez-vous ici et transmettez le message affiché à la personne qui maintient le projet. Rien n'a été modifié.

> Cette application « depuis zéro » sur une base entièrement neuve n'a encore jamais été exécutée : jusqu'ici les migrations ont été posées une à une sur la base de test. L'essai à blanc sert précisément à le vérifier sans risque.

**4.3 — Application réelle**

Seulement si l'essai à blanc est entièrement vert :

```
node --env-file=.env.production.local scripts/apply-migrations.mjs --smoke
```

Vous devez lire `APPLICATION TERMINÉE : 26 migration(s) validée(s) (COMMIT).` Les données créées par les tests sont annulées : la base est structurée mais vide.

**4.4 — Contrôle**

```
node --env-file=.env.production.local scripts/db-state.mjs
```

Toutes les lignes indiquent `PRÉSENTE`, et la rubrique « Données » affiche `0` partout.

---

## 5. Régler la connexion des utilisateurs (Supabase Auth)

Les utilisateurs se connectent avec un **code à 6 chiffres** reçu par e-mail (ou par SMS / WhatsApp), puis un code PIN. Ces réglages se font dans Supabase, menu **Authentication**.

1. **E-mails** — *Authentication → Emails → SMTP Settings* : activez **Custom SMTP** et saisissez les paramètres fournis par votre service d'envoi d'e-mails (hôte, port, identifiant, mot de passe, adresse d'expéditeur). Sans ce réglage, Supabase n'envoie que quelques e-mails par heure, et seulement aux membres de votre organisation Supabase : suffisant pour un essai, pas pour un service ouvert.
2. **Modèles d'e-mails — étape obligatoire.** Par défaut, Supabase envoie un **lien** de connexion, alors que l'application demande un **code à 6 chiffres**. Tant que les modèles ne sont pas corrigés, personne ne peut se connecter. Voir [5.1](#51--modèles-de-mails-avec-le-code-à-6-chiffres) ci-dessous.
3. **Téléphone** (si vous ouvrez la connexion par SMS ou WhatsApp) — *Authentication → Sign In / Providers → Phone* : renseignez le fournisseur (Twilio). Sinon, laissez désactivé : seule la connexion par e-mail fonctionnera.
4. Faites un essai à l'étape 8 : c'est en créant votre propre compte que vous vérifierez la réception du code.

### 5.1 — Modèles d'e-mails avec le code à 6 chiffres

Dans Supabase, ouvrez **Authentication → Emails → Templates**. Deux modèles sont à remplacer : **Confirm signup** (envoyé à la première connexion, quand le compte est créé) et **Magic Link** (envoyé aux connexions suivantes). Pour chacun, remplacez le champ **Subject** et tout le contenu du champ **Body** par les textes ci-dessous, puis cliquez sur **Save**.

Ne modifiez pas les mots entre doubles accolades (`{{ .Token }}`) : Supabase les remplace par le code propre à chaque utilisateur.

**Modèle « Confirm signup »**

Subject :

```
Votre code AssoShop : {{ .Token }}
```

Body :

```html
<h2>Bienvenue sur AssoShop</h2>
<p>Pour confirmer votre inscription, saisissez ce code dans l'application :</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:24px 0">{{ .Token }}</p>
<p>Ce code est valable une heure et ne peut servir qu'une fois.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : aucun compte ne sera activé.</p>
<p>L'équipe AssoShop</p>
```

**Modèle « Magic Link »**

Subject :

```
Votre code de connexion AssoShop : {{ .Token }}
```

Body :

```html
<h2>Connexion à AssoShop</h2>
<p>Pour vous connecter, saisissez ce code dans l'application :</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:24px 0">{{ .Token }}</p>
<p>Ce code est valable une heure et ne peut servir qu'une fois.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et ne communiquez ce code à personne.</p>
<p>L'équipe AssoShop</p>
```

Ces modèles ne contiennent volontairement **aucun lien** : l'application Flutter n'a pas de page pour en recevoir un. (Sur la base de test, utilisée aussi par l'application web de référence, on peut ajouter une ligne `<a href="{{ .ConfirmationURL }}">…</a>`.)

Deux réglages à vérifier au même endroit, dans **Authentication → Sign In / Providers → Email** :

- **Email OTP Length** vaut **6** : l'application n'accepte que des codes à 6 chiffres ;
- **Email OTP Expiration** vaut **3600** secondes (une heure), pour correspondre au texte des e-mails. Si vous choisissez une autre durée, adaptez la phrase « valable une heure ».

---

## 6. Installer les fonctions serveur (Edge Functions)

Six fonctions tournent chez Supabase, dans le dossier `supabase/functions/` du projet :

| Fonction | Rôle | Qui l'appelle |
| --- | --- | --- |
| `ai-assistant` | Assistant IA (la clé du fournisseur d'IA reste côté serveur) | L'application, avec le jeton de l'utilisateur |
| `pay-topup-confirm` | Confirmation d'une recharge par l'opérateur Mobile Money | Le futur opérateur — **désactivée** tant que `PAY_WEBHOOK_SECRET` n'existe pas |
| `pay-withdraw` | Retrait vers Mobile Money : seul chemin vers le débit d'un portefeuille | L'application, avec le jeton de l'utilisateur — **répond `503`** tant qu'aucun opérateur n'est intégré |
| `investments-settle` | Dénouement à la demande des projets d'investissement échus | L'exploitation (la planification normale se fait en base, étape 7) |
| `control-plane-push` | Envoi des statistiques au Control Plane GSG | La base, toutes les 15 minutes |
| `control-plane` | Points d'accès interrogés par le Control Plane GSG | Le Kernel GSG |

**6.1 — Relier l'outil au projet de production**

```
supabase login
supabase link --project-ref LA_REFERENCE_DU_PROJET
```

La première commande ouvre le navigateur pour vous identifier ; la seconde demande le mot de passe de la base (étape 2).

**6.2 — Poser les secrets des fonctions**

Créez, à côté du premier, un fichier **`.env.functions.production.local`** contenant :

```
CRON_SECRET=
PAY_REAL_MONEY=0
```

| Secret | Valeur | Obligatoire |
| --- | --- | --- |
| `CRON_SECRET` | La même valeur que dans `.env.production.local` | Oui |
| `PAY_REAL_MONEY` | `0` | Recommandé, pour que le choix soit visible |
| `PAY_WEBHOOK_SECRET` | **Ne pas le créer** pour l'instant | Non — à créer avec le futur opérateur Mobile Money |
| `APP_ENV` | **Ne pas le créer** en production | Réservé au projet de test (valeur `test`) |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | Clé et modèle de votre fournisseur d'IA | Non — sans clé, l'application utilise sa synthèse locale |
| `CONTROL_PLANE_*` | Fournies par l'équipe du Kernel GSG (voir `docs/CONTROL_PLANE.md`) | Non — seulement si le Control Plane est branché |

Puis :

```
supabase secrets set --env-file .env.functions.production.local
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement aux fonctions : ne les ajoutez pas.

**6.3 — Déployer**

```
supabase functions deploy --use-api
```

Les six fonctions sont envoyées (l'option `--use-api` évite d'avoir à installer Docker). Vérification dans Supabase : menu **Edge Functions**, six lignes.

**6.4 — Contrôle**

Remplacez `LA_REFERENCE` et `LE_SECRET` (valeur de `CRON_SECRET`) :

```
curl -i https://LA_REFERENCE.supabase.co/functions/v1/investments-settle
curl -i -H "Authorization: Bearer LE_SECRET" https://LA_REFERENCE.supabase.co/functions/v1/investments-settle
curl -i -X POST https://LA_REFERENCE.supabase.co/functions/v1/pay-topup-confirm
```

Réponses attendues, dans l'ordre : `401` (pas de secret), `200` avec `{"released":0,"refunded":0,"expired":0,"failed":[]}`, et `404` (recharge réelle désactivée).

Sur le projet de **test** uniquement, un parcours complet des six fonctions existe (60 vérifications : refus sans secret, jetons falsifiés ou rejoués, recharge confirmée une seule fois, retrait, chaîne planifiée) :

```
node --env-file=.env.local --env-file=.env.functions.local scripts/e2e-edge-functions.mjs
```

Il crée un compte et de l'argent fictifs, puis les supprime. **Ne le lancez jamais sur la production** : il refuse de démarrer si `APP_ENV` ne vaut pas `test`.

---

## 7. Tâches automatiques toutes les 15 minutes

C'est **la base elle-même** qui planifie (extension pg_cron, installée par la migration `0026`). Il n'y a rien à héberger ni à configurer ailleurs.

| Tâche | Ce qu'elle fait | À faire de votre côté |
| --- | --- | --- |
| `assoshop-investments-settle` | À la date limite d'un projet d'investissement : verse les fonds au porteur si l'objectif est atteint, rembourse les investisseurs sinon | **Rien** : elle fonctionne dès l'étape 4 |
| `assoshop-control-plane-push` | Appelle la fonction `control-plane-push` pour envoyer les statistiques au Control Plane GSG | Seulement si le Control Plane est branché : étape 7.1 |

Ces tâches peuvent tourner autant de fois que l'on veut : un projet déjà traité n'est jamais versé ni remboursé une seconde fois. Si un projet ne peut pas être dénoué, une ligne `investment_settlement_failed:…` de gravité « critical » apparaît dans le journal du back-office.

Vérification : dans Supabase, **SQL Editor**, exécutez

```sql
select jobname, schedule, active from cron.job;
```

Deux lignes, `*/15 * * * *`, `active = true`. Un quart d'heure plus tard :

```sql
select jobid, status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
```

doit montrer des exécutions `succeeded`.

### 7.1 — Seulement si le Control Plane GSG est branché

La base a besoin de connaître l'adresse des fonctions et le mot de passe des tâches. Dans **SQL Editor**, exécutez une seule fois, en remplaçant les deux valeurs :

```sql
select vault.create_secret('https://LA_REFERENCE.supabase.co/functions/v1', 'assoshop_functions_url');
select vault.create_secret('LA_VALEUR_DE_CRON_SECRET', 'assoshop_cron_secret');
```

Ces valeurs sont conservées chiffrées (Supabase Vault). Tant qu'elles n'y sont pas, la tâche `assoshop-control-plane-push` ne fait rien : c'est normal.

---

## 8. Créer le premier administrateur

Un administrateur est un compte ordinaire auquel on donne le droit d'administrer la plateforme.

1. **Créez votre compte.** Avec l'application Flutter si elle est disponible ; sinon dans Supabase, **Authentication → Users → Add user → Create new user** : votre adresse e-mail, un mot de passe quelconque (il ne servira pas), case **Auto Confirm User** cochée.
2. Sur votre ordinateur, lancez, avec **votre** adresse e-mail :

```
node --env-file=.env.production.local scripts/bootstrap-admin.mjs votre-adresse@exemple.org
```

La première ligne affichée, `Projet Supabase visé : …`, doit être l'adresse du projet de **production**. Vous devez ensuite lire `Administrateur activé`.

3. Connectez-vous dans l'application avec cette adresse : vous recevez le code à 6 chiffres (c'est aussi le test de l'étape 5), puis l'application propose le mode administrateur.

Les administrateurs suivants se créent de la même façon. Un administrateur valide les revendeurs, les vérifications d'identité et les bénéfices des projets, et peut modifier les taux de commission : donnez ce rôle à peu de personnes.

---

## 9. Transmettre les accès à l'équipe Flutter

L'application n'a besoin que de **deux valeurs**, toutes deux publiques :

- l'adresse du projet (`NEXT_PUBLIC_SUPABASE_URL`) ;
- la clé `anon` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Ne transmettez **jamais** la clé `service_role`, le mot de passe de la base ni `CRON_SECRET` : l'application n'en a aucun usage, et ils donneraient tous les droits à quiconque la décompile.

Le document de référence de l'équipe est `docs/CONTRAT_BACKEND_FLUTTER.md` ; pour le mode administrateur, `docs/BACKOFFICE_FLUTTER.md`.

---

## 10. Liste de vérification avant ouverture

Cochez chaque ligne. N'ouvrez pas le service s'il en reste une.

**Secrets et accès**

- [ ] `node --env-file=.env.production.local scripts/preflight-production.mjs` affiche « Tout est en ordre. »
- [ ] L'équipe Flutter n'a reçu que l'adresse du projet et la clé `anon`.
- [ ] Le mot de passe de la base, la clé `service_role` et `CRON_SECRET` sont dans un gestionnaire de mots de passe, connus de deux personnes au plus.

**Connexion**

- [ ] L'e-mail de connexion contient un **code à 6 chiffres**, en français, et ce code vous a connecté (étape 5.1).
- [ ] Vous l'avez reçu en moins d'une minute, depuis l'adresse d'expéditeur d'AssoShop, et il n'est pas arrivé dans les indésirables.

**Argent**

- [ ] Le secret `PAY_REAL_MONEY` vaut `0` (ou n'existe pas) : `supabase secrets list` ne doit pas le montrer à `1`.
- [ ] Les secrets `PAY_WEBHOOK_SECRET` et `APP_ENV` n'existent pas.
- [ ] `curl -X POST …/functions/v1/pay-topup-confirm` répond `404`.
- [ ] L'application affiche le bandeau **« Paiements en mode test »**.

**Base de données**

- [ ] *Database → Backups* dans Supabase montre des sauvegardes quotidiennes.
- [ ] `node --env-file=.env.production.local scripts/db-state.mjs` : toutes les migrations `0001` à `0028` sont `PRÉSENTE`.
- [ ] Dans la rubrique « Données » de cette même commande, les **deux journaux d'audit sont à 0** et il n'y a que les comptes que vous avez créés vous-même. Un journal d'audit ne peut pas être vidé : s'il n'est pas vierge, c'est qu'un test a été lancé sur la production (voir étape 11) ; mieux vaut alors repartir d'un projet Supabase neuf.

**Fonctions et tâches automatiques**

- [ ] Menu **Edge Functions** : six fonctions déployées ; les trois réponses de l'étape 6.4 sont celles attendues.
- [ ] `select jobname, schedule, active from cron.job;` montre deux tâches actives, et `cron.job_run_details` des exécutions réussies.

**Personnes**

- [ ] Au moins un administrateur, et la liste des administrateurs est connue.

---

## 11. À ne jamais faire en production

- **Ne lancez jamais les scripts de test sur la production** (`e2e-security.mjs`, `e2e-auth.mjs`, `e2e-org.mjs`, `verify-production-guard.mjs`). Ils créent des comptes et des opérations fictives, et les traces qu'ils laissent dans le journal d'audit ne peuvent pas être effacées. Ils sont faits pour la base de test.
- **N'activez pas `PAY_REAL_MONEY`** sans décision écrite sur le partenaire agréé qui détient les fonds. **Ne créez pas `APP_ENV=test`** en production : ce réglage, réservé au projet de test, lève le garde-fou.
- **Ne modifiez jamais un fichier de migration déjà appliqué.** Toute correction passe par un nouveau fichier numéroté.
- **Ne modifiez pas les données à la main** dans les tables de portefeuille, de transactions ou d'investissement depuis le tableau de bord Supabase : aucune trace n'en serait gardée.
- **Ne supprimez pas un utilisateur depuis le tableau de bord Supabase** en cas de refus. Si la suppression est refusée, c'est que le compte porte encore un solde, une contribution, une commande ou une part dans un projet : il doit être anonymisé, pas supprimé. L'utilisateur le fait lui-même depuis l'application (*Paramètres → Supprimer mon compte*), qui choisit alors entre suppression et anonymisation.
- **Ne partagez pas** la clé `service_role`, le mot de passe de la base ni `CRON_SECRET`. En cas de doute sur une fuite, régénérez-les (Supabase → *API Keys* ; nouvelle valeur de `CRON_SECRET` par `supabase secrets set`, et dans Vault si l'étape 7.1 a été faite).

---

## 12. En cas de problème

| Ce que vous voyez | Ce que cela signifie | Que faire |
| --- | --- | --- |
| `Variable PGHOST manquante` | Le fichier `.env.production.local` n'est pas lu ou est incomplet | Vérifiez son nom exact et relancez la commande avec `--env-file=.env.production.local` |
| `ÉCHEC` pendant l'essai à blanc | Une migration ou un test ne passe pas | Rien n'a été modifié. Transmettez le message complet au mainteneur |
| `Fichier(s) modifié(s) depuis leur application` | Un fichier de migration a été changé après coup | Ne forcez rien. Prévenez le mainteneur |
| `Aucun utilisateur avec l'email …` (étape 8) | Le compte n'existe pas encore dans cette base | Créez d'abord le compte (étape 8, point 1), puis relancez |
| Le code de connexion n'arrive pas | Envoi d'e-mails non configuré | Reprenez l'étape 5, point 1 |
| L'e-mail contient un lien mais pas de code | Modèles d'e-mails de Supabase non corrigés | Reprenez l'étape 5.1 |
| `supabase functions deploy --use-api` refuse de démarrer | L'outil n'est pas relié au bon projet | Refaites `supabase link` (étape 6.1) |
| Une fonction répond `401` avec le bon secret | Le secret posé chez Supabase diffère de celui que vous envoyez | Refaites l'étape 6.2 ; les fonctions prennent la nouvelle valeur aussitôt |
| `investments-settle` répond `404` | Le secret `CRON_SECRET` n'existe pas | Refaites l'étape 6.2 |
| Message « Paiements en mode test » lors d'une recharge | Fonctionnement attendu tant que `PAY_REAL_MONEY` est désactivé | Rien à faire |
| Une ligne `investment_settlement_failed` dans le journal du back-office | Un projet d'investissement n'a pas pu être dénoué | Prévenez le mainteneur avec l'identifiant du projet ; les autres projets ne sont pas affectés |

Pour revenir à un état antérieur de la base, seule une sauvegarde Supabase le permet (*Database → Backups → Restore*). Une fonction serveur se redéploie simplement à partir d'une version précédente du code (`supabase functions deploy --use-api`).
