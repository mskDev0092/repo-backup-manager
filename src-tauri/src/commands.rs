// Tauri Commands Module
// Exposes all backend functionality to the frontend

use tauri::State;
use crate::state::{AppState, Repository, BackupConfig, AppSettings, ActivityLog, GitHubCredentials, generate_id, current_timestamp};
use crate::git::{self, GitStatus};
use crate::backup::{self, BackupInfo};
use crate::github;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ==================== Repository Commands ====================

#[derive(Debug, Serialize)]
pub struct RepoListResponse {
    pub repositories: Vec<Repository>,
    pub total: usize,
}

#[tauri::command]
pub async fn get_repositories(state: State<'_, AppState>) -> Result<RepoListResponse, String> {
    let repos = state.repositories.lock().map_err(|e| e.to_string())?;
    Ok(RepoListResponse {
        total: repos.len(),
        repositories: repos.clone(),
    })
}

#[derive(Debug, Deserialize)]
pub struct AddRepoRequest {
    pub name: String,
    pub url: String,
    pub local_path: String,
    pub provider: String,
    pub auto_sync: bool,
    pub backup_enabled: bool,
}

#[tauri::command]
pub async fn add_repository(
    state: State<'_, AppState>,
    request: AddRepoRequest,
) -> Result<Repository, String> {
    let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
    
    let repo = Repository {
        id: generate_id(),
        name: request.name,
        url: request.url.clone(),
        local_path: request.local_path.clone(),
        provider: request.provider,
        last_sync: None,
        last_backup: None,
        status: "not_cloned".to_string(),
        branch: "main".to_string(),
        size: 0,
        is_favorite: false,
        auto_sync: request.auto_sync,
        backup_enabled: request.backup_enabled,
        error_message: None,
        description: None,
        stars: None,
        forks: None,
        is_private: false,
        created_at: current_timestamp(),
        updated_at: current_timestamp(),
    };
    
    // Add to activity log
    add_activity(&state, &repo.id, &repo.name, "clone", &format!("Added repository: {}", request.url))?;
    
    repos.push(repo.clone());
    Ok(repo)
}

#[tauri::command]
pub async fn remove_repository(
    state: State<'_, AppState>,
    repo_id: String,
    delete_local: bool,
) -> Result<String, String> {
    let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
    
    if let Some(pos) = repos.iter().position(|r| r.id == repo_id) {
        let repo = repos.remove(pos);
        
        if delete_local {
            // Delete local directory
            let path = PathBuf::from(&repo.local_path);
            if path.exists() {
                std::fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to delete local repository: {}", e))?;
            }
        }
        
        add_activity(&state, &repo_id, &repo.name, "clone", "Removed repository")?;
        Ok(format!("Repository {} removed", repo.name))
    } else {
        Err("Repository not found".to_string())
    }
}

