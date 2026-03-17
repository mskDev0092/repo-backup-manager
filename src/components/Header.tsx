// Header Component
import { useApp } from '../contexts/AppContext';
import { Search, Bell } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { state, getStats } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const stats = getStats();

  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    repositories: 'Repositories',
    backups: 'Backups',
    settings: 'Settings',
    activity: 'Activity Log',
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <header className="bg-dark-900 border-b border-dark-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{viewTitles[state.currentView] || 'Dashboard'}</h2>
          <p className="text-sm text-dark-400 mt-1">
            {stats.totalRepos} repositories • {formatBytes(stats.totalSize)} total
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-dark-800 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-dark-400" />
            {stats.errorRepos > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
