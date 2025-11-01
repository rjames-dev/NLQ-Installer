import React, { useState, useEffect } from 'react';
import { MessageSquare, Database, Settings, BarChart3, HelpCircle, Power, RotateCw } from 'lucide-react';
import ServiceStatus from '../components/ServiceStatus';
import ProxyFrame from '../components/ProxyFrame';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('chat');
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceStatus();
    const interval = setInterval(loadServiceStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/services/status');
      const data = await response.json();
      setServices(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleRestart = async (service) => {
    try {
      await fetch(`/api/services/${service}/restart`, { method: 'POST' });
      // Reload status
      setTimeout(loadServiceStatus, 2000);
    } catch (error) {
      console.error('Error restarting service:', error);
    }
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'migrate', label: 'Migrate', icon: Database },
    { id: 'status', label: 'Status', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle }
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold">NLQ</h1>
          <p className="text-xs text-slate-400 mt-1">Platform Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Service Status Bar (Footer) */}
        <div className="border-t border-slate-700 p-4">
          <p className="text-xs font-bold text-slate-400 mb-3 uppercase">Services</p>
          <div className="space-y-2 text-xs">
            {Object.entries(services).slice(0, 3).map(([name, info]) => (
              <div key={name} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${info.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-slate-300 capitalize">{name.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-8 py-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <div className="text-sm text-slate-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'chat' && (
            <ChatTab />
          )}

          {activeTab === 'migrate' && (
            <MigrateTab />
          )}

          {activeTab === 'status' && (
            <StatusTab services={services} onRestart={handleRestart} loading={loading} />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}

          {activeTab === 'help' && (
            <HelpTab />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatTab() {
  return (
    <ProxyFrame
      title="Claude Chat Interface"
      subtitle="Ask questions, run queries, generate charts"
      url="/chat"
      loading={false}
    />
  );
}

function MigrateTab() {
  return (
    <ProxyFrame
      title="Data Migration"
      subtitle="Migrate data between systems"
      url="/migration"
      loading={false}
    />
  );
}

function StatusTab({ services, onRestart, loading }) {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <p className="text-slate-400 mb-6">
          Monitor and manage running services
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(services).map(([name, info]) => (
            <ServiceStatus
              key={name}
              name={name}
              info={info}
              onRestart={() => onRestart(name)}
            />
          ))}
        </div>

        {Object.keys(services).length === 0 && (
          <div className="bg-slate-800 rounded-lg p-12 text-center">
            <p className="text-slate-400">Loading service status...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const [config, setConfig] = React.useState({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-bold mb-6">System Configuration</h3>

        {loading ? (
          <p className="text-slate-400">Loading configuration...</p>
        ) : (
          <div className="bg-slate-800 rounded-lg p-6 space-y-4">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-slate-400">{key}</span>
                <span className="font-mono text-sm">{String(value).substring(0, 20)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HelpTab() {
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h3 className="text-xl font-bold">Help & Documentation</h3>

        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-6">
            <h4 className="font-bold mb-2">Getting Started</h4>
            <p className="text-slate-400 text-sm mb-4">
              Welcome to the NLQ Platform! Here are some quick links to get you started.
            </p>
            <ul className="space-y-2 text-sm text-blue-400">
              <li>→ <a href="#" className="hover:underline">Configure Claude Model</a></li>
              <li>→ <a href="#" className="hover:underline">Connect to MCP Tools</a></li>
              <li>→ <a href="#" className="hover:underline">Run Your First Query</a></li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h4 className="font-bold mb-2">Common Issues</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Can't see MCP tools? Check that the service is healthy in Status tab</li>
              <li>• Getting database errors? Verify database passwords match</li>
              <li>• Claude not responding? Check API key in settings</li>
            </ul>
          </div>

          <div className="bg-blue-900 border border-blue-700 rounded-lg p-6">
            <h4 className="font-bold mb-2 text-blue-100">Need More Help?</h4>
            <p className="text-sm text-blue-200">
              Check out our documentation at docs.example.com or contact support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