#[tauri::command]
pub async fn clone_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Repository, String> {
    let repos = state.repositories.lock().map_err(|e| e.to_string())?;
    let repo = repos.iter().find(|r| r.id == repo_id)
        .ok_or("Repository not found")?
        .clone();
    drop(repos);
    
    add_activity(&state, &repo_id, &repo.name, "clone", &format!("Cloning from {}...", repo.url))?;
    
    // Clone the repository
    match git::clone_repo(&repo.url, &repo.local_path, None) {
        Ok(msg) => {
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
                r.status = "synced".to_string();
                r.last_sync = Some(current_timestamp());
                r.branch = git::get_current_branch(&r.local_path).unwrap_or_else(|_| "main".to_string());
                r.size = git::get_repo_size(&r.local_path).unwrap_or(0);
                
                add_activity(&state, &repo_id, &r.name, "clone", &msg)?;
                Ok(r.clone())
            } else {
                Err("Repository not found after clone".to_string())
            }
        }
        Err(e) => {
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
                r.status = "error".to_string();
                r.error_message = Some(e.clone());
            }
            add_activity(&state, &repo_id, &repo.name, "error", &e)?;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn sync_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Repository, String> {
    let repos = state.repositories.lock().map_err(|e| e.to_string())?;
    let repo = repos.iter().find(|r| r.id == repo_id)
        .ok_or("Repository not found")?
        .clone();
    drop(repos);
    
    // Check if repository is cloned
    if !git::is_git_repo(&repo.local_path) {
        return Err("Repository not cloned yet. Clone it first.".to_string());
    }
    
    add_activity(&state, &repo_id, &repo.name, "sync", "Syncing repository...")?;
    
    // Update status to syncing
    {
        let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
        if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
            r.status = "syncing".to_string();
        }
    }
    
    // Pull changes
    match git::pull_repo(&repo.local_path) {
        Ok(msg) => {
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
                r.status = "synced".to_string();
                r.last_sync = Some(current_timestamp());
                r.branch = git::get_current_branch(&r.local_path).unwrap_or_else(|_| r.branch.clone());
                r.size = git::get_repo_size(&r.local_path).unwrap_or(0);
                
                add_activity(&state, &repo_id, &r.name, "sync", &msg)?;
                Ok(r.clone())
            } else {
                Err("Repository not found after sync".to_string())
            }
        }
        Err(e) => {
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
                r.status = "error".to_string();
                r.error_message = Some(e.clone());
            }
            add_activity(&state, &repo_id, &repo.name, "error", &e)?;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn sync_all_repositories(state: State<'_, AppState>) -> Result<Vec<Repository>, String> {
    let repos = state.repositories.lock().map_err(|e| e.to_string())?;
    let repo_ids: Vec<(String, String, String)> = repos.iter()
        .filter(|r| r.auto_sync && git::is_git_repo(&r.local_path))
        .map(|r| (r.id.clone(), r.name.clone(), r.local_path.clone()))
        .collect();
    drop(repos);
    
    let mut results = Vec::new();
    
    for (id, name, path) in repo_ids {
        match git::pull_repo(&path) {
            Ok(msg) => {
                let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
                if let Some(r) = repos.iter_mut().find(|r| r.id == id) {
                    r.status = "synced".to_string();
                    r.last_sync = Some(current_timestamp());
                    results.push(r.clone());
                }
                add_activity(&state, &id, &name, "sync", &msg)?;
            }
            Err(e) => {
                let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
                if let Some(r) = repos.iter_mut().find(|r| r.id == id) {
                    r.status = "error".to_string();
                    r.error_message = Some(e.clone());
                    results.push(r.clone());
                }
                add_activity(&state, &id, &name, "error", &e)?;
            }
        }
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn get_repository_status(
    local_path: String,
) -> Result<GitStatus, String> {
    git::get_status(&local_path)
}

// ==================== Backup Commands ====================

#[tauri::command]
pub async fn create_backup(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<BackupInfo, String> {
    let repos = state.repositories.lock().map_err(|e| e.to_string())?;
    let repo = repos.iter().find(|r| r.id == repo_id)
        .ok_or("Repository not found")?
        .clone();
    drop(repos);
    
    if !git::is_git_repo(&repo.local_path) {
        return Err("Repository not cloned yet".to_string());
    }
    
    let config = state.backup_config.lock().map_err(|e| e.to_string())?;
    let backup_path = config.backup_path.clone();
    let compress = config.compress_backups;
    drop(config);
    
    add_activity(&state, &repo_id, &repo.name, "backup", "Creating backup...")?;
    
    match backup::create_backup(&repo.local_path, &backup_path, &repo.id, &repo.name, compress) {
        Ok(info) => {
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            if let Some(r) = repos.iter_mut().find(|r| r.id == repo_id) {
                r.last_backup = Some(current_timestamp());
            }
            add_activity(&state, &repo_id, &repo.name, "backup", &format!("Backup created: {}", info.id))?;
            Ok(info)
        }
        Err(e) => {
            add_activity(&state, &repo_id, &repo.name, "error", &e)?;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn restore_backup(
    backup_path: String,
    target_path: String,
    is_compressed: bool,
) -> Result<String, String> {
    backup::restore_backup(&backup_path, &target_path, is_compressed)
}

#[tauri::command]
pub async fn list_backups(
    state: State<'_, AppState>,
    repo_name: String,
) -> Result<Vec<BackupInfo>, String> {
    let config = state.backup_config.lock().map_err(|e| e.to_string())?;
    backup::list_backups(&config.backup_path, &repo_name)
}

#[tauri::command]
pub async fn delete_backup(backup_path: String) -> Result<String, String> {
    backup::delete_backup(&backup_path)
}

#[tauri::command]
pub async fn get_backup_config(state: State<'_, AppState>) -> Result<BackupConfig, String> {
    let config = state.backup_config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub async fn set_backup_config(
    state: State<'_, AppState>,
    config: BackupConfig,
) -> Result<BackupConfig, String> {
    let mut current = state.backup_config.lock().map_err(|e| e.to_string())?;
    *current = config;
    Ok(current.clone())
}

// ==================== GitHub Commands ====================

#[derive(Debug, Deserialize)]
pub struct GitHubAuthRequest {
    pub token: String,
}

#[tauri::command]
pub async fn authenticate_github(
    state: State<'_, AppState>,
    token: String,
) -> Result<GitHubUser, String> {
    let user = github::validate_token(&token).await?;
    
    // Store credentials
    let mut creds = state.github_credentials.lock().map_err(|e| e.to_string())?;
    *creds = Some(GitHubCredentials {
        token,
        username: Some(user.login.clone()),
        email: user.email.clone(),
    });
    
    Ok(user)
}

#[tauri::command]
pub async fn get_github_user(state: State<'_, AppState>) -> Result<GitHubUser, String> {
    let token = {
        let creds = state.github_credentials.lock().map_err(|e| e.to_string())?;
        creds.as_ref()
            .ok_or("Not authenticated with GitHub")?
            .token.clone()
    };
    
    github::validate_token(&token).await
}

#[tauri::command]
pub async fn get_github_repos(state: State<'_, AppState>) -> Result<Vec<github::GitHubRepo>, String> {
    let token = {
        let creds = state.github_credentials.lock().map_err(|e| e.to_string())?;
        creds.as_ref()
            .ok_or("Not authenticated with GitHub")?
            .token.clone()
    };
    
    github::get_all_user_repos(&token).await
}

#[tauri::command]
pub async fn import_github_repos(
    state: State<'_, AppState>,
    repo_ids: Vec<String>,
    local_base_path: String,
) -> Result<Vec<Repository>, String> {
    let token = {
        let creds = state.github_credentials.lock().map_err(|e| e.to_string())?;
        creds.as_ref()
            .ok_or("Not authenticated with GitHub")?
            .token.clone()
    };
    
    let all_repos = github::get_all_user_repos(&token).await?;
    let mut imported = Vec::new();
    
    for github_repo in all_repos {
        if repo_ids.contains(&format!("github_{}", github_repo.id)) {
            let repo = github::to_internal_repo(&github_repo, &local_base_path);
            
            let mut repos = state.repositories.lock().map_err(|e| e.to_string())?;
            repos.push(repo.clone());
            drop(repos);
            
            add_activity(&state, &repo.id, &repo.name, "clone", &format!("Imported from GitHub: {}", github_repo.full_name))?;
            imported.push(repo);
        }
    }
    
    Ok(imported)
}

// ==================== Settings Commands ====================

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn set_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let mut current = state.settings.lock().map_err(|e| e.to_string())?;
    *current = settings;
    Ok(current.clone())
}

// ==================== Activity Commands ====================

#[tauri::command]
pub async fn get_activity_log(state: State<'_, AppState>) -> Result<Vec<ActivityLog>, String> {
    let log = state.activity_log.lock().map_err(|e| e.to_string())?;
    Ok(log.clone())
}

#[tauri::command]
pub async fn clear_activity_log(state: State<'_, AppState>) -> Result<String, String> {
    let mut log = state.activity_log.lock().map_err(|e| e.to_string())?;
    log.clear();
    Ok("Activity log cleared".to_string())
}

// ==================== System Commands ====================

#[tauri::command]
pub async fn select_directory() -> Result<String, String> {
    // Use tauri dialog plugin for file selection
    // For now, return a default path
    dirs::home_dir()
        .map(|h| h.to_string_lossy().to_string())
        .ok_or("Could not determine home directory".to_string())
}

#[tauri::command]
pub async fn check_git_installed() -> Result<bool, String> {
    Ok(git::is_git_installed())
}

#[tauri::command]
pub async fn get_disk_space(path: String) -> Result<DiskSpaceInfo, String> {
    let path = PathBuf::from(path);
    let parent = path.parent().unwrap_or(&path);
    
    // Use df command to get disk space
    let output = std::process::Command::new("df")
        .args(&["-B1", parent.to_str().unwrap_or("/")])
        .output()
        .map_err(|e| format!("Failed to get disk space: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    
    if lines.len() >= 2 {
        let parts: Vec<&str> = lines[1].split_whitespace().collect();
        if parts.len() >= 4 {
            return Ok(DiskSpaceInfo {
                total: parts[1].parse().unwrap_or(0),
                used: parts[2].parse().unwrap_or(0),
                available: parts[3].parse().unwrap_or(0),
            });
        }
    }
    
    Err("Failed to parse disk space info".to_string())
}

#[derive(Debug, Serialize)]
pub struct DiskSpaceInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
}

// ==================== Helper Functions ====================

fn add_activity(
    state: &State<'_, AppState>,
    repo_id: &str,
    repo_name: &str,
    action: &str,
    message: &str,
) -> Result<(), String> {
    let mut log = state.activity_log.lock().map_err(|e| e.to_string())?;
    
    log.push(ActivityLog {
        id: generate_id(),
        repo_id: repo_id.to_string(),
        repo_name: repo_name.to_string(),
        action: action.to_string(),
        timestamp: current_timestamp(),
        message: message.to_string(),
        details: None,
    });
    
    // Keep only last 1000 entries
    let len = log.len();
    if len > 1000 {
        log.drain(0..len - 1000);
    }
    
    Ok(())
}

// Re-export GitHub types
pub use github::{GitHubUser, GitHubRepo};
