# Mettre AssoShop en production

Ce guide s'adresse à la personne qui ouvre le service, sans connaissances techniques particulières. Suivez les étapes dans l'ordre. Chaque commande est à copier telle quelle dans un terminal ouvert dans le dossier du projet (`assoshop-web`).

Comptez une demi-journée. Vous pouvez vous arrêter après n'importe quelle étape et reprendre plus tard.

> **Deux règles à garder en tête tout du long**
>
> 1. La base de **production** et la base de **test** sont deux projets Supabase différents. On ne mélange jamais leurs clés.
> 2. L'interrupteur `PAY_REAL_MONEY` reste **désactivé**. Tant qu'il l'est, aucun argent réel n'entre ni ne sort, et l'application affiche le bandeau « Paiements en mode test ». Il ne s'active que lorsque le partenaire agréé qui détiendra les fonds est choisi (cahier des charges, règles RG-P01 et RG-P07).

## Sommaire

1. [Ce qu'il vous faut](#1-ce-quil-vous-faut)
2. [Créer la base de production (Supabase)](#2-créer-la-base-de-production-supabase)
3. [Préparer le fichier des secrets sur votre ordinateur](#3-préparer-le-fichier-des-secrets-sur-votre-ordinateur)
4. [Installer la structure de la base (migrations)](#4-installer-la-structure-de-la-base-migrations)
5. [Régler la connexion des utilisateurs (Supabase Auth)](#5-régler-la-connexion-des-utilisateurs-supabase-auth)
6. [Héberger l'application (Vercel)](#6-héberger-lapplication-vercel)
7. [Tâches automatiques toutes les 15 minutes](#7-tâches-automatiques-toutes-les-15-minutes)
8. [Créer le premier administrateur](#8-créer-le-premier-administrateur)
9. [Liste de vérification avant ouverture](#9-liste-de-vérification-avant-ouverture)
10. [À ne jamais faire en production](#10-à-ne-jamais-faire-en-production)
11. [En cas de problème](#11-en-cas-de-problème)

---

## 1. Ce qu'il vous faut

| Quoi | Pourquoi | Coût |
| --- | --- | --- |
| Un compte **Supabase** (supabase.com) | Héberge la base de données et la connexion des utilisateurs | Formule **Pro** nécessaire pour les sauvegardes quotidiennes |
| Un compte **Vercel** (vercel.com) | Héberge l'application | Formule **Pro** nécessaire pour les tâches toutes les 15 minutes |
| L'accès au dépôt **GitHub** `TamataDelamou/AssoShop` | Vercel y lit le code | Déjà en place |
| Un **nom de domaine** (par exemple `app.votre-domaine.org`) | Adresse publique du service | Selon le bureau d'enregistrement |
| Un service d'**envoi d'e-mails** (SMTP : Brevo, Resend, Mailjet…) | Envoi des codes de connexion | Souvent gratuit pour de petits volumes |
| Votre ordinateur, avec le projet et Node.js installés | Pour lancer les quelques commandes de ce guide | — |

Les formules et leurs limites changent : vérifiez-les sur les sites de Supabase et de Vercel au moment de souscrire.

---

## 2. Créer la base de production (Supabase)

1. Connectez-vous sur supabase.com et cliquez sur **New project**.
2. **Nom** : `assoshop-production` (un nom qui ne peut pas être confondu avec la base de test).
3. **Mot de passe de la base** : cliquez sur **Generate a password** pour obtenir un mot de passe long et aléatoire. Enregistrez-le tout de suite dans un gestionnaire de mots de passe : il ne sera plus affiché.
4. **Région** : choisissez **West EU (Paris)**, la région européenne la plus proche de la Guinée.
5. **Formule** : choisissez **Pro**. C'est elle qui apporte les **sauvegardes quotidiennes automatiques** ; la formule gratuite n'en fait pas et met le projet en pause en cas d'inactivité.
6. Créez le projet et attendez une à deux minutes.
7. Vérifiez les sauvegardes : menu **Database → Backups**. La page doit indiquer des sauvegardes quotidiennes planifiées.

Gardez cette page ouverte : l'étape suivante y prend plusieurs valeurs.

---

## 3. Préparer le fichier des secrets sur votre ordinateur

Dans le dossier du projet, créez un fichier nommé exactement **`.env.production.local`**. Ce fichier reste sur votre ordinateur : il n'est jamais envoyé sur GitHub (le projet l'ignore automatiquement). Ne l'envoyez à personne par e-mail ou messagerie.

Copiez-y ce modèle, puis remplacez chaque valeur :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_BASE44_API_URL=
NEXT_PUBLIC_USE_REAL_API=1
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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API Keys** → clé `anon` (`public`) | Clé publique, sans danger |
| `SUPABASE_SERVICE_ROLE_KEY` | Même page → clé `service_role` (`secret`) | **Secrète** : elle donne tous les droits sur la base |
| `NEXT_PUBLIC_BASE44_API_URL` | L'adresse de votre site suivie de `/api`, par exemple `https://app.votre-domaine.org/api` | Jamais `localhost` |
| `NEXT_PUBLIC_USE_REAL_API` | Toujours `1` | — |
| `CRON_SECRET` | À fabriquer vous-même (commande ci-dessous) | Sert de mot de passe aux tâches automatiques |
| `PAY_REAL_MONEY` | Toujours `0` pour l'instant | Voir l'encadré en tête de guide |
| `PGHOST`, `PGUSER` | Supabase → bouton **Connect** (en haut de page) → onglet **Session pooler** | `PGUSER` a la forme `postgres.xxxxxxxx` |
| `PGPASSWORD` | Le mot de passe de la base enregistré à l'étape 2 | — |
| `PGPORT`, `PGDATABASE` | Toujours `5432` et `postgres` | — |

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

Les « migrations » sont les 24 fichiers (`0001` à `0024`) qui créent les tables et les règles de sécurité. Un script les applique toutes d'un coup, et annule tout au moindre problème : la base n'est jamais laissée dans un état intermédiaire.

**4.1 — Regarder l'état de la base (ne modifie rien)**

```
node --env-file=.env.production.local scripts/db-state.mjs
```

Sur un projet neuf, toutes les lignes indiquent `ABSENTE`. Vérifiez sur la première ligne que le serveur est bien celui de **production**.

**4.2 — Essai à blanc (ne modifie rien)**

```
node --env-file=.env.production.local scripts/apply-migrations.mjs --dry-run --smoke
```

Le script applique les 24 migrations, lance 156 tests de sécurité, puis **annule tout**. Vous devez lire :

- `24 migration(s)` en attente, chacune suivie de `OK` ;
- `156/156 tests de fumée verts` ;
- `ESSAI À BLANC TERMINÉ : ROLLBACK effectué, la base n'a pas été modifiée.`

Si une ligne indique `ÉCHEC`, arrêtez-vous ici et transmettez le message affiché à la personne qui maintient le projet. Rien n'a été modifié.

> Cette application « depuis zéro » sur une base entièrement neuve n'a encore jamais été exécutée : jusqu'ici les migrations ont été posées une à une sur la base de test. L'essai à blanc sert précisément à le vérifier sans risque.

**4.3 — Application réelle**

Seulement si l'essai à blanc est entièrement vert :

```
node --env-file=.env.production.local scripts/apply-migrations.mjs --smoke
```

Vous devez lire `APPLICATION TERMINÉE : 24 migration(s) validée(s) (COMMIT).` Les données créées par les tests sont annulées : la base est structurée mais vide.

**4.4 — Contrôle**

```
node --env-file=.env.production.local scripts/db-state.mjs
```

Toutes les lignes indiquent `PRÉSENTE`, et la rubrique « Données » affiche `0` partout.

---

## 5. Régler la connexion des utilisateurs (Supabase Auth)

Les utilisateurs se connectent avec un code reçu par e-mail (ou par SMS / WhatsApp). Ces réglages se font dans Supabase, menu **Authentication**.

1. **URL du site** — *Authentication → URL Configuration* :
   - **Site URL** : l'adresse de votre site, par exemple `https://app.votre-domaine.org` ;
   - **Redirect URLs** : ajoutez `https://app.votre-domaine.org/**`.
2. **E-mails** — *Authentication → Emails → SMTP Settings* : activez **Custom SMTP** et saisissez les paramètres fournis par votre service d'envoi d'e-mails (hôte, port, identifiant, mot de passe, adresse d'expéditeur). Sans ce réglage, Supabase n'envoie que quelques e-mails par heure : suffisant pour un essai, pas pour un service ouvert.
3. **Modèles d'e-mails — étape obligatoire.** Par défaut, Supabase envoie un **lien** de connexion, alors que l'application demande un **code à 6 chiffres**. Tant que les modèles ne sont pas corrigés, personne ne peut saisir de code. Voir [5.1 — Modèles d'e-mails](#51--modèles-de-mails-avec-le-code-à-6-chiffres) ci-dessous.
4. **Téléphone** (si vous ouvrez la connexion par SMS ou WhatsApp) — *Authentication → Sign In / Providers → Phone* : renseignez le fournisseur (Twilio). Sinon, laissez désactivé : seule la connexion par e-mail fonctionnera.
5. Faites un essai à l'étape 8 : c'est en créant votre propre compte que vous vérifierez la réception du code.

### 5.1 — Modèles d'e-mails avec le code à 6 chiffres

Dans Supabase, ouvrez **Authentication → Emails → Templates**. Deux modèles sont à remplacer : **Confirm signup** (envoyé à la première connexion, quand le compte est créé) et **Magic Link** (envoyé aux connexions suivantes). Pour chacun, remplacez le champ **Subject** et tout le contenu du champ **Body** par les textes ci-dessous, puis cliquez sur **Save**.

Ne modifiez pas les mots entre doubles accolades (`{{ .Token }}`, `{{ .ConfirmationURL }}`) : Supabase les remplace par le code et par le lien propres à chaque utilisateur.

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
<p>Vous pouvez aussi confirmer en ouvrant ce lien : <a href="{{ .ConfirmationURL }}">confirmer mon inscription</a>.</p>
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
<p>Vous pouvez aussi vous connecter en ouvrant ce lien : <a href="{{ .ConfirmationURL }}">me connecter</a>.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et ne communiquez ce code à personne.</p>
<p>L'équipe AssoShop</p>
```

Deux réglages à vérifier au même endroit, dans **Authentication → Sign In / Providers → Email** :

- **Email OTP Length** vaut **6** : l'application n'accepte que des codes à 6 chiffres ;
- **Email OTP Expiration** vaut **3600** secondes (une heure), pour correspondre au texte des e-mails. Si vous choisissez une autre durée, adaptez la phrase « valable une heure ».

Vérification : à l'étape 8, l'e-mail reçu doit afficher un code à 6 chiffres, et ce code doit vous connecter.

---

## 6. Héberger l'application (Vercel)

Vercel est l'hébergeur conçu par les auteurs de Next.js (la technologie de l'application, version 16) : c'est le choix le plus simple. Tout autre hébergeur capable de faire tourner une application Next.js 16 avec Node.js convient, à condition de pouvoir y planifier un appel toutes les 15 minutes (étape 7).

**6.1 — Importer le projet**

1. Sur vercel.com : **Add New → Project**, puis choisissez le dépôt GitHub `TamataDelamou/AssoShop`.
2. Vercel reconnaît Next.js : ne changez aucun réglage de construction.
3. **Avant** de cliquer sur *Deploy*, ouvrez **Environment Variables** et saisissez les variables ci-dessous.

**6.2 — Variables d'environnement**

Saisissez-les une par une, pour l'environnement **Production**. Ce sont les mêmes valeurs que dans votre fichier `.env.production.local`.

| Variable | Valeur | Obligatoire |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Voir étape 3 | Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Voir étape 3 | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Voir étape 3 — cochez **Sensitive** | Oui |
| `NEXT_PUBLIC_BASE44_API_URL` | `https://app.votre-domaine.org/api` | Oui |
| `NEXT_PUBLIC_USE_REAL_API` | `1` | Oui |
| `CRON_SECRET` | Voir étape 3 — cochez **Sensitive** | Oui |
| `PAY_REAL_MONEY` | `0` (ou ne pas la créer) | Recommandé, pour que le choix soit visible |
| `PAY_WEBHOOK_SECRET` | Ne pas la créer pour l'instant | Non — à créer avec le futur opérateur Mobile Money |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | Clé de votre fournisseur d'IA | Non — sans clé, l'assistant utilise une synthèse locale |
| `CONTROL_PLANE_*` | Fournies par l'équipe du Kernel GSG (voir `docs/CONTROL_PLANE.md`) | Non — seulement si le Control Plane est branché |

Ne saisissez **pas** les variables `PG…` chez l'hébergeur : elles ne servent que sur votre ordinateur, pour l'étape 4.

**6.3 — Région**

Dans **Settings → Functions → Function Region**, choisissez **Paris (cdg1)** : l'application est ainsi à côté de la base de données.

**6.4 — Déployer, puis brancher le domaine**

1. Cliquez sur **Deploy** et attendez la fin (quelques minutes).
2. **Settings → Domains** : ajoutez votre domaine et suivez les indications (une ligne à ajouter chez votre bureau d'enregistrement). Vercel installe le certificat **HTTPS** tout seul, en quelques minutes.
3. Si l'adresse finale diffère de celle saisie dans `NEXT_PUBLIC_BASE44_API_URL` ou dans Supabase (étape 5), corrigez-les puis relancez un déploiement (**Deployments → … → Redeploy**).

---

## 7. Tâches automatiques toutes les 15 minutes

Deux adresses doivent être appelées régulièrement :

| Adresse | Rôle |
| --- | --- |
| `/api/cron/investments/settle` | À la date limite d'un projet d'investissement : verse les fonds au porteur si l'objectif est atteint, rembourse les investisseurs sinon |
| `/api/control-plane/push` | Envoie les statistiques au Control Plane GSG (et dénoue aussi les projets échus) |

**Avec Vercel, il n'y a rien à faire** : le fichier `vercel.json` du projet déclare déjà ces deux appels toutes les 15 minutes, et Vercel leur joint automatiquement le mot de passe `CRON_SECRET`. Deux conditions :

- la variable `CRON_SECRET` existe (étape 6.2) ;
- le compte est en formule **Pro** (la formule gratuite n'autorise qu'un appel par jour).

Vérification : **Settings → Cron Jobs** liste les deux tâches. Après un quart d'heure, cliquez sur **View Logs** : `/api/cron/investments/settle` doit répondre `200`.

`/api/control-plane/push` répond `404` tant que le Control Plane n'est pas branché : c'est normal et sans conséquence.

**Avec un autre hébergeur**, utilisez son planificateur (ou un service de tâches planifiées) pour appeler les deux adresses toutes les 15 minutes, en méthode `GET`, avec l'en-tête :

```
Authorization: Bearer <la valeur de CRON_SECRET>
```

Ces appels peuvent être répétés sans risque : un projet déjà traité n'est jamais versé ni remboursé une seconde fois.

---

## 8. Créer le premier administrateur

1. Ouvrez votre site et **créez votre compte** comme n'importe quel utilisateur (c'est aussi le test de réception du code de connexion).
2. Sur votre ordinateur, lancez, avec **votre** adresse e-mail :

```
node --env-file=.env.production.local scripts/bootstrap-admin.mjs votre-adresse@exemple.org
```

La première ligne affichée, `Projet Supabase visé : …`, doit être l'adresse du projet de **production**. Vous devez ensuite lire `Administrateur activé`.

3. Ouvrez `https://app.votre-domaine.org/admin` : le back-office doit s'afficher.

Les administrateurs suivants se créent de la même façon. Un administrateur valide les revendeurs et les bénéfices des projets : donnez ce rôle à peu de personnes.

---

## 9. Liste de vérification avant ouverture

Cochez chaque ligne. N'ouvrez pas le service s'il en reste une.

**Adresse et sécurité**

- [ ] Le site s'ouvre à l'adresse définitive, en `https://`, avec le cadenas du navigateur.
- [ ] L'ancienne adresse `….vercel.app` n'est communiquée à personne.
- [ ] `node --env-file=.env.production.local scripts/preflight-production.mjs` affiche « Tout est en ordre. »

**Connexion**

- [ ] L'e-mail de connexion contient un **code à 6 chiffres**, en français, et ce code vous a connecté (étape 5.1).
- [ ] Vous avez reçu le code de connexion par e-mail en moins d'une minute, depuis l'adresse d'expéditeur d'AssoShop, et il n'est pas arrivé dans les indésirables.
- [ ] *Authentication → URL Configuration* dans Supabase contient l'adresse définitive.

**Argent**

- [ ] `PAY_REAL_MONEY` vaut `0` (ou n'existe pas) chez l'hébergeur.
- [ ] Une fois connecté, le bandeau **« Paiements en mode test »** est visible en haut de l'application.
- [ ] `PAY_WEBHOOK_SECRET` n'existe pas chez l'hébergeur.

**Base de données**

- [ ] *Database → Backups* dans Supabase montre des sauvegardes quotidiennes.
- [ ] `node --env-file=.env.production.local scripts/db-state.mjs` : toutes les migrations `0001` à `0024` sont `PRÉSENTE`.
- [ ] Dans la rubrique « Données » de cette même commande, les **deux journaux d'audit sont à 0** et il n'y a que les comptes que vous avez créés vous-même. Un journal d'audit ne peut pas être vidé : s'il n'est pas vierge, c'est qu'un test a été lancé sur la production (voir étape 10) ; mieux vaut alors repartir d'un projet Supabase neuf.

**Tâches automatiques**

- [ ] *Settings → Cron Jobs* chez Vercel liste les deux tâches, et `/api/cron/investments/settle` répond `200` dans les journaux.

**Personnes**

- [ ] Au moins un administrateur, et la liste des administrateurs est connue.
- [ ] Le mot de passe de la base et la clé `service_role` sont dans un gestionnaire de mots de passe, connus de deux personnes au plus.

---

## 10. À ne jamais faire en production

- **Ne lancez jamais les scripts de test sur la production** (`e2e-security.mjs`, `e2e-auth.mjs`, `e2e-org.mjs`, `verify-production-guard.mjs`). Ils créent des comptes et des opérations fictives, et les traces qu'ils laissent dans le journal d'audit ne peuvent pas être effacées. Ils sont faits pour la base de test.
- **N'activez pas `PAY_REAL_MONEY`** sans décision écrite sur le partenaire agréé qui détient les fonds.
- **Ne modifiez jamais un fichier de migration déjà appliqué.** Toute correction passe par un nouveau fichier numéroté.
- **Ne supprimez pas un utilisateur depuis le tableau de bord Supabase** en cas de refus. Si la suppression est refusée, c'est que le compte porte encore un solde, une contribution, une commande ou une part dans un projet : il doit être anonymisé, pas supprimé. L'utilisateur le fait lui-même depuis *Paramètres → Supprimer mon compte* ; l'application choisit alors entre suppression et anonymisation.
- **Ne partagez pas** la clé `service_role`, le mot de passe de la base ni `CRON_SECRET`. En cas de doute sur une fuite, régénérez-les (Supabase → *API Keys* ; nouvelle valeur de `CRON_SECRET` chez l'hébergeur) puis redéployez.

---

## 11. En cas de problème

| Ce que vous voyez | Ce que cela signifie | Que faire |
| --- | --- | --- |
| `Variable PGHOST manquante` | Le fichier `.env.production.local` n'est pas lu ou est incomplet | Vérifiez son nom exact et relancez la commande avec `--env-file=.env.production.local` |
| `ÉCHEC` pendant l'essai à blanc | Une migration ou un test ne passe pas | Rien n'a été modifié. Transmettez le message complet au mainteneur |
| `Fichier(s) modifié(s) depuis leur application` | Un fichier de migration a été changé après coup | Ne forcez rien. Prévenez le mainteneur |
| `Aucun utilisateur avec l'email …` (étape 8) | Le compte n'existe pas encore dans cette base | Créez d'abord le compte sur le site, puis relancez |
| L'e-mail contient un lien mais pas de code | Modèles d'e-mails de Supabase non corrigés | Reprenez l'étape 5.1 |
| Le code de connexion n'arrive pas | Envoi d'e-mails non configuré | Reprenez l'étape 5, point 2 |
| Les tâches automatiques répondent `401` | `CRON_SECRET` absent ou différent | Vérifiez la variable chez l'hébergeur, puis redéployez |
| Les tâches automatiques répondent `404` sur `/api/cron/investments/settle` | `CRON_SECRET` n'existe pas | Créez la variable, puis redéployez |
| Message « Paiements en mode test » lors d'un retrait | Fonctionnement attendu tant que `PAY_REAL_MONEY` est désactivé | Rien à faire |
| L'application affiche des écrans vides | `NEXT_PUBLIC_BASE44_API_URL` pointe ailleurs que sur votre site | Corrigez la variable, puis redéployez |

Pour revenir en arrière après un déploiement défectueux : chez Vercel, **Deployments**, choisissez le déploiement précédent puis **Promote to Production**. La base de données n'est pas concernée par ce retour arrière ; pour elle, seule une sauvegarde Supabase (*Database → Backups → Restore*) permet de revenir à un état antérieur.
