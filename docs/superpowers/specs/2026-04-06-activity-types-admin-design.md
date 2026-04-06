# Design: Administration des types d'activite

## Objectif

Ajouter l'administration des types d'activite avec le meme niveau de gestion que les projets et les tags, puis utiliser ces types administres dans les formulaires de creation et d'edition des entrees du journal.

Le perimetre inclut aussi une correction de l'onglet Administration: il doit afficher les elements actifs et inactifs pour permettre leur reactivation depuis l'UI.

## Contexte actuel

- Les projets et les tags sont administres via des commandes Tauri stockant les donnees dans des fichiers JSON distincts.
- L'onglet Administration permet deja de creer, modifier, supprimer et activer/desactiver les projets et les tags.
- Les types d'activite sont encore codes en dur dans le front.
- Les entrees de journal stockent `entry_type` comme une chaine dans le markdown; il n'existe pas de reference technique forte vers une table ou un identifiant.

## Approche retenue

L'implementation suit le pattern existant des projets et des tags.

- Ajouter une nouvelle entite `ActivityType` cote Tauri.
- Ajouter un store dedie `activity-types.json`.
- Exposer un CRUD complet et un basculement de statut actif/inactif.
- Charger les types d'activite dans le front au demarrage.
- Ajouter une section "Types d'activite" dans l'onglet Administration.
- Remplacer les listes d'options codees en dur par une liste dynamique issue du store.
- Corriger l'onglet Administration pour qu'il affiche aussi les elements inactifs.

## Modele de donnees

`ActivityType` reprend les memes champs que `Project` et `Tag`.

- `id: Option<i64>`
- `name: String`
- `description: Option<String>`
- `color: String`
- `active: bool`
- `created_at: Option<String>`
- `updated_at: Option<String>`

## Donnees par defaut

Le store des types d'activite sera initialise avec les valeurs actuellement proposees dans les selects, afin d'eviter toute regression fonctionnelle.

Liste initiale:

- `debug`
- `developpement`
- `documentation`
- `formation`
- `infrastructure`
- `reunion`
- `revue de code`
- `veille technologique`

Les libelles existants dans le code utilisent des accents dans les valeurs (`developpement`, `reunion`, etc. selon le cas reel dans le code). L'implementation doit reprendre exactement les valeurs deja consommees par l'application pour ne pas casser les anciennes entrees. Les labels affiches a l'ecran resteront en francais lisible.

## Backend

### Commandes a ajouter

Les commandes suivantes seront ajoutees dans `src-tauri/src/lib.rs`:

- `get_all_activity_types(include_inactive?: bool)`
- `create_activity_type(name, description?, color?)`
- `update_activity_type(id, name, description?, color?)`
- `delete_activity_type(id)`
- `toggle_activity_type_status(id)`

### Comportement

- Le store utilise `activity-types.json`.
- En absence de donnees, des types par defaut sont crees et sauvegardes.
- Les IDs sont attribues par incrementation du plus grand ID courant, comme pour projets/tags.
- `include_inactive` filtre ou non les elements retournes.
- Les mises a jour changent `updated_at` comme pour les autres entites.

## Frontend

### Etat et chargement

Dans `src/App.tsx`:

- ajouter l'etat `activityTypes`
- charger `activityTypes` avec `projects` et `tags` au demarrage
- renommer la fonction de chargement vers quelque chose de coherent pour les trois referentiels, ou garder le nom existant si cela limite le diff

### Onglet Administration

Ajouter une troisieme section:

- titre: `Types d'activite`
- bouton: `Nouveau Type d'activite`
- tableau avec colonnes: nom, description, couleur, actif, actions
- actions: editer, supprimer, activer/desactiver

Ajouter une modale `ActivityTypeModal` calquee sur `ProjectModal` et `TagModal`, avec:

- `name`
- `description`
- `color`

### Correction de l'affichage des inactifs

L'onglet Administration doit charger les trois referentiels avec `includeInactive: true`.

Les formulaires de saisie ne doivent en revanche proposer que les elements actifs:

- projets actifs dans le select de projet
- tags actifs dans le select de tags
- types d'activite actifs dans le select de type d'activite

Cette separation maintient une administration complete sans exposer les elements desactives dans la saisie courante.

### Formulaire de creation

Dans `src/components/JournalEntryForm.tsx`:

- injecter `activityTypes` via les props
- remplacer les `option` codees en dur par une boucle sur les types actifs tries par nom
- conserver une valeur par defaut compatible avec les donnees existantes

### Formulaire d'edition

Dans `src/components/JournalEntriesList.tsx`:

- injecter `activityTypes` via les props
- remplacer les `option` codees en dur par une boucle sur les types actifs tries par nom
- si l'entree editee contient un type absent ou inactif, conserver sa valeur courante comme option visible pour permettre l'edition sans perte

## Compatibilite

- Les anciennes entrees restent lisibles, car `entry_type` demeure une chaine stockee dans le markdown.
- Aucune migration de contenu n'est necessaire.
- Les analytics et rapports continueront a agreger les types a partir des valeurs presentes dans les entrees.

## Gestion des cas limites

- Si un type d'activite est desactive, il disparait des nouvelles saisies mais reste visible dans les anciennes entrees et dans les statistiques.
- Si une ancienne entree utilise un type non present dans le referentiel, l'edition doit continuer a fonctionner sans effacer cette valeur implicitement.
- Si le store est vide ou absent, les valeurs par defaut sont recreees automatiquement.

## Tests et verification

Verification minimale attendue:

- creation, edition, suppression, activation et desactivation d'un type d'activite depuis l'onglet Administration
- affichage des elements inactifs dans l'onglet Administration
- absence des elements inactifs dans les formulaires de saisie
- selection d'un type administre dans le formulaire de creation
- edition d'une entree existante avec un type actif
- edition d'une entree existante avec un type absent ou inactif
- build TypeScript et build Tauri sans erreur

## Hors perimetre

- factorisation generique du CRUD des referentiels
- migration du stockage JSON vers SQLite
- renommage automatique des types deja presents dans les fichiers markdown
