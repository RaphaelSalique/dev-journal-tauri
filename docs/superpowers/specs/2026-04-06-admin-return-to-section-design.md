# Design: Retour a la section admin apres sauvegarde

## Objectif

Quand l'utilisateur cree ou edite un element depuis l'onglet `Administration`, puis valide le formulaire, l'application doit revenir a la vue liste et se repositionner automatiquement sur la section d'origine (`Projets`, `Tags`, `Types d'activite`) au lieu de revenir tout en haut.

## Contexte actuel

- L'administration utilise maintenant une navigation par ecran interne.
- Apres sauvegarde, le code revient a la vue liste.
- Le retour se fait actuellement sans repositionnement vers la section source.

## Approche retenue

Utiliser un retour par section memorisee, avec scroll programmatique.

- Ajouter dans l'etat d'administration une information `returnToSection`
- Les valeurs possibles sont:
  - `project`
  - `tag`
  - `activityType`
- Associer une `ref` React a chaque bloc de liste correspondant
- Quand l'utilisateur ouvre le formulaire via `Nouveau ...` ou `Editer`, memoriser la section source
- Apres sauvegarde reussie:
  - revenir a la vue liste
  - attendre le rendu
  - appeler `scrollIntoView` sur la section memorisee

## Comportement attendu

- `Nouveau projet` ou `Editer` sur un projet => retour sur la section `Projets`
- `Nouveau tag` ou `Editer` sur un tag => retour sur la section `Tags`
- `Nouveau type d'activite` ou `Editer` sur un type d'activite => retour sur la section `Types d'activite`

Le scroll doit etre:

- automatique
- stable
- suffisamment precis pour que la section visee soit visible sans remettre l'utilisateur en haut de la page

## Details techniques

Dans `src/App.tsx`:

- etendre l'etat `adminView` avec `returnToSection`
- ajouter trois refs:
  - `projectsSectionRef`
  - `tagsSectionRef`
  - `activityTypesSectionRef`
- attacher chaque ref au conteneur `.admin-section` correspondant
- au moment du retour a la liste apres sauvegarde, declencher un scroll vers la ref cible

Le scroll peut utiliser:

- `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`

ou une variante equivalente si un leger offset est necessaire.

## Hors perimetre

- memorisation persistante de la position apres changement d'onglet
- navigation historique type routeur
- restauration de position pour les suppressions ou activations/desactivations

## Verification attendue

- edition d'un type d'activite puis validation => retour sur `Types d'activite`
- edition d'un projet puis validation => retour sur `Projets`
- edition d'un tag puis validation => retour sur `Tags`
- creation d'un element dans chaque section => retour sur la section correspondante
