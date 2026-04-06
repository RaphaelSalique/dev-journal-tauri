# Design: Navigation par ecran pour l'administration

## Objectif

Remplacer les modales d'administration par une navigation interne a l'onglet `Administration`, avec un ecran de formulaire qui remplace la vue liste pendant la creation ou l'edition d'un projet, d'un tag ou d'un type d'activite.

## Contexte actuel

- Les projets, tags et types d'activite sont administres depuis l'onglet `Administration`.
- La creation et l'edition utilisent actuellement des modales distinctes.
- Le positionnement des modales pose des problemes repetes d'ergonomie dans la fenetre Tauri.
- Les trois referentiels partagent deja les memes champs metier principaux: `name`, `description`, `color`.

## Approche retenue

L'implementation remplace completement la logique de modale par une navigation d'ecran interne a `Administration`.

- La vue `Administration` a deux etats:
  - `list`: affichage des trois sections existantes
  - `form`: affichage d'un formulaire unifie de creation/edition
- Le formulaire est pilote par un etat unique indiquant:
  - l'entite cible: `project`, `tag`, `activityType`
  - le mode: `create` ou `edit`
  - la donnee initiale si on edite un element existant
- Les handlers de persistence existants dans `App.tsx` sont conserves et reutilises.

## Navigation

### Vue liste

La vue liste conserve:

- les trois tableaux d'administration
- les boutons `Nouveau ...`
- les boutons `Editer`
- les boutons `Supprimer`
- les boutons `Activer` / `Desactiver`

### Vue formulaire

Quand l'utilisateur clique sur `Nouveau ...` ou `Editer`:

- l'onglet reste `Administration`
- le contenu de la vue `Administration` est remplace par l'ecran formulaire
- la liste n'est plus visible tant que le formulaire est ouvert

Le formulaire propose:

- un titre adapte (`Nouveau projet`, `Modifier le tag`, etc.)
- un bouton `Retour a la liste`
- les champs `nom`, `description`, `couleur`
- un bouton d'action `Creer` ou `Modifier`

### Sortie du formulaire

- `Retour a la liste` ferme l'ecran formulaire sans sauvegarde
- `Creer` / `Modifier` sauvegarde, recharge les donnees d'administration, puis revient a la vue liste

## Structure d'etat

Dans `src/App.tsx`, la navigation interne est geree par un etat unique de type conceptuel:

- `view: 'list' | 'form'`
- `entityType: 'project' | 'tag' | 'activityType' | null`
- `mode: 'create' | 'edit' | null`
- `initialData: any | null`

Le but est d'eviter trois flux paralleles de modales et de centraliser l'etat de navigation de l'administration.

## Formulaire unifie

Le formulaire d'administration est commun aux trois entites.

Il affiche dynamiquement:

- le titre
- le label du champ nom
- la valeur initiale
- le texte du bouton principal

Les champs restent:

- `name`
- `description`
- `color`

Le comportement du champ couleur conserve les protections recentes:

- preview fiable du `input[type="color"]`
- fallback visuel si la valeur texte n'est pas un hex valide

## Persistence

Les handlers existants sont reutilises:

- `handleSaveProject`
- `handleSaveTag`
- `handleSaveActivityType`

Ils peuvent etre legerement adaptes pour:

- ne plus fermer de modale
- reinitialiser l'etat `adminView`
- revenir a la vue liste apres succes

Les handlers de suppression et d'activation/desactivation restent limites a la vue liste.

## Suppression des modales

Les composants suivants deviennent inutiles et doivent etre retires si plus references:

- `src/components/ProjectModal.tsx`
- `src/components/TagModal.tsx`
- `src/components/ActivityTypeModal.tsx`

Le CSS de modale associe dans `src/App.css` doit aussi etre supprime s'il n'est plus utilise.

## Compatibilite et hors perimetre

### Ce qui ne change pas

- le backend Tauri
- les formulaires du journal
- les analytics et rapports
- la logique CRUD metier des trois referentiels

### Hors perimetre

- refonte visuelle complete de l'administration
- factorisation generique du CRUD backend
- navigation multi-page globale de l'application

## Verification attendue

- ouverture de `Nouveau projet` vers un ecran de formulaire
- ouverture de `Editer` sur un projet existant vers le meme ecran
- memes comportements pour `tags` et `types d'activite`
- retour a la liste sans sauvegarde
- retour automatique a la liste apres creation
- retour automatique a la liste apres modification
- suppression et activation/desactivation toujours fonctionnelles depuis la vue liste
- build frontend sans erreur
- compilation Rust sans regression
