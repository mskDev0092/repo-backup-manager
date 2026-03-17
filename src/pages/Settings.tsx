// Settings Page
import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Settings as SettingsIcon, 
  Save, 
  Github,
  CheckCircle,
  Folder,
  Shield,
  Trash2,
  LogOut
} from 'lucide-react';
import type { BackupConfig, AppSettings } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { invoke } from '@tauri-apps/api/core';

export default function Settings() {
  const { state, actions, dispatch } = useApp();
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'backup' | 'github'>('general');

  useEffect(() => {
    if (state.backupConfig) {
      setBackupConfig(state.backupConfig);
    }
    if (state.settings) {
      setSettings(state.settings);
    }
  }, [state.backupConfig, state.settings]);

  const handleSaveBackupConfig = async () => {
    if (!backupConfig) return;
    setIsSaving(true);
    try {
      await actions.updateBackupConfig(backupConfig);
      alert('Backup settings saved!');
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await actions.updateSettings(settings);
      alert('Settings saved!');
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGithubConnect = async () => {
    if (!githubToken) return;
    setIsSaving(true);
    try {
      await actions.authenticateGithub(githubToken);
      setGithubToken('');
      alert('GitHub connected successfully!');
    } catch (error) {
      console.error('GitHub auth failed:', error);
      alert('Failed to connect GitHub. Check your token.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectGithub = () => {
    dispatch({ type: 'SET_GITHUB_AUTHENTICATED', payload: false });
    dispatch({ type: 'SET_GITHUB_USER', payload: null });
    dispatch({ type: 'SET_GITHUB_TOKEN', payload: null });
  };

  const handleClearActivityLog = async () => {
    if (confirm('Are you sure you want to clear the activity log?')) {
      try {
        await invoke('clear_activity_log');
        await actions.loadActivityLog();
        alert('Activity log cleared!');
      } catch (error) {
        console.error('Failed to clear log:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-dark-400 mt-1">Configure your backup manager preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        {[
          { id: 'general', label: 'General' },
          { id: 'backup', label: 'Backup' },
          { id: 'github', label: 'GitHub' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && settings && (
        <div className="space-y-6">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <SettingsIcon className="w-5 h-5 text-primary-400" />
              General Settings
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' | 'system' })}
                  className="input-field"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Startup Behavior</label>
                <select
                  value={settings.startupBehavior}
                  onChange={(e) => setSettings({ ...settings, startupBehavior: e.target.value as 'minimized' | 'normal' | 'hidden' })}
                  className="input-field"
                >
                  <option value="normal">Show Window</option>
                  <option value="minimized">Start Minimized</option>
                  <option value="hidden">Start Hidden (Tray Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sync Interval (minutes)</label>
                <input
                  type="number"
                  value={settings.syncInterval}
                  onChange={(e) => setSettings({ ...settings, syncInterval: parseInt(e.target.value) || 30 })}
                  className="input-field"
                  min={1}
                  max={1440}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Concurrent Operations</label>
                <input
                  type="number"
                  value={settings.maxConcurrentOperations}
                  onChange={(e) => setSettings({ ...settings, maxConcurrentOperations: parseInt(e.target.value) || 3 })}
                  className="input-field"
                  min={1}
                  max={10}
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.checkUpdatesOnStartup}
                    onChange={(e) => setSettings({ ...settings, checkUpdatesOnStartup: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Check for updates on startup</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.confirmBeforeSync}
                    onChange={(e) => setSettings({ ...settings, confirmBeforeSync: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Confirm before syncing all repositories</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.showNotifications}
                    onChange={(e) => setSettings({ ...settings, showNotifications: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Show desktop notifications</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="btn-primary mt-6 flex items-center gap-2"
              disabled={isSaving}
            >
              {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5 text-red-400" />
              Data Management
            </h3>
            <p className="text-dark-400 text-sm mb-4">
              Clear activity log to free up space. This action cannot be undone.
            </p>
            <button onClick={handleClearActivityLog} className="btn-danger">
              Clear Activity Log
            </button>
          </div>
        </div>
      )}

      {/* Backup Settings */}
      {activeTab === 'backup' && backupConfig && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Folder className="w-5 h-5 text-primary-400" />
            Backup Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Backup Storage Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backupConfig.backupPath}
                  onChange={(e) => setBackupConfig({ ...backupConfig, backupPath: e.target.value })}
                  className="input-field flex-1"
                />
                <button className="btn-secondary flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Backup Interval (minutes)</label>
              <input
                type="number"
                value={backupConfig.backupInterval}
                onChange={(e) => setBackupConfig({ ...backupConfig, backupInterval: parseInt(e.target.value) || 60 })}
                className="input-field"
                min={10}
                max={10080}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Retention Period (days)</label>
              <input
                type="number"
                value={backupConfig.retentionDays}
                onChange={(e) => setBackupConfig({ ...backupConfig, retentionDays: parseInt(e.target.value) || 30 })}
                className="input-field"
                min={1}
                max={365}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Maximum Backups per Repository</label>
              <input
                type="number"
                value={backupConfig.maxBackups}
                onChange={(e) => setBackupConfig({ ...backupConfig, maxBackups: parseInt(e.target.value) || 10 })}
                className="input-field"
                min={1}
                max={100}
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={backupConfig.autoBackupEnabled}
                  onChange={(e) => setBackupConfig({ ...backupConfig, autoBackupEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Enable automatic backups</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={backupConfig.includeSubmodules}
                  onChange={(e) => setBackupConfig({ ...backupConfig, includeSubmodules: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Include submodules in backups</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={backupConfig.compressBackups}
                  onChange={(e) => setBackupConfig({ ...backupConfig, compressBackups: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Compress backups (tar.gz)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveBackupConfig}
            className="btn-primary mt-6 flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
            Save Backup Settings
          </button>
        </div>
      )}

      {/* GitHub Settings */}
      {activeTab === 'github' && (
        <div className="space-y-6">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Github className="w-5 h-5 text-primary-400" />
              GitHub Authentication
            </h3>

            {state.isGithubAuthenticated && state.githubUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-dark-700 rounded-lg">
                  <img
                    src={state.githubUser.avatar_url}
                    alt={state.githubUser.login}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{state.githubUser.name || state.githubUser.login}</p>
                    <p className="text-sm text-dark-400">@{state.githubUser.login}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <button onClick={handleDisconnectGithub} className="btn-danger flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Disconnect GitHub
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-dark-400 text-sm">
                  Connect your GitHub account to import repositories and enable enhanced features.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2">Personal Access Token</label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="input-field"
                  />
                  <p className="text-xs text-dark-400 mt-2">
                    Create a token with <code className="text-primary-400">repo</code> scope at{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:underline"
                    >
                      GitHub Settings → Tokens
                    </a>
                  </p>
                </div>
                <button
                  onClick={handleGithubConnect}
                  className="btn-primary flex items-center gap-2"
                  disabled={isSaving || !githubToken}
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : <Github className="w-4 h-4" />}
                  Connect GitHub
                </button>
              </div>
            )}
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary-400" />
              Permissions
            </h3>
            <p className="text-dark-400 text-sm mb-4">
              The following permissions are required for full functionality:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span><code>repo</code> - Access to your repositories</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span><code>user:email</code> - Access to your email address</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span><code>read:org</code> - Access to organization repositories</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
