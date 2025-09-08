use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize)]
pub struct JournalEntry {
    pub date: String,
    pub time_range: String,
    pub project: String,
    pub entry_type: String,
    pub description: String,
    pub duration: String,
    pub results: String,
    pub blockers: String,
    pub links: Vec<Link>,
    pub tags: Vec<String>,
    pub reflections: String,
    pub jira_tickets: Vec<JiraTicketRef>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Link {
    pub text: String,
    pub url: String,
}

pub fn get_journal_dir() -> Result<PathBuf> {
    let home_dir = dirs::home_dir().ok_or_else(|| anyhow::anyhow!("Impossible de trouver le répertoire home"))?;
    let journal_dir = home_dir.join("Documents").join("DevJournal");
    
    if !journal_dir.exists() {
        fs::create_dir_all(&journal_dir)?;
    }
    
    Ok(journal_dir)
}

pub fn save_journal_entry(date: &str, entry: JournalEntry) -> Result<()> {
    let journal_dir = get_journal_dir()?;
    let file_path = journal_dir.join(format!("{}.md", date));
    
    let content = format_entry_as_markdown(&entry);
    
    if file_path.exists() {
        // Append to existing file
        let mut existing_content = fs::read_to_string(&file_path)?;
        existing_content.push_str("\n\n---\n\n");
        existing_content.push_str(&content);
        fs::write(&file_path, existing_content)?;
    } else {
        // Create new file
        fs::write(&file_path, content)?;
    }
    
    Ok(())
}

pub fn load_journal_file(date: &str) -> Result<String> {
    let journal_dir = get_journal_dir()?;
    let file_path = journal_dir.join(format!("{}.md", date));
    
    if file_path.exists() {
        Ok(fs::read_to_string(file_path)?)
    } else {
        Ok(String::new())
    }
}

pub fn get_available_journal_dates() -> Result<Vec<String>> {
    let journal_dir = get_journal_dir()?;
    
    if !journal_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut dates = Vec::new();
    
    for entry in fs::read_dir(journal_dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if let Some(extension) = path.extension() {
            if extension == "md" {
                if let Some(file_stem) = path.file_stem() {
                    if let Some(date_str) = file_stem.to_str() {
                        // Valider que c'est un format de date
                        if date_str.len() == 10 && date_str.matches('-').count() == 2 {
                            dates.push(date_str.to_string());
                        }
                    }
                }
            }
        }
    }
    
    dates.sort();
    dates.reverse(); // Plus récent en premier
    Ok(dates)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedJournalEntry {
    pub timestamp: String,
    pub project: String,
    pub description: String,
    pub duration: String,
    pub tags: Vec<String>,
    pub time_range: String,
    pub entry_type: String,
    pub results: String,
    pub blockers: String,
    pub links: Vec<Link>,
    pub reflections: String,
    pub jira_tickets: Vec<JiraTicketRef>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraTicketRef {
    pub key: String,
    pub summary: Option<String>,
}

// Parse les entrées d'un fichier journal 
pub fn parse_journal_entries(content: &str) -> Vec<ParsedJournalEntry> {
    if content.is_empty() {
        return vec![];
    }
    
    let mut entries = Vec::new();
    let sections: Vec<&str> = content.split("## ").collect();
    
    for section in sections {
        if section.trim().is_empty() {
            continue;
        }
        
        let lines: Vec<&str> = section.lines().collect();
        if lines.is_empty() {
            continue;
        }
        
        let timestamp = lines[0].trim().to_string();
        if timestamp.is_empty() {
            continue;
        }
        
        let mut entry = ParsedJournalEntry {
            timestamp,
            project: String::new(),
            description: String::new(),
            duration: "0".to_string(),
            tags: Vec::new(),
            time_range: String::new(),
            entry_type: "développement".to_string(),
            results: String::new(),
            blockers: String::new(),
            links: Vec::new(),
            reflections: String::new(),
            jira_tickets: Vec::new(),
        };
        
        let mut i = 1;
        while i < lines.len() {
            let line = lines[i].trim();
            
            if line.starts_with("**Projet**:") {
                entry.project = line.replace("**Projet**:", "").trim().to_string();
            } else if line.starts_with("**Description**:") {
                let mut description = line.replace("**Description**:", "").trim().to_string();
                i += 1;
                while i < lines.len() && !lines[i].starts_with("**") {
                    if !lines[i].trim().is_empty() {
                        if !description.is_empty() {
                            description.push('\n');
                        }
                        description.push_str(lines[i]);
                    }
                    i += 1;
                }
                entry.description = description;
                continue;
            } else if line.starts_with("**Durée**:") {
                entry.duration = line.replace("**Durée**:", "").replace("minutes", "").trim().to_string();
            } else if line.starts_with("**Tags**:") {
                let tags_replaced = line.replace("**Tags**:", "");
                let tags_str = tags_replaced.trim();
                entry.tags = if tags_str == "Aucun" || tags_str.is_empty() {
                    Vec::new()
                } else {
                    tags_str.split_whitespace()
                        .map(|tag| tag.replace('#', ""))
                        .filter(|tag| !tag.is_empty())
                        .collect()
                };
            } else if line.starts_with("**Plage horaire**:") {
                entry.time_range = line.replace("**Plage horaire**:", "").trim().to_string();
            } else if line.starts_with("**Type d'activité**:") {
                entry.entry_type = line.replace("**Type d'activité**:", "").trim().to_string();
            } else if line.starts_with("**Résultats**:") {
                let mut results = line.replace("**Résultats**:", "").trim().to_string();
                i += 1;
                while i < lines.len() && !lines[i].starts_with("**") {
                    if !lines[i].trim().is_empty() {
                        if !results.is_empty() {
                            results.push('\n');
                        }
                        results.push_str(lines[i]);
                    }
                    i += 1;
                }
                entry.results = results;
                continue;
            } else if line.starts_with("**Blocages**:") {
                let mut blockers = line.replace("**Blocages**:", "").trim().to_string();
                i += 1;
                while i < lines.len() && !lines[i].starts_with("**") {
                    if !lines[i].trim().is_empty() {
                        if !blockers.is_empty() {
                            blockers.push('\n');
                        }
                        blockers.push_str(lines[i]);
                    }
                    i += 1;
                }
                entry.blockers = blockers;
                continue;
            } else if line.starts_with("**Réflexions**:") {
                let mut reflections = line.replace("**Réflexions**:", "").trim().to_string();
                i += 1;
                while i < lines.len() && !lines[i].starts_with("**") {
                    if !lines[i].trim().is_empty() {
                        if !reflections.is_empty() {
                            reflections.push('\n');
                        }
                        reflections.push_str(lines[i]);
                    }
                    i += 1;
                }
                entry.reflections = reflections;
                continue;
            } else if line.starts_with("**Liens**:") {
                let line_replaced = line.replace("**Liens**:", "");
                let links_str = line_replaced.trim();
                if !links_str.is_empty() && links_str != "Aucun" {
                    // Parse d'abord les tickets Jira [TICKET](URL)
                    let jira_regex = regex::Regex::new(r"\[([A-Z]+-\d+)\]\([^)]*browse/([^)]+)\)").unwrap();
                    for cap in jira_regex.captures_iter(links_str) {
                        if let Some(key) = cap.get(1) {
                            entry.jira_tickets.push(JiraTicketRef {
                                key: key.as_str().to_string(),
                                summary: None,
                            });
                        }
                    }
                    
                    // Parse les autres liens markdown [text](url)
                    let link_regex = regex::Regex::new(r"\[([^\]]+)\]\(([^)]+)\)").unwrap();
                    for cap in link_regex.captures_iter(links_str) {
                        if let (Some(text), Some(url)) = (cap.get(1), cap.get(2)) {
                            let text_str = text.as_str().to_string();
                            // Skip les liens Jira car ils sont déjà parsés
                            if !text_str.matches(r"^[A-Z]+-\d+$").any(|_| true) {
                                entry.links.push(Link {
                                    text: text_str,
                                    url: url.as_str().to_string(),
                                });
                            }
                        }
                    }
                }
            }
            
            i += 1;
        }
        
        entries.push(entry);
    }
    
    entries
}

pub fn generate_markdown_entry(entry: &ParsedJournalEntry) -> String {
    let timestamp = if entry.timestamp.contains('/') {
        entry.timestamp.clone()
    } else {
        // Utiliser le timestamp tel quel
        entry.timestamp.clone()
    };
    
    let mut content = format!("## {}\n", timestamp);
    content.push_str(&format!("**Projet**: {}  \n", entry.project));
    
    if !entry.time_range.is_empty() {
        content.push_str(&format!("**Plage horaire**: {}  \n", entry.time_range));
    }
    
    content.push_str(&format!("**Type d'activité**: {}  \n", entry.entry_type));
    content.push_str(&format!("**Description**: {}  \n", entry.description));
    content.push_str(&format!("**Durée**: {} minutes  \n", entry.duration));
    
    if !entry.results.is_empty() {
        content.push_str(&format!("**Résultats**: {}  \n", entry.results));
    }
    
    if !entry.blockers.is_empty() {
        content.push_str(&format!("**Blocages**: {}  \n", entry.blockers));
    }
    
    // Générer les liens Jira et les liens normaux ensemble
    let mut all_links = Vec::new();
    
    // Ajouter les tickets Jira
    if !entry.jira_tickets.is_empty() {
        let base_url = std::env::var("JIRA_BASE_URL").unwrap_or_else(|_| "https://votre-instance.atlassian.net".to_string());
        for ticket in &entry.jira_tickets {
            all_links.push(format!("[{}]({}/browse/{})", ticket.key, base_url, ticket.key));
        }
    }
    
    // Ajouter les liens normaux
    if !entry.links.is_empty() {
        for link in entry.links.iter().filter(|link| !link.text.is_empty() && !link.url.is_empty()) {
            all_links.push(format!("[{}]({})", link.text, link.url));
        }
    }
    
    if !all_links.is_empty() {
        content.push_str(&format!("**Liens**: {}  \n", all_links.join(", ")));
    }
    
    let tags_str = if entry.tags.is_empty() {
        "Aucun".to_string()
    } else {
        entry.tags.iter().map(|tag| format!("#{}", tag)).collect::<Vec<_>>().join(" ")
    };
    content.push_str(&format!("**Tags**: {}  \n", tags_str));
    
    if !entry.reflections.is_empty() {
        content.push_str(&format!("**Réflexions**: {}  \n", entry.reflections));
    }
    
    content
}

pub fn update_journal_entry(date: &str, entry_index: usize, updated_entry: &ParsedJournalEntry) -> Result<bool> {
    let journal_dir = get_journal_dir()?;
    let file_path = journal_dir.join(format!("{}.md", date));
    
    if !file_path.exists() {
        return Ok(false);
    }
    
    let content = fs::read_to_string(&file_path)?;
    let mut entries = parse_journal_entries(&content);
    
    if entry_index < entries.len() {
        // Garder le timestamp original mais mettre à jour le reste
        entries[entry_index] = ParsedJournalEntry {
            timestamp: entries[entry_index].timestamp.clone(),
            ..updated_entry.clone()
        };
        
        // Régénérer le contenu complet
        let new_content = entries.iter()
            .map(|entry| generate_markdown_entry(entry))
            .collect::<Vec<_>>()
            .join("\n\n");
            
        fs::write(&file_path, new_content)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

pub fn delete_journal_entry(date: &str, entry_index: usize) -> Result<bool> {
    let journal_dir = get_journal_dir()?;
    let file_path = journal_dir.join(format!("{}.md", date));
    
    if !file_path.exists() {
        return Ok(false);
    }
    
    let content = fs::read_to_string(&file_path)?;
    let mut entries = parse_journal_entries(&content);
    
    if entry_index < entries.len() {
        entries.remove(entry_index);
        
        // Régénérer le contenu complet
        let new_content = if entries.is_empty() {
            String::new()
        } else {
            entries.iter()
                .map(|entry| generate_markdown_entry(entry))
                .collect::<Vec<_>>()
                .join("\n\n")
        };
            
        fs::write(&file_path, new_content)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

fn format_entry_as_markdown(entry: &JournalEntry) -> String {
    let now = chrono::Utc::now();
    let timestamp = now.format("%d/%m/%Y %H:%M").to_string();
    
    let parsed_entry = ParsedJournalEntry {
        timestamp,
        project: entry.project.clone(),
        description: entry.description.clone(),
        duration: entry.duration.clone(),
        tags: entry.tags.clone(),
        time_range: entry.time_range.clone(),
        entry_type: entry.entry_type.clone(),
        results: entry.results.clone(),
        blockers: entry.blockers.clone(),
        links: entry.links.clone(),
        reflections: entry.reflections.clone(),
        jira_tickets: entry.jira_tickets.clone(),
    };
    
    generate_markdown_entry(&parsed_entry)
}