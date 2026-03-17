// Types for the Repository Backup Manager

export interface Repository {
  id: string;
  name: string;
  url: string;
  localPath: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'other';
  lastSync: string | null;
  lastBackup: string | null;
  status: 'synced' | 'pending' | 'syncing' | 'error' | 'not_cloned';
  branch: string;
  size: number;
  isFavorite: boolean;
  autoSync: boolean;
  backupEnabled: boolean;
  errorMessage?: string;
  remoteUrl?: string;
  description?: string;
  stars?: number;
  forks?: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BackupConfig {
  backupPath: string;
  autoBackupEnabled: boolean;
  backupInterval: number; // in minutes
  retentionDays: number;
  maxBackups: number;
  includeSubmodules: boolean;
  compressBackups: boolean;
}

export interface SyncStatus {
  repoId: string;
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress: number;
  message: string;
  startTime?: string;
  endTime?: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string;
  email: string;
}

export interface GitCredentials {
  provider: 'github' | 'gitlab' | 'bitbucket';
  token: string;
  username: string;
  email: string;
}

export interface ActivityLog {
  id: string;
  repoId: string;
  repoName: string;
  action: 'clone' | 'pull' | 'push' | 'backup' | 'sync' | 'error';
  timestamp: string;
  message: string;
  details?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  startupBehavior: 'minimized' | 'normal' | 'hidden';
  checkUpdatesOnStartup: boolean;
  confirmBeforeSync: boolean;
  showNotifications: boolean;
  syncInterval: number;
  maxConcurrentOperations: number;
}

export interface DashboardStats {
  totalRepos: number;
  syncedRepos: number;
  pendingRepos: number;
  errorRepos: number;
  totalSize: number;
  lastSyncTime: string | null;
  lastBackupTime: string | null;
}

export type ViewType = 'dashboard' | 'repositories' | 'backups' | 'settings' | 'activity';

export interface BackupInfo {
  id: string;
  repo_id: string;
  repo_name: string;
  backup_path: string;
  created_at: string;
  size: number;
  is_compressed: boolean;
  branch: string;
  commit_hash: string;
}
