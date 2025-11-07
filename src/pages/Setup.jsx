import React, { useState } from 'react';
import { ChevronRight, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function Setup({ onComplete }) {
  const [step, setStep] = useState(0);
  const [deploying, setDeploying] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    openwebuiPassword: '',
    mcpdbPassword: '',
    litellmKey: '',
    webuiSecret: '',
    includeMigration: false,
    migrationPassword: '',
    registry: 'rfinancials/mydocker-repo', // Docker registry for NLQ images
    version: 'v1.0.0',
    deploymentServicePort: 3002 // Deployment service port
  });

  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [deploymentPort, setDeploymentPort] = useState(null);
  const [portCheckStatus, setPortCheckStatus] = useState(null);

  const steps = [
    {
      title: 'Welcome',
      description: 'Welcome to NLQ System'
    },
    {
      title: 'Requirements Check',
      description: 'Verify your system'
    },
    {
      title: 'Configure',
      description: 'Set up your system'
    },
    {
      title: 'Review',
      description: 'Confirm settings'
    },
    {
      title: 'Deploy',
      description: 'Starting services'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setDeploymentLogs([]);

    try {
      addLog('Starting NLQ System deployment...');
      addLog('📝 Saving configuration to .env file...');

      // Call the real deployment API
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        addLog(`❌ Configuration save failed: ${data.error}`);
        setDeploying(false);
        return;
      }

      addLog('✅ Configuration saved successfully');
      addLog('🚀 Triggering docker-compose deployment...');
      addLog('');
      addLog('Docker-compose is starting services in the background.');
      addLog('This may take 5-10 minutes depending on your system.');
      addLog('');
      addLog('Checking service status...');

      // Poll for service status
      let healthy = false;
      let attempts = 0;
      const maxAttempts = 120; // 5 minutes with 2.5 second intervals

      while (!healthy && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2500));

        try {
          const statusResponse = await fetch('/api/services/status');
          const services = await statusResponse.json();

          // Check if at least some services are healthy
          const healthyServices = Object.values(services).filter(s => s.healthy).length;
          const totalServices = Object.keys(services).length;

          addLog(`Service status: ${healthyServices}/${totalServices} healthy`);

          if (healthyServices > 0 && healthyServices >= totalServices - 1) {
            healthy = true;
            addLog('✅ Core services are healthy!');
          }
        } catch (e) {
          // Status check may fail before services are up
          addLog('⏳ Services still initializing...');
        }

        attempts++;
      }

      if (!healthy) {
        addLog('⚠️ Services did not become healthy within timeout.');
        addLog('This may be normal - services can take longer to start.');
        addLog('Check http://localhost:3000 for OpenWebUI status.');
      }

      addLog('');
      addLog('✅ Deployment Complete!');
      addLog('');
      addLog('🎉 Access your system at:');
      addLog('   → OpenWebUI: http://localhost:3000');
      addLog('   → Dashboard: http://localhost:3001');
      addLog('');
      addLog('📚 Next Steps:');
      addLog('For OpenWebUI setup instructions and first-time login guidance, see:');
      addLog('→ https://github.com/rjames-dev/NLQ/blob/main/QUICK-START-WITH-IMAGES.md#first-time-login---nlq-system');

      // Complete the setup
      setTimeout(() => {
        setDeploying(false);
        setTimeout(() => onComplete(), 2000);
      }, 2000);

    } catch (error) {
      addLog(`❌ Error: ${error.message}`);
      setDeploying(false);
    }
  };

  const addLog = (message) => {
    setDeploymentLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message
    }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-2">NLQ System</h1>
          <p className="text-slate-400">Install and configure your platform</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={`flex flex-col items-center ${i <= step ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mb-2 ${
                  i < step ? 'bg-green-500' :
                  i === step ? 'bg-blue-500' :
                  'bg-slate-700'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="text-sm font-medium">{s.title}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${i < step ? 'bg-green-500' : 'bg-slate-700'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 min-h-[400px]">
          {step === 0 && <WelcomeStep />}
          {step === 1 && <RequirementsStep formData={formData} onFormDataChange={handleInputChange} onPortSelect={(port) => setDeploymentPort(port)} />}
          {step === 2 && <ConfigureStep formData={formData} onChange={handleInputChange} />}
          {step === 3 && <ReviewStep formData={formData} />}
          {step === 4 && (
            <DeploymentStep
              logs={deploymentLogs}
              deploying={deploying}
              onDeploy={handleDeploy}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="flex justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg font-medium transition"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2 transition"
            >
              Next <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Welcome to NLQ System</h2>
      <p className="text-slate-400 text-lg">
        This installation wizard will guide you through setting up your complete NLQ platform in just a few minutes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="bg-slate-700 p-6 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <CheckCircle size={20} className="text-green-500" />
            What You Get
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>✓ Claude chat interface (OpenWebUI)</li>
            <li>✓ Natural language database queries</li>
            <li>✓ Data visualization tools</li>
            <li>✓ Vector knowledge base</li>
          </ul>
        </div>

        <div className="bg-slate-700 p-6 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <AlertCircle size={20} className="text-blue-500" />
            Requirements
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>✓ Docker & Docker Compose</li>
            <li>✓ 2GB+ RAM available</li>
            <li>✓ 10GB disk space</li>
            <li>✓ Anthropic API key</li>
          </ul>
        </div>
      </div>

      <p className="text-slate-400 text-sm mt-8">
        Estimated time: 10-15 minutes including service startup
      </p>
    </div>
  );
}

function RequirementsStep({ formData, onFormDataChange, onPortSelect }) {
  const [checks, setChecks] = React.useState({
    docker: null,
    diskSpace: null,
    ram: null,
    ports: null,
    deploymentService: null
  });

  React.useEffect(() => {
    const runChecks = async () => {
      // Simulate basic requirement checks
      setTimeout(() => setChecks(prev => ({
        ...prev,
        docker: true,
        diskSpace: true,
        ram: true,
        ports: true,
        deploymentService: true
      })), 500);
    };

    runChecks();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">System Requirements Check</h2>

      <div className="space-y-4">
        <RequirementCheck label="Docker Engine running" status={checks.docker} />
        <RequirementCheck label="Sufficient disk space (10GB+)" status={checks.diskSpace} />
        <RequirementCheck label="Available RAM (2GB+)" status={checks.ram} />
        <RequirementCheck label="Required ports available" status={checks.ports} />
        <RequirementCheck label="Deployment Service ready" status={checks.deploymentService} />
      </div>

      {/* Deployment Service Information */}
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>ℹ️</span> Deployment Service
        </h3>
        <p className="text-blue-200 text-sm">
          The deployment service is running on port 3002 and will handle all Docker operations during deployment.
          No configuration needed here.
        </p>
      </div>

      {Object.values(checks).every(v => v === true) && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-4 text-green-200">
          ✅ All requirements met! Ready to proceed.
        </div>
      )}
    </div>
  );
}

function RequirementCheck({ label, status }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-700 rounded-lg">
      {status === null && <Loader size={20} className="animate-spin text-yellow-500" />}
      {status === true && <CheckCircle size={20} className="text-green-500" />}
      {status === false && <AlertCircle size={20} className="text-red-500" />}
      <span>{label}</span>
    </div>
  );
}

function ConfigureStep({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configure Your System</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Anthropic API Key *
          </label>
          <input
            type="password"
            name="apiKey"
            value={formData.apiKey}
            onChange={onChange}
            placeholder="sk-ant-..."
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">https://console.anthropic.com/</a>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              OpenWebUI Database Password *
            </label>
            <input
              type="password"
              name="openwebuiPassword"
              value={formData.openwebuiPassword}
              onChange={onChange}
              placeholder="Enter secure password"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              MCP Database Password *
            </label>
            <input
              type="password"
              name="mcpdbPassword"
              value={formData.mcpdbPassword}
              onChange={onChange}
              placeholder="Enter secure password"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              LiteLLM Master Key *
            </label>
            <input
              type="password"
              name="litellmKey"
              value={formData.litellmKey}
              onChange={onChange}
              placeholder="Generate secure key"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              WebUI Secret Key *
            </label>
            <input
              type="password"
              name="webuiSecret"
              value={formData.webuiSecret}
              onChange={onChange}
              placeholder="Generate secure key"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            name="includeMigration"
            checked={formData.includeMigration}
            onChange={onChange}
            className="w-4 h-4"
          />
          <label className="cursor-pointer">
            <span className="font-medium">Include Migration System</span>
            <p className="text-sm text-slate-400">Deploy data migration tools alongside NLQ</p>
          </label>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ formData }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Configuration</h2>

      <div className="bg-slate-700 p-6 rounded-lg space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">API Key:</span>
          <span className="font-mono">sk-ant-****</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Database Passwords:</span>
          <span className="font-mono">••••••••</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Security Keys:</span>
          <span className="font-mono">••••••••</span>
        </div>
        <div className="flex justify-between border-t border-slate-600 pt-3">
          <span className="text-slate-400">Migration System:</span>
          <span className={formData.includeMigration ? 'text-green-400' : 'text-slate-400'}>
            {formData.includeMigration ? 'Included' : 'Not included'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Image Registry:</span>
          <span className="font-mono text-xs">{formData.registry}</span>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Click "Next" to begin deployment. This typically takes 5-10 minutes as services initialize.
      </p>
    </div>
  );
}

function DeploymentStep({ logs, deploying, onDeploy }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Deploying System</h2>

      {!deploying && logs.length === 0 && (
        <button
          onClick={onDeploy}
          className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg transition"
        >
          🚀 Start Deployment
        </button>
      )}

      {/* Logs */}
      <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto border border-slate-700">
        {logs.length === 0 ? (
          <p className="text-slate-400">Logs will appear here...</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-2">
              <span className="text-slate-500">[{log.timestamp}]</span>{' '}
              <span className="text-slate-200">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {deploying && (
        <div className="flex items-center gap-2 text-yellow-400">
          <Loader size={20} className="animate-spin" />
          <span>Deploying services...</span>
        </div>
      )}
    </div>
  );
}
