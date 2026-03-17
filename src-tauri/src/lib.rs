// Tauri Backend - Repository Backup Manager
// This module provides Git operations, backup management, and GitHub API integration

mod git;
mod backup;
mod github;
mod commands;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize app state
            let app_state = state::AppState::new();
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Repository commands
            commands::get_repositories,
            commands::add_repository,
            commands::remove_repository,
            commands::clone_repository,
            commands::sync_repository,
            commands::sync_all_repositories,
            commands::get_repository_status,
            
            // Backup commands
            commands::create_backup,
            commands::restore_backup,
            commands::list_backups,
            commands::delete_backup,
            commands::get_backup_config,
            commands::set_backup_config,
            
            // GitHub commands
            commands::authenticate_github,
            commands::get_github_user,
            commands::get_github_repos,
            commands::import_github_repos,
            
            // Settings commands
            commands::get_settings,
            commands::set_settings,
            
            // Activity commands
            commands::get_activity_log,
            commands::clear_activity_log,
            
            // System commands
            commands::select_directory,
            commands::check_git_installed,
            commands::get_disk_space,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
