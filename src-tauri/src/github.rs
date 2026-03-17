// GitHub API Integration Module
// Handles authentication and repository listing from GitHub

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUser {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
    pub html_url: String,
    pub name: Option<String>,
    pub email: Option<String>,
    pub public_repos: u32,
    pub private_repos: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub id: u64,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub clone_url: String,
    pub ssh_url: String,
    pub private: bool,
    pub fork: bool,
    pub stars: u32,
    pub forks: u32,
    pub watchers: u32,
    pub open_issues: u32,
    pub default_branch: String,
    pub created_at: String,
    pub updated_at: String,
    pub pushed_at: Option<String>,
    pub language: Option<String>,
    pub topics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubCredentials {
    pub token: String,
    pub username: Option<String>,
}

/// Validate GitHub token and get user info
pub async fn validate_token(token: &str) -> Result<GitHubUser, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "RepoBackupManager/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }
    
    let user: GitHubUser = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse user data: {}", e))?;
    
    Ok(user)
}

/// Get user's repositories from GitHub
pub async fn get_user_repos(token: &str, page: u32, per_page: u32) -> Result<Vec<GitHubRepo>, String> {
    let client = reqwest::Client::new();
    
    let url = format!(
        "https://api.github.com/user/repos?page={}&per_page={}&sort=updated&affiliation=owner,collaborator,organization_member",
        page, per_page
    );
    
    let response = client
        .get(&url)
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "RepoBackupManager/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }
    
    let repos: Vec<GitHubRepo> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse repository data: {}", e))?;
    
    Ok(repos)
}

/// Get all user repositories (handles pagination)
pub async fn get_all_user_repos(token: &str) -> Result<Vec<GitHubRepo>, String> {
    let mut all_repos = Vec::new();
    let mut page = 1;
    let per_page = 100;
    
    loop {
        let repos = get_user_repos(token, page, per_page).await?;
        
        if repos.is_empty() {
            break;
        }
        
        all_repos.extend(repos);
        page += 1;
        
        // Safety limit
        if page > 100 {
            break;
        }
    }
    
    Ok(all_repos)
}

/// Get repository details
pub async fn get_repo(token: &str, owner: &str, repo: &str) -> Result<GitHubRepo, String> {
    let client = reqwest::Client::new();
    
    let url = format!("https://api.github.com/repos/{}/{}", owner, repo);
    
    let response = client
        .get(&url)
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "RepoBackupManager/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error ({}): {}", status, body));
    }
    
    let repo: GitHubRepo = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse repository data: {}", e))?;
    
    Ok(repo)
}

/// Get starred repositories
pub async fn get_starred_repos(token: &str) -> Result<Vec<GitHubRepo>, String> {
    let client = reqwest::Client::new();
    
    let mut all_repos = Vec::new();
    let mut page = 1;
    
    loop {
        let url = format!(
            "https://api.github.com/user/starred?page={}&per_page=100",
            page
        );
        
        let response = client
            .get(&url)
            .header("Authorization", format!("token {}", token))
            .header("User-Agent", "RepoBackupManager/1.0")
            .send()
            .await
            .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("GitHub API error ({}): {}", status, body));
        }
        
        let repos: Vec<GitHubRepo> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse repository data: {}", e))?;
        
        if repos.is_empty() {
            break;
        }
        
        all_repos.extend(repos);
        page += 1;
        
        if page > 100 {
            break;
        }
    }
    
    Ok(all_repos)
}

/// Check if token has required scopes
pub async fn check_token_scopes(token: &str) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("token {}", token))
        .header("User-Agent", "RepoBackupManager/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to GitHub: {}", e))?;
    
    // Get scopes from response headers
    let scopes = response
        .headers()
        .get("x-oauth-scopes")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default();
    
    Ok(scopes)
}

/// Convert GitHub repo to internal Repository format
pub fn to_internal_repo(repo: &GitHubRepo, local_base_path: &str) -> super::state::Repository {
    let local_path = PathBuf::from(local_base_path)
        .join(&repo.full_name)
        .to_string_lossy()
        .to_string();
    
    super::state::Repository {
        id: format!("github_{}", repo.id),
        name: repo.name.clone(),
        url: repo.clone_url.clone(),
        local_path,
        provider: "github".to_string(),
        last_sync: None,
        last_backup: None,
        status: "not_cloned".to_string(),
        branch: repo.default_branch.clone(),
        size: 0,
        is_favorite: false,
        auto_sync: true,
        backup_enabled: true,
        error_message: None,
        description: repo.description.clone(),
        stars: Some(repo.stars),
        forks: Some(repo.forks),
        is_private: repo.private,
        created_at: repo.created_at.clone(),
        updated_at: repo.updated_at.clone(),
    }
}

use std::path::PathBuf;
