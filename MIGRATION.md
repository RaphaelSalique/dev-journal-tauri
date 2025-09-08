# Migration Electron vers Tauri

## Résumé de la migration

Ce document décrit la migration du projet **dev-journal-electron** vers **Tauri**.

## Changements principaux

### 1. Structure du projet

- **Avant (Electron)**: 
  - Processus principal en Node.js (`src/main/main.js`)
  - Frontend React dans `src/renderer/`
  - Base de données SQLite avec `better-sqlite3`

- **Après (Tauri)**:
  - Backend en Rust (`src-tauri/src/`)
  - Frontend React dans `src/`
  - Store JSON pour les préférences (simplifié)

### 2. Dépendances migrées

| Electron | Tauri | Status |
|----------|-------|---------|
| `electron` | `tauri` | ✅ Migré |
| `better-sqlite3` | `tauri-plugin-store` | ⚠️ Simplifié |
| `electron-store` | `tauri-plugin-store` | ✅ Migré |
| `axios` | `reqwest` (Rust) | ✅ Migré |
| `node-notifier` | `tauri-plugin-notification` | ✅ Configuré |
| `docx`, `pdf-lib` | - | ❌ Non migré |

### 3. Fonctionnalités implémentées

#### ✅ Fonctionnalités migrées
- Interface React pour le journal
- Sauvegarde/chargement des entrées journal (fichiers Markdown)
- Intégration Jira avec mode mock
- Stockage des préférences utilisateur
- Gestion des dates de journal

#### ⚠️ Fonctionnalités simplifiées
- Base de données : Store JSON au lieu de SQLite
- Projets et tags : Non migrés (étaient en base)

#### ❌ Fonctionnalités non migrées
- Export PDF/DOCX
- Analytics et rapports
- Gestion avancée des projets/tags via base de données

### 4. Commandes Tauri disponibles

```rust
// Journal
save_journal_entry_cmd(date, entry)
load_journal_file_cmd(date)
get_journal_dates()

// Jira
initialize_jira(base_url, email, api_token)
fetch_jira_tickets(query)

// Préférences
get_preference(key)
set_preference(key, value)
```

### 5. Configuration requise

#### Variables d'environnement
Créer un fichier `.env` à la racine :
```bash
JIRA_BASE_URL=https://your-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

#### Dépendances système
- Rust (https://rustup.rs/)
- Node.js 18+ (pour Vite 5.x)

## Utilisation

### Développement
```bash
cd dev-journal-tauri
npm install
npm run tauri dev
```

### Build de production
```bash
npm run tauri build
```

## Notes techniques

### Sérialisation des données
- Les données sont maintenant stockées en JSON via `tauri-plugin-store`
- Les entrées journal sont sauvées en fichiers Markdown
- Les préférences sont gérées par le store Tauri

### Performance
- Tauri génère des binaires plus petits qu'Electron
- Moins d'usage mémoire (pas de runtime Chrome)
- Temps de démarrage plus rapide

### Sécurité
- Communications IPC sécurisées via Tauri
- Pas d'accès Node.js depuis le frontend
- Surface d'attaque réduite

## Améliorations futures

1. **Restaurer la base de données SQLite** avec `tauri-plugin-sql`
2. **Réimplémenter l'export PDF/DOCX** côté frontend ou avec des crates Rust
3. **Ajouter les analytics** avec des bibliothèques Rust
4. **Optimiser l'interface utilisateur** avec des composants modernes
5. **Ajouter des notifications desktop** avec `tauri-plugin-notification`

## Avantages de la migration

- ✅ **Performance**: Binaires plus légers et rapides
- ✅ **Sécurité**: Modèle de sécurité plus strict
- ✅ **Maintenance**: Écosystème Rust moderne
- ✅ **Distribution**: Pas de runtime externe requis
- ✅ **Multi-plateforme**: Support natif Linux/Windows/macOS