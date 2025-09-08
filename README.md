# Journal de Développement - Application Tauri

Une application moderne de journalisation des activités de développement, construite avec Tauri, React et TypeScript. Cette application permet de suivre et d'analyser vos activités de développement quotidiennes avec une intégration Jira complète.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## 🚀 Fonctionnalités

### 📝 Gestion des Entrées de Journal
- **Saisie structurée** : Formulaire complet pour documenter vos activités
- **Édition en place** : Modification directe des entrées existantes
- **Suppression sécurisée** : Suppression avec confirmation
- **Stockage Markdown** : Les données sont sauvées dans des fichiers Markdown lisibles

### 🎯 Gestion de Projets et Tags
- **Administration complète** : CRUD pour projets et tags
- **Sélecteur visuel** : Interface graphique avec couleurs personnalisées
- **Persistance** : Stockage local avec JSON
- **Activation/Désactivation** : Gestion du cycle de vie des projets et tags

### 🔗 Intégration Jira
- **Authentification API** : Connexion sécurisée avec token d'API
- **Requêtes JQL** : Support complet des requêtes Jira Query Language
- **Sélection de tickets** : Association de tickets Jira aux entrées
- **Persistance** : Les tickets sélectionnés restent visibles même hors requête JQL
- **Mode hors ligne** : Données mock disponibles sans configuration Jira

### 📊 Rapports et Analytics
- **Rapports d'activité** : Génération de rapports sur mesure par période
- **Visualisations** : Graphiques et statistiques interactives
- **Répartition par projet** : Analyse du temps passé par projet
- **Tags populaires** : Visualisation des tags les plus utilisés
- **Export** : Exportation des rapports en JSON

## 🛠️ Installation

### Prérequis
- **Node.js** 20.19+ ou 22.12+
- **Rust** 1.70+
- **Git**

### Installation des dépendances

```bash
# Cloner le repository
git clone <repository-url>
cd dev-journal-tauri

# Installer les dépendances Node.js
npm install
```

### Configuration Jira (Optionnelle)

1. Créer un fichier `.env` à la racine :
```bash
cp .env.example .env
```

2. Configurer vos informations Jira dans le fichier `.env` :
```env
JIRA_BASE_URL=https://votre-instance.atlassian.net
JIRA_EMAIL=votre.email@exemple.com
JIRA_API_TOKEN=votre_token_api
```

3. Obtenir votre token d'API Jira :
   - Aller sur https://id.atlassian.com/manage-profile/security/api-tokens
   - Créer un nouveau token
   - Copier le token dans la variable `JIRA_API_TOKEN`

## 🚀 Utilisation

### Développement
```bash
npm run tauri dev
```

### Build React seul (pour développement web)
```bash
npm run build
```

### Build Tauri complet (application native)
```bash
npm run tauri build
```

Cette commande fait :
- ✅ **Compile React** → build web optimisé
- ✅ **Compile Rust** → binaire natif  
- ✅ **Empaquette** → créé les installeurs/exécutables pour votre OS

## 📦 Configuration en Production

### Emplacements des fichiers après build

Après `npm run tauri build`, les fichiers seront disponibles dans :

**Linux Ubuntu :**
```
src-tauri/target/release/bundle/
├── appimage/dev-journal-tauri_1.0.0_amd64.AppImage  # ← Exécutable portable
├── deb/dev-journal-tauri_1.0.0_amd64.deb           # ← Package .deb pour installation
└── rpm/dev-journal-tauri-1.0.0-1.x86_64.rpm        # ← Package RPM
```

**Windows :**
```
src-tauri/target/release/bundle/
├── msi/dev-journal-tauri_1.0.0_x64_en-US.msi       # ← Installeur MSI
└── ../dev-journal-tauri.exe                         # ← Exécutable direct
```

**Mac :**
```
src-tauri/target/release/bundle/
├── dmg/dev-journal-tauri_1.0.0_x64.dmg             # ← Image disque
└── macos/dev-journal-tauri.app                      # ← Bundle application
```

### Variables d'environnement en production

L'application en production peut être configurée de plusieurs façons :

#### Option 1: Fichier .env (Recommandée)
Créez un fichier `.env` **à côté de l'exécutable** avec :
```env
JIRA_BASE_URL=https://votre-instance.atlassian.net
JIRA_EMAIL=votre-email@domain.com
JIRA_API_TOKEN=votre-token-api
```

