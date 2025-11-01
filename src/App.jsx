import React, { useEffect, useState } from 'react';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import './styles/App.css';

export default function App() {
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInstallation();
  }, []);

  const checkInstallation = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setInstalled(data.installed);
    } catch (error) {
      console.error('Error checking installation:', error);
      setInstalled(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallationComplete = () => {
    setInstalled(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-lg">Initializing NLQ Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {!installed ? (
        <Setup onComplete={handleInstallationComplete} />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
