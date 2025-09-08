mod database;
mod jira;
mod file_manager;

use std::sync::Mutex;
use tauri::{Manager, State};

use crate::database::{Project, Tag};
use crate::jira::{JiraClient, JiraTicket};
use crate::file_manager::{JournalEntry, ParsedJournalEntry, save_journal_entry, load_journal_file, get_available_journal_dates, parse_journal_entries, update_journal_entry, delete_journal_entry};
use std::collections::HashMap;

// État global pour le client Jira et la liste des tickets disponibles
struct AppState {
    jira_client: Mutex<Option<JiraClient>>,
    available_tickets: Mutex<Vec<JiraTicket>>,
}

// === COMMANDES POUR LE JOURNAL ===

#[tauri::command]
async fn save_journal_entry_cmd(date: String, entry: JournalEntry) -> Result<(), String> {
    save_journal_entry(&date, entry).map_err(|e| e.to_string())
}

#[tauri::command]
async fn load_journal_file_cmd(date: String) -> Result<String, String> {
    load_journal_file(&date).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_journal_dates() -> Result<Vec<String>, String> {
    get_available_journal_dates().map_err(|e| e.to_string())
}

#[tauri::command]
async fn parse_journal_entries_cmd(date: String) -> Result<Vec<ParsedJournalEntry>, String> {
    let content = load_journal_file(&date).map_err(|e| e.to_string())?;
    Ok(parse_journal_entries(&content))
}

#[tauri::command]
async fn update_journal_entry_cmd(
    date: String, 
    entry_index: usize, 
    updated_entry: ParsedJournalEntry
) -> Result<bool, String> {
    update_journal_entry(&date, entry_index, &updated_entry).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_journal_entry_cmd(date: String, entry_index: usize) -> Result<bool, String> {
    delete_journal_entry(&date, entry_index).map_err(|e| e.to_string())
}

// === COMMANDES POUR JIRA ===

#[tauri::command]
async fn initialize_jira(
    state: State<'_, AppState>,
    base_url: String,
    email: String,
    api_token: String,
) -> Result<(), String> {
    println!("Manually initializing Jira with: base_url='{}', email='{}', token='{}'", 
        base_url, 
        email, 
        if api_token.is_empty() { "empty" } else { "***set***" }
    );
    let client = JiraClient::new(base_url, email, api_token);
    let mut jira_client = state.jira_client.lock().unwrap();
    *jira_client = Some(client);
    Ok(())
}

#[tauri::command]
async fn test_jira_connection(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let client_option = {
        let jira_client = state.jira_client.lock().unwrap();
        jira_client.clone()
    };
    
    match client_option {
        Some(client) => {
            // Test avec une requête simple
            match client.search_tickets("ORDER BY created DESC").await {
                Ok(tickets) => Ok(format!("Connexion réussie ! Trouvé {} tickets.", tickets.len())),
                Err(e) => Err(format!("Erreur de connexion: {}", e))
            }
        }
        None => Err("Client Jira non initialisé".to_string())
    }
}

#[tauri::command]
async fn fetch_jira_tickets(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<JiraTicket>, String> {
    // Clone the client instead of keeping the lock across await
    let client_option = {
        let jira_client = state.jira_client.lock().unwrap();
        jira_client.clone()
    };
    
    let tickets = match client_option {
        Some(client) => {
            client.search_tickets(&query).await.map_err(|e| e.to_string())?
        }
        None => {
            // Client pas initialisé, utiliser un client mock
            let mock_client = JiraClient::new("".to_string(), "".to_string(), "".to_string());
            mock_client.search_tickets(&query).await.map_err(|e| e.to_string())?
        }
    };
    
    // Mettre à jour la liste des tickets disponibles
    {
        let mut available_tickets = state.available_tickets.lock().unwrap();
        *available_tickets = tickets.clone();
    }
    
    Ok(tickets)
}

#[tauri::command]
async fn get_available_tickets_for_entry(
    state: State<'_, AppState>,
    selected_ticket_keys: Vec<String>,
) -> Result<Vec<JiraTicketForEntry>, String> {
    let available_tickets = {
        let tickets = state.available_tickets.lock().unwrap();
        tickets.clone()
    };
    
    let mut result = Vec::new();
    
    // Ajouter d'abord les tickets disponibles dans la requête actuelle
    for ticket in &available_tickets {
        result.push(JiraTicketForEntry {
            key: ticket.key.clone(),
            summary: ticket.fields.summary.clone(),
            status: ticket.fields.status.name.clone(),
            is_selected: selected_ticket_keys.contains(&ticket.key),
            is_available: true,
        });
    }
    
    // Ajouter ensuite les tickets sélectionnés qui ne sont pas dans la liste actuelle
    for selected_key in &selected_ticket_keys {
        if !available_tickets.iter().any(|t| &t.key == selected_key) {
            result.push(JiraTicketForEntry {
                key: selected_key.clone(),
                summary: "Ticket non trouvé dans la requête actuelle".to_string(),
                status: "Inconnu".to_string(),
                is_selected: true,
                is_available: false,
            });
        }
    }
    
    Ok(result)
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct JiraTicketForEntry {
    pub key: String,
    pub summary: String,
    pub status: String,
    pub is_selected: bool,
    pub is_available: bool,
}

// === COMMANDES POUR LES PROJETS ===

#[tauri::command]
async fn get_all_projects(
    app: tauri::AppHandle,
    include_inactive: Option<bool>,
) -> Result<Vec<Project>, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("projects.json").map_err(|e| e.to_string())?;
    
    // Charger les projets ou créer des projets par défaut
    let mut projects: Vec<Project> = match store.get("projects") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_else(|_| {
            // Projets par défaut
            vec![
                Project {
                    id: Some(1),
                    name: "Mandate".to_string(),
                    description: Some("Gestion de mandats CSE".to_string()),
                    color: "#28a745".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Project {
                    id: Some(2),
                    name: "Instance".to_string(),
                    description: Some("Gestion des réunions".to_string()),
                    color: "#007bff".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Project {
                    id: Some(3),
                    name: "Claims".to_string(),
                    description: Some("Gestion des réclamations".to_string()),
                    color: "#ffc107".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
            ]
        }),
        None => {
            // Créer et sauvegarder les projets par défaut
            let default_projects = vec![
                Project {
                    id: Some(1),
                    name: "Mandate".to_string(),
                    description: Some("Gestion de mandats CSE".to_string()),
                    color: "#28a745".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Project {
                    id: Some(2),
                    name: "Instance".to_string(),
                    description: Some("Gestion des réunions".to_string()),
                    color: "#007bff".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Project {
                    id: Some(3),
                    name: "Claims".to_string(),
                    description: Some("Gestion des réclamations".to_string()),
                    color: "#ffc107".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
            ];
            store.set("projects", serde_json::to_value(&default_projects).unwrap());
            store.save().map_err(|e| e.to_string())?;
            default_projects
        }
    };
    
    let include_inactive = include_inactive.unwrap_or(false);
    if !include_inactive {
        projects.retain(|p| p.active);
    }
    
    Ok(projects)
}

#[tauri::command]
async fn create_project(
    app: tauri::AppHandle,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<Project, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("projects.json").map_err(|e| e.to_string())?;
    
    // Charger les projets existants
    let mut projects: Vec<Project> = match store.get("projects") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver le prochain ID
    let next_id = projects.iter().map(|p| p.id.unwrap_or(0)).max().unwrap_or(0) + 1;
    
    let new_project = Project {
        id: Some(next_id),
        name,
        description,
        color: color.unwrap_or("#007bff".to_string()),
        active: true,
        created_at: None,
        updated_at: None,
    };
    
    // Ajouter le nouveau projet
    projects.push(new_project.clone());
    
    // Sauvegarder
    store.set("projects", serde_json::to_value(&projects).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    
    Ok(new_project)
}

#[tauri::command]
async fn update_project(
    app: tauri::AppHandle,
    id: i64,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("projects.json").map_err(|e| e.to_string())?;
    
    // Charger les projets existants
    let mut projects: Vec<Project> = match store.get("projects") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver et mettre à jour le projet
    if let Some(project) = projects.iter_mut().find(|p| p.id == Some(id)) {
        project.name = name;
        project.description = description;
        if let Some(color) = color {
            project.color = color;
        }
        project.updated_at = Some((std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64).to_string());

        // Sauvegarder
        store.set("projects", serde_json::to_value(&projects).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Projet non trouvé".to_string())
    }
}

#[tauri::command]
async fn delete_project(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("projects.json").map_err(|e| e.to_string())?;
    
    // Charger les projets existants
    let mut projects: Vec<Project> = match store.get("projects") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Supprimer le projet
    let initial_len = projects.len();
    projects.retain(|p| p.id != Some(id));
    
    if projects.len() < initial_len {
        // Sauvegarder
        store.set("projects", serde_json::to_value(&projects).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Projet non trouvé".to_string())
    }
}

#[tauri::command]
async fn toggle_project_status(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("projects.json").map_err(|e| e.to_string())?;
    
    // Charger les projets existants
    let mut projects: Vec<Project> = match store.get("projects") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver et basculer le statut du projet
    if let Some(project) = projects.iter_mut().find(|p| p.id == Some(id)) {
        project.active = !project.active;
        project.updated_at = Some((std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64).to_string());

        // Sauvegarder
        store.set("projects", serde_json::to_value(&projects).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Projet non trouvé".to_string())
    }
}

// === COMMANDES POUR LES TAGS ===

#[tauri::command]
async fn get_all_tags(
    app: tauri::AppHandle,
    include_inactive: Option<bool>,
) -> Result<Vec<Tag>, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("tags.json").map_err(|e| e.to_string())?;
    
    // Charger les tags ou créer des tags par défaut
    let mut tags: Vec<Tag> = match store.get("tags") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_else(|_| {
            // Tags par défaut
            vec![
                Tag {
                    id: Some(1),
                    name: "bug".to_string(),
                    description: Some("Correction de bugs".to_string()),
                    color: "#dc3545".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Tag {
                    id: Some(2),
                    name: "feature".to_string(),
                    description: Some("Nouvelle fonctionnalité".to_string()),
                    color: "#28a745".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Tag {
                    id: Some(3),
                    name: "documentation".to_string(),
                    description: Some("Documentation".to_string()),
                    color: "#17a2b8".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
            ]
        }),
        None => {
            // Créer et sauvegarder les tags par défaut
            let default_tags = vec![
                Tag {
                    id: Some(1),
                    name: "bug".to_string(),
                    description: Some("Correction de bugs".to_string()),
                    color: "#dc3545".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Tag {
                    id: Some(2),
                    name: "feature".to_string(),
                    description: Some("Nouvelle fonctionnalité".to_string()),
                    color: "#28a745".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
                Tag {
                    id: Some(3),
                    name: "documentation".to_string(),
                    description: Some("Documentation".to_string()),
                    color: "#17a2b8".to_string(),
                    active: true,
                    created_at: None,
                    updated_at: None,
                },
            ];
            store.set("tags", serde_json::to_value(&default_tags).unwrap());
            store.save().map_err(|e| e.to_string())?;
            default_tags
        }
    };
    
    let include_inactive = include_inactive.unwrap_or(false);
    if !include_inactive {
        tags.retain(|t| t.active);
    }
    
    Ok(tags)
}

#[tauri::command]
async fn create_tag(
    app: tauri::AppHandle,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<Tag, String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("tags.json").map_err(|e| e.to_string())?;
    
    // Charger les tags existants
    let mut tags: Vec<Tag> = match store.get("tags") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver le prochain ID
    let next_id = tags.iter().map(|t| t.id.unwrap_or(0)).max().unwrap_or(0) + 1;
    
    let new_tag = Tag {
        id: Some(next_id),
        name,
        description,
        color: color.unwrap_or("#6c757d".to_string()),
        active: true,
        created_at: None,
        updated_at: None,
    };
    
    // Ajouter le nouveau tag
    tags.push(new_tag.clone());
    
    // Sauvegarder
    store.set("tags", serde_json::to_value(&tags).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    
    Ok(new_tag)
}

#[tauri::command]
async fn update_tag(
    app: tauri::AppHandle,
    id: i64,
    name: String,
    description: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("tags.json").map_err(|e| e.to_string())?;
    
    // Charger les tags existants
    let mut tags: Vec<Tag> = match store.get("tags") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver et mettre à jour le tag
    if let Some(tag) = tags.iter_mut().find(|t| t.id == Some(id)) {
        tag.name = name;
        tag.description = description;
        if let Some(color) = color {
            tag.color = color;
        }
        tag.updated_at = Some((std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64).to_string());

        // Sauvegarder
        store.set("tags", serde_json::to_value(&tags).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Tag non trouvé".to_string())
    }
}

#[tauri::command]
async fn delete_tag(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("tags.json").map_err(|e| e.to_string())?;
    
    // Charger les tags existants
    let mut tags: Vec<Tag> = match store.get("tags") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Supprimer le tag
    let initial_len = tags.len();
    tags.retain(|t| t.id != Some(id));
    
    if tags.len() < initial_len {
        // Sauvegarder
        store.set("tags", serde_json::to_value(&tags).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Tag non trouvé".to_string())
    }
}

#[tauri::command]
async fn toggle_tag_status(
    app: tauri::AppHandle,
    id: i64
) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;
    let store = app.store("tags.json").map_err(|e| e.to_string())?;
    
    // Charger les tags existants
    let mut tags: Vec<Tag> = match store.get("tags") {
        Some(value) => serde_json::from_value(value.clone()).unwrap_or_default(),
        None => Vec::new(),
    };
    
    // Trouver et basculer le statut du tag
    if let Some(tag) = tags.iter_mut().find(|t| t.id == Some(id)) {
        tag.active = !tag.active;
        tag.updated_at = Some((std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64).to_string());

        // Sauvegarder
        store.set("tags", serde_json::to_value(&tags).map_err(|e| e.to_string())?);
        store.save().map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Tag non trouvé".to_string())
    }
}

// === COMMANDES POUR LES RAPPORTS D'ACTIVITÉ ===

#[derive(Debug, serde::Serialize)]
struct ActivityReport {
    period_start: String,
    period_end: String,
    total_entries: usize,
    total_hours: f64,
    projects_summary: Vec<ProjectSummary>,
    tags_summary: Vec<TagSummary>,
    activity_types: HashMap<String, usize>,
    daily_breakdown: HashMap<String, f64>,
}

#[derive(Debug, serde::Serialize)]
struct ProjectSummary {
    name: String,
    entries: usize,
    hours: f64,
    color: String,
}

#[derive(Debug, serde::Serialize)]
struct TagSummary {
    name: String,
    count: usize,
    color: String,
}

#[tauri::command]
async fn generate_activity_report(
    start_date: String,
    end_date: String,
) -> Result<ActivityReport, String> {
    let dates = get_available_journal_dates().map_err(|e| e.to_string())?;
    
    // Filtrer les dates dans la plage
    let filtered_dates: Vec<String> = dates
        .into_iter()
        .filter(|date| date >= &start_date && date <= &end_date)
        .collect();
    
    let mut all_entries = Vec::new();
    
    // Charger toutes les entrées de la période
    for date in &filtered_dates {
        match load_journal_file(date) {
            Ok(content) => {
                if !content.is_empty() {
                    let entries = parse_journal_entries(&content);
                    for mut entry in entries {
                        entry.timestamp = format!("{} {}", date, entry.timestamp);
                        all_entries.push(entry);
                    }
                }
            }
            Err(_) => continue,
        }
    }
    
    // Calculer les statistiques
    let total_entries = all_entries.len();
    let mut total_hours = 0.0;
    let mut projects_map: HashMap<String, (usize, f64, String)> = HashMap::new();
    let mut tags_map: HashMap<String, usize> = HashMap::new();
    let mut activity_types: HashMap<String, usize> = HashMap::new();
    let mut daily_breakdown: HashMap<String, f64> = HashMap::new();
    
    for entry in &all_entries {
        // Parseage de la durée (format "3h", "2h30", "1.5h")
        let hours = parse_duration(&entry.duration);
        total_hours += hours;
        
        // Projets
        let project_entry = projects_map.entry(entry.project.clone()).or_insert((0, 0.0, "#007bff".to_string()));
        project_entry.0 += 1;
        project_entry.1 += hours;
        
        // Tags
        for tag in &entry.tags {
            *tags_map.entry(tag.clone()).or_insert(0) += 1;
        }
        
        // Types d'activité
        *activity_types.entry(entry.entry_type.clone()).or_insert(0) += 1;
        
        // Décomposition par jour
        let date = entry.timestamp.split(' ').next().unwrap_or("").to_string();
        *daily_breakdown.entry(date).or_insert(0.0) += hours;
    }
    
    // Convertir en structures de résultat
    let projects_summary: Vec<ProjectSummary> = projects_map
        .into_iter()
        .map(|(name, (entries, hours, color))| ProjectSummary {
            name,
            entries,
            hours,
            color,
        })
        .collect();
    
    let tags_summary: Vec<TagSummary> = tags_map
        .into_iter()
        .map(|(name, count)| TagSummary {
            name,
            count,
            color: "#6c757d".to_string(), // Couleur par défaut
        })
        .collect();
    
    Ok(ActivityReport {
        period_start: start_date,
        period_end: end_date,
        total_entries,
        total_hours,
        projects_summary,
        tags_summary,
        activity_types,
        daily_breakdown,
    })
}

fn parse_duration(duration: &str) -> f64 {
    let duration = duration.trim().to_lowercase();
    
    if let Some(hours_str) = duration.strip_suffix('h') {
        // Format "3h" ou "2.5h"
        hours_str.parse::<f64>().unwrap_or(0.0)
    } else if duration.contains("h") {
        // Format "2h30" -> 2.5h
        if let Some((hours, minutes)) = duration.split_once('h') {
            let h = hours.parse::<f64>().unwrap_or(0.0);
            let m = minutes.parse::<f64>().unwrap_or(0.0) / 60.0;
            h + m
        } else {
            0.0
        }
    } else {
        // Essayer de parser directement comme nombre
        duration.parse::<f64>().unwrap_or(0.0)
    }
}

// === COMMANDES POUR LES PRÉFÉRENCES (Version simple avec Store temporaire) ===

use tauri_plugin_store::StoreExt;

#[tauri::command]
async fn get_preference(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    match store.get(&key) {
        Some(value) => {
            if let Some(s) = value.as_str() {
                Ok(Some(s.to_string()))
            } else {
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

#[tauri::command]
async fn set_preference(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), String> {
    let store = app.store("store.json").map_err(|e| e.to_string())?;
    store.set(&key, serde_json::Value::String(value));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            jira_client: Mutex::new(None),
            available_tickets: Mutex::new(Vec::new()),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            save_journal_entry_cmd,
            load_journal_file_cmd,
            get_journal_dates,
            parse_journal_entries_cmd,
            update_journal_entry_cmd,
            delete_journal_entry_cmd,
            initialize_jira,
            test_jira_connection,
            fetch_jira_tickets,
            get_available_tickets_for_entry,
            get_all_projects,
            create_project,
            update_project,
            delete_project,
            toggle_project_status,
            get_all_tags,
            create_tag,
            update_tag,
            delete_tag,
            toggle_tag_status,
            get_preference,
            set_preference,
            generate_activity_report
        ])
        .setup(|app| {
            // Charger le fichier .env s'il existe
            if let Err(_) = dotenv::dotenv() {
                println!("No .env file found, using system environment variables");
            }
            
            // Initialiser Jira avec les variables d'environnement au démarrage
            let base_url = std::env::var("JIRA_BASE_URL").unwrap_or_default();
            let email = std::env::var("JIRA_EMAIL").unwrap_or_default();
            let api_token = std::env::var("JIRA_API_TOKEN").unwrap_or_default();
            
            println!("Setup: Loading Jira config - base_url='{}', email='{}', token='{}'", 
                base_url, 
                email, 
                if api_token.is_empty() { "empty" } else { "***set***" }
            );
            
            if !base_url.is_empty() && !email.is_empty() && !api_token.is_empty() {
                let state = app.state::<AppState>();
                let client = JiraClient::new(base_url, email, api_token);
                let mut jira_client = state.jira_client.lock().unwrap();
                *jira_client = Some(client);
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