**Exemple de structure :**
```
/home/user/Applications/
├── dev-journal-tauri.AppImage    # Votre application
└── .env                          # Fichier de configuration
```

#### Option 2: Variables d'environnement système

**Linux/Mac :**
```bash
export JIRA_BASE_URL="https://votre-instance.atlassian.net"
export JIRA_EMAIL="votre-email@domain.com" 
export JIRA_API_TOKEN="votre-token"
```

**Windows :**
```cmd
setx JIRA_BASE_URL "https://votre-instance.atlassian.net"
setx JIRA_EMAIL "votre-email@domain.com"
setx JIRA_API_TOKEN "votre-token"
```

#### Option 3: Mode déconnecté
Sans configuration Jira, l'application fonctionne avec des données de démonstration.

### Distribution

#### Distribution Simple (Ubuntu/Linux)
**OUI**, vous pouvez simplement copier-coller :

1. **Buildez** l'application :
   ```bash
   npm run tauri build
   ```

2. **Récupérez le fichier AppImage** :
   ```bash
   cp src-tauri/target/release/bundle/appimage/*.AppImage ~/dev-journal-tauri.AppImage
   ```

3. **Créez un fichier .env d'exemple** :
   ```bash
   cat > .env.example << 'EOF'
   JIRA_BASE_URL=https://votre-instance.atlassian.net
   JIRA_EMAIL=votre-email@domain.com
   JIRA_API_TOKEN=votre-token-api
   EOF
   ```

4. **Distribution** : Copiez ces 2 fichiers sur n'importe quel PC Ubuntu :
   ```
   ~/Applications/
   ├── dev-journal-tauri.AppImage  # ← Application
   └── .env                        # ← Configuration
   ```

5. **Sur le PC cible** :
   ```bash
   chmod +x dev-journal-tauri.AppImage
   cp .env.example .env
   # Éditer .env avec vos credentials
   ./dev-journal-tauri.AppImage
   ```

#### Distribution avec Installeur
Pour une installation plus propre :
1. Buildez avec `npm run tauri build`
2. Distribuez le fichier `.deb` : `dpkg -i dev-journal-tauri_1.0.0_amd64.deb`
3. L'application sera installée dans `/usr/bin/`
4. Créez `/usr/bin/.env` ou utilisez les variables d'environnement système

### Tests
```bash
npm test
```

## 📖 Guide d'utilisation

### 1. Onglet Journal
- **Saisie d'entrées** : Utilisez le formulaire pour créer de nouvelles entrées
- **Sélection de date** : Naviguez entre les différentes dates
- **Édition** : Cliquez sur "Éditer" pour modifier une entrée existante
- **Projets et tags** : Sélectionnez depuis les listes configurées en admin

### 2. Onglet Jira (si configuré)
- **Requête JQL** : Saisissez votre requête Jira Query Language
- **Sélection de tickets** : Cochez les tickets à associer à vos entrées de journal
- **Persistance intelligente** : Les tickets sélectionnés restent visibles même s'ils n'apparaissent plus dans la requête JQL actuelle
- **Exemples de requêtes** :
  - `project = "MON_PROJET"`
  - `assignee = currentUser() AND status != Done`
  - `created >= -7d`

### 3. Onglet Administration
- **Projets** : Créez, modifiez et gérez vos projets
- **Tags** : Gérez vos étiquettes avec couleurs personnalisées
- **Couleurs** : Sélecteur de couleurs intégré pour l'organisation visuelle

### 4. Onglet Analytics
- **Génération de rapports** : Sélectionnez une période et générez votre rapport
- **Visualisations** : Graphiques de répartition par projet et tags
- **Export** : Téléchargez vos rapports au format JSON

## 🏗️ Architecture

```
src/
├── components/           # Composants React
│   ├── JournalEntryForm.tsx
│   ├── JournalEntriesList.tsx
│   ├── ProjectModal.tsx
│   └── TagModal.tsx
├── App.tsx              # Composant principal
├── App.css              # Styles globaux
└── main.tsx             # Point d'entrée React

src-tauri/src/
├── database.rs          # Structures de données
├── file_manager.rs      # Gestion des fichiers journal
├── jira.rs              # Client Jira
├── lib.rs               # Commandes Tauri principales
└── main.rs              # Point d'entrée Rust
```

