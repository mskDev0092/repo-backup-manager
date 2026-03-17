// Application State Management

use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub url: String,
    pub local_path: String,
    pub provider: String,
    pub last_sync: Option<String>,
    pub last_backup: Option<String>,
    pub status: String,
    pub branch: String,
    pub size: u64,
    pub is_favorite: bool,
    pub auto_sync: bool,
    pub backup_enabled: bool,
    pub error_message: Option<String>,
    pub description: Option<String>,
    pub stars: Option<u32>,
    pub forks: Option<u32>,
    pub is_private: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub backup_path: String,
    pub auto_backup_enabled: bool,
    pub backup_interval: u64,
    pub retention_days: u32,
    pub max_backups: u32,
    pub include_submodules: bool,
    pub compress_backups: bool,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            backup_path: dirs::home_dir()
                .map(|h| h.join("repo-backups"))
                .unwrap_or_else(|| std::path::PathBuf::from("/tmp/repo-backups"))
                .to_string_lossy()
                .to_string(),
            auto_backup_enabled: true,
            backup_interval: 60,
            retention_days: 30,
            max_backups: 10,
            include_submodules: true,
            compress_backups: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub startup_behavior: String,
    pub check_updates_on_startup: bool,
    pub confirm_before_sync: bool,
    pub show_notifications: bool,
    pub sync_interval: u64,
    pub max_concurrent_operations: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            startup_behavior: "normal".to_string(),
            check_updates_on_startup: true,
            confirm_before_sync: true,
            show_notifications: true,
            sync_interval: 30,
            max_concurrent_operations: 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub repo_id: String,
    pub repo_name: String,
    pub action: String,
    pub timestamp: String,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubCredentials {
    pub token: String,
    pub username: Option<String>,
    pub email: Option<String>,
}

pub struct AppState {
    pub repositories: Mutex<Vec<Repository>>,
    pub backup_config: Mutex<BackupConfig>,
    pub settings: Mutex<AppSettings>,
    pub activity_log: Mutex<Vec<ActivityLog>>,
    pub github_credentials: Mutex<Option<GitHubCredentials>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            repositories: Mutex::new(Vec::new()),
            backup_config: Mutex::new(BackupConfig::default()),
            settings: Mutex::new(AppSettings::default()),
            activity_log: Mutex::new(Vec::new()),
            github_credentials: Mutex::new(None),
        }
    }
}

// Helper functions for generating IDs
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn current_timestamp() -> String {
    chrono::Local::now().to_rfc3339()
}
