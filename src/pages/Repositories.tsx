// Repositories Page
import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  GitBranch, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  Clock,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Search,
  Github,
  Star,
  GitFork,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Repository } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Repositories() {
  const { state, actions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [syncingRepos, setSyncingRepos] = useState<Set<string>>(new Set());

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredRepos = state.repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || repo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'pending':
      case 'not_cloned':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <GitBranch className="w-4 h-4 text-dark-400" />;
    }
  };

  const handleSync = async (repo: Repository) => {
    if (syncingRepos.has(repo.id)) return;
    
    setSyncingRepos(prev => new Set(prev).add(repo.id));
    try {
      if (repo.status === 'not_cloned') {
        await actions.cloneRepository(repo.id);
      } else {
        await actions.syncRepository(repo.id);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncingRepos(prev => {
        const next = new Set(prev);
        next.delete(repo.id);
        return next;
      });
    }
  };

  const handleBackup = async (repo: Repository) => {
    try {
      await actions.createBackup(repo.id);
    } catch (error) {
      console.error('Backup failed:', error);
    }
  };

  const handleRemove = async (repo: Repository) => {
    if (confirm(`Are you sure you want to remove "${repo.name}"?`)) {
      await actions.removeRepository(repo.id, false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Repositories</h2>
          <p className="text-dark-400 mt-1">Manage and sync your Git repositories</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowGithubModal(true)} className="btn-secondary flex items-center gap-2">
            <Github className="w-4 h-4" />
            Import from GitHub
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Repository
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="all">All Status</option>
          <option value="synced">Synced</option>
          <option value="pending">Pending</option>
          <option value="not_cloned">Not Cloned</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Repository List */}
      {filteredRepos.length === 0 ? (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-12 text-center">
          <GitBranch className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No repositories found</h3>
          <p className="text-dark-400 mb-4">
            {searchQuery ? 'Try a different search term' : 'Add your first repository to get started'}
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add Repository
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRepos.map((repo) => (
            <div key={repo.id} className="repo-card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{repo.name}</h3>
                    <span className={`status-badge ${
                      repo.status === 'synced' ? 'status-synced' :
                      repo.status === 'syncing' ? 'status-syncing' :
                      repo.status === 'error' ? 'status-error' :
                      'status-pending'
                    }`}>
                      {getStatusIcon(repo.status)}
                      {repo.status}
                    </span>
                    {repo.isPrivate && (
                      <span className="text-xs bg-dark-700 px-2 py-0.5 rounded">Private</span>
                    )}
                  </div>
                  
                  <p className="text-dark-400 text-sm truncate mb-3">{repo.url}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-dark-400">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-4 h-4" />
                      {repo.branch}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      {formatBytes(repo.size)}
                    </span>
                    {repo.stars !== undefined && repo.stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {repo.stars}
                      </span>
                    )}
                    {repo.forks !== undefined && repo.forks > 0 && (
                      <span className="flex items-center gap-1">
                        <GitFork className="w-4 h-4" />
                        {repo.forks}
                      </span>
                    )}
                    {repo.lastSync && (
                      <span>
                        Last sync: {formatDistanceToNow(new Date(repo.lastSync))} ago
                      </span>
                    )}
                  </div>
                  
                  {repo.errorMessage && (
                    <p className="text-red-400 text-sm mt-2">{repo.errorMessage}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleSync(repo)}
                    disabled={syncingRepos.has(repo.id)}
                    className="btn-secondary flex items-center gap-1"
                  >
                    {syncingRepos.has(repo.id) ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {repo.status === 'not_cloned' ? 'Clone' : 'Sync'}
                  </button>
                  <button
                    onClick={() => handleBackup(repo)}
                    className="btn-secondary flex items-center gap-1"
                  >
                    <HardDrive className="w-4 h-4" />
                    Backup
                  </button>
                  <button
                    onClick={() => window.open(repo.url, '_blank')}
                    className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(repo)}
                    className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Repository Modal */}
      {showAddModal && (
        <AddRepositoryModal onClose={() => setShowAddModal(false)} />
      )}

      {/* GitHub Import Modal */}
      {showGithubModal && (
        <GithubImportModal onClose={() => setShowGithubModal(false)} />
      )}
    </div>
  );
}

// Add Repository Modal Component
function AddRepositoryModal({ onClose }: { onClose: () => void }) {
  const { actions } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    localPath: '',
    provider: 'github' as const,
    autoSync: true,
    backupEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Extract name from URL if not provided
      const name = formData.name || formData.url.split('/').pop()?.replace('.git', '') || 'unnamed';
      const localPath = formData.localPath || `~/repos/${name}`;
      
      await actions.addRepository({
        name,
        url: formData.url,
        localPath,
        provider: formData.provider,
        autoSync: formData.autoSync,
        backupEnabled: formData.backupEnabled,
      });
      onClose();
    } catch (error) {
      console.error('Failed to add repository:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Add Repository</h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Repository URL</label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://github.com/user/repo.git"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Name (optional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Auto-detected from URL"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Local Path (optional)</label>
            <input
              type="text"
              value={formData.localPath}
              onChange={(e) => setFormData({ ...formData, localPath: e.target.value })}
              placeholder="~/repos/repo-name"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
              className="input-field"
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="bitbucket">Bitbucket</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.autoSync}
                onChange={(e) => setFormData({ ...formData, autoSync: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Auto-sync enabled</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.backupEnabled}
                onChange={(e) => setFormData({ ...formData, backupEnabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Backup enabled</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : 'Add Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// GitHub Import Modal Component
function GithubImportModal({ onClose }: { onClose: () => void }) {
  const { state, actions } = useApp();
  const [token, setToken] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [basePath, setBasePath] = useState('~/repos');
  const [step, setStep] = useState<'auth' | 'select' | 'importing'>('auth');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthenticate = async () => {
    setIsLoading(true);
    try {
      await actions.authenticateGithub(token);
      const fetchedRepos = await actions.loadGithubRepos();
      setRepos(fetchedRepos);
      setStep('select');
    } catch (error) {
      console.error('Auth failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setStep('importing');
    try {
      await actions.importGithubRepos(Array.from(selectedRepos), basePath);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRepo = (id: string) => {
    setSelectedRepos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedRepos(new Set(repos.map(r => `github_${r.id}`)));
  };

  const deselectAll = () => {
    setSelectedRepos(new Set());
  };

  // If already authenticated, skip to select
  if (state.isGithubAuthenticated && step === 'auth') {
    (async () => {
      setIsLoading(true);
      try {
        const fetchedRepos = await actions.loadGithubRepos();
        setRepos(fetchedRepos);
        setStep('select');
      } catch (error) {
        console.error('Failed to load repos:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">
            {step === 'auth' ? 'Connect GitHub' : 'Select Repositories'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : step === 'auth' ? (
          <div className="space-y-4">
            <p className="text-dark-400">
              Enter your GitHub Personal Access Token to import your repositories.
              The token needs <code className="text-primary-400">repo</code> scope.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="input-field"
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleAuthenticate} className="btn-primary flex-1">
                Connect
              </button>
            </div>
          </div>
        ) : step === 'select' ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-dark-400">
                {selectedRepos.size} of {repos.length} repositories selected
              </p>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-sm text-primary-400 hover:text-primary-300">
                  Select All
                </button>
                <span className="text-dark-600">|</span>
                <button onClick={deselectAll} className="text-sm text-primary-400 hover:text-primary-300">
                  Deselect All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-2 mb-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => toggleRepo(`github_${repo.id}`)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRepos.has(`github_${repo.id}`)
                      ? 'bg-primary-500/20 border border-primary-500/30'
                      : 'bg-dark-700 hover:bg-dark-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedRepos.has(`github_${repo.id}`)}
                    onChange={() => {}}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{repo.full_name}</p>
                    <p className="text-sm text-dark-400 truncate">{repo.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-dark-400">
                    {repo.stargazers_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {repo.stargazers_count}
                      </span>
                    )}
                    {repo.private && (
                      <span className="text-xs bg-dark-600 px-2 py-0.5 rounded">Private</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={basePath}
                onChange={(e) => setBasePath(e.target.value)}
                placeholder="Local base path"
                className="input-field flex-1"
              />
              <button onClick={handleImport} className="btn-primary" disabled={selectedRepos.size === 0}>
                Import {selectedRepos.size} Repositories
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4">Importing repositories...</p>
          </div>
        )}
      </div>
    </div>
  );
}
