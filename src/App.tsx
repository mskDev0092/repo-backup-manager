// Main App Component
import { AppProvider, useApp } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import Backups from './pages/Backups';
import Settings from './pages/Settings';
import Activity from './pages/Activity';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';

function AppContent() {
  const { state } = useApp();

  const renderCurrentView = () => {
    switch (state.currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'repositories':
        return <Repositories />;
      case 'backups':
        return <Backups />;
      case 'settings':
        return <Settings />;
      case 'activity':
        return <Activity />;
      default:
        return <Dashboard />;
    }
  };

  if (state.isLoading && state.repositories.length === 0) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {renderCurrentView()}
        </main>
      </div>
      {state.error && <Toast message={state.error} type="error" />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
