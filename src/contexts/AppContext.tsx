// App Context - Global State Management
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Repository, BackupConfig, AppSettings, ActivityLog, DashboardStats, ViewType } from '../types';

// State interface
interface AppState {
  repositories: Repository[];
  backupConfig: BackupConfig | null;
  settings: AppSettings | null;
  activityLog: ActivityLog[];
  currentView: ViewType;
  selectedRepo: Repository | null;
  isLoading: boolean;
  error: string | null;
  githubToken: string | null;
  githubUser: { login: string; avatar_url: string; name: string } | null;
  isGithubAuthenticated: boolean;
}

// Action types
type Action =
  | { type: 'SET_REPOSITORIES'; payload: Repository[] }
  | { type: 'ADD_REPOSITORY'; payload: Repository }
  | { type: 'UPDATE_REPOSITORY'; payload: Repository }
  | { type: 'REMOVE_REPOSITORY'; payload: string }
  | { type: 'SET_BACKUP_CONFIG'; payload: BackupConfig }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_ACTIVITY_LOG'; payload: ActivityLog[] }
  | { type: 'ADD_ACTIVITY'; payload: ActivityLog }
  | { type: 'SET_CURRENT_VIEW'; payload: ViewType }
  | { type: 'SELECT_REPOSITORY'; payload: Repository | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GITHUB_TOKEN'; payload: string | null }
  | { type: 'SET_GITHUB_USER'; payload: { login: string; avatar_url: string; name: string } | null }
  | { type: 'SET_GITHUB_AUTHENTICATED'; payload: boolean };

// Initial state
const initialState: AppState = {
  repositories: [],
  backupConfig: null,
  settings: null,
  activityLog: [],
  currentView: 'dashboard',
  selectedRepo: null,
  isLoading: false,
  error: null,
  githubToken: null,
  githubUser: null,
  isGithubAuthenticated: false,
};

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_REPOSITORIES':
      return { ...state, repositories: action.payload };
    case 'ADD_REPOSITORY':
      return { ...state, repositories: [...state.repositories, action.payload] };
    case 'UPDATE_REPOSITORY':
      return {
        ...state,
        repositories: state.repositories.map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'REMOVE_REPOSITORY':
      return {
        ...state,
        repositories: state.repositories.filter(r => r.id !== action.payload),
      };
    case 'SET_BACKUP_CONFIG':
      return { ...state, backupConfig: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_ACTIVITY_LOG':
      return { ...state, activityLog: action.payload };
    case 'ADD_ACTIVITY':
      return { ...state, activityLog: [action.payload, ...state.activityLog].slice(0, 100) };
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SELECT_REPOSITORY':
      return { ...state, selectedRepo: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_GITHUB_TOKEN':
      return { ...state, githubToken: action.payload };
    case 'SET_GITHUB_USER':
      return { ...state, githubUser: action.payload };
    case 'SET_GITHUB_AUTHENTICATED':
      return { ...state, isGithubAuthenticated: action.payload };
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    loadRepositories: () => Promise<void>;
    addRepository: (repo: { name: string; url: string; localPath: string; provider: string; autoSync: boolean; backupEnabled: boolean }) => Promise<void>;
    syncRepository: (repoId: string) => Promise<void>;
    syncAllRepositories: () => Promise<void>;
    cloneRepository: (repoId: string) => Promise<void>;
    removeRepository: (repoId: string, deleteLocal: boolean) => Promise<void>;
    createBackup: (repoId: string) => Promise<void>;
    loadBackupConfig: () => Promise<void>;
    updateBackupConfig: (config: BackupConfig) => Promise<void>;
    loadSettings: () => Promise<void>;
    updateSettings: (settings: AppSettings) => Promise<void>;
    loadActivityLog: () => Promise<void>;
    authenticateGithub: (token: string) => Promise<void>;
    loadGithubRepos: () => Promise<any[]>;
    importGithubRepos: (repoIds: string[], basePath: string) => Promise<void>;
    selectDirectory: () => Promise<string>;
  };
  getStats: () => DashboardStats;
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    actions.loadRepositories();
    actions.loadBackupConfig();
    actions.loadSettings();
    actions.loadActivityLog();
  }, []);

  // Actions
  const actions = {
    loadRepositories: async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await invoke<{ repositories: Repository[]; total: number }>('get_repositories');
        dispatch({ type: 'SET_REPOSITORIES', payload: response.repositories });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },

    addRepository: async (repo: any) => {
      try {
        const newRepo = await invoke<Repository>('add_repository', {
          request: {
            name: repo.name,
            url: repo.url,
            local_path: repo.localPath,
            provider: repo.provider,
            auto_sync: repo.autoSync,
            backup_enabled: repo.backupEnabled,
          },
        });
        dispatch({ type: 'ADD_REPOSITORY', payload: newRepo });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    syncRepository: async (repoId: string) => {
      try {
        const updatedRepo = await invoke<Repository>('sync_repository', { repoId });
        dispatch({ type: 'UPDATE_REPOSITORY', payload: updatedRepo });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    syncAllRepositories: async () => {
      try {
        const updatedRepos = await invoke<Repository[]>('sync_all_repositories');
        updatedRepos.forEach(repo => {
          dispatch({ type: 'UPDATE_REPOSITORY', payload: repo });
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    cloneRepository: async (repoId: string) => {
      try {
        const updatedRepo = await invoke<Repository>('clone_repository', { repoId });
        dispatch({ type: 'UPDATE_REPOSITORY', payload: updatedRepo });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    removeRepository: async (repoId: string, deleteLocal: boolean) => {
      try {
        await invoke('remove_repository', { repoId, deleteLocal });
        dispatch({ type: 'REMOVE_REPOSITORY', payload: repoId });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    createBackup: async (repoId: string) => {
      try {
        await invoke('create_backup', { repoId });
        await actions.loadRepositories();
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    loadBackupConfig: async () => {
      try {
        const config = await invoke<BackupConfig>('get_backup_config');
        dispatch({ type: 'SET_BACKUP_CONFIG', payload: config });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      }
    },

    updateBackupConfig: async (config: BackupConfig) => {
      try {
        const updated = await invoke<BackupConfig>('set_backup_config', { config });
        dispatch({ type: 'SET_BACKUP_CONFIG', payload: updated });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    loadSettings: async () => {
      try {
        const settings = await invoke<AppSettings>('get_settings');
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      }
    },

    updateSettings: async (settings: AppSettings) => {
      try {
        const updated = await invoke<AppSettings>('set_settings', { settings });
        dispatch({ type: 'SET_SETTINGS', payload: updated });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    loadActivityLog: async () => {
      try {
        const log = await invoke<ActivityLog[]>('get_activity_log');
        dispatch({ type: 'SET_ACTIVITY_LOG', payload: log });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
      }
    },

    authenticateGithub: async (token: string) => {
      try {
        const user = await invoke<{ login: string; avatar_url: string; name: string }>('authenticate_github', { token });
        dispatch({ type: 'SET_GITHUB_TOKEN', payload: token });
        dispatch({ type: 'SET_GITHUB_USER', payload: user });
        dispatch({ type: 'SET_GITHUB_AUTHENTICATED', payload: true });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    loadGithubRepos: async () => {
      try {
        const repos = await invoke<any[]>('get_github_repos');
        return repos;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    importGithubRepos: async (repoIds: string[], basePath: string) => {
      try {
        const imported = await invoke<Repository[]>('import_github_repos', { repoIds, localBasePath: basePath });
        imported.forEach(repo => {
          dispatch({ type: 'ADD_REPOSITORY', payload: repo });
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: String(error) });
        throw error;
      }
    },

    selectDirectory: async () => {
      return await invoke<string>('select_directory');
    },
  };

  // Get stats
  const getStats = (): DashboardStats => {
    const repos = state.repositories;
    return {
      totalRepos: repos.length,
      syncedRepos: repos.filter(r => r.status === 'synced').length,
      pendingRepos: repos.filter(r => r.status === 'pending' || r.status === 'not_cloned').length,
      errorRepos: repos.filter(r => r.status === 'error').length,
      totalSize: repos.reduce((acc, r) => acc + r.size, 0),
      lastSyncTime: repos.reduce<string | null>((acc, r) => {
        if (!r.lastSync) return acc;
        if (!acc) return r.lastSync;
        return r.lastSync > acc ? r.lastSync : acc;
      }, null),
      lastBackupTime: repos.reduce<string | null>((acc, r) => {
        if (!r.lastBackup) return acc;
        if (!acc) return r.lastBackup;
        return r.lastBackup > acc ? r.lastBackup : acc;
      }, null),
    };
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions, getStats }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