## 📁 Structure des Données

### Fichiers Journal
Les entrées sont stockées dans des fichiers Markdown dans `~/Documents/DevJournal/` :
```
DevJournal/
├── 2024-01-15.md
├── 2024-01-16.md
└── ...
```

### Format des Entrées
```markdown
## 14:30 - Développement - Mon Projet (2h30)

**Description :** Implémentation de la nouvelle fonctionnalité

**Résultats :** 
- API REST créée
- Tests unitaires ajoutés

**Blocages :** Problème de CORS à résoudre

**Tags :** #backend #api

**Tickets Jira :** PROJ-123, PROJ-124

**Réflexions :** Architecture à revoir pour optimiser les performances
```

## 🎨 Personnalisation

### Thèmes et Couleurs
L'application utilise un design glassmorphism avec des dégradés personnalisables. Les couleurs principales peuvent être modifiées dans `src/App.css`.

### Extension
- **Nouvelles commandes Tauri** : Ajoutez vos commandes dans `src-tauri/src/lib.rs`
- **Nouveaux composants** : Créez vos composants React dans `src/components/`
- **Nouveaux modules Rust** : Ajoutez vos modules dans `src-tauri/src/`

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de compilation Rust**
   ```bash
   cargo clean
   npm run tauri dev
   ```

2. **Erreurs TypeScript lors du build**
   ```bash
   # Vérifier les types
   npm run build
   # Si erreur, corriger les imports React non utilisés
   ```

3. **Problème de connexion Jira en développement**
   - Vérifiez vos variables d'environnement dans `.env`
   - Testez votre token d'API sur https://id.atlassian.com/
   - Vérifiez que votre instance Jira est accessible

4. **Problème de connexion Jira en production**
   - Vérifiez que le fichier `.env` est bien à côté de l'exécutable
   - Vérifiez les permissions de lecture du fichier `.env`
   - Testez avec des variables d'environnement système
   - En cas de doute, l'application affiche des logs de debug dans la console

5. **Fichiers journal non trouvés**
   - Le dossier `~/Documents/DevJournal/` sera créé automatiquement
   - Vérifiez les permissions d'écriture
   - Sur Linux, vérifiez `~/Documents/DevJournal/`
   - Sur Windows, vérifiez `%USERPROFILE%\Documents\DevJournal\`

6. **Date picker reste ouvert**
   - Appuyez sur `Entrée` ou `Échap` pour fermer
   - Cliquez en dehors du calendrier
   - Le calendrier se ferme automatiquement après sélection

7. **Application ne démarre pas**
   - Vérifiez que vous avez les bonnes permissions d'exécution
   - Sur Linux : `chmod +x dev-journal-tauri.AppImage`
   - **Dépendances Ubuntu** : L'AppImage est autonome, aucune dépendance supplémentaire requise
   - **Dépendances minimales** : glibc 2.31+ (Ubuntu 20.04+)

8. **Distribution sur autre PC Ubuntu**
   - ✅ **AppImage** : Copier-coller direct, aucune installation requise
   - ✅ **Fichier .env** : Même format, même fonctionnement
   - ✅ **Dossier journal** : Créé automatiquement dans `~/Documents/DevJournal/`
   - ✅ **Pas de Node.js/Rust** requis sur le PC cible

## 🤝 Contribution

1. Fork le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔧 Technologies Utilisées

- **Frontend** : React 18, TypeScript, CSS3
- **Backend** : Rust, Tauri 2.0
- **Persistance** : Fichiers Markdown, JSON Store
- **HTTP** : Reqwest (Rust), Fetch API (JavaScript)
- **UI/UX** : Design Glassmorphism, Animations CSS
- **Intégrations** : Jira REST API v3

## 📞 Support

Pour le support technique :
- 📧 Email : [votre-email]
- 🐛 Issues : [GitHub Issues]
- 📖 Documentation : [Documentation complète]

---

**Note** : Cette application a été migrée d'Electron vers Tauri pour de meilleures performances et une empreinte mémoire réduite, tout en conservant toutes les fonctionnalités originales.