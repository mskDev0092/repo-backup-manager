// Activity Page
import { useApp } from '../contexts/AppContext';
import { 
  Activity as ActivityIcon,
  RefreshCw,
  GitBranch,
  HardDrive,
  AlertTriangle,
  Trash2,
  Filter
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function Activity() {
  const { state, actions } = useApp();
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredActivity = state.activityLog.filter(log => {
    if (actionFilter === 'all') return true;
    return log.action === actionFilter;
  });

  const groupedActivity = filteredActivity.reduce((groups, log) => {
    const date = new Date(log.timestamp);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(log);
    return groups;
  }, {} as Record<string, typeof state.activityLog>);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'clone':
        return <GitBranch className="w-4 h-4 text-blue-400" />;
      case 'sync':
        return <RefreshCw className="w-4 h-4 text-green-400" />;
      case 'backup':
        return <HardDrive className="w-4 h-4 text-purple-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-dark-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'clone':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'sync':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'backup':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-dark-700 text-dark-400 border-dark-600';
    }
  };

  const handleClearLog = async () => {
    if (confirm('Are you sure you want to clear the activity log?')) {
      try {
        await invoke('clear_activity_log');
        await actions.loadActivityLog();
      } catch (error) {
        console.error('Failed to clear log:', error);
      }
    }
  };

  const actionCounts = state.activityLog.reduce((counts, log) => {
    counts[log.action] = (counts[log.action] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Log</h2>
          <p className="text-dark-400 mt-1">Track all repository operations</p>
        </div>
        <div className="flex gap-3">
          <button onClick={actions.loadActivityLog} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={handleClearLog} className="btn-danger flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Clear Log
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-dark-400 text-sm">Total Events</p>
          <p className="text-2xl font-bold">{state.activityLog.length}</p>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-dark-400 text-sm">Syncs</p>
          <p className="text-2xl font-bold text-green-400">{actionCounts['sync'] || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-dark-400 text-sm">Backups</p>
          <p className="text-2xl font-bold text-purple-400">{actionCounts['backup'] || 0}</p>
        </div>
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
          <p className="text-dark-400 text-sm">Errors</p>
          <p className="text-2xl font-bold text-red-400">{actionCounts['error'] || 0}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5 text-dark-400" />
        <div className="flex gap-2">
          {['all', 'sync', 'backup', 'clone', 'error'].map((action) => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                actionFilter === action
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      {filteredActivity.length === 0 ? (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-12 text-center">
          <ActivityIcon className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No activity yet</h3>
          <p className="text-dark-400">
            {actionFilter !== 'all' 
              ? `No ${actionFilter} events found`
              : 'Activity will appear here as you use the application'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivity).map(([date, logs]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-dark-400 mb-3">{date}</h3>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-dark-800 rounded-xl border border-dark-700 p-4 hover:border-dark-600 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg border ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{log.repoName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-dark-300">{log.message}</p>
                        {log.details && (
                          <p className="text-xs text-dark-400 mt-1">{log.details}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-dark-400">
                          {format(new Date(log.timestamp), 'HH:mm')}
                        </p>
                        <p className="text-xs text-dark-500">
                          {formatDistanceToNow(new Date(log.timestamp))} ago
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
