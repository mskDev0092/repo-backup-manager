// Git Operations Module
// Handles all Git-related operations: clone, pull, push, status, etc.

use std::path::Path;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub staged: u32,
    pub unstaged: u32,
    pub untracked: u32,
    pub conflicts: u32,
    pub is_clean: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRemote {
    pub name: String,
    pub url: String,
}

/// Check if git is installed on the system
pub fn is_git_installed() -> bool {
    Command::new("git")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Get git version
pub fn get_git_version() -> Option<String> {
    let output = Command::new("git")
        .arg("--version")
        .output()
        .ok()?;
    
    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        None
    }
}

/// Clone a repository from URL to local path
pub fn clone_repo(url: &str, local_path: &str, depth: Option<u32>) -> Result<String, String> {
    let path = Path::new(local_path);
    
    // Create parent directories if needed
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    let mut cmd = Command::new("git");
    cmd.arg("clone");
    
    if let Some(d) = depth {
        cmd.arg("--depth").arg(d.to_string());
    }
    
    cmd.arg(url).arg(local_path);
    
    let output = cmd.output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;
    
    if output.status.success() {
        Ok(format!("Successfully cloned {} to {}", url, local_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Git clone failed: {}", stderr))
    }
}

/// Pull latest changes from remote
pub fn pull_repo(local_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["pull", "--rebase"])
        .output()
        .map_err(|e| format!("Failed to execute git pull: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("Already up to date") || stdout.contains("Already up-to-date") {
            Ok("Already up to date".to_string())
        } else {
            Ok(format!("Successfully pulled changes: {}", stdout))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Git pull failed: {}", stderr))
    }
}

/// Fetch changes from remote without merging
pub fn fetch_repo(local_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["fetch", "--all"])
        .output()
        .map_err(|e| format!("Failed to execute git fetch: {}", e))?;
    
    if output.status.success() {
        Ok("Successfully fetched changes".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Git fetch failed: {}", stderr))
    }
}

/// Get current branch name
pub fn get_current_branch(local_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["branch", "--show-current"])
        .output()
        .map_err(|e| format!("Failed to get branch: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("Failed to get current branch".to_string())
    }
}

/// Get detailed git status
pub fn get_status(local_path: &str) -> Result<GitStatus, String> {
    // Get branch name
    let branch = get_current_branch(local_path).unwrap_or_else(|_| "unknown".to_string());
    
    // Get status in porcelain format
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["status", "--porcelain=v2", "--branch"])
        .output()
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to get git status".to_string());
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ahead = 0;
    let mut behind = 0;
    let mut staged = 0;
    let mut unstaged = 0;
    let mut untracked = 0;
    let mut conflicts = 0;
    
    for line in stdout.lines() {
        if line.starts_with("# branch.ab ") {
            // Parse ahead/behind info
            let parts: Vec<&str> = line.split_whitespace().collect();
            for i in 0..parts.len() {
                if parts[i] == "+ahead" && i + 1 < parts.len() {
                    ahead = parts[i + 1].parse().unwrap_or(0);
                } else if parts[i] == "-behind" && i + 1 < parts.len() {
                    behind = parts[i + 1].parse().unwrap_or(0);
                }
            }
        } else if line.starts_with("1 ") || line.starts_with("2 ") {
            // Changed entries
            let status_code = line.chars().nth(2).unwrap_or(' ');
            let index_status = line.chars().nth(3).unwrap_or(' ');
            
            match index_status {
                '.' => unstaged += 1,
                _ => staged += 1,
            }
            
            if status_code == 'U' {
                conflicts += 1;
            }
        } else if line.starts_with("? ") {
            untracked += 1;
        }
    }
    
    let is_clean = staged == 0 && unstaged == 0 && untracked == 0 && conflicts == 0;
    
    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
        conflicts,
        is_clean,
    })
}

/// Get list of remotes
pub fn get_remotes(local_path: &str) -> Result<Vec<GitRemote>, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["remote", "-v"])
        .output()
        .map_err(|e| format!("Failed to get remotes: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to get git remotes".to_string());
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut remotes: Vec<GitRemote> = Vec::new();
    let mut seen_names = std::collections::HashSet::new();
    
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].to_string();
            if !seen_names.contains(&name) {
                seen_names.insert(name.clone());
                remotes.push(GitRemote {
                    name,
                    url: parts[1].to_string(),
                });
            }
        }
    }
    
    Ok(remotes)
}

/// Get repository size in bytes
pub fn get_repo_size(local_path: &str) -> Result<u64, String> {
    let path = Path::new(local_path);
    if !path.exists() {
        return Ok(0);
    }
    
    fn dir_size(path: &Path) -> u64 {
        let mut size = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
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
    
    Ok(dir_size(path))
}

/// Check if path is a valid git repository
pub fn is_git_repo(local_path: &str) -> bool {
    let git_dir = Path::new(local_path).join(".git");
    git_dir.exists()
}

/// Get last commit info
pub fn get_last_commit(local_path: &str) -> Result<(String, String), String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["log", "-1", "--format=%H|%ci|%s"])
        .output()
        .map_err(|e| format!("Failed to get last commit: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let parts: Vec<&str> = stdout.splitn(3, '|').collect();
        if parts.len() >= 3 {
            Ok((parts[1].to_string(), parts[2].to_string()))
        } else {
            Ok(("Unknown".to_string(), stdout))
        }
    } else {
        Err("Failed to get last commit".to_string())
    }
}

/// Initialize a new git repository
pub fn init_repo(local_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .arg("init")
        .output()
        .map_err(|e| format!("Failed to init repo: {}", e))?;
    
    if output.status.success() {
        Ok(format!("Initialized git repository at {}", local_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Git init failed: {}", stderr))
    }
}

/// Get commit log
pub fn get_commit_log(local_path: &str, limit: u32) -> Result<Vec<CommitInfo>, String> {
    let output = Command::new("git")
        .current_dir(local_path)
        .args(&["log", &format!("-{}", limit), "--format=%H|%ci|%an|%s"])
        .output()
        .map_err(|e| format!("Failed to get log: {}", e))?;
    
    if !output.status.success() {
        return Err("Failed to get commit log".to_string());
    }
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();
    
    for line in stdout.lines() {
        let parts: Vec<&str> = line.splitn(4, '|').collect();
        if parts.len() >= 4 {
            commits.push(CommitInfo {
                hash: parts[0].to_string(),
                date: parts[1].to_string(),
                author: parts[2].to_string(),
                message: parts[3].to_string(),
            });
        }
    }
    
    Ok(commits)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitInfo {
    pub hash: String,
    pub date: String,
    pub author: String,
    pub message: String,
}
