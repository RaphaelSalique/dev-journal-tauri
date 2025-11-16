use serde::{Deserialize, Serialize};
use reqwest;
use base64::{Engine as _, engine::general_purpose};
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraTicket {
    pub key: String,
    pub fields: JiraFields,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraFields {
    pub summary: String,
    pub status: JiraStatus,
    pub issuetype: JiraIssueType,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraStatus {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraIssueType {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraSearchResponse {
    pub issues: Vec<JiraTicket>,
}

#[derive(Clone)]
pub struct JiraClient {
    base_url: String,
    email: String,
    api_token: String,
    client: reqwest::Client,
}

impl JiraClient {
    pub fn new(base_url: String, email: String, api_token: String) -> Self {
        Self {
            base_url,
            email,
            api_token,
            client: reqwest::Client::new(),
        }
    }

    pub async fn search_tickets(&self, jql: &str) -> Result<Vec<JiraTicket>> {
        println!("Jira config: base_url='{}', email='{}', token='{}'", 
            self.base_url, 
            self.email, 
            if self.api_token.is_empty() { "empty" } else { "***set***" }
        );
        
        if self.base_url.is_empty() || self.email.is_empty() || self.api_token.is_empty() {
            println!("Using mock data - one or more Jira credentials are missing");
            // Mode mock - retourner des données de test
            return Ok(self.get_mock_tickets());
        }

        let auth_header = format!("{}:{}", self.email, self.api_token);
        let encoded = general_purpose::STANDARD.encode(auth_header);

        let url = format!("{}/rest/api/3/search/jql", self.base_url);
        
        let body = serde_json::json!({
            "jql": jql,
            "maxResults": 50,
            "fields": ["summary", "status", "issuetype"]
        });

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Basic {}", encoded))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Erreur Jira: {}", response.status()));
        }

        let search_response: JiraSearchResponse = response.json().await?;
        Ok(search_response.issues)
    }

    fn get_mock_tickets(&self) -> Vec<JiraTicket> {
        vec![
            JiraTicket {
                key: "MOCK-1".to_string(),
                fields: JiraFields {
                    summary: "Ticket de démonstration 1".to_string(),
                    status: JiraStatus {
                        name: "En cours".to_string(),
                    },
                    issuetype: JiraIssueType {
                        name: "Tâche".to_string(),
                    },
                },
            },
            JiraTicket {
                key: "MOCK-2".to_string(),
                fields: JiraFields {
                    summary: "Ticket de démonstration 2".to_string(),
                    status: JiraStatus {
                        name: "À faire".to_string(),
                    },
                    issuetype: JiraIssueType {
                        name: "Bug".to_string(),
                    },
                },
            },
        ]
    }
}