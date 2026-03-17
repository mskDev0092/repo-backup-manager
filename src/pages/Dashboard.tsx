// Dashboard Page
import { useApp } from '../contexts/AppContext';
import { 
  GitBranch, 
  HardDrive, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Repository } from '../types';

export default function Dashboard() {
  const { state, dispatch, actions, getStats } = useApp();
  const stats = getStats();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    {
      title: 'Total Repositories',
      value: stats.totalRepos,
      icon: <GitBranch className="w-6 h-6" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Synced',
      value: stats.syncedRepos,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending',
      value: stats.pendingRepos,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Errors',
      value: stats.errorRepos,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  const recentRepos = [...state.repositories]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const recentActivity = state.activityLog.slice(0, 10);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'text-green-400 bg-green-500/10';
      case 'syncing':
        return 'text-blue-400 bg-blue-500/10';
      case 'pending':
      case 'not_cloned':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'error':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-dark-400 bg-dark-700';
    }
  };

  const handleRepoClick = (repo: Repository) => {
    dispatch({ type: 'SELECT_REPOSITORY', payload: repo });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-dark-800 rounded-xl border border-dark-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Storage */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold">Storage Used</h3>
          </div>
          <span className="text-2xl font-bold">{formatBytes(stats.totalSize)}</span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((stats.totalSize / (100 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
          />
        </div>
        <p className="text-dark-400 text-sm mt-2">
          {((stats.totalSize / (100 * 1024 * 1024 * 1024)) * 100).toFixed(1)}% of 100GB quota
        </p>
      </div>

      {/* Recent Repositories & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Repositories */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary-400" />
              Recent Repositories
            </h3>
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              View All
            </button>
          </div>
          
          {recentRepos.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No repositories yet</p>
              <p className="text-dark-500 text-sm">Add your first repository to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRepos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoClick(repo)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-dark-700 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{repo.name}</p>
                    <p className="text-sm text-dark-400 truncate">{repo.url}</p>
                  </div>
                  <span className={`status-badge ml-3 ${getStatusColor(repo.status)}`}>
                    {repo.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              Recent Activity
            </h3>
            <button
              onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'activity' })}
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              View All
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No recent activity</p>
              <p className="text-dark-500 text-sm">Activity will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-dark-700/50"
                >
                  <div className={`p-2 rounded-lg ${
                    activity.action === 'error' ? 'bg-red-500/10' :
                    activity.action === 'sync' ? 'bg-green-500/10' :
                    activity.action === 'backup' ? 'bg-blue-500/10' :
                    'bg-dark-700'
                  }`}>
                    {activity.action === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : activity.action === 'sync' ? (
                      <RefreshCw className="w-4 h-4 text-green-400" />
                    ) : activity.action === 'backup' ? (
                      <HardDrive className="w-4 h-4 text-blue-400" />
                    ) : (
                      <GitBranch className="w-4 h-4 text-dark-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-dark-400 mt-1">
                      {activity.repoName} • {formatDistanceToNow(new Date(activity.timestamp))} ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-5">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={async () => {
              await actions.syncAllRepositories();
            }}
            className="flex items-center gap-3 p-4 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-green-400" />
            <div className="text-left">
              <p className="font-medium">Sync All</p>
              <p className="text-sm text-dark-400">Update all repositories</p>
            </div>
          </button>
          
          <button
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'repositories' })}
            className="flex items-center gap-3 p-4 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            <GitBranch className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <p className="font-medium">Add Repository</p>
              <p className="text-sm text-dark-400">Clone or import a repo</p>
            </div>
          </button>
          
          <button
            onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'backups' })}
            className="flex items-center gap-3 p-4 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors"
          >
            <HardDrive className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <p className="font-medium">Manage Backups</p>
              <p className="text-sm text-dark-400">View and create backups</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
