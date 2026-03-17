// Sidebar Component
import { useApp } from '../contexts/AppContext';
import { 
  LayoutDashboard, 
  GitBranch, 
  HardDrive, 
  Settings as SettingsIcon, 
  Activity as ActivityIcon,
  RefreshCw,
  Github
} from 'lucide-react';
import type { ViewType } from '../types';

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'repositories', label: 'Repositories', icon: <GitBranch size={20} /> },
  { id: 'backups', label: 'Backups', icon: <HardDrive size={20} /> },
  { id: 'activity', label: 'Activity', icon: <ActivityIcon size={20} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
];

export default function Sidebar() {
  const { state, dispatch, actions, getStats } = useApp();
  const stats = getStats();

  const handleSyncAll = async () => {
    try {
      await actions.syncAllRepositories();
    } catch (error) {
      console.error('Sync all failed:', error);
    }
  };

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">RepoSync</h1>
            <p className="text-xs text-dark-400">Backup Manager</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-dark-800">
        <button
          onClick={handleSyncAll}
          className="w-full btn-primary flex items-center justify-center gap-2"
          disabled={state.repositories.length === 0}
        >
          <RefreshCw size={18} />
          Sync All Repos
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: item.id })}
                className={`sidebar-item w-full ${state.currentView === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'repositories' && (
                  <span className="ml-auto text-xs bg-dark-700 px-2 py-0.5 rounded-full">
                    {stats.totalRepos}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Stats Summary */}
      <div className="p-4 border-t border-dark-800">
        <div className="bg-dark-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Synced</span>
            <span className="text-green-400">{stats.syncedRepos}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Pending</span>
            <span className="text-yellow-400">{stats.pendingRepos}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-400">Errors</span>
            <span className="text-red-400">{stats.errorRepos}</span>
          </div>
        </div>
      </div>

      {/* GitHub Status */}
      <div className="p-4 border-t border-dark-800">
        {state.isGithubAuthenticated && state.githubUser ? (
          <div className="flex items-center gap-3">
            <img
              src={state.githubUser.avatar_url}
              alt={state.githubUser.login}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{state.githubUser.name || state.githubUser.login}</p>
              <p className="text-xs text-dark-400 flex items-center gap-1">
                <Github size={12} />
                Connected
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'settings' })}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Github size={18} />
            Connect GitHub
          </button>
        )}
      </div>
    </aside>
  );
}
