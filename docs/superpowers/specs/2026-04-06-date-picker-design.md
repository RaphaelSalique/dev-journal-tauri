# Design: Remplacement des champs de date natifs

## Objectif

Remplacer les champs `input[type="date"]` natifs par un composant de selection de date React maitrisant completement l'ouverture et la fermeture du calendrier dans la fenetre Tauri.

L'objectif principal est d'eviter le comportement instable du picker natif du webview, en particulier le cas ou le calendrier ne se ferme pas correctement quand l'utilisateur clique a l'exterieur.

## Contexte actuel

- L'application utilise aujourd'hui plusieurs champs `input[type="date"]` natifs dans le journal et les rapports.
- Ces champs reposent sur le picker fourni par le moteur du webview Tauri, donc sur un comportement qui varie selon la plateforme.
- Le projet n'utilise actuellement aucune bibliotheque UI ou date picker dediee.
- L'utilisateur a confirme qu'il ne peut pas saisir la date au clavier; la saisie doit donc passer par une selection visuelle.

## Approche retenue

L'implementation introduit un composant React reutilisable `DatePickerField` base sur `react-day-picker`.

- Le champ visible est en lecture seule.
- Un bouton calendrier explicite ouvre le calendrier.
- Le calendrier est affiche dans un popover custom gere par React.
- Le popover se ferme sur clic exterieur, touche `Escape` ou selection d'une date.
- La valeur metier continue d'etre stockee en `YYYY-MM-DD` pour rester compatible avec le front et le backend Tauri existants.

Cette approche remplace la dependance au picker natif du navigateur par un composant deterministic et uniforme dans Tauri.

## Bibliotheque

La bibliotheque retenue est `react-day-picker`.

Raisons du choix:

- integration legere dans un projet React sans design system existant
- controle total sur le rendu du champ et du popover
- bon support de navigation clavier et des interactions de calendrier
- adoption simple pour un composant interne reutilisable

Les alternatives `react-aria-components` et `react-datepicker` ont ete ecartees:

- `react-aria-components` est plus structurante et plus lourde a introduire pour ce besoin
- `react-datepicker` est rapide a brancher mais moins adaptee a une integration sobre et maitrisee dans l'UI existante

## UX retenue

### Champ

Le composant affiche:

- un champ visuel en lecture seule
- un bouton avec icone ou libelle calendrier
- une valeur formattee de maniere lisible en francais

Exemple d'affichage:

- valeur stockee: `2026-04-06`
- valeur affichee: `lundi 6 avril 2026`

Si aucune date n'est definie et que le champ doit accepter le vide, le composant affiche un placeholder explicite. Pour les champs actuellement obligatoires, une date valide doit toujours etre presente.

### Ouverture et fermeture

- clic sur le champ: ouvre ou ferme le calendrier
- clic sur le bouton calendrier: ouvre ou ferme le calendrier
- clic a l'exterieur du composant: ferme le calendrier
- touche `Escape`: ferme le calendrier et rend le focus au declencheur
- selection d'une date: met a jour la valeur puis ferme le calendrier

Le comportement doit etre identique sur tous les points d'usage, independamment du webview Tauri.

### Accessibilite

- le champ expose un label associe
- le bouton calendrier est focusable et annonce son role
- le calendrier est navigable au clavier
- le focus revient proprement sur le declencheur apres fermeture

## Structure du composant

Un composant central `DatePickerField` sera ajoute dans `src/components`.

Responsabilites:

- afficher la valeur formatee
- ouvrir et fermer le popover
- detecter les clics exterieurs
- rendre le calendrier `react-day-picker`
- convertir entre valeur metier `YYYY-MM-DD` et objet `Date`
- notifier le parent via `onChange(nextDate: string)`

API conceptuelle:

- `label: string`
- `value: string`
- `onChange: (value: string) => void`
- `required?: boolean`
- `disabled?: boolean`
- `className?: string`

Le composant ne portera pas de logique metier specifique au journal ou aux rapports.

## Zones a migrer

Le nouveau composant remplacera les champs de date natifs dans:

- le selecteur de journal dans `src/App.tsx`
- le formulaire de creation d'entree dans `src/components/JournalEntryForm.tsx`
- les champs `Date de debut` et `Date de fin` du generateur de rapport dans `src/App.tsx`

L'objectif est d'unifier toute la saisie de date visible dans l'application.

## Format et compatibilite

- le format interne reste `YYYY-MM-DD`
- aucun changement n'est necessaire cote Rust
- aucune migration de donnees n'est necessaire
- les commandes Tauri et les filtres existants continuent de fonctionner sans adaptation de contrat

Le composant de date ne doit etre qu'une couche d'interface utilisateur au-dessus des chaines deja manipulees par l'application.

## Style et integration visuelle

- conserver l'esthetique generale de la classe `.date-input`
- ajouter le style du popover et du calendrier dans `src/App.css` ou dans un fichier CSS de composant si cela reste simple
- garder une largeur compacte compatible avec la barre de selection du journal
- assurer un rendu correct en theme clair et sombre

Le rendu doit s'inserer dans l'UI actuelle sans introduire de design system parallele.

## Cas limites

- si la valeur initiale est vide ou invalide, le calendrier ouvre sur la date du jour
- si la valeur initiale est valide, le calendrier ouvre sur le mois correspondant
- si l'utilisateur reclique sur la date deja selectionnee, la valeur reste stable et le popover se ferme
- si plusieurs `DatePickerField` existent a l'ecran, l'ouverture de l'un ne doit pas perturber la valeur des autres

## Verification attendue

- ouverture du calendrier depuis le champ du journal
- fermeture sur clic exterieur dans la fenetre Tauri
- fermeture sur `Escape`
- mise a jour correcte de `currentDate` apres selection
- creation d'une entree avec selection de date via le nouveau composant
- selection correcte des dates de debut et fin de rapport
- rendu correct en theme clair et sombre
- build TypeScript sans erreur
- build Tauri sans regression

## Hors perimetre

- saisie clavier libre des dates
- support d'heures ou de date/heure
- internationalisation complete de tous les messages du calendrier
- refonte globale du systeme de formulaires
