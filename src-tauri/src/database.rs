use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserPreference {
    pub id: Option<i64>,
    pub key: String,
    pub value: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    color TEXT DEFAULT '#007bff',
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    color TEXT DEFAULT '#6c757d',
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
                AFTER UPDATE ON projects
                BEGIN
                    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;

                CREATE TRIGGER IF NOT EXISTS update_tags_timestamp 
                AFTER UPDATE ON tags
                BEGIN
                    UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;

                CREATE TRIGGER IF NOT EXISTS update_preferences_timestamp 
                AFTER UPDATE ON user_preferences
                BEGIN
                    UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_default_data",
            sql: r#"
                INSERT OR IGNORE INTO projects (name, description, color) VALUES
                ('Mandate', 'Gestion de mandats CSE', '#28a745'),
                ('Instance', 'Gestion des réunions', '#007bff'),
                ('Claims', 'Gestion des réclamations', '#ffc107'),
                ('Negociation', 'Module négociations', '#17a2b8'),
                ('Socle', 'Infrastructure technique', '#6c757d'),
                ('Formation', 'Temps de formation et veille', '#e83e8c'),
                ('Maintenance', 'Maintenance et corrections', '#fd7e14');

                INSERT OR IGNORE INTO tags (name, description, color) VALUES
                ('bug', 'Correction de bugs', '#dc3545'),
                ('feature', 'Nouvelle fonctionnalité', '#28a745'),
                ('refactor', 'Refactoring de code', '#6f42c1'),
                ('test', 'Tests et QA', '#20c997'),
                ('documentation', 'Documentation', '#0dcaf0'),
                ('release', 'Préparation de release', '#fd7e14'),
                ('meeting', 'Réunions et discussions', '#6c757d'),
                ('review', 'Code review', '#e83e8c'),
                ('performance', 'Optimisation performance', '#ffc107'),
                ('security', 'Sécurité', '#dc3545'),
                ('deployment', 'Déploiement', '#198754'),
                ('research', 'Recherche et POC', '#0d6efd'),
                ('maintenance', 'Maintenance technique', '#fd7e14'),
                ('support', 'Support utilisateur', '#6610f2'),
                ('planning', 'Planification et estimation', '#6f42c1');
            "#,
            kind: MigrationKind::Up,
        },
    ]
}