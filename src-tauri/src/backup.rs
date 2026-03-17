// Backup Management Module
// Handles creating, restoring, and managing repository backups

use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Local, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: String,
    pub repo_id: String,
    pub repo_name: String,
    pub backup_path: String,
    pub created_at: String,
    pub size: u64,
    pub is_compressed: bool,
    pub branch: String,
    pub commit_hash: String,
}

/// Create a backup of a repository
pub fn create_backup(
    repo_path: &str,
    backup_base_path: &str,
    repo_id: &str,
    repo_name: &str,
    compress: bool,
) -> Result<BackupInfo, String> {
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_id = format!("{}_{}", repo_name, timestamp);
    
    // Get current branch and commit
    let branch = super::git::get_current_branch(repo_path).unwrap_or_else(|_| "unknown".to_string());
    let commit_output = Command::new("git")
        .current_dir(repo_path)
        .args(&["rev-parse", "HEAD"])
        .output()
        .map_err(|e| format!("Failed to get commit hash: {}", e))?;
    
    let commit_hash = String::from_utf8_lossy(&commit_output.stdout).trim().to_string();
    
    // Create backup directory
    let backup_dir = Path::new(backup_base_path).join(repo_name);
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    let backup_path = if compress {
        backup_dir.join(format!("{}.tar.gz", backup_id))
    } else {
        backup_dir.join(&backup_id)
    };
    
    if compress {
        // Create compressed tar archive
        let output = Command::new("tar")
            .args(&[
                "-czf",
                backup_path.to_str().unwrap(),
                "-C",
                repo_path,
                ".",
            ])
            .output()
            .map_err(|e| format!("Failed to create tar archive: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Tar creation failed: {}", stderr));
        }
    } else {
        // Create a bare clone as backup
        let output = Command::new("git")
            .args(&[
                "clone",
                "--bare",
                repo_path,
                backup_path.to_str().unwrap(),
            ])
            .output()
            .map_err(|e| format!("Failed to clone repo for backup: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Backup clone failed: {}", stderr));
        }
    }
    
    // Get backup size
    let size = get_backup_size(backup_path.to_str().unwrap())?;
    
    Ok(BackupInfo {
        id: backup_id,
        repo_id: repo_id.to_string(),
        repo_name: repo_name.to_string(),
        backup_path: backup_path.to_str().unwrap().to_string(),
        created_at: Local::now().to_rfc3339(),
        size,
        is_compressed: compress,
        branch,
        commit_hash,
    })
}

/// Restore a repository from backup
pub fn restore_backup(backup_path: &str, target_path: &str, is_compressed: bool) -> Result<String, String> {
    let target = Path::new(target_path);
    
    // Create parent directory if needed
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create target directory: {}", e))?;
    }
    
    if is_compressed {
        // Extract tar archive
        let output = Command::new("tar")
            .args(&[
                "-xzf",
                backup_path,
                "-C",
                target_path,
            ])
            .output()
            .map_err(|e| format!("Failed to extract tar archive: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Tar extraction failed: {}", stderr));
        }
    } else {
        // Clone from bare repository
        let output = Command::new("git")
            .args(&[
                "clone",
                backup_path,
                target_path,
            ])
            .output()
            .map_err(|e| format!("Failed to restore from backup: {}", e))?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Restore clone failed: {}", stderr));
        }
    }
    
    Ok(format!("Successfully restored to {}", target_path))
}

/// List all backups for a repository
pub fn list_backups(backup_base_path: &str, repo_name: &str) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = Path::new(backup_base_path).join(repo_name);
    
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut backups = Vec::new();
    
    let entries = fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        let metadata = entry.metadata().ok();
        let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
        
        let filename = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        let is_compressed = filename.ends_with(".tar.gz");
        let backup_name = if is_compressed {
            filename.trim_end_matches(".tar.gz")
        } else {
            &filename
        };
        
        let created = metadata
            .and_then(|m| m.created().ok())
            .map(|t| {
                let datetime: DateTime<Local> = t.into();
                datetime.to_rfc3339()
            })
            .unwrap_or_else(|| "Unknown".to_string());
        
        backups.push(BackupInfo {
            id: backup_name.to_string(),
            repo_id: String::new(),
            repo_name: repo_name.to_string(),
            backup_path: path.to_str().unwrap().to_string(),
            created_at: created,
            size,
            is_compressed,
            branch: String::new(),
            commit_hash: String::new(),
        });
    }
    
    // Sort by creation time (newest first)
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(backups)
}

/// Delete a backup
pub fn delete_backup(backup_path: &str) -> Result<String, String> {
    let path = Path::new(backup_path);
    
    if path.is_dir() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to delete backup directory: {}", e))?;
    } else {
        fs::remove_file(path)
            .map_err(|e| format!("Failed to delete backup file: {}", e))?;
    }
    
    Ok(format!("Successfully deleted backup: {}", backup_path))
}

/// Get backup size in bytes
pub fn get_backup_size(backup_path: &str) -> Result<u64, String> {
    let path = Path::new(backup_path);
    
    if path.is_file() {
        let metadata = fs::metadata(path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        return Ok(metadata.len());
    }
    
    if path.is_dir() {
        fn dir_size(path: &Path) -> u64 {
            let mut size = 0;
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_dir() {
                            size += dir_size(&entry.path());
                        } else {
                            size += metadata.len();
                        }
                    }
                }
            }
            size
        }
        
        return Ok(dir_size(path));
    }
    
    Ok(0)
}

/// Clean old backups based on retention policy
pub fn clean_old_backups(
    backup_base_path: &str,
    repo_name: &str,
    retention_days: u32,
    max_backups: u32,
) -> Result<Vec<String>, String> {
    let mut backups = list_backups(backup_base_path, repo_name)?;
    let mut deleted = Vec::new();
    
    // Calculate cutoff date
    let cutoff_date = Local::now() - Duration::days(retention_days as i64);
    
    // Delete backups older than retention period
    let mut i = 0;
    while i < backups.len() {
        let mut should_delete = false;
        
        if let Ok(created) = DateTime::parse_from_rfc3339(&backups[i].created_at) {
            let created_local: DateTime<Local> = created.with_timezone(&Local);
            if created_local < cutoff_date && backups.len() > max_backups as usize {
                should_delete = true;
            }
        }
        
        if should_delete {
            let backup = backups.remove(i);
            if delete_backup(&backup.backup_path).is_ok() {
                deleted.push(backup.backup_path);
            }
        } else {
            i += 1;
        }
    }
    
    // If still more than max_backups, delete oldest
    while backups.len() > max_backups as usize {
        if let Some(oldest) = backups.pop() {
            if delete_backup(&oldest.backup_path).is_ok() {
                deleted.push(oldest.backup_path);
            }
        }
    }
    
    Ok(deleted)
}

/// Get total backup size for a repository
pub fn get_total_backup_size(backup_base_path: &str, repo_name: &str) -> Result<u64, String> {
    let backups = list_backups(backup_base_path, repo_name)?;
    Ok(backups.iter().map(|b| b.size).sum())
}

/// Format bytes to human readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: [&str; 6] = ["B", "KB", "MB", "GB", "TB", "PB"];
    let mut size = bytes as f64;
    let mut unit_index = 0;
    
    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }
    
    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.2} {}", size, UNITS[unit_index])
    }
}
