// Backups Page
import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  HardDrive, 
  RefreshCw, 
  Trash2, 
  Download,
  Archive,
  Settings,
  ChevronDown,
  ChevronUp,
  GitBranch
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BackupInfo } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { invoke } from '@tauri-apps/api/core';

export default function Backups() {
  const { state, actions } = useApp();
  const [backups, setBackups] = useState<Map<string, BackupInfo[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const backupMap = new Map<string, BackupInfo[]>();
      for (const repo of state.repositories) {
        try {
          const repoBackups = await invoke<BackupInfo[]>('list_backups', { repoName: repo.name });
          if (repoBackups.length > 0) {
            backupMap.set(repo.id, repoBackups);
          }
        } catch (error) {
          console.error(`Failed to load backups for ${repo.name}:`, error);
        }
      }
      setBackups(backupMap);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, [state.repositories]);

  const handleCreateBackup = async (repoId: string) => {
    try {
      await actions.createBackup(repoId);
      await loadBackups();
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  const handleDeleteBackup = async (backupPath: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      try {
        await invoke('delete_backup', { backupPath });
        await loadBackups();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleRestoreBackup = async (backup: BackupInfo) => {
    const targetPath = prompt('Enter target path for restore:', `/tmp/${backup.repo_name}-restore`);
    if (targetPath) {
      try {
        await invoke('restore_backup', {
          backupPath: backup.backup_path,
          targetPath,
          isCompressed: backup.is_compressed,
        });
        alert('Backup restored successfully!');
      } catch (error) {
        console.error('Restore failed:', error);
        alert('Restore failed: ' + error);
      }
    }
  };

  const totalBackupSize = Array.from(backups.values())
    .flat()
    .reduce((acc, b) => acc + b.size, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Backups</h2>
          <p className="text-dark-400 mt-1">Manage repository backups</p>
        </div>
        <button onClick={loadBackups} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Backup Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Archive className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Backups</p>
              <p className="text-2xl font-bold">
                {Array.from(backups.values()).flat().length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-500/10">
              <HardDrive className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Total Size</p>
              <p className="text-2xl font-bold">{formatBytes(totalBackupSize)}</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <GitBranch className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">Repos with Backups</p>
              <p className="text-2xl font-bold">{backups.size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Configuration */}
      {state.backupConfig && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-400" />
              Backup Configuration
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-dark-400">Backup Path</p>
              <p className="font-mono truncate">{state.backupConfig.backupPath}</p>
            </div>
            <div>
              <p className="text-dark-400">Auto Backup</p>
              <p>{state.backupConfig.autoBackupEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <p className="text-dark-400">Retention</p>
              <p>{state.backupConfig.retentionDays} days</p>
            </div>
            <div>
              <p className="text-dark-400">Compression</p>
              <p>{state.backupConfig.compressBackups ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Repository Backups */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : state.repositories.length === 0 ? (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-12 text-center">
          <Archive className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No repositories</h3>
          <p className="text-dark-400">Add repositories first to create backups</p>
        </div>
      ) : (
        <div className="space-y-4">
          {state.repositories.map((repo) => {
            const repoBackups = backups.get(repo.id) || [];
            const isExpanded = expandedRepo === repo.id;

            return (
              <div key={repo.id} className="bg-dark-800 rounded-xl border border-dark-700">
                <div
                  className="p-4 cursor-pointer hover:bg-dark-700/50"
                  onClick={() => setExpandedRepo(isExpanded ? null : repo.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <GitBranch className="w-5 h-5 text-primary-400" />
                      <div>
                        <h4 className="font-semibold">{repo.name}</h4>
                        <p className="text-sm text-dark-400">
                          {repoBackups.length} backups • {formatBytes(repoBackups.reduce((acc, b) => acc + b.size, 0))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateBackup(repo.id);
                        }}
                        className="btn-primary text-sm py-1.5"
                      >
                        Create Backup
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-dark-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-dark-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && repoBackups.length > 0 && (
                  <div className="border-t border-dark-700 p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-dark-400">
                          <th className="pb-3">Backup ID</th>
                          <th className="pb-3">Created</th>
                          <th className="pb-3">Size</th>
                          <th className="pb-3">Branch</th>
                          <th className="pb-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repoBackups.map((backup) => (
                          <tr key={backup.id} className="border-t border-dark-700">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Archive className="w-4 h-4 text-dark-400" />
                                <span className="font-mono text-sm">{backup.id}</span>
                              </div>
                            </td>
                            <td className="py-3 text-sm text-dark-400">
                              {formatDistanceToNow(new Date(backup.created_at))} ago
                            </td>
                            <td className="py-3 text-sm">{formatBytes(backup.size)}</td>
                            <td className="py-3 text-sm">
                              {backup.branch && (
                                <span className="flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" />
                                  {backup.branch}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRestoreBackup(backup)}
                                  className="p-1.5 hover:bg-dark-600 rounded text-primary-400"
                                  title="Restore"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(backup.backup_path)}
                                  className="p-1.5 hover:bg-red-500/10 rounded text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && repoBackups.length === 0 && (
                  <div className="border-t border-dark-700 p-4 text-center text-dark-400">
                    No backups yet. Click "Create Backup" to create one.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
