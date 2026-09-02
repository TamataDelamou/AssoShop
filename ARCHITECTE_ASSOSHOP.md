# Cahier de Conception – AssoShop V6

## Écosystème financier et communautaire multi-pays

Un produit du **Global Service Groupe**  
AssoShop Community · AssoShop Finance · AssoShop Market · AssoShop Pay

_Version 6 — Refonte modulaire, monétisation SaaS, vision multi-pays CEDEAO_

---

## Sommaire

- [1. Introduction et vision](#1-introduction-et-vision)
  - [1.1 Modèle économique](#11-modèle-économique)
- [2. Architecture modulaire](#2-architecture-modulaire)
  - [2.1 Configuration multi-pays](#21-configuration-multi-pays)
  - [2.2 Multi-opérateurs Mobile Money et multi-devises](#22-multi-opérateurs-mobile-money-et-multi-devises)
  - [2.3 Hiérarchie des organisations](#23-hiérarchie-des-organisations)
  - [2.4 Intégration au GSG Platform Kernel](#24-intégration-au-gsg-platform-kernel)
- [3. Rôles et acteurs](#3-rôles-et-acteurs)
- [4. Module AssoShop Community](#4-module-assoshop-community)
  - [4.1 Fonctionnalités clés](#41-fonctionnalités-clés)
  - [4.2 Règles de gestion](#42-règles-de-gestion)
  - [4.3 Écrans mobiles](#43-écrans-mobiles)
- [5. Module AssoShop Finance](#5-module-assoshop-finance)
  - [5.1 Fonctionnalités clés](#51-fonctionnalités-clés)
  - [5.2 Règles de gestion](#52-règles-de-gestion)
  - [5.3 Écrans mobiles](#53-écrans-mobiles)
- [6. Module AssoShop Market](#6-module-assoshop-market)
  - [6.1 Fonctionnalités clés](#61-fonctionnalités-clés)
  - [6.2 Règles de gestion](#62-règles-de-gestion)
  - [6.3 Écrans mobiles](#63-écrans-mobiles)
- [7. Module AssoShop Pay](#7-module-assoshop-pay)
  - [7.1 Fonctionnalités clés](#71-fonctionnalités-clés)
  - [7.2 Règles de gestion](#72-règles-de-gestion)
  - [7.3 Écrans mobiles](#73-écrans-mobiles)
- [8. Hub Communautaire et socle transversal](#8-hub-communautaire-et-socle-transversal)
  - [8.1 Fonctionnalités clés](#81-fonctionnalités-clés)
  - [8.2 Règles de gestion](#82-règles-de-gestion)
  - [8.3 Écrans mobiles](#83-écrans-mobiles)
- [9. Relations entre les modules](#9-relations-entre-les-modules)
- [10. Écrans web (back-office)](#10-écrans-web-back-office)
- [11. Récapitulatif global des écrans](#11-récapitulatif-global-des-écrans)
- [12. Gestion hors connexion et synchronisation](#12-gestion-hors-connexion-et-synchronisation)
- [13. Gestion du cache](#13-gestion-du-cache)
- [14. Sécurité](#14-sécurité)
- [15. Hébergement et infrastructure](#15-hébergement-et-infrastructure)
- [16. Architecture technique et programmation](#16-architecture-technique-et-programmation)
  - [16.1 Applications mobiles](#161-applications-mobiles)
  - [16.2 Application web (back-office)](#162-application-web-back-office)
  - [16.3 Back-end et API](#163-back-end-et-api)
  - [16.4 Paiements](#164-paiements)
  - [16.5 Notifications et intégrations](#165-notifications-et-intégrations)
- [17. Feuille de route de déploiement](#17-feuille-de-route-de-déploiement)
- [18. Résumé](#18-résumé)
- [19. Annexes](#19-annexes)
  - [Annexe A — Glossaire](#annexe-a--glossaire)
  - [Annexe B — Grille tarifaire complète](#annexe-b--grille-tarifaire-complète)
  - [Annexe C — Pays cibles pour l'expansion CEDEAO](#annexe-c--pays-cibles-pour-lexpansion-cedeao)
  - [Annexe D — Points à valider avec un conseil juridique et réglementaire](#annexe-d--points-à-valider-avec-un-conseil-juridique-et-réglementaire)
  - [Annexe E — Registre consolidé des règles de conception (développeur)](#annexe-e--registre-consolidé-des-règles-de-conception-développeur)
  - [Annexe F — Registre consolidé des écrans (référence développeur)](#annexe-f--registre-consolidé-des-écrans-référence-développeur)

---

## 1. Introduction et vision

AssoShop évolue d'une simple application de gestion vers un véritable écosystème SaaS communautaire, générant plusieurs sources de revenus complémentaires afin de ne pas dépendre d'un modèle unique. La plateforme réunit la gestion des associations, les cotisations et tontines, les cas sociaux, une marketplace, les paiements Mobile Money et l'épargne communautaire au sein d'un même environnement, pour créer un usage régulier et fidéliser durablement les organisations et leurs membres.

La stratégie de déploiement reste volontairement progressive : consolider une solution solide en Guinée avant d'adapter la plateforme aux autres pays de la CEDEAO (Sénégal, Côte d'Ivoire, Mali, Sierra Leone, Liberia, Gambie, Guinée-Bissau, etc.). L'architecture est toutefois pensée dès le départ pour être multi-pays, même si un seul pays est activé au lancement.

### 1.1 Modèle économique

La formule d'abonnement des associations constitue le socle du modèle économique.  
Les fonctionnalités sont réparties selon les trois paliers **Gratuit**, **Standard** (40 000 GNF/mois) et **Premium** (60 000 GNF/mois) selon le tableau ci-dessous.

| Services et fonctionnalités                                                   | Gratuit                      | Standard (40 000 GNF/mois)   | Premium (60 000 GNF/mois) |
| ----------------------------------------------------------------------------- | ---------------------------- | ---------------------------- | ------------------------- |
| **Abonnement de base**                                                        |                              |                              |                           |
| Nombre de membres limite                                                      | 10                           | 100                          | Illimité                  |
| Structures gérées (association simple)                                        | x                            | x                            | x                         |
| Antennes, sections et structures faîtières (Union, Fédération, Confédération) |                              |                              | x                         |
| **AssoShop Community — Vie associative**                                      |                              |                              |                           |
| Adhésion manuelle / auto-inscription (lien, QR Code)                          | x                            | x                            | x                         |
| Rôles et droits du bureau                                                     | x                            | x                            | x                         |
| Cotisations en ligne et suivi des paiements                                   |                              | x                            | x                         |
| Cas sociaux et financement participatif interne                               |                              | x                            | x                         |
| Communications et fil d'annonces                                              | x                            | x                            | x                         |
| Réunions, convocations et comptes-rendus (pointage QR)                        |                              | x                            | x                         |
| Gestion documentaire (classeur de l'association)                              |                              | x                            | x                         |
| Projets et activités (budget, tâches, bénéficiaires)                          |                              |                              | x                         |
| Discipline interne (sanctions)                                                |                              | x                            | x                         |
| Gouvernance numérique (élections, votes électroniques)                        |                              |                              | x                         |
| Comptabilité complète (caisse, banque, grand livre, bilan)                    |                              |                              | x                         |
| Gestion des actifs                                                            |                              |                              | x                         |
| Ressources humaines                                                           |                              |                              | x                         |
| **AssoShop Finance — Groupes financiers**                                     |                              |                              |                           |
| Groupes financiers (Tontine, Cotisation à objectif, Épargne)                  |                              | x                            | x                         |
| Parrainage et adhésion encadrée                                               | x                            | x                            | x                         |
| Frais de création et abonnement des groupes financiers                        | Payant (20 000 à 30 000 GNF) | Payant (20 000 à 30 000 GNF) | Inclus                    |
| Sous-portefeuilles à objectif nommé                                           |                              | x                            | x                         |
| Score de confiance communautaire                                              |                              | x                            | x                         |
| Gestion des prêts internes                                                    |                              |                              | x                         |
| Assurance communautaire                                                       |                              |                              | x                         |
| Fonds de Garantie Solidaire (0,2 à 0,5 % des cotisations)                     | x                            | x                            | x                         |
| **AssoShop Market — Marketplace**                                             |                              |                              |                           |
| Marketplace communautaire de services (entre membres)                         | x                            | x                            | x                         |
| Marketplace B2B (compte revendeur, catalogue)                                 |                              | x                            | x                         |
| Livraison programmée et commandes groupées                                    |                              | x                            | x                         |
| Suivi de commande (notifications)                                             | x                            | x                            | x                         |
| Module d'investissement communautaire                                         |                              |                              | x                         |
| **AssoShop Pay — Paiements**                                                  |                              |                              |                           |
| Mobile money                                                                  | x                            | x                            | x                         |
| Commission sur les paiements                                                  | 1 %                          | 0,7 %                        | 0,7 %                     |
| Recharge / retrait / transfert entre membres                                  | x                            | x                            | x                         |
| Réconciliation des paiements et reçu numérique                                | x                            | x                            | x                         |
| Historique global consolidé (« Ma situation financière »)                     |                              | x                            | x                         |
| **Hub communautaire et socle transversal**                                    |                              |                              |                           |
| Carte numérique / QR Code personnel                                           | x                            | x                            | x                         |
| Coffre-fort numérique                                                         |                              | x                            | x                         |
| Vérification d'identité (KYC)                                                 |                              | x                            | x                         |
| Signature électronique                                                        |                              | x                            | x                         |
| Mode hors connexion et synchronisation                                        | x                            | x                            | x                         |
| Notifications in-app et e-mail                                                | x                            | x                            | x                         |
| Notifications SMS                                                             |                              |                              | x                         |
| Assistant IA                                                                  |                              |                              | x                         |
| Sauvegardes automatiques                                                      |                              |                              | x                         |
| **Services complémentaires**                                                  |                              |                              |                           |
| Rapports avancés                                                              |                              | x                            | x                         |
| Services d'accompagnement (statuts, comptabilité, audit, juridique)           | Option payante               | Option payante               | Option payante            |
| API et intégrations                                                           | x                            | x                            | x                         |
| Financement participatif (frais de service sur contributions)                 | 1 %                          | 1 %                          | 1 %                       |

---

## 2. Architecture modulaire

Plutôt qu'une application monolithique, AssoShop est reconstruit autour de quatre modules complémentaires, partageant la même base technique et le même compte utilisateur, complétés par un Hub Communautaire transversal :

- **AssoShop Community** : associations, membres, communication, gouvernance, projets, cas sociaux.
- **AssoShop Finance** : portefeuille financier, cotisations, tontines, épargne, prêts communautaires, assurance.
- **AssoShop Market** : commerce entre professionnels (B2B) et marketplace communautaire de biens et de services.
- **AssoShop Pay** : orchestration des paiements — connexion aux banques et aux opérateurs Mobile Money, sans nécessairement détenir les fonds au départ.
- **Hub Communautaire** : point d'entrée unique agrégeant les données des quatre modules pour chaque utilisateur.

Cette organisation modulaire permet de lancer rapidement un produit simple en Guinée, puis d'ajouter progressivement de nouvelles briques fonctionnelles sans reconstruire l'application existante. Chaque association ou chaque utilisateur n'active et n'utilise que les modules dont il a besoin.

### 2.1 Configuration multi-pays

Un module **Pays**, disponible dans les paramètres globaux, permet d'activer un nouveau pays avec ses propres réglages : devise (GNF, XOF, Leone, etc.), langue (français, anglais, portugais), fuseau horaire, format des numéros de téléphone, format des dates, jours fériés, taux de TVA le cas échéant, et réglementation locale. Lorsqu'un pays est activé, l'application s'adapte automatiquement à ces paramètres.

### 2.2 Multi-opérateurs Mobile Money et multi-devises

L'architecture de paiement est conçue dès le départ pour brancher plusieurs opérateurs. En Guinée : Orange Money et MTN Mobile Money. Pour les déploiements ultérieurs : Wave, Moov Money, Airtel Money, Free Money et d'autres opérateurs selon les pays. Le système propose automatiquement les moyens de paiement disponibles selon le pays de l'utilisateur. Les devises prises en charge dès la conception sont le GNF, le XOF, l'USD et l'EUR ; les rapports financiers peuvent afficher la devise locale et, si besoin, une conversion de référence.

### 2.3 Hiérarchie des organisations

La plateforme prend en charge plusieurs niveaux de structures : **Association, Union, Fédération, Confédération, ONG, Coopérative, Réseau national**. Chaque niveau peut superviser les structures qui lui sont rattachées. Une association peut elle-même comporter un siège national, des bureaux régionaux, des bureaux préfectoraux, des sections communales et des cellules de quartier ; les statistiques remontent alors automatiquement vers le niveau supérieur, sans exposer le détail financier de chaque membre.

À côté de ce rattachement hiérarchique, la plateforme prend également en charge un regroupement fédératif à adhésion partagée : une grande communauté (par exemple une grande communauté forestière d'une ville) et plusieurs associations locales affiliées, « sœurs » (les communautés des villages de la forêt de cette même ville), qui partagent en partie leurs membres tout en conservant chacune sa propre gouvernance et ses propres règles de gestion. Les communications diffusées par la grande communauté et concernant ses affiliées leur sont automatiquement relayées (voir 4.2, RG-C08 à RG-C11).

### 2.4 Intégration au GSG Platform Kernel

Conformément au gabarit d'intégration défini par le cahier GSG Platform Kernel (v3.0, section 19), AssoShop décrit ci-dessous sa relation au noyau générique du portefeuille Global Service Groupe. AssoShop V6 est en cours de conception et n'est pas encore en production : il est donc conçu nativement avec le noyau dès l'origine (KER-INT-01), sans qu'aucun document de migration a posteriori ne soit nécessaire.

#### Briques du noyau consommées

| Brique du noyau        | Statut           | Détail                                                                                                                                                                                                                                                               |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GSG ID**             | Oui              | Authentification fédérée (SSO) proposée en option, en complément de l'authentification native Supabase déjà décrite en section 8.3, conformément à KER-ID-02 et KER-ID-03.                                                                                           |
| **Org Registry**       | Oui              | Chaque association, groupe et compte B2B porte un identifiant `gsg_org_id`, sans modification de sa structure de données existante (KER-ORG-02).                                                                                                                     |
| **GSG Referential**    | Oui              | `pays_id`, `devise_id`, `langue_id`, `unite_administrative_id`, `ville_id` résolus une seule fois côté noyau plutôt que ressaisis (KER-ID-05, KER-ORG-04).                                                                                                           |
| **Referential Engine** | Oui              | `code_domaine assoshop_structure_organisation` (hiérarchie Association/Union/Fédération/Confédération/ONG/Coopérative/Réseau national) et `assoshop_regle_groupe_financier` (règles tontine/cotisation/épargne, variables selon la réglementation d'un pays CEDEAO). |
| **Bus d'événements**   | Oui              | Publiés : `organisation.creee`, `membre.adherent`, `paiement.valide`, `pret.decaisse`. Consommés : `kernel.pays.active`, `kernel.identite.fusionnee`.                                                                                                                |
| **Audit**              | Oui              | Journalisation centralisée des modifications du référentiel structurel partagé (KER-AUD-04).                                                                                                                                                                         |
| **Billing Core**       | Non (par défaut) | AssoShop conserve sa facturation autonome (abonnements, commissions) ; activation différée selon KER-BIL-02, hors offre groupée future.                                                                                                                              |
| **Design System**      | Non (par défaut) | Adoption progressive du GSG Design Kit envisageable sur les nouveaux écrans, non bloquante (KER-DES-02).                                                                                                                                                             |

#### Cartographie des champs hérités du référentiel

- **Table utilisateur** : référence `gsg_id` vers le profil GSG ID ; `pays_id`, `devise_id`, `langue_id`, `unite_administrative_id`, `ville_id` et `fuseau_horaire` résolus depuis le noyau plutôt que stockés localement.
- **Table organisation** (association, groupe financier, compte B2B) : champ `gsg_org_id` ajouté sans modification de la structure existante ; `pays_id`, `devise_id`, `langue_id`, `unite_administrative_id` et `ville_id` propres à chaque organisation, indépendants d'une éventuelle structure faîtière.

#### Instanciation du Referential Engine

- `code_domaine assoshop_structure_organisation` : arbre `referentiel_hierarchique` modélisant la hiérarchie Association / Union / Fédération / Confédération / ONG / Coopérative / Réseau national déjà décrite en section 2.3, avec ses antennes et sections.
- `code_domaine assoshop_regle_groupe_financier` : `corpus_versionne` des règles de fonctionnement des groupes de tontine, cotisation et épargne, pouvant varier selon la réglementation locale lors de l'expansion vers d'autres pays de la CEDEAO.

#### Événements publiés et consommés

- **Publiés** vers le bus : `organisation.creee`, `membre.adherent`, `paiement.valide`, `pret.decaisse` (charge utile : `gsg_org_id`, montant, `devise_id`, date).
- **Consommés** depuis le bus : `kernel.pays.active` (déclenche l'activation du module Pays local), `kernel.identite.fusionnee` (fusion de doublons d'identité GSG ID).

#### Authentification native et GSG ID

AssoShop authentifie nativement ses utilisateurs via **Supabase Auth** (`signInWithOtp` / `verifyOtp`), selon le modèle d'authentification GSG à deux entrées — téléphone (SMS ou WhatsApp via Twilio) ou e-mail (Magic Link ou code OTP) — détaillé en section 8.3. Le numéro de téléphone est stocké au format international E.164, avec saisie séparée de l'indicatif pays et du numéro local avant normalisation, conformément à la convention portefeuille de référence (PharmaConnect). GSG ID vérifie ensuite la signature du jeton de session déjà authentifiée pour la relier à un profil GSG ID existant ou en créer un (KER-ID-07) ; la connexion fédérée GSG ID reste une option supplémentaire à côté de ce flux natif, jamais un remplacement imposé (KER-ID-03).

---

## 3. Rôles et acteurs

Un même utilisateur peut cumuler plusieurs rôles selon les modules et les organisations auxquels il participe.

| Rôle                                                                                           | Définition et périmètre                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visiteur**                                                                                   | Personne non connectée. Accès limité à la présentation de l'application et à l'inscription.                                                                                 |
| **Utilisateur / Membre**                                                                       | Compte de base. Accède au Hub, à la marketplace, peut rejoindre associations et groupes.                                                                                    |
| **Revendeur B2B**                                                                              | Compte validé par un administrateur. Publie des produits et gère des commandes sur AssoShop Market.                                                                         |
| **Prestataire de services**                                                                    | Membre proposant un service sur la marketplace communautaire (plomberie, couture, transport, etc.).                                                                         |
| **Membre d'association / organisation**                                                        | Utilisateur ayant rejoint une structure après validation de son adhésion.                                                                                                   |
| **Bureau (Président, Vice-Président, Secrétaire, Vice-Secrétaire, Trésorier, Vice-Trésorier)** | Droits de gestion sur l'association : adhésions, trésorerie (dont validation manuelle des paiements en espèces), communications, réunions, projets, sanctions, cas sociaux. |
| **Commissaire aux comptes**                                                                    | Membre chargé du contrôle et de la vérification de la comptabilité de l'association.                                                                                        |
| **Responsable de commission**                                                                  | Membre en charge d'une commission thématique (projets, social, discipline, etc.).                                                                                           |
| **Structure faîtière (Union, Fédération, Confédération, ONG, Coopérative, Réseau national)**   | Niveau hiérarchique supervisant les structures qui lui sont rattachées ; reçoit la remontée automatique des statistiques.                                                   |
| **Membre de groupe (Tontine / Cotisation / Épargne)**                                          | Utilisateur inscrit par un parrain. Participe aux versements et, selon le type, aux tours ou aux prêts.                                                                     |
| **Parrain**                                                                                    | Membre actif d'un groupe qui inscrit et garantit un nouveau membre, y compris pour la confirmation d'une demande de prêt.                                                   |
| **Créateur / Administrateur du groupe**                                                        | Responsable du paramétrage initial, de la validation des prêts et des versements déclarés en espèces.                                                                       |
| **Comité de prêt / d'épargne**                                                                 | Instance qui examine et valide les demandes de prêt au sein d'un groupe d'épargne.                                                                                          |
| **Agent logistique / Point de retrait**                                                        | Réception des colis (scan QR code) et remise aux clients (signature, historique).                                                                                           |
| **Administrateur de la plateforme**                                                            | Agent Global Service Groupe : valide les revendeurs, supervise associations et groupes, configure la plateforme et les pays.                                                |
| **Support / Modérateur**                                                                       | Assistance aux utilisateurs, modération des contenus et des litiges.                                                                                                        |

---

## 4. Module AssoShop Community

Gestion complète de la vie associative : création et hiérarchie des structures, membres et rôles, gouvernance, réunions, projets, discipline interne et accompagnement social.

### 4.1 Fonctionnalités clés

- Création d'une structure avec statuts, objet social, type (association, union, fédération, confédération, ONG, coopérative, réseau national) et règles d'adhésion.
- Gestion des antennes et sections, avec remontée automatique des statistiques vers le niveau supérieur.
- Adhésion par validation manuelle ou auto-inscription via lien/QR Code d'invitation.
- Rôles et droits différenciés du bureau, y compris les postes de vice-bureau et les commissaires aux comptes.
- Cotisations avec paiement pour un tiers et validation manuelle des paiements en espèces par le trésorier.
- Réunions (planification, convocation, ordre du jour, compte-rendu, pointage par QR Code), projets et activités (budget, tâches, bénéficiaires, évaluation).
- Discipline interne (sanctions) et accompagnement social (cas sociaux avec financement participatif en temps réel).
- Gouvernance numérique : élections, votes électroniques sécurisés, historique des mandats et des dirigeants.
- Gestion documentaire avancée, comptabilité complète, gestion des actifs et ressources humaines pour les grandes structures.
- Signature électronique pour les décisions sensibles (prêt, dépense, procès-verbal, retrait exceptionnel).
- Regroupement fédératif à adhésion partagée entre une grande communauté et ses associations affiliées (« sœurs »), chacune conservant sa gouvernance, sa trésorerie et ses règles de gestion propres.
- Mobilité des membres entre villes : détection automatique de l'association d'accueil et transmission d'un rapport de mobilité (engagement, cotisations, participation) lors d'un déménagement déclaré.

### 4.2 Règles de gestion

| Code       | Règle de conception                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-C01** | Les données de chaque structure sont cloisonnées ; aucune donnée n'est partagée entre deux organisations sans autorisation explicite.                                                                                                                                                                                                                       |
| **RG-C02** | Une structure peut être rattachée à un niveau hiérarchique supérieur ; les statistiques remontent automatiquement, sans exposer le détail financier de chaque membre.                                                                                                                                                                                       |
| **RG-C03** | Chaque rôle du bureau dispose de droits distincts et non cumulables par défaut (le trésorier ne peut pas modifier les membres, le secrétaire ne peut pas effectuer de retrait).                                                                                                                                                                             |
| **RG-C04** | Un retrait ou une dépense au-delà d'un seuil défini par l'association (par exemple 5 000 000 GNF) nécessite une double validation par signature électronique du président et du trésorier.                                                                                                                                                                  |
| **RG-C05** | Un cas social est validé par le comité avant diffusion ; la liste des contributeurs n'est visible que si les paramètres de confidentialité de l'association l'autorisent, et le décaissement n'intervient qu'une fois l'objectif atteint.                                                                                                                   |
| **RG-C06** | Un vote électronique ne peut être modifié après clôture ; le résultat et l'historique des mandats sont conservés indéfiniment.                                                                                                                                                                                                                              |
| **RG-C07** | Toute sanction doit mentionner un motif et n'est visible que par le bureau et le membre concerné.                                                                                                                                                                                                                                                           |
| **RG-C08** | Distinction rattachement hiérarchique / affiliation fédérative : une association affiliée à une grande communauté (fédération à adhésion partagée entre associations « sœurs ») reste juridiquement et opérationnellement autonome — bureau, trésorerie, règles d'adhésion et de gestion propres — contrairement au rattachement antenne/section de RG-C02. |
| **RG-C09** | Adhésion partagée : un membre peut être simultanément adhérent d'une association locale affiliée et de la grande communauté ; chaque adhésion conserve son propre statut, ses cotisations et son historique, reliés sous un même profil utilisateur.                                                                                                        |
| **RG-C10** | Diffusion croisée : toute annonce publiée par la grande communauté et marquée comme concernant les associations affiliées est automatiquement relayée dans le fil d'annonces des membres de ces associations, sans jamais exposer les données internes (trésorerie, liste des membres) d'une association affiliée à une autre.                              |
| **RG-C11** | La grande communauté peut consulter les statistiques agrégées de ses associations affiliées (effectifs, participation), selon le même principe de confidentialité que RG-C02, mais ne peut ni modifier les décisions du bureau d'une association affiliée ni accéder au détail financier de celle-ci sans autorisation explicite de cette dernière.         |
| **RG-C12** | Déclaration de mobilité : un membre actif qui déclare un déménagement vers une ville où existe une association communautaire (détection via le référentiel GSG, champ `ville_id`) déclenche la génération automatique d'un rapport de mobilité à destination du bureau de cette association.                                                                |
| **RG-C13** | Le rapport de mobilité contient des indicateurs agrégés d'engagement communautaire (régularité des cotisations, participation aux réunions et activités, score de confiance communautaire, sanctions actives le cas échéant) et jamais le détail financier brut du membre.                                                                                  |
| **RG-C14** | Le rapport de mobilité appuie la décision du bureau d'accueil sans s'y substituer : le membre déplacé reste soumis à la procédure normale d'adhésion (parrainage, validation par le bureau, confirmation par le membre).                                                                                                                                    |
| **RG-C15** | Un membre parti conserve son historique dans l'association d'origine sous un statut « membre parti » plutôt qu'une suppression ; si les deux associations sont affiliées à la même grande communauté, le lien avec celle-ci peut être conservé selon le paramétrage retenu par la grande communauté.                                                        |

### 4.3 Écrans mobiles

| N°  | Écran                                              | Description / fonction                                                                                                                                                                                                                         |
| --- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Recherche d'associations et d'organisations**    | Liste et recherche des structures existantes sur la plateforme.                                                                                                                                                                                |
| 2   | **Fiche association / organisation**               | Présentation publique : objet, type de structure, niveau hiérarchique, membres.                                                                                                                                                                |
| 3   | **Créer une association / organisation**           | Nom, objet, statuts, ville, type de structure (Association, Union, Fédération, Confédération, ONG, Coopérative, Réseau national).                                                                                                              |
| 4   | **Gestion des antennes et sections**               | Liste des structures rattachées : siège national, bureaux régionaux, préfectoraux, sections communales, cellules de quartier.                                                                                                                  |
| 5   | **Créer une antenne / section**                    | Rattachement d'une nouvelle antenne à la structure mère, avec remontée automatique des statistiques.                                                                                                                                           |
| 6   | **Demande d'adhésion**                             | Candidature pour rejoindre une association.                                                                                                                                                                                                    |
| 7   | **Invitation par lien / QR Code**                  | Génération d'un lien ou d'un QR Code d'invitation pour l'auto-inscription des membres.                                                                                                                                                         |
| 8   | **Validation des demandes d'adhésion**             | Traitement des candidatures par le bureau.                                                                                                                                                                                                     |
| 9   | **Liste des membres**                              | Annuaire avec statut, rôle, icônes d'appel et de message, badge coloré d'engagement (rouge, orange, vert, bleu), consultable hors connexion depuis le cache local.                                                                             |
| 10  | **Fiche membre / attribution des rôles**           | Président, Vice-Président, Secrétaire, Vice-Secrétaire, Trésorier, Vice-Trésorier, Commissaire aux comptes, Responsable de commission, Membre.                                                                                                 |
| 11  | **Profil complet du membre**                       | Informations personnelles, badge coloré d'engagement communautaire, historique de cotisations, participations aux tontines, épargne, aides sociales reçues, achats sur la marketplace.                                                         |
| 12  | **Suivi des cotisations**                          | Tableau des cotisations dues et payées, avec mention du payeur si réglé par un tiers.                                                                                                                                                          |
| 13  | **Paiement d'une cotisation**                      | Règlement en ligne, pour soi-même.                                                                                                                                                                                                             |
| 14  | **Payer la cotisation d'un autre membre**          | Règlement à la place d'un membre bénéficiaire.                                                                                                                                                                                                 |
| 15  | **Déclarer un paiement en espèces**                | Signalement d'un paiement en liquide, en attente de validation.                                                                                                                                                                                |
| 16  | **Validation manuelle d'un paiement (Trésorier)**  | Confirmation manuelle d'un paiement en espèces.                                                                                                                                                                                                |
| 17  | **Trésorerie de l'association**                    | Solde, entrées/sorties, justificatifs ; solde et derniers mouvements consultables hors connexion depuis le cache local.                                                                                                                        |
| 18  | **Agenda / événements**                            | Calendrier des réunions et activités.                                                                                                                                                                                                          |
| 19  | **Création d'un événement**                        | Titre, date, lieu, description.                                                                                                                                                                                                                |
| 20  | **Fil d'annonces**                                 | Communications et actualités diffusées aux membres.                                                                                                                                                                                            |
| 21  | **Publication d'une annonce**                      | Rédaction et diffusion d'un message.                                                                                                                                                                                                           |
| 22  | **Documents de l'association**                     | Statuts, règlement intérieur, PV, comptes rendus, photos, vidéos, contrats, pièces d'identité, documents financiers, classés et sécurisés.                                                                                                     |
| 23  | **Ajouter un document**                            | Dépôt d'un nouveau document dans le classeur de l'association.                                                                                                                                                                                 |
| 24  | **Rapports et statistiques**                       | Taux de participation, évolution des effectifs, bilan financier.                                                                                                                                                                               |
| 25  | **Paramètres de l'association**                    | Confidentialité, règles d'adhésion, gestion du bureau.                                                                                                                                                                                         |
| 26  | **Liste des réunions**                             | Vue chronologique des réunions planifiées et passées.                                                                                                                                                                                          |
| 27  | **Planifier une réunion**                          | Date, lieu, ordre du jour, convocation.                                                                                                                                                                                                        |
| 28  | **Compte-rendu de réunion**                        | Rédaction du compte-rendu assistée par l'IA (synthèse automatique à partir des notes ou d'un enregistrement), présences par pointage QR Code, préférences de rappel.                                                                           |
| 29  | **Liste des projets et activités**                 | Construction, agriculture, élevage, santé, éducation, commerce — vue d'ensemble et avancement.                                                                                                                                                 |
| 30  | **Créer un projet / une activité**                 | Objectifs, budget, calendrier, responsables, indicateurs de performance.                                                                                                                                                                       |
| 31  | **Suivi des tâches et responsabilités**            | Attribution des tâches et suivi de leur avancement.                                                                                                                                                                                            |
| 32  | **Suivi des bénéficiaires et évaluation**          | Enregistrement des bénéficiaires et bilan d'évaluation du projet.                                                                                                                                                                              |
| 33  | **Historique des sanctions**                       | Avertissement, suspension, exclusion, avec motif et durée.                                                                                                                                                                                     |
| 34  | **Appliquer une sanction**                         | Formulaire de sanction à l'encontre d'un membre.                                                                                                                                                                                               |
| 35  | **Déclarer un cas social**                         | Signalement d'un cas social (maladie, décès, sinistre) par un membre ou le bureau, avec aide à la rédaction par l'IA.                                                                                                                          |
| 36  | **Validation et attribution d'aide**               | Étude par le comité et attribution d'une aide.                                                                                                                                                                                                 |
| 37  | **Suivi et financement du cas social**             | Montant recherché, montant déjà collecté, liste des contributeurs selon la confidentialité, en temps réel.                                                                                                                                     |
| 38  | **Contribuer à un cas social ou un projet**        | Financement participatif : contribution directe depuis l'application.                                                                                                                                                                          |
| 39  | **Gouvernance — élections et votes**               | Candidatures, vote électronique sécurisé, résultats, non modifiables après clôture.                                                                                                                                                            |
| 40  | **Historique des dirigeants et des mandats**       | Archive des bureaux successifs et de leurs mandats.                                                                                                                                                                                            |
| 41  | **Comptabilité de l'association**                  | Caisse, banque, Mobile Money, journal, grand livre, bilan, compte de résultat, rapprochement bancaire, budget prévisionnel.                                                                                                                    |
| 42  | **Gestion des actifs**                             | Véhicules, ordinateurs, imprimantes, bâtiments, terrains, mobilier, matériel agricole.                                                                                                                                                         |
| 43  | **Ressources humaines**                            | Employés, bénévoles, consultants, contrats, congés, présences, salaires, évaluations.                                                                                                                                                          |
| 44  | **Signature électronique**                         | Validation des décisions sensibles : prêt, dépense, procès-verbal, retrait exceptionnel.                                                                                                                                                       |
| 45  | **Gestion des associations affiliées (« sœurs »)** | Lier ou délier une association à une grande communauté (fédération à adhésion partagée), distincte du rattachement hiérarchique antenne/section.                                                                                               |
| 46  | **Adhésion partagée — vue consolidée**             | Vue du membre regroupant sa grande communauté et ses associations locales affiliées, chacune avec son propre statut et ses propres cotisations.                                                                                                |
| 47  | **Fil d'annonces croisé**                          | Réception, dans le fil d'annonces d'une association affiliée, des communications diffusées par la grande communauté et marquées comme la concernant.                                                                                           |
| 48  | **Déclarer un déménagement / changement de ville** | Le membre indique sa nouvelle ville ; l'application détecte automatiquement une association communautaire existante dans cette ville.                                                                                                          |
| 49  | **Rapport de mobilité du membre**                  | Généré et synthétisé automatiquement par l'IA lors d'une déclaration de déménagement : indicateurs agrégés d'engagement (cotisations, participation, score de confiance) restitués avec le badge coloré du membre, sans détail financier brut. |
| 50  | **Décision d'adhésion sur transfert (bureau)**     | Le bureau de l'association d'accueil consulte le rapport de mobilité puis applique la procédure normale d'adhésion (parrainage, validation).                                                                                                   |

**Total AssoShop Community : 50 écrans**

---

## 5. Module AssoShop Finance

Cœur financier communautaire : cotisations, tontines, cotisations à objectif, épargne, prêts internes et assurance communautaire.

### 5.1 Fonctionnalités clés

- Trois logiques de groupe mutuellement exclusives : Tontine (redistribution à tour de rôle), Cotisation à objectif (collecte pour un but commun), Épargne (mise en commun avec partage final et prêts à intérêt).
- Adhésion encadrée par un système de parrainage, avec confirmation d'adhésion par le nouveau membre.
- Frais de création de groupe et abonnement du groupe selon sa taille (petit, moyen, grand groupe), ou inclus dans la formule Premium.
- Paiement pour un autre membre et validation manuelle des versements en espèces.
- Sous-portefeuilles à objectif nommés (mariage, construction, terrain, pèlerinage, scolarité, santé) avec suivi de progression.
- Gestion des prêts internes : demande, confirmation du parrain, décision du comité, échéancier automatique, rappels de remboursement, et suggestion de prêt intelligent basée sur l'historique d'épargne.
- Assurance communautaire : cotisation à un fonds de solidarité, déclaration de sinistre et indemnisation selon les règles définies.
- Fonds de Garantie Solidaire alimenté par un prélèvement transparent sur les cotisations.
- Score de confiance communautaire, calculé à partir de la régularité des cotisations, des remboursements, de la participation et de l'ancienneté.

### 5.2 Règles de gestion

| Code       | Règle de conception                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RG-F01** | Un groupe ne peut relever que d'une seule logique (Tontine, Cotisation ou Épargne) ; ce type est figé dès le premier paiement enregistré.                                                                    |
| **RG-F02** | L'adhésion à un groupe requiert un parrain actif, et le nouveau membre doit lui-même confirmer son adhésion après inscription par le parrain.                                                                |
| **RG-F03** | Dans une tontine, l'ordre de passage et le montant sont fixés à la création et ne peuvent être modifiés en cours de cycle sans accord unanime des membres.                                                   |
| **RG-F04** | Un versement peut être effectué par un membre pour le compte d'un autre ; le payeur et le bénéficiaire réel sont systématiquement enregistrés séparément.                                                    |
| **RG-F05** | Un paiement déclaré en espèces reste au statut « en attente » jusqu'à validation manuelle par le trésorier ou l'administrateur du groupe ; aucun solde n'est mis à jour avant validation.                    |
| **RG-F06** | Une demande de prêt requiert la confirmation du parrain du demandeur puis l'accord du comité avant décaissement.                                                                                             |
| **RG-F07** | Le montant suggéré pour un prêt est indexé sur l'historique d'épargne et le score de confiance du membre ; le comité conserve toujours la décision finale.                                                   |
| **RG-F08** | L'assurance communautaire et le Fonds de Garantie Solidaire sont alimentés par un prélèvement transparent et plafonné sur les cotisations, dans le respect de la réglementation financière du pays concerné. |
| **RG-F09** | Le score de confiance est recalculé automatiquement mais n'entraîne aucune décision automatique : il constitue une aide à la décision, jamais une décision elle-même.                                        |

### 5.3 Écrans mobiles

| N°  | Écran                                         | Description / fonction                                                                                                                                                                        |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Choix du type de groupe**                   | Tontine, Cotisation ou Épargne, avec explication de chaque logique.                                                                                                                           |
| 2   | **Créer un groupe — paramètres communs**      | Nom, montant, périodicité, nombre de membres, frais de création unique (20 000 à 30 000 GNF selon le type, ou inclus en formule Premium).                                                     |
| 3   | **Paramétrage spécifique Tontine**            | Ordre de passage, nombre de tours, date de début.                                                                                                                                             |
| 4   | **Paramétrage spécifique Cotisation**         | Objectif financier, date ou condition de fin.                                                                                                                                                 |
| 5   | **Paramétrage spécifique Épargne**            | Durée, règles de partage final, taux d'intérêt applicable aux prêts.                                                                                                                          |
| 6   | **Abonnement du groupe**                      | Formule selon la taille : petit (jusqu'à 20 membres), moyen (21 à 100) ou grand groupe (plus de 100).                                                                                         |
| 7   | **Suggestions de parrain**                    | Contacts du téléphone déjà membres d'un groupe.                                                                                                                                               |
| 8   | **Demande de parrainage**                     | Envoi d'une demande à un contact.                                                                                                                                                             |
| 9   | **Réponse à une demande de parrainage**       | Acceptation ou refus par le parrain.                                                                                                                                                          |
| 10  | **Recherche / adhésion à un groupe existant** | Découverte des groupes ouverts via un parrain.                                                                                                                                                |
| 11  | **Confirmation d'adhésion au groupe**         | Validation par le nouveau membre lui-même.                                                                                                                                                    |
| 12  | **Fiche du groupe**                           | Type, règles, membres, montant, avancement du cycle.                                                                                                                                          |
| 13  | **Liste des membres du groupe**               | Annuaire avec rôle (créateur, parrain, membre), icônes d'appel et de message, badge coloré d'engagement (rouge, orange, vert, bleu).                                                          |
| 14  | **Calendrier des tours (Tontine)**            | Ordre et dates de passage de chaque membre.                                                                                                                                                   |
| 15  | **Suivi des cotisations / versements**        | Paiements effectués et en attente, avec mention du payeur si réglé pour un tiers ; consultable hors connexion depuis le cache local, mise à jour à la reconnexion.                            |
| 16  | **Effectuer un versement**                    | Paiement de la cotisation périodique, pour soi-même.                                                                                                                                          |
| 17  | **Payer le versement d'un autre membre**      | Règlement à la place d'un membre bénéficiaire.                                                                                                                                                |
| 18  | **Déclarer un versement en espèces**          | Signalement d'un versement en liquide, en attente de validation.                                                                                                                              |
| 19  | **Validation manuelle d'un versement**        | Confirmation manuelle par l'administrateur ou le trésorier du groupe.                                                                                                                         |
| 20  | **Confirmation de paiement**                  | Reçu et mise à jour du solde, avec mention payeur/bénéficiaire si différents.                                                                                                                 |
| 21  | **Historique des transactions du groupe**     | Mouvements financiers complets du groupe.                                                                                                                                                     |
| 22  | **Sous-portefeuille à objectif**              | Objectif nommé (mariage, construction, terrain, pèlerinage, scolarité, santé) avec barre de progression.                                                                                      |
| 23  | **Demande de prêt**                           | Formulaire de demande, réservé aux groupes d'épargne le permettant.                                                                                                                           |
| 24  | **Confirmation du parrain pour le prêt**      | Le parrain du demandeur donne son accord avant examen par le comité.                                                                                                                          |
| 25  | **Validation de la demande de prêt**          | Décision du comité, enregistrée et tracée.                                                                                                                                                    |
| 26  | **Suggestion de prêt intelligent**            | Montant suggéré selon l'historique d'épargne ; la décision finale reste au comité.                                                                                                            |
| 27  | **Échéancier de remboursement**               | Généré automatiquement après décaissement du prêt.                                                                                                                                            |
| 28  | **Remboursement du prêt**                     | Suivi et paiement des échéances, rappels automatiques.                                                                                                                                        |
| 29  | **Notifications d'échéance / de tour**        | Rappels avant une cotisation ou un tour de tontine, incluant une détection par l'IA des membres à risque de retard, à titre d'information pour le trésorier ou l'administrateur du groupe.    |
| 30  | **Clôture du cycle / du groupe**              | Résumé final, répartition des fonds, archivage.                                                                                                                                               |
| 31  | **Statistiques et rapports du groupe**        | Régularité des paiements, historique des tours, bilan.                                                                                                                                        |
| 32  | **Paramètres du groupe**                      | Règles, visibilité, gestion des membres.                                                                                                                                                      |
| 33  | **Assurance communautaire — adhésion**        | Cotisation mensuelle à un fonds de solidarité et règles d'éligibilité.                                                                                                                        |
| 34  | **Déclaration de sinistre**                   | Décès, maladie ou sinistre : demande d'indemnisation auprès de l'assurance communautaire.                                                                                                     |
| 35  | **Fonds de Garantie Solidaire**               | Information sur le fonds commun (alimenté par un prélèvement de 0,2 à 0,5 % des cotisations) et ses conditions d'utilisation.                                                                 |
| 36  | **Score de confiance — vue détaillée**        | Détail du calcul : régularité, remboursements, participation, ancienneté, engagement, avec légende du badge coloré (rouge = à risque, orange = irrégulier, vert = fiable, bleu = exemplaire). |

**Total AssoShop Finance : 36 écrans**

---

## 6. Module AssoShop Market

Commerce entre professionnels et marketplace communautaire de biens, de services et d'investissement.

### 6.1 Fonctionnalités clés

- Marketplace B2B avec comptes revendeurs validés, catalogue par catégories et sous-catégories, filtres avancés et affichage du pays/ville du vendeur.
- Livraison programmée à date précise et commandes groupées entre plusieurs acheteurs pour réduire les frais de livraison.
- Réception des colis par scan de QR code et remise au client avec signature ou validation et historique de retrait.
- Marketplace communautaire de services entre membres (plomberie, couture, transport, informatique, agriculture, formation), avec évaluation par les utilisateurs.
- Module d'investissement communautaire : lancement d'un projet (agriculture, élevage, commerce), suivi des contributions, des dépenses, des revenus et répartition des bénéfices.
- Notifications de suivi de commande : confirmée, expédiée, arrivée à destination, prête à être récupérée.

### 6.2 Règles de gestion

| Code       | Règle de conception                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-M01** | Un revendeur B2B doit être validé par un administrateur de la plateforme avant de pouvoir publier des produits.                                                                                |
| **RG-M02** | Une commande groupée n'est facturée qu'une fois le nombre minimal de participants atteint ou la date limite dépassée, selon la configuration du revendeur.                                     |
| **RG-M03** | Un colis n'est marqué « prêt à être récupéré » qu'après scan du QR code à la réception par l'agent logistique.                                                                                 |
| **RG-M04** | Un service proposé sur la marketplace communautaire ne peut être évalué que par un utilisateur ayant effectivement sollicité ce service.                                                       |
| **RG-M05** | Un projet d'investissement communautaire publie ses règles de répartition des bénéfices avant la première contribution ; elles ne peuvent plus être modifiées après le premier investissement. |
| **RG-M06** | Aucune conversation entre un client et un vendeur ne peut être modifiée ou supprimée, à des fins de traçabilité et de résolution des litiges.                                                  |

### 6.3 Écrans mobiles

| N°  | Écran                                                 | Description / fonction                                                                                                                                 |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Accueil Marketplace B2B**                           | Vitrine des produits mis en avant, bannières, catégories populaires.                                                                                   |
| 2   | **Catégories et sous-catégories de produits**         | Arborescence à deux niveaux du catalogue B2B.                                                                                                          |
| 3   | **Recherche et filtres avancés**                      | Tri et affichage par vendeur, produit, catégorie, prix, pays, ville.                                                                                   |
| 4   | **Fiche produit**                                     | Détail, photos, prix de gros, quantité minimale ; drapeau du pays et ville du vendeur.                                                                 |
| 5   | **Panier**                                            | Récapitulatif des articles avant commande.                                                                                                             |
| 6   | **Choix de la livraison**                             | Mode et adresse de livraison.                                                                                                                          |
| 7   | **Livraison programmée**                              | Choix d'un jour précis parmi les créneaux proposés.                                                                                                    |
| 8   | **Commande groupée — rejoindre ou créer**             | Regroupement de plusieurs acheteurs pour réduire les frais de livraison.                                                                               |
| 9   | **Suivi de la commande groupée**                      | Participants, montant total, réduction obtenue.                                                                                                        |
| 10  | **Paiement de la commande**                           | Réglé via le portefeuille AssoShop Pay.                                                                                                                |
| 11  | **Confirmation de commande**                          | Récapitulatif final et numéro de commande.                                                                                                             |
| 12  | **Suivi de commande**                                 | Confirmée, expédiée, arrivée à destination, prête à être récupérée, remise effectuée.                                                                  |
| 13  | **Historique des achats (Mes achats)**                | Commandes passées par l'acheteur.                                                                                                                      |
| 14  | **Demande de compte revendeur**                       | Informations société, pièce d'identité, secteur d'activité.                                                                                            |
| 15  | **Statut de la demande revendeur**                    | Suivi de validation (en attente / validé / rejeté).                                                                                                    |
| 16  | **Tableau de bord revendeur**                         | Ventes, commandes en cours, revenus.                                                                                                                   |
| 17  | **Gestion des produits (liste)**                      | Produits publiés par le revendeur, filtrables par catégorie.                                                                                           |
| 18  | **Ajout / modification d'un produit**                 | Catégorie, sous-catégorie, prix, stock, photos, description assistée par l'IA (proposition de texte à partir de mots-clés ou d'une photo), pays/ville. |
| 19  | **Commandes reçues (revendeur)**                      | Commandes à traiter.                                                                                                                                   |
| 20  | **Détail d'une commande (revendeur)**                 | Changement de statut, validation d'expédition.                                                                                                         |
| 21  | **Scanner un colis à la réception (QR code)**         | Confirmation de l'arrivée d'un colis par le point de retrait.                                                                                          |
| 22  | **Confirmation d'enregistrement du colis**            | Enregistrement automatique dans le système, avec horodatage.                                                                                           |
| 23  | **Remise au client (signature / validation)**         | Notification, puis signature ou validation à la remise.                                                                                                |
| 24  | **Historique des retraits**                           | Journal des colis remis.                                                                                                                               |
| 25  | **Avis et évaluations**                               | Notation après achat.                                                                                                                                  |
| 26  | **Statistiques de vente**                             | Chiffre d'affaires, produits les plus vendus.                                                                                                          |
| 27  | **Paramètres du compte revendeur**                    | Zones et créneaux de livraison, coordonnées de paiement.                                                                                               |
| 28  | **Marketplace des services communautaires — accueil** | Offres de services proposées par les membres : plomberie, couture, transport, informatique, agriculture, formation.                                    |
| 29  | **Publier une offre de service**                      | Description, tarif, zone d'intervention.                                                                                                               |
| 30  | **Fiche prestataire de service**                      | Profil, évaluations des utilisateurs.                                                                                                                  |
| 31  | **Rechercher un prestataire**                         | Recherche par catégorie de service et localisation.                                                                                                    |
| 32  | **Projets d'investissement communautaire — liste**    | Projets agricoles, d'élevage ou commerciaux ouverts à l'investissement.                                                                                |
| 33  | **Créer un projet d'investissement**                  | Objet, montant recherché, règles de répartition des bénéfices.                                                                                         |
| 34  | **Investir dans un projet**                           | Contribution financière à un projet d'investissement.                                                                                                  |
| 35  | **Suivi du projet d'investissement**                  | Contributions, dépenses, revenus, répartition des bénéfices selon les règles définies.                                                                 |

**Total AssoShop Market : 35 écrans**

---

## 7. Module AssoShop Pay

Module transversal d'orchestration des paiements, cœur de l'écosystème AssoShop.

### 7.1 Fonctionnalités clés

- Portefeuille multi-comptes : un même utilisateur peut détenir un portefeuille personnel et un portefeuille par association, coopérative, famille ou entreprise, et basculer de l'un à l'autre sans changer de compte.
- Connexion aux opérateurs Mobile Money et aux banques, avec choix automatique selon le pays de l'utilisateur.
- Recharge, retrait, transfert entre membres, historique global consolidé de toutes les opérations, tous modules confondus.
- Réconciliation des paiements avec les opérateurs et génération d'un reçu numérique pour chaque transaction.
- Vue « Ma situation financière » consolidant en une seule page cotisations, épargne, tontine, aides reçues et prêts en cours.

### 7.2 Règles de gestion

| Code       | Règle de conception                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-P01** | Au lancement, l'application n'est pas dépositaire des fonds : les montants restent chez l'opérateur Mobile Money ou sur le compte bancaire de l'association ; AssoShop Pay enregistre, autorise et rapproche les opérations.                                     |
| **RG-P02** | Chaque opération financière transite par un compte virtuel et génère un identifiant de transaction unique et un reçu numérique.                                                                                                                                  |
| **RG-P03** | Une commission de service, comprise entre 0,5 % et 1 %, peut être prélevée sur chaque paiement effectué via Mobile Money ou carte, en plus des frais éventuels de l'opérateur ; le montant est toujours affiché avant validation.                                |
| **RG-P04** | Le choix des opérateurs Mobile Money proposés dépend automatiquement du pays de l'utilisateur.                                                                                                                                                                   |
| **RG-P05** | Toute conversion de devise affichée est indicative ; la transaction réelle s'effectue dans la devise du pays de l'opération.                                                                                                                                     |
| **RG-P06** | Un utilisateur peut détenir plusieurs portefeuilles mais ne peut pas transférer directement entre deux portefeuilles sans passer par une opération tracée.                                                                                                       |
| **RG-P07** | Si la plateforme souhaite un jour détenir elle-même les fonds des utilisateurs, elle devra au préalable respecter la réglementation financière applicable et obtenir les autorisations nécessaires (établissement de monnaie électronique ou partenariat agréé). |

### 7.3 Écrans mobiles

| N°  | Écran                                  | Description / fonction                                                                                                                                           |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Portefeuille (wallet)**              | Vue du compte actif : personnel, association, groupe, coopérative, famille ou entreprise ; dernier solde connu consultable hors connexion depuis le cache local. |
| 2   | **Recharge du portefeuille**           | Approvisionnement via l'opérateur Mobile Money disponible dans le pays.                                                                                          |
| 3   | **Retrait de fonds**                   | Transfert du solde vers un compte Mobile Money ou bancaire.                                                                                                      |
| 4   | **Transfert entre membres**            | Envoi d'argent direct à un autre utilisateur de la plateforme.                                                                                                   |
| 5   | **Moyens de paiement enregistrés**     | Numéros Mobile Money liés au compte, multi-opérateurs selon le pays.                                                                                             |
| 6   | **Historique global des transactions** | Vue consolidée de tous les mouvements, tous modules confondus.                                                                                                   |
| 7   | **Réconciliation des paiements**       | Rapprochement d'une opération avec la confirmation de l'opérateur Mobile Money ou de la banque, avec signalement par l'IA des écarts inhabituels à vérifier.     |
| 8   | **Reçu numérique**                     | Détail d'une transaction : montant, date, payeur, bénéficiaire, référence.                                                                                       |
| 9   | **Conversion de devise**               | Affichage indicatif en GNF, XOF, USD ou EUR.                                                                                                                     |
| 10  | **Ma situation financière globale**    | Vue consolidée : cotisations, épargne, tontine, aides reçues, prêts en cours, en une seule page.                                                                 |
| 11  | **Paramètres de paiement**             | Opérateur par défaut, plafonds, alertes de transaction.                                                                                                          |

**Total AssoShop Pay : 11 écrans**

---

## 8. Hub Communautaire et socle transversal

Le Hub Communautaire est le point d'entrée unique de l'application : un utilisateur se connecte une seule fois et retrouve immédiatement toutes ses associations, tontines, épargnes, prêts, projets, cotisations, invitations, dépenses et recettes, sans avoir besoin d'ouvrir plusieurs applications. Il regroupe également le socle commun : navigation, notifications, sécurité, paramètres, messagerie, mode hors connexion et fonctionnalités avancées (carte numérique, coffre-fort, score de confiance, assistant IA).

### 8.1 Fonctionnalités clés

- Carte numérique et QR Code personnels pour l'identification, le pointage, la validation de paiement et le contrôle d'accès.
- Coffre-fort numérique chiffré pour les documents personnels (pièce d'identité, passeport, diplômes, contrats, factures, reçus).
- Vérification d'identité (KYC), service pouvant être payant, pour renforcer la confiance entre utilisateurs.
- Assistant IA capable de répondre aux questions courantes, de résumer une réunion ou de préparer un rapport d'assemblée.
- Notifications intelligentes multicanal (SMS, e-mail, WhatsApp, notifications in-app).
- Mode hors connexion avec synchronisation automatique dès le retour de la connexion.

### 8.2 Règles de gestion

| Code       | Règle de conception                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-H01** | Le Hub n'affiche que les données des organisations et groupes auxquels l'utilisateur appartient réellement ; aucune donnée d'un tiers n'y est consolidée.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **RG-H02** | La vérification d'identité est facultative sauf lorsqu'un module (prêt, signature électronique, retrait important) l'exige explicitement dans ses propres règles.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **RG-H03** | L'assistant IA n'effectue aucune opération financière ou de gestion ; il informe et prépare des documents, mais toute action sensible reste soumise aux validations humaines prévues par les autres modules.                                                                                                                                                                                                                                                                                                                                                                          |
| **RG-H04** | Indicateur d'engagement communautaire (badge coloré) : le score de confiance communautaire est restitué visuellement par un badge à 4 niveaux — rouge (engagement à risque : retards de cotisation répétés, absences non justifiées, sanction active), orange (engagement irrégulier : retards ponctuels, participation faible), vert (engagement fiable : cotisations à jour, participation régulière), bleu (engagement exemplaire : ancienneté significative et régularité continue) — affiché à côté du nom du membre dans les listes, la fiche membre et le rapport de mobilité. |
| **RG-H05** | L'assistant IA est intégré comme point de contact contextuel dans plusieurs écrans du portefeuille, et non uniquement dans l'écran dédié : synthèse de réunion, aide à la rédaction d'un cas social ou d'une annonce, synthèse du rapport de mobilité, détection des membres à risque de retard, description assistée d'un produit. Il reste soumis au même principe que RG-H03 : jamais d'exécution d'une action financière ou de gestion, uniquement information ou préparation de document.                                                                                        |
| **RG-H06** | Le mode hors connexion couvre, au-delà de la consultation générale (section 12), des points d'usage identifiés dans plusieurs modules : liste des membres et badge d'engagement, solde et derniers mouvements de trésorerie ou de portefeuille, suivi des cotisations déjà chargées — chacun consultable depuis le cache local et mis à jour à la reconnexion.                                                                                                                                                                                                                        |

### 8.3 Écrans mobiles

| N°  | Écran                                            | Description / fonction                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Écran de démarrage (Splash screen)**           | Logo AssoShop / Global Service Groupe, chargement initial.                                                                                                                                                                                                 |
| 2   | **Onboarding (carrousel)**                       | Présentation des 4 modules : Community, Finance, Market, Pay.                                                                                                                                                                                              |
| 3   | **Choix du pays**                                | Sélection du pays d'utilisation ; charge automatiquement devise, langue, fuseau horaire, format de téléphone et de dates.                                                                                                                                  |
| 4   | **Choix de la langue**                           | Français, anglais ou portugais selon le pays.                                                                                                                                                                                                              |
| 5   | **Inscription**                                  | Choix du canal d'authentification (numéro de téléphone au format E.164 ou adresse e-mail), puis nom, prénom.                                                                                                                                               |
| 6   | **Vérification OTP**                             | Branche téléphone : code à 6 chiffres reçu par SMS ou WhatsApp (au choix). Branche e-mail : lien Magic Link ou code OTP à 6 chiffres. Le tout via Supabase Auth (`signInWithOtp` / `verifyOtp`), conformément au modèle d'authentification GSG.            |
| 7   | **Création du code PIN / mot de passe**          | Sécurisation initiale du compte.                                                                                                                                                                                                                           |
| 8   | **Connexion**                                    | Authentification native par téléphone (SMS/WhatsApp) ou e-mail (Magic Link/code OTP) + code PIN, avec connexion fédérée GSG ID (SSO portefeuille Global Service Groupe) proposée en option supplémentaire, jamais en remplacement.                         |
| 9   | **Mot de passe oublié**                          | Réinitialisation via OTP, envoyé sur le canal (SMS, WhatsApp ou e-mail) utilisé à l'inscription.                                                                                                                                                           |
| 10  | **Complétion du profil**                         | Photo, ville, informations personnelles.                                                                                                                                                                                                                   |
| 11  | **Carte numérique du membre (QR Code)**          | Identifiant visuel personnel utilisé pour l'identification, le pointage, la validation de paiement et le contrôle d'accès.                                                                                                                                 |
| 12  | **Hub Communautaire (accueil unifié)**           | Vue consolidée : associations, tontines, épargnes, prêts, projets, cotisations, invitations, dépenses et recettes de l'utilisateur, tous modules confondus.                                                                                                |
| 13  | **Menu latéral global**                          | Accès direct à Community, Finance, Market, Pay, À propos, Confidentialité, Discuter avec un conseiller, FAQ, Paramètres, Quitter.                                                                                                                          |
| 14  | **Menu latéral contextuel du module actif**      | Contenu adapté au module en cours d'utilisation.                                                                                                                                                                                                           |
| 15  | **Menu latéral — Profil**                        | Compléter le profil, mes groupes, mes associations, créer un groupe/une association, mes achats, mon historique, se déconnecter.                                                                                                                           |
| 16  | **Écran d'animation de transition / chargement** | Loader animé réutilisable pour les transitions et traitements sensibles.                                                                                                                                                                                   |
| 17  | **Mes favoris**                                  | Produits, associations, groupes et prestataires enregistrés en favoris.                                                                                                                                                                                    |
| 18  | **Mes groupes**                                  | Liste personnelle des groupes de tontine/cotisation/épargne.                                                                                                                                                                                               |
| 19  | **Mes associations**                             | Liste personnelle des associations et organisations rattachées.                                                                                                                                                                                            |
| 20  | **Wallet multi-comptes — sélecteur**             | Bascule entre les portefeuilles Personnel, Association A, Association B, Coopérative, Famille, Entreprise sans changer de compte.                                                                                                                          |
| 21  | **Coffre-fort numérique**                        | Stockage chiffré des documents personnels (pièce d'identité, passeport, diplômes, contrats, factures, reçus, actes) accessible selon autorisations.                                                                                                        |
| 22  | **Score de confiance communautaire**             | Indice calculé sur la régularité des cotisations, les remboursements, la participation et l'ancienneté, restitué par un badge à 4 couleurs (rouge, orange, vert, bleu — voir RG-H04).                                                                      |
| 23  | **Assistant IA**                                 | Assistant conversationnel central ; l'IA est également intégrée en plusieurs autres points de l'application (compte-rendu de réunion, aide à la rédaction d'un cas social, synthèse du rapport de mobilité, détection des retards à risque — voir RG-H05). |
| 24  | **Centre de notifications**                      | Alertes de paiement, validations, rappels d'échéance et notifications de commande.                                                                                                                                                                         |
| 25  | **Préférences de notifications**                 | Activation par canal (SMS, e-mail, WhatsApp, notifications in-app) et par type d'événement.                                                                                                                                                                |
| 26  | **Paramètres de sécurité**                       | Code PIN, biométrie, changement de mot de passe.                                                                                                                                                                                                           |
| 27  | **Paramètres généraux**                          | Langue, thème, devise d'affichage, mentions légales, à propos.                                                                                                                                                                                             |
| 28  | **Confidentialité et gestion des données**       | Visibilité du profil, export des données, suppression du compte.                                                                                                                                                                                           |
| 29  | **Vérification d'identité (KYC)**                | Dépôt d'une pièce d'identité et suivi du statut de vérification.                                                                                                                                                                                           |
| 30  | **Aide / FAQ**                                   | Questions fréquentes sur les quatre modules.                                                                                                                                                                                                               |
| 31  | **Discuter avec un conseiller**                  | Chat d'assistance en direct avec un conseiller Global Service Groupe.                                                                                                                                                                                      |
| 32  | **Messagerie — liste des conversations**         | Toutes les discussions privées de l'utilisateur, tous modules confondus.                                                                                                                                                                                   |
| 33  | **Conversation privée**                          | Échange en tête-à-tête ; les messages ne peuvent être ni modifiés ni supprimés.                                                                                                                                                                            |
| 34  | **Nouvelle conversation**                        | Choix d'un contact pour démarrer un message privé.                                                                                                                                                                                                         |
| 35  | **Mode hors connexion**                          | Bandeau et accès au contenu mis en cache sans connexion internet.                                                                                                                                                                                          |
| 36  | **File de synchronisation**                      | Suivi des actions réalisées hors connexion, en attente de synchronisation.                                                                                                                                                                                 |
| 37  | **Choix du canal de réception**                  | Pour la branche téléphone : SMS ou WhatsApp (Twilio) ; pour la branche e-mail : Magic Link ou code OTP — au choix de l'utilisateur, avant l'écran de vérification.                                                                                         |
| 38  | **Recherche vocale**                             | Recherche par la voix dans le catalogue Market, l'annuaire des groupes et l'annuaire des associations, pour les utilisateurs à faible littératie ou peu à l'aise avec la saisie texte.                                                                     |
| 39  | **Messages vocaux**                              | Envoi et lecture de messages vocaux dans la messagerie privée, en alternative à la saisie texte.                                                                                                                                                           |
| 40  | **Mode simplifié / accessibilité**               | Interface à grands caractères, contraste renforcé et lecture audio des écrans clés (solde, dernier versement, prochaine réunion), activable depuis les paramètres généraux.                                                                                |
| 41  | **Avis et notation**                             | Évaluation par étoiles et commentaire des vendeurs B2B, des prestataires de services et des groupes, visible après une transaction ou un cycle terminé.                                                                                                    |
| 42  | **Widget d'accueil (raccourcis rapides)**        | Widget sur l'écran d'accueil du téléphone : solde du portefeuille, prochain versement attendu, prochaine réunion, accès en un tap sans ouvrir l'application.                                                                                               |
| 43  | **Partage par WhatsApp**                         | Reçu de paiement, carte numérique de membre et QR code partageables directement vers WhatsApp ou tout autre canal, en dehors de l'application.                                                                                                             |
| 44  | **Programme de parrainage**                      | Suivi des filleuls inscrits par un membre, avec récompenses (réduction de frais de service, badge de confiance) au-delà d'un seuil de parrainages actifs.                                                                                                  |

**Total Hub Communautaire et socle transversal : 44 écrans**

---

## 9. Relations entre les modules

Les quatre modules ne fonctionnent pas de manière cloisonnée : ils échangent des données et des événements selon les relations suivantes.

| Module source          | Module cible                 | Nature de la relation                                                                                                                                                                                         |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AssoShop Community** | **AssoShop Finance**         | Une association héberge et supervise les groupes de tontine, cotisation et épargne créés par ses membres.                                                                                                     |
| **AssoShop Community** | **AssoShop Market**          | Un cas social ou un projet associatif peut être financé par contribution directe (financement participatif) ; l'association peut vendre sur la marketplace communautaire.                                     |
| **AssoShop Community** | **AssoShop Pay**             | Les cotisations d'association, sanctions financières et frais d'adhésion sont réglés via le portefeuille.                                                                                                     |
| **AssoShop Finance**   | **AssoShop Pay**             | Tous les versements, remboursements de prêts et soldes de tontine/épargne sont exécutés et tracés dans le portefeuille.                                                                                       |
| **AssoShop Finance**   | **AssoShop Community**       | Le score de confiance et l'historique de cotisation d'un membre alimentent les décisions du bureau (prêts, sanctions, cas sociaux).                                                                           |
| **AssoShop Market**    | **AssoShop Pay**             | Tout achat B2B ou service communautaire est réglé via le portefeuille ; les commissions de la plateforme y sont prélevées.                                                                                    |
| **AssoShop Market**    | **AssoShop Community**       | Les revendeurs et prestataires peuvent être des membres d'association ; leur score de confiance influence leur visibilité.                                                                                    |
| **AssoShop Pay**       | **Les trois autres modules** | Module transversal d'orchestration des paiements : il enregistre, autorise et rapproche chaque opération avec les opérateurs Mobile Money ou les banques, sans nécessairement détenir les fonds au lancement. |
| **Hub Communautaire**  | **Les quatre modules**       | Point d'entrée unique agrégeant, pour chaque utilisateur, les données de Community, Finance, Market et Pay en une vue consolidée.                                                                             |
| **Back-office Web**    | **Les quatre modules**       | Supervision, configuration multi-pays, gestion des abonnements, des litiges et des statistiques pour l'ensemble de la plateforme.                                                                             |

**Schéma de circulation :** Community et Market déclenchent des opérations financières qui transitent systématiquement par Pay ; Finance alimente Community en indicateurs de confiance ; le Hub agrège la lecture des quatre modules pour l'utilisateur final, tandis que le Back-office Web supervise l'ensemble de la plateforme, tous pays confondus.

---

## 10. Écrans web (back-office)

Le back-office web, réservé aux équipes de Global Service Groupe, supervise l'ensemble des modules, des pays et des abonnements.

| N°  | Écran                                                             | Description / fonction                                                                                                     |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Connexion administrateur**                                      | Authentification sécurisée à l'espace back-office.                                                                         |
| 2   | **Tableau de bord global**                                        | Indicateurs clés : utilisateurs actifs, volumes d'affaires, groupes actifs, associations actives.                          |
| 3   | **Gestion des utilisateurs**                                      | Recherche, consultation, suspension de comptes.                                                                            |
| 4   | **Validation des comptes revendeurs**                             | Étude des demandes et décision, avec justification.                                                                        |
| 5   | **Gestion du catalogue et des catégories**                        | Structuration des catégories du Commerce B2B.                                                                              |
| 6   | **Modération des produits et annonces**                           | Contrôle du contenu publié sur la marketplace.                                                                             |
| 7   | **Supervision des associations**                                  | Vue d'ensemble des structures créées, signalements.                                                                        |
| 8   | **Supervision des groupes financiers**                            | Vue d'ensemble des groupes de tontine/cotisation/épargne, alertes anomalies.                                               |
| 9   | **Gestion des litiges et réclamations**                           | Traitement des conflits entre utilisateurs, revendeurs ou membres.                                                         |
| 10  | **Gestion des commissions et frais**                              | Paramétrage des frais de service prélevés par la plateforme.                                                               |
| 11  | **Statistiques et rapports globaux**                              | Analyse transversale des quatre modules.                                                                                   |
| 12  | **Configuration de la plateforme**                                | Paramètres généraux, textes légaux, CGU.                                                                                   |
| 13  | **Journal d'activité (logs)**                                     | Traçabilité des actions sensibles pour audit et sécurité.                                                                  |
| 14  | **Gestion des rôles internes**                                    | Attribution des droits aux agents du support et modérateurs.                                                               |
| 15  | **Gestion des pays et paramètres régionaux**                      | Devise, langue, fuseau horaire, format des dates et téléphones, jours fériés, TVA, réglementation locale, par pays activé. |
| 16  | **Gestion des opérateurs Mobile Money**                           | Activation des opérateurs disponibles par pays (Orange Money, MTN, Wave, Moov, Airtel, Free Money, etc.).                  |
| 17  | **Gestion des abonnements et formules**                           | Configuration des paliers Gratuit / Standard / Premium et de leurs tarifs par pays.                                        |
| 18  | **Facturation et suivi des paiements d'abonnement**               | Suivi des paiements d'abonnement des associations et des groupes.                                                          |
| 19  | **Supervision de la hiérarchie des organisations**                | Vue arborescente Union / Fédération / Confédération / ONG / Coopérative / Réseau national.                                 |
| 20  | **Vérification d'identité (KYC) — file de validation**            | Traitement des demandes de vérification d'identité des utilisateurs.                                                       |
| 21  | **Gestion du Fonds de Garantie Solidaire**                        | Suivi des sommes collectées et des situations exceptionnelles couvertes, dans le respect de la réglementation.             |
| 22  | **Gestion des partenariats d'assurance communautaire**            | Suivi des conventions avec les assureurs partenaires et des commissions perçues.                                           |
| 23  | **Tableau de bord national / sous-régional**                      | Statistiques agrégées et anonymisées : nombre d'associations, de membres, volume des cotisations, projets financés.        |
| 24  | **Gestion de l'API et des intégrations**                          | Clés API, webhooks, partenaires (banques, ERP, logiciels comptables).                                                      |
| 25  | **Supervision de l'investissement communautaire et des services** | Vue d'ensemble des projets d'investissement et de la marketplace de services.                                              |
| 26  | **Audit et journal de sécurité avancé**                           | Historique détaillé des accès et actions sensibles, à des fins d'audit.                                                    |

**Total Back-office Web : 26 écrans**

---

## 11. Récapitulatif global des écrans

### 11.1 Écrans mobiles par module

| Module / Périmètre                     | Nombre d'écrans |
| -------------------------------------- | --------------- |
| Hub Communautaire et socle transversal | 44              |
| AssoShop Community                     | 50              |
| AssoShop Finance                       | 36              |
| AssoShop Market                        | 35              |
| AssoShop Pay                           | 11              |
| **TOTAL ÉCRANS MOBILES**               | **176**         |

### 11.2 Écrans web

| Module / Périmètre                                 | Nombre d'écrans |
| -------------------------------------------------- | --------------- |
| Back-office administrateur (Global Service Groupe) | 26              |
| **TOTAL ÉCRANS WEB**                               | **26**          |

### 11.3 Total général de la plateforme

| Module / Périmètre         | Nombre d'écrans |
| -------------------------- | --------------- |
| Écrans mobiles (5 modules) | 176             |
| Écrans web (back-office)   | 26              |
| **TOTAL GÉNÉRAL**          | **202**         |

---

## 12. Gestion hors connexion et synchronisation

Le mode hors connexion est une exigence essentielle pour la Guinée et plusieurs pays voisins où la couverture réseau reste irrégulière.

- Consultation hors ligne du contenu déjà mis en cache : catalogue consulté, fiches de groupes et d'associations, messages reçus, solde et historique récents du portefeuille.
- Les actions réalisées sans réseau (paiement déclaré, formulaire, présence à une réunion via QR Code) sont mises en file d'attente locale et synchronisées automatiquement dès le retour de la connexion.
- Gestion des conflits de synchronisation : en cas de double modification (ex. deux validations manuelles concurrentes d'un même paiement), la première opération horodatée côté serveur est retenue et l'autre est signalée pour arbitrage manuel par le rôle compétent (trésorier, administrateur).
- Les opérations financières irréversibles (décaissement d'un prêt, clôture d'un cycle de tontine) ne sont jamais exécutées localement : elles restent en attente jusqu'à confirmation du serveur, afin d'éviter tout double paiement.

---

## 13. Gestion du cache

- Cache local chiffré sur l'appareil mobile pour les données consultées récemment (fiches, catalogues, soldes), avec une durée de validité limitée avant rafraîchissement.
- Invalidation ciblée du cache dès qu'une donnée change côté serveur (paiement validé, nouveau membre, nouvelle annonce), via des notifications de synchronisation plutôt qu'un rechargement complet.
- Cache serveur (mémoire) pour les données à forte lecture et faible fréquence de changement : catalogues, taux de change indicatifs, statistiques agrégées du tableau de bord national — afin de réduire la charge sur la base de données principale.
- Aucune donnée sensible (mot de passe, code PIN, pièce d'identité) n'est conservée en cache non chiffré, ni côté mobile ni côté serveur.

---

## 14. Sécurité

- Authentification native via Supabase Auth (téléphone SMS/WhatsApp ou e-mail Magic Link/OTP), code PIN et option d'authentification biométrique sur l'appareil, complétée par une connexion fédérée GSG ID (SSO portefeuille Global Service Groupe) proposée en option et par une authentification multifacteur (MFA) mutualisée au niveau du noyau, réutilisable sans réimplémentation produit par produit.
- Chiffrement des données en transit (TLS) et au repos (base de données et coffre-fort numérique chiffrés).
- Contrôle d'accès basé sur les rôles (RBAC) : chaque rôle du bureau, du groupe ou de l'administration dispose de permissions strictement définies et non cumulables par défaut.
- Cloisonnement multi-tenant strict : les données d'une association ou d'un groupe ne sont jamais accessibles à une autre organisation.
- Journalisation (logs) de toutes les actions sensibles — paiements, validations, retraits, modifications de rôle — à des fins d'audit et de non-répudiation.
- Signature électronique horodatée pour les décisions sensibles, avec piste d'audit associée.
- Vérification d'identité (KYC) optionnelle mais recommandée avant certaines opérations sensibles (prêt important, retrait exceptionnel).
- Aucune donnée personnelle ou financière n'est partagée avec un tiers sans consentement explicite, conformément aux paramètres de confidentialité.
- Sauvegardes automatiques régulières et chiffrées, avec plan de reprise après sinistre.

---

## 15. Hébergement et infrastructure

Une infrastructure cloud est recommandée afin de garantir la disponibilité, la scalabilité et la conformité multi-pays de la plateforme.

- Hébergement cloud avec présence régionale en Afrique de l'Ouest lorsque disponible, complété par un fournisseur international de premier plan (redondance et plan de reprise après sinistre).
- Architecture en conteneurs (Docker) orchestrés (Kubernetes ou équivalent managé), permettant de faire évoluer chaque module indépendamment selon sa charge.
- Base de données principale répliquée avec sauvegardes automatiques quotidiennes et tests de restauration périodiques.
- Réseau de diffusion de contenu (CDN) pour les images de produits, documents et ressources statiques, afin d'améliorer les temps de chargement malgré une connexion limitée.
- Environnements distincts pour le développement, les tests et la production, avec déploiement continu maîtrisé.
- Surveillance (monitoring) et alertes automatiques sur la disponibilité, la latence et les tentatives d'accès anormales.

---

## 16. Architecture technique et programmation

| Directive de développement — applicable dès le lancement du projet, sans nouvelle validation                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - **Application mobile (Android + iOS) : Flutter.** Base de code unique pour Android et iOS ; stockage local hors connexion via SQLite/Drift ou Hive, avec file de synchronisation dédiée (section 12).                                                    |
| - **Back-office web (administration Global Service Groupe) : React.** Application web séparée, consommant les mêmes API que le mobile. Aucune tentative d'unification mobile/web sous une seule technologie (pas de Flutter Web, pas de React Native Web). |
| - **Cohérence portefeuille.** Cette répartition est déjà celle retenue pour Ecclesias 360, EcoShop et l'application tontine. Ne pas s'en écarter, afin de pouvoir réutiliser une base de composants commune (GSG Design Kit) une fois disponible.          |
| - **API et back-end.** Indépendante du choix mobile/web : REST, passerelle unique pour l'authentification et le routage, structurée par module (Community, Finance, Market, Pay) — voir 16.3.                                                              |

### 16.1 Applications mobiles

- Développement en Flutter (Android et iOS) à partir d'une base de code unique, cohérente avec les autres applications du Global Service Groupe.
- Stockage local hors connexion via une base embarquée (SQLite/Drift ou Hive) et file de synchronisation dédiée.

### 16.2 Application web (back-office)

- Interface web d'administration développée séparément (framework moderne de type React), consommant les mêmes API que l'application mobile.

### 16.3 Back-end et API

- API applicative structurée par module (Community, Finance, Market, Pay), avec une passerelle API unique pour l'authentification et le routage.
- Architecture orientée services, permettant de faire évoluer un module sans redéployer l'ensemble de la plateforme.
- Base de données relationnelle (PostgreSQL) avec cloisonnement logique par organisation (multi-tenant), complétée par un cache mémoire (Redis) pour les données à forte lecture.
- Intégration au GSG Platform Kernel via un adaptateur dédié (SDK léger ou appels API REST) pour l'identité fédérée (GSG ID), le registre des organisations et le référentiel pays/devise/langue (voir section 2.4), sans jamais modifier le cœur applicatif existant ni conditionner le fonctionnement autonome d'AssoShop à la disponibilité du noyau.

### 16.4 Paiements

- Intégration via un agrégateur de paiement Mobile Money couvrant plusieurs opérateurs (Orange Money, MTN Mobile Money, puis Wave, Moov Money, Airtel Money selon les pays), afin d'éviter une intégration séparée par opérateur.
- Architecture pair-à-pair recommandée pour AssoShop Pay au lancement, afin de ne pas être soumis aux exigences d'un établissement de monnaie électronique tant que la plateforme ne détient pas elle-même les fonds.

### 16.5 Notifications et intégrations

- Service de notifications multicanal (SMS, e-mail, notifications push, WhatsApp Business si disponible).
- API ouverte pour les intégrations futures avec des banques, des ERP, des logiciels comptables ou des plateformes gouvernementales partenaires.

---

## 17. Feuille de route de déploiement

- **Version 1** (environ 6 mois) : associations, membres, cotisations, cas sociaux, rapports — cœur du module AssoShop Community, lancé en Guinée.
- **Version 2** : tontines, épargne, prêts communautaires, portefeuille numérique — activation d'AssoShop Finance et d'AssoShop Pay.
- **Version 3** : portefeuille étendu (Wallet), marketplace complète, paiements inter-associations, puis expansion progressive vers les autres pays de la CEDEAO — activation complète d'AssoShop Market et de la configuration multi-pays.

Cette approche permet de lancer rapidement un produit utile, de recueillir les retours des utilisateurs, puis d'ajouter progressivement les fonctionnalités les plus complexes, sans reconstruire l'application à chaque étape.

---

## 18. Résumé

AssoShop devient une plateforme SaaS communautaire organisée en quatre modules complémentaires — Community, Finance, Market et Pay — réunis autour d'un Hub Communautaire unique et d'un module transversal de paiement. Le modèle économique combine un abonnement associatif à paliers (Gratuit, Standard, Premium), des frais et abonnements liés aux groupes financiers, une commission sur les paiements, des services premium (coffre-fort, vérification d'identité, signature électronique, rapports avancés, accompagnement) et un Fonds de Garantie Solidaire.

L'architecture totale compte 176 écrans mobiles répartis sur cinq espaces (Hub et socle transversal, Community, Finance, Market, Pay) et 26 écrans web de back-office, soit 202 écrans au total. Chaque module dispose de ses propres règles de gestion, tandis que des relations claires — notamment le passage systématique des opérations financières par AssoShop Pay — assurent la cohérence de l'ensemble.

La plateforme est pensée dès l'origine pour un déploiement multi-pays (devises, langues, opérateurs Mobile Money, réglementations locales) tout en démarrant simplement en Guinée. La feuille de route en trois versions permet un lancement rapide et un enrichissement progressif, porté par une infrastructure cloud sécurisée, un mode hors connexion robuste et une architecture technique modulaire (Flutter, API par module, PostgreSQL, Redis, agrégateur de paiement Mobile Money). AssoShop est conçu nativement avec le GSG Platform Kernel dès l'origine (identité fédérée GSG ID, registre des organisations, référentiel pays/devise/langue), et enrichi de fonctionnalités d'expérience utilisateur supplémentaires — authentification multicanal, recherche et messages vocaux, mode simplifié, avis et notation, widget d'accueil, partage WhatsApp et programme de parrainage.

---

## 19. Annexes

### Annexe A — Glossaire

- **Hub Communautaire** : écran d'accueil unifié agrégeant tous les modules pour un utilisateur.
- **Wallet / Portefeuille** : compte virtuel dans AssoShop Pay retraçant l'ensemble des opérations d'un utilisateur ou d'une organisation.
- **Score de confiance** : indice calculé à partir du comportement financier et de la participation d'un membre.
- **Fonds de Garantie Solidaire** : fonds commun alimenté par un prélèvement sur les cotisations, destiné aux situations exceptionnelles.
- **KYC (Know Your Customer)** : vérification d'identité d'un utilisateur.
- **Multi-tenant** : architecture garantissant le cloisonnement des données entre organisations distinctes sur une même plateforme.

### Annexe B — Grille tarifaire complète

| Formule      | Prix indicatif                   | Fonctionnalités                                                                                                                                                                                         |
| ------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gratuit**  | **0 GNF**                        | Jusqu'à 30 membres, gestion associative de base, marketplace communautaire, Mobile Money, carte numérique et mode hors connexion.                                                                       |
| **Standard** | **35 000 à 130 000 GNF / mois**  | Jusqu'à 500 membres, cotisations et groupes financiers, cas sociaux, réunions, marketplace B2B, coffre-fort numérique, KYC, signature électronique et rapports avancés.                                 |
| **Premium**  | **185 000 à 430 000 GNF / mois** | Membres illimités, prêts internes, assurance communautaire, investissement communautaire, comptabilité complète, gouvernance électronique, assistant IA, notifications SMS et sauvegardes automatiques. |

_Le détail complet des fonctionnalités réparties par formule (Gratuit, Standard, Premium), module par module, figure dans le tableau de la section 1.1 Modèle économique._

- **Frais de création de groupe** : Cotisation 20 000 GNF, Tontine 30 000 GNF, Épargne 30 000 GNF (ou inclus en Premium).
- **Commission sur paiement** : 0,5 % à 1 % par transaction Mobile Money ou carte.
- **Fonds de Garantie Solidaire** : 0,2 % à 0,5 % des cotisations et versements.

### Annexe C — Pays cibles pour l'expansion CEDEAO

- Phase de lancement : Guinée.
- Phase d'expansion : Sénégal, Côte d'Ivoire, Mali, Sierra Leone, Liberia, Gambie, Guinée-Bissau.

### Annexe D — Points à valider avec un conseil juridique et réglementaire

- Conditions d'exercice pour la collecte et la gestion de fonds communautaires (tontines, épargne, assurance) dans chaque pays visé.
- Régime applicable au Fonds de Garantie Solidaire et à l'éventuelle détention future des fonds des utilisateurs.
- Conformité en matière de protection des données personnelles pour le coffre-fort numérique et la vérification d'identité, pays par pays.

---

### Annexe E — Registre consolidé des règles de conception (développeur)

Ce registre rassemble, sans exception, l'intégralité des règles de conception d'AssoShop (RG-XXNN), module par module, dans l'ordre du document. Il sert de point d'entrée unique pour l'implémentation, la revue de conformité ou toute vérification effectuée par un développeur ou une IA de développement avant codage.

#### AssoShop Community (15 règles)

| Code       | Règle de conception                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-C01** | Les données de chaque structure sont cloisonnées ; aucune donnée n'est partagée entre deux organisations sans autorisation explicite.                                                                                                                                                                                                                       |
| **RG-C02** | Une structure peut être rattachée à un niveau hiérarchique supérieur ; les statistiques remontent automatiquement, sans exposer le détail financier de chaque membre.                                                                                                                                                                                       |
| **RG-C03** | Chaque rôle du bureau dispose de droits distincts et non cumulables par défaut (le trésorier ne peut pas modifier les membres, le secrétaire ne peut pas effectuer de retrait).                                                                                                                                                                             |
| **RG-C04** | Un retrait ou une dépense au-delà d'un seuil défini par l'association (par exemple 5 000 000 GNF) nécessite une double validation par signature électronique du président et du trésorier.                                                                                                                                                                  |
| **RG-C05** | Un cas social est validé par le comité avant diffusion ; la liste des contributeurs n'est visible que si les paramètres de confidentialité de l'association l'autorisent, et le décaissement n'intervient qu'une fois l'objectif atteint.                                                                                                                   |
| **RG-C06** | Un vote électronique ne peut être modifié après clôture ; le résultat et l'historique des mandats sont conservés indéfiniment.                                                                                                                                                                                                                              |
| **RG-C07** | Toute sanction doit mentionner un motif et n'est visible que par le bureau et le membre concerné.                                                                                                                                                                                                                                                           |
| **RG-C08** | Distinction rattachement hiérarchique / affiliation fédérative : une association affiliée à une grande communauté (fédération à adhésion partagée entre associations « sœurs ») reste juridiquement et opérationnellement autonome — bureau, trésorerie, règles d'adhésion et de gestion propres — contrairement au rattachement antenne/section de RG-C02. |
| **RG-C09** | Adhésion partagée : un membre peut être simultanément adhérent d'une association locale affiliée et de la grande communauté ; chaque adhésion conserve son propre statut, ses cotisations et son historique, reliés sous un même profil utilisateur.                                                                                                        |
| **RG-C10** | Diffusion croisée : toute annonce publiée par la grande communauté et marquée comme concernant les associations affiliées est automatiquement relayée dans le fil d'annonces des membres de ces associations, sans jamais exposer les données internes (trésorerie, liste des membres) d'une association affiliée à une autre.                              |
| **RG-C11** | La grande communauté peut consulter les statistiques agrégées de ses associations affiliées (effectifs, participation), selon le même principe de confidentialité que RG-C02, mais ne peut ni modifier les décisions du bureau d'une association affiliée ni accéder au détail financier de celle-ci sans autorisation explicite de cette dernière.         |
| **RG-C12** | Déclaration de mobilité : un membre actif qui déclare un déménagement vers une ville où existe une association communautaire (détection via le référentiel GSG, champ `ville_id`) déclenche la génération automatique d'un rapport de mobilité à destination du bureau de cette association.                                                                |
| **RG-C13** | Le rapport de mobilité contient des indicateurs agrégés d'engagement communautaire (régularité des cotisations, participation aux réunions et activités, score de confiance communautaire, sanctions actives le cas échéant) et jamais le détail financier brut du membre.                                                                                  |
| **RG-C14** | Le rapport de mobilité appuie la décision du bureau d'accueil sans s'y substituer : le membre déplacé reste soumis à la procédure normale d'adhésion (parrainage, validation par le bureau, confirmation par le membre).                                                                                                                                    |
| **RG-C15** | Un membre parti conserve son historique dans l'association d'origine sous un statut « membre parti » plutôt qu'une suppression ; si les deux associations sont affiliées à la même grande communauté, le lien avec celle-ci peut être conservé selon le paramétrage retenu par la grande communauté.                                                        |

#### AssoShop Finance (9 règles)

| Code       | Règle de conception                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RG-F01** | Un groupe ne peut relever que d'une seule logique (Tontine, Cotisation ou Épargne) ; ce type est figé dès le premier paiement enregistré.                                                                    |
| **RG-F02** | L'adhésion à un groupe requiert un parrain actif, et le nouveau membre doit lui-même confirmer son adhésion après inscription par le parrain.                                                                |
| **RG-F03** | Dans une tontine, l'ordre de passage et le montant sont fixés à la création et ne peuvent être modifiés en cours de cycle sans accord unanime des membres.                                                   |
| **RG-F04** | Un versement peut être effectué par un membre pour le compte d'un autre ; le payeur et le bénéficiaire réel sont systématiquement enregistrés séparément.                                                    |
| **RG-F05** | Un paiement déclaré en espèces reste au statut « en attente » jusqu'à validation manuelle par le trésorier ou l'administrateur du groupe ; aucun solde n'est mis à jour avant validation.                    |
| **RG-F06** | Une demande de prêt requiert la confirmation du parrain du demandeur puis l'accord du comité avant décaissement.                                                                                             |
| **RG-F07** | Le montant suggéré pour un prêt est indexé sur l'historique d'épargne et le score de confiance du membre ; le comité conserve toujours la décision finale.                                                   |
| **RG-F08** | L'assurance communautaire et le Fonds de Garantie Solidaire sont alimentés par un prélèvement transparent et plafonné sur les cotisations, dans le respect de la réglementation financière du pays concerné. |
| **RG-F09** | Le score de confiance est recalculé automatiquement mais n'entraîne aucune décision automatique : il constitue une aide à la décision, jamais une décision elle-même.                                        |

#### AssoShop Market (6 règles)

| Code       | Règle de conception                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-M01** | Un revendeur B2B doit être validé par un administrateur de la plateforme avant de pouvoir publier des produits.                                                                                |
| **RG-M02** | Une commande groupée n'est facturée qu'une fois le nombre minimal de participants atteint ou la date limite dépassée, selon la configuration du revendeur.                                     |
| **RG-M03** | Un colis n'est marqué « prêt à être récupéré » qu'après scan du QR code à la réception par l'agent logistique.                                                                                 |
| **RG-M04** | Un service proposé sur la marketplace communautaire ne peut être évalué que par un utilisateur ayant effectivement sollicité ce service.                                                       |
| **RG-M05** | Un projet d'investissement communautaire publie ses règles de répartition des bénéfices avant la première contribution ; elles ne peuvent plus être modifiées après le premier investissement. |
| **RG-M06** | Aucune conversation entre un client et un vendeur ne peut être modifiée ou supprimée, à des fins de traçabilité et de résolution des litiges.                                                  |

#### AssoShop Pay (7 règles)

| Code       | Règle de conception                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-P01** | Au lancement, l'application n'est pas dépositaire des fonds : les montants restent chez l'opérateur Mobile Money ou sur le compte bancaire de l'association ; AssoShop Pay enregistre, autorise et rapproche les opérations.                                     |
| **RG-P02** | Chaque opération financière transite par un compte virtuel et génère un identifiant de transaction unique et un reçu numérique.                                                                                                                                  |
| **RG-P03** | Une commission de service, comprise entre 0,5 % et 1 %, peut être prélevée sur chaque paiement effectué via Mobile Money ou carte, en plus des frais éventuels de l'opérateur ; le montant est toujours affiché avant validation.                                |
| **RG-P04** | Le choix des opérateurs Mobile Money proposés dépend automatiquement du pays de l'utilisateur.                                                                                                                                                                   |
| **RG-P05** | Toute conversion de devise affichée est indicative ; la transaction réelle s'effectue dans la devise du pays de l'opération.                                                                                                                                     |
| **RG-P06** | Un utilisateur peut détenir plusieurs portefeuilles mais ne peut pas transférer directement entre deux portefeuilles sans passer par une opération tracée.                                                                                                       |
| **RG-P07** | Si la plateforme souhaite un jour détenir elle-même les fonds des utilisateurs, elle devra au préalable respecter la réglementation financière applicable et obtenir les autorisations nécessaires (établissement de monnaie électronique ou partenariat agréé). |

#### Hub Communautaire et socle transversal (6 règles)

| Code       | Règle de conception                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RG-H01** | Le Hub n'affiche que les données des organisations et groupes auxquels l'utilisateur appartient réellement ; aucune donnée d'un tiers n'y est consolidée.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **RG-H02** | La vérification d'identité est facultative sauf lorsqu'un module (prêt, signature électronique, retrait important) l'exige explicitement dans ses propres règles.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **RG-H03** | L'assistant IA n'effectue aucune opération financière ou de gestion ; il informe et prépare des documents, mais toute action sensible reste soumise aux validations humaines prévues par les autres modules.                                                                                                                                                                                                                                                                                                                                                                          |
| **RG-H04** | Indicateur d'engagement communautaire (badge coloré) : le score de confiance communautaire est restitué visuellement par un badge à 4 niveaux — rouge (engagement à risque : retards de cotisation répétés, absences non justifiées, sanction active), orange (engagement irrégulier : retards ponctuels, participation faible), vert (engagement fiable : cotisations à jour, participation régulière), bleu (engagement exemplaire : ancienneté significative et régularité continue) — affiché à côté du nom du membre dans les listes, la fiche membre et le rapport de mobilité. |
| **RG-H05** | L'assistant IA est intégré comme point de contact contextuel dans plusieurs écrans du portefeuille, et non uniquement dans l'écran dédié : synthèse de réunion, aide à la rédaction d'un cas social ou d'une annonce, synthèse du rapport de mobilité, détection des membres à risque de retard, description assistée d'un produit. Il reste soumis au même principe que RG-H03 : jamais d'exécution d'une action financière ou de gestion, uniquement information ou préparation de document.                                                                                        |
| **RG-H06** | Le mode hors connexion couvre, au-delà de la consultation générale (section 12), des points d'usage identifiés dans plusieurs modules : liste des membres et badge d'engagement, solde et derniers mouvements de trésorerie ou de portefeuille, suivi des cotisations déjà chargées — chacun consultable depuis le cache local et mis à jour à la reconnexion.                                                                                                                                                                                                                        |

**Total : 43 règles de conception actives (RG-C, RG-F, RG-M, RG-P, RG-H), couvrant l'intégralité des cinq modules d'AssoShop.**

---

### Annexe F — Registre consolidé des écrans (référence développeur)

Ce registre liste, dans l'ordre de chaque module, l'ensemble des écrans mobiles et web d'AssoShop, avec un identifiant technique proposé (préfixe du module + numéro sur deux chiffres) destiné à nommer les routes, les widgets d'écran et les tickets de développement de façon stable, indépendamment de l'ordre d'apparition dans ce document. Le détail fonctionnel de chaque écran reste défini dans la section du module correspondant (4.3, 5.3, 6.3, 7.3, 8.3, 10).

#### Hub Communautaire et socle transversal (44 écrans, HUB-01 à HUB-44)

| ID     | Écran                                        |
| ------ | -------------------------------------------- |
| HUB-01 | Écran de démarrage (Splash screen)           |
| HUB-02 | Onboarding (carrousel)                       |
| HUB-03 | Choix du pays                                |
| HUB-04 | Choix de la langue                           |
| HUB-05 | Inscription                                  |
| HUB-06 | Vérification OTP                             |
| HUB-07 | Création du code PIN / mot de passe          |
| HUB-08 | Connexion                                    |
| HUB-09 | Mot de passe oublié                          |
| HUB-10 | Complétion du profil                         |
| HUB-11 | Carte numérique du membre (QR Code)          |
| HUB-12 | Hub Communautaire (accueil unifié)           |
| HUB-13 | Menu latéral global                          |
| HUB-14 | Menu latéral contextuel du module actif      |
| HUB-15 | Menu latéral — Profil                        |
| HUB-16 | Écran d'animation de transition / chargement |
| HUB-17 | Mes favoris                                  |
| HUB-18 | Mes groupes                                  |
| HUB-19 | Mes associations                             |
| HUB-20 | Wallet multi-comptes — sélecteur             |
| HUB-21 | Coffre-fort numérique                        |
| HUB-22 | Score de confiance communautaire             |
| HUB-23 | Assistant IA                                 |
| HUB-24 | Centre de notifications                      |
| HUB-25 | Préférences de notifications                 |
| HUB-26 | Paramètres de sécurité                       |
| HUB-27 | Paramètres généraux                          |
| HUB-28 | Confidentialité et gestion des données       |
| HUB-29 | Vérification d'identité (KYC)                |
| HUB-30 | Aide / FAQ                                   |
| HUB-31 | Discuter avec un conseiller                  |
| HUB-32 | Messagerie — liste des conversations         |
| HUB-33 | Conversation privée                          |
| HUB-34 | Nouvelle conversation                        |
| HUB-35 | Mode hors connexion                          |
| HUB-36 | File de synchronisation                      |
| HUB-37 | Choix du canal de réception                  |
| HUB-38 | Recherche vocale                             |
| HUB-39 | Messages vocaux                              |
| HUB-40 | Mode simplifié / accessibilité               |
| HUB-41 | Avis et notation                             |
| HUB-42 | Widget d'accueil (raccourcis rapides)        |
| HUB-43 | Partage par WhatsApp                         |
| HUB-44 | Programme de parrainage                      |

#### AssoShop Community (50 écrans, COM-01 à COM-50)

| ID     | Écran                                          |
| ------ | ---------------------------------------------- |
| COM-01 | Recherche d'associations et d'organisations    |
| COM-02 | Fiche association / organisation               |
| COM-03 | Créer une association / organisation           |
| COM-04 | Gestion des antennes et sections               |
| COM-05 | Créer une antenne / section                    |
| COM-06 | Demande d'adhésion                             |
| COM-07 | Invitation par lien / QR Code                  |
| COM-08 | Validation des demandes d'adhésion             |
| COM-09 | Liste des membres                              |
| COM-10 | Fiche membre / attribution des rôles           |
| COM-11 | Profil complet du membre                       |
| COM-12 | Suivi des cotisations                          |
| COM-13 | Paiement d'une cotisation                      |
| COM-14 | Payer la cotisation d'un autre membre          |
| COM-15 | Déclarer un paiement en espèces                |
| COM-16 | Validation manuelle d'un paiement (Trésorier)  |
| COM-17 | Trésorerie de l'association                    |
| COM-18 | Agenda / événements                            |
| COM-19 | Création d'un événement                        |
| COM-20 | Fil d'annonces                                 |
| COM-21 | Publication d'une annonce                      |
| COM-22 | Documents de l'association                     |
| COM-23 | Ajouter un document                            |
| COM-24 | Rapports et statistiques                       |
| COM-25 | Paramètres de l'association                    |
| COM-26 | Liste des réunions                             |
| COM-27 | Planifier une réunion                          |
| COM-28 | Compte-rendu de réunion                        |
| COM-29 | Liste des projets et activités                 |
| COM-30 | Créer un projet / une activité                 |
| COM-31 | Suivi des tâches et responsabilités            |
| COM-32 | Suivi des bénéficiaires et évaluation          |
| COM-33 | Historique des sanctions                       |
| COM-34 | Appliquer une sanction                         |
| COM-35 | Déclarer un cas social                         |
| COM-36 | Validation et attribution d'aide               |
| COM-37 | Suivi et financement du cas social             |
| COM-38 | Contribuer à un cas social ou un projet        |
| COM-39 | Gouvernance — élections et votes               |
| COM-40 | Historique des dirigeants et des mandats       |
| COM-41 | Comptabilité de l'association                  |
| COM-42 | Gestion des actifs                             |
| COM-43 | Ressources humaines                            |
| COM-44 | Signature électronique                         |
| COM-45 | Gestion des associations affiliées (« sœurs ») |
| COM-46 | Adhésion partagée — vue consolidée             |
| COM-47 | Fil d'annonces croisé                          |
| COM-48 | Déclarer un déménagement / changement de ville |
| COM-49 | Rapport de mobilité du membre                  |
| COM-50 | Décision d'adhésion sur transfert (bureau)     |

#### AssoShop Finance (36 écrans, FIN-01 à FIN-36)

| ID     | Écran                                     |
| ------ | ----------------------------------------- |
| FIN-01 | Choix du type de groupe                   |
| FIN-02 | Créer un groupe — paramètres communs      |
| FIN-03 | Paramétrage spécifique Tontine            |
| FIN-04 | Paramétrage spécifique Cotisation         |
| FIN-05 | Paramétrage spécifique Épargne            |
| FIN-06 | Abonnement du groupe                      |
| FIN-07 | Suggestions de parrain                    |
| FIN-08 | Demande de parrainage                     |
| FIN-09 | Réponse à une demande de parrainage       |
| FIN-10 | Recherche / adhésion à un groupe existant |
| FIN-11 | Confirmation d'adhésion au groupe         |
| FIN-12 | Fiche du groupe                           |
| FIN-13 | Liste des membres du groupe               |
| FIN-14 | Calendrier des tours (Tontine)            |
| FIN-15 | Suivi des cotisations / versements        |
| FIN-16 | Effectuer un versement                    |
| FIN-17 | Payer le versement d'un autre membre      |
| FIN-18 | Déclarer un versement en espèces          |
| FIN-19 | Validation manuelle d'un versement        |
| FIN-20 | Confirmation de paiement                  |
| FIN-21 | Historique des transactions du groupe     |
| FIN-22 | Sous-portefeuille à objectif              |
| FIN-23 | Demande de prêt                           |
| FIN-24 | Confirmation du parrain pour le prêt      |
| FIN-25 | Validation de la demande de prêt          |
| FIN-26 | Suggestion de prêt intelligent            |
| FIN-27 | Échéancier de remboursement               |
| FIN-28 | Remboursement du prêt                     |
| FIN-29 | Notifications d'échéance / de tour        |
| FIN-30 | Clôture du cycle / du groupe              |
| FIN-31 | Statistiques et rapports du groupe        |
| FIN-32 | Paramètres du groupe                      |
| FIN-33 | Assurance communautaire — adhésion        |
| FIN-34 | Déclaration de sinistre                   |
| FIN-35 | Fonds de Garantie Solidaire               |
| FIN-36 | Score de confiance — vue détaillée        |

#### AssoShop Market (35 écrans, MKT-01 à MKT-35)

| ID     | Écran                                             |
| ------ | ------------------------------------------------- |
| MKT-01 | Accueil Marketplace B2B                           |
| MKT-02 | Catégories et sous-catégories de produits         |
| MKT-03 | Recherche et filtres avancés                      |
| MKT-04 | Fiche produit                                     |
| MKT-05 | Panier                                            |
| MKT-06 | Choix de la livraison                             |
| MKT-07 | Livraison programmée                              |
| MKT-08 | Commande groupée — rejoindre ou créer             |
| MKT-09 | Suivi de la commande groupée                      |
| MKT-10 | Paiement de la commande                           |
| MKT-11 | Confirmation de commande                          |
| MKT-12 | Suivi de commande                                 |
| MKT-13 | Historique des achats (Mes achats)                |
| MKT-14 | Demande de compte revendeur                       |
| MKT-15 | Statut de la demande revendeur                    |
| MKT-16 | Tableau de bord revendeur                         |
| MKT-17 | Gestion des produits (liste)                      |
| MKT-18 | Ajout / modification d'un produit                 |
| MKT-19 | Commandes reçues (revendeur)                      |
| MKT-20 | Détail d'une commande (revendeur)                 |
| MKT-21 | Scanner un colis à la réception (QR code)         |
| MKT-22 | Confirmation d'enregistrement du colis            |
| MKT-23 | Remise au client (signature / validation)         |
| MKT-24 | Historique des retraits                           |
| MKT-25 | Avis et évaluations                               |
| MKT-26 | Statistiques de vente                             |
| MKT-27 | Paramètres du compte revendeur                    |
| MKT-28 | Marketplace des services communautaires — accueil |
| MKT-29 | Publier une offre de service                      |
| MKT-30 | Fiche prestataire de service                      |
| MKT-31 | Rechercher un prestataire                         |
| MKT-32 | Projets d'investissement communautaire — liste    |
| MKT-33 | Créer un projet d'investissement                  |
| MKT-34 | Investir dans un projet                           |
| MKT-35 | Suivi du projet d'investissement                  |

#### AssoShop Pay (11 écrans, PAY-01 à PAY-11)

| ID     | Écran                              |
| ------ | ---------------------------------- |
| PAY-01 | Portefeuille (wallet)              |
| PAY-02 | Recharge du portefeuille           |
| PAY-03 | Retrait de fonds                   |
| PAY-04 | Transfert entre membres            |
| PAY-05 | Moyens de paiement enregistrés     |
| PAY-06 | Historique global des transactions |
| PAY-07 | Réconciliation des paiements       |
| PAY-08 | Reçu numérique                     |
| PAY-09 | Conversion de devise               |
| PAY-10 | Ma situation financière globale    |
| PAY-11 | Paramètres de paiement             |

#### Back-office web — Global Service Groupe (26 écrans, WEB-01 à WEB-26)

| ID     | Écran                                                         |
| ------ | ------------------------------------------------------------- |
| WEB-01 | Connexion administrateur                                      |
| WEB-02 | Tableau de bord global                                        |
| WEB-03 | Gestion des utilisateurs                                      |
| WEB-04 | Validation des comptes revendeurs                             |
| WEB-05 | Gestion du catalogue et des catégories                        |
| WEB-06 | Modération des produits et annonces                           |
| WEB-07 | Supervision des associations                                  |
| WEB-08 | Supervision des groupes financiers                            |
| WEB-09 | Gestion des litiges et réclamations                           |
| WEB-10 | Gestion des commissions et frais                              |
| WEB-11 | Statistiques et rapports globaux                              |
| WEB-12 | Configuration de la plateforme                                |
| WEB-13 | Journal d'activité (logs)                                     |
| WEB-14 | Gestion des rôles internes                                    |
| WEB-15 | Gestion des pays et paramètres régionaux                      |
| WEB-16 | Gestion des opérateurs Mobile Money                           |
| WEB-17 | Gestion des abonnements et formules                           |
| WEB-18 | Facturation et suivi des paiements d'abonnement               |
| WEB-19 | Supervision de la hiérarchie des organisations                |
| WEB-20 | Vérification d'identité (KYC) — file de validation            |
| WEB-21 | Gestion du Fonds de Garantie Solidaire                        |
| WEB-22 | Gestion des partenariats d'assurance communautaire            |
| WEB-23 | Tableau de bord national / sous-régional                      |
| WEB-24 | Gestion de l'API et des intégrations                          |
| WEB-25 | Supervision de l'investissement communautaire et des services |
| WEB-26 | Audit et journal de sécurité avancé                           |

**Total : 202 écrans référencés (176 écrans mobiles répartis sur cinq espaces + 26 écrans web de back-office), en cohérence avec le récapitulatif de la section 11.**

---

> **Fin du cahier de conception AssoShop V6** – Document destiné à l'architecte pour l'implémentation. Toute question ou évolution doit faire l'objet d'une mise à jour de ce document.
