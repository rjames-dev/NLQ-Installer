import express from 'express';
import Docker from 'dockerode';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import net from 'net';

const app = express();
const port = process.env.PORT || 3001; // Dashboard runs on 3001, platform services on different ports

// Initialize Docker with cross-platform socket support
function getDockerSocket() {
  // Try common socket paths
  const socketPaths = [
    '/var/run/docker.sock',  // Linux and Docker Desktop on Mac/Windows via mount
    process.env.DOCKER_HOST, // Environment variable override
  ];

  // Add user-specific paths for macOS Docker Desktop
  if (process.platform === 'darwin') {
    const homeDir = process.env.HOME;
    if (homeDir) {
      socketPaths.push(`${homeDir}/.docker/run/docker.sock`);
    }
  }

  // Find first available socket
  for (const socketPath of socketPaths) {
    if (socketPath && existsSync(socketPath)) {
      console.log(`✅ Docker socket found at: ${socketPath}`);
      return { socketPath };
    }
  }

  console.warn('⚠️ No Docker socket found. Some features may not work.');
  console.warn('Available socket paths tried:', socketPaths.filter(Boolean).join(', '));

  // Return default - might fail but allows graceful degradation
  return { socketPath: '/var/run/docker.sock' };
}

const docker = new Docker(getDockerSocket());

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// Platform state
let platformState = {
  isInstalled: false,
  config: {},
  services: {},
  deploymentServicePort: null
};

// =====================================================================
// Port Detection Utilities
// =====================================================================

/**
 * Check if a port is available on localhost
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find available port starting from given port
 */
async function findAvailablePort(startPort = 3002, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const testPort = startPort + i;
    if (await isPortAvailable(testPort)) {
      return testPort;
    }
  }
  return null;
}

/**
 * Get deployment service hostname for container communication
 * Returns appropriate hostname based on execution context
 */
function getDeploymentServiceHost() {
  // If DEPLOYMENT_SERVICE_PORT is set, we're running in docker-compose
  // Use the container hostname for DNS resolution via docker-compose network
  if (process.env.DEPLOYMENT_SERVICE_PORT) {
    console.log('🐳 Running in docker-compose environment - using container hostname');
    return 'nlq-deployment-service';
  }

  // Otherwise, we're running locally/outside docker
  // Use host.docker.internal for Docker Desktop on Mac/Windows
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'win32') {
    return 'host.docker.internal';
  }

  // On Linux, use the Docker gateway IP
  return '172.17.0.1';
}

// Helper: Load configuration from .env
function loadConfig() {
  try {
    // Try paths in order: /app/nlq-system (container), ./nlq-system (local dev)
    let nlqEnvPath = '/app/nlq-system/.env';
    if (!existsSync(nlqEnvPath)) {
      nlqEnvPath = './nlq-system/.env';
    }

    const envContent = readFileSync(nlqEnvPath, 'utf8');
    const lines = envContent.split('\n');
    const config = {};

    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, ...rest] = line.split('=');
        if (key) {
          config[key.trim()] = rest.join('=').trim();
        }
      }
    });

    return config;
  } catch (error) {
    console.log('Config not found yet:', error.message);
    return {};
  }
}

// Helper: Execute docker-compose deployment via deployment service
async function deploySystem(system = 'nlq', deploymentPort = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use provided port or from platform state
      const port = deploymentPort || platformState.deploymentServicePort || 3002;
      const deploymentServiceHost = getDeploymentServiceHost();
      const deploymentServiceUrl = `http://${deploymentServiceHost}:${port}/deploy`;

      console.log(`🚀 Starting deployment via service: ${deploymentServiceUrl}`);
      console.log(`📦 System: ${system}`);
      console.log(`🐳 Using deployment service host: ${deploymentServiceHost}`);

      // Call the deployment service
      // Note: deploymentService reads paths from environment variables, not from request body
      const response = await axios.post(deploymentServiceUrl, {
        system: system
      }, {
        timeout: 30 * 60 * 1000 // 30 minute timeout
      });

      const data = response.data;

      if (data.status === 'error') {
        console.error('❌ Deployment error:', data.message);
        reject({
          status: 'error',
          message: `Deployment failed: ${data.message}`,
          stderr: data.stderr,
          composePath: data.composePath
        });
      } else {
        console.log('✅ Deployment initiated on host');
        console.log(data.stdout);
        resolve({
          status: 'success',
          message: `${system} system deployment initiated via host service`,
          stdout: data.stdout,
          system: system
        });
      }
    } catch (error) {
      console.error('❌ Deployment service error:', error.message);

      // Provide helpful error messages
      let message = error.message;
      if (error.code === 'ECONNREFUSED') {
        message = `Could not connect to deployment service. Make sure the deployment service is running on port ${platformState.deploymentServicePort || 3002}`;
      }

      reject({
        status: 'error',
        message: `Deployment failed: ${message}`,
        system: system,
        error: error.message
      });
    }
  });
}

// Helper: Check if installation is complete
function checkInstallation() {
  try {
    const config = loadConfig();
    const hasApiKey = config.ANTHROPIC_API_KEY && !config.ANTHROPIC_API_KEY.includes('sk-ant-api03');
    const hasPasswords = config.OPENWEBUI_DB_PASSWORD && config.MCPDB_PASSWORD;

    return hasApiKey && hasPasswords;
  } catch {
    return false;
  }
}

// Helper: Get service health status
async function getServiceStatus() {
  try {
    const services = {
      openwebui: { port: 3000, healthy: false },  // OpenWebUI web interface
      mcp: { port: 8000, healthy: false },        // Custom MCP Server
      litellm: { port: 4000, healthy: false },    // LiteLLM API proxy
      postgres_system: { port: 5434, healthy: false },  // System database (internal)
      postgres_query: { port: 5433, healthy: false }    // Query database (external)
    };

    for (const [service, info] of Object.entries(services)) {
      try {
        const response = await axios.get(`http://localhost:${info.port}/health`, {
          timeout: 2000
        });
        info.healthy = response.status === 200;
      } catch {
        info.healthy = false;
      }
    }

    return services;
  } catch (error) {
    console.error('Error getting service status:', error);
    return {};
  }
}

// Helper: Save configuration to .env
function saveConfig(config, system = 'nlq') {
  try {
    // Use /app paths for container, fall back to ./ for local dev
    let envPath;
    if (system === 'migration') {
      envPath = '/app/migration-system/.env';
      if (!existsSync('/app/migration-system')) {
        envPath = './migration-system/.env';
      }
    } else {
      envPath = '/app/nlq-system/.env';
      if (!existsSync('/app/nlq-system')) {
        envPath = './nlq-system/.env';
      }
    }

    let content = '';
    for (const [key, value] of Object.entries(config)) {
      content += `${key}=${value}\n`;
    }

    writeFileSync(envPath, content);
    console.log(`✅ Configuration saved to ${envPath}`);
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

// =====================================================================
// API Routes
// =====================================================================

// GET - Check installation status
app.get('/api/status', (req, res) => {
  const isInstalled = checkInstallation();
  const config = loadConfig();

  res.json({
    installed: isInstalled,
    hasApiKey: !!config.ANTHROPIC_API_KEY,
    hasPasswords: !!(config.OPENWEBUI_DB_PASSWORD && config.MCPDB_PASSWORD),
    timestamp: new Date()
  });
});

// GET - Get current configuration
app.get('/api/config', (req, res) => {
  try {
    const config = loadConfig();

    // Hide sensitive values
    const safeConfig = {
      ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY ? '****' : '',
      OPENWEBUI_DB_PASSWORD: config.OPENWEBUI_DB_PASSWORD ? '****' : '',
      MCPDB_PASSWORD: config.MCPDB_PASSWORD ? '****' : '',
      LITELLM_MASTER_KEY: config.LITELLM_MASTER_KEY ? '****' : '',
      WEBUI_SECRET_KEY: config.WEBUI_SECRET_KEY ? '****' : '',
      OPENWEBUI_PORT: config.OPENWEBUI_PORT || '3000',     // OpenWebUI web interface
      MCP_PORT: config.MCP_PORT || '8000',                 // Custom MCP Server
      LITELLM_PORT: config.LITELLM_PORT || '4000',         // LiteLLM API proxy
      MIGRATION_UI_PORT: config.MIGRATION_UI_PORT || '8080', // Migration UI web interface
      MCP_REGISTRY: config.MCP_REGISTRY || 'rfinancials/mydocker-repo',
      MCP_VERSION: config.MCP_VERSION || 'v1.0.0'
    };

    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Save configuration
app.post('/api/config', (req, res) => {
  try {
    const config = req.body;
    const success = saveConfig(config);

    if (success) {
      res.json({ success: true, message: 'Configuration saved' });
    } else {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Service status
app.get('/api/services/status', async (req, res) => {
  try {
    const status = await getServiceStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Deployment service port detection
app.get('/api/deployment-port', async (req, res) => {
  try {
    const defaultPort = 3002;
    const available = await isPortAvailable(defaultPort);

    if (available) {
      platformState.deploymentServicePort = defaultPort;
      return res.json({
        available: true,
        port: defaultPort,
        host: getHostAddress(),
        url: `http://${getHostAddress()}:${defaultPort}`
      });
    }

    // Port 3002 is in use, find alternatives
    console.log(`⚠️ Port ${defaultPort} is in use, finding alternatives...`);
    const alternatives = [];

    for (let i = 1; i <= 5; i++) {
      const testPort = defaultPort + i;
      if (await isPortAvailable(testPort)) {
        alternatives.push(testPort);
      }
    }

    res.json({
      available: false,
      port: defaultPort,
      inUse: true,
      alternatives: alternatives,
      host: getHostAddress(),
      message: `Default port ${defaultPort} is in use. Available alternatives: ${alternatives.join(', ')}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Set deployment service port
app.post('/api/deployment-port', async (req, res) => {
  try {
    const { port } = req.body;

    if (!port || typeof port !== 'number') {
      return res.status(400).json({ error: 'Port must be a number' });
    }

    const available = await isPortAvailable(port);

    if (!available) {
      return res.status(400).json({
        error: `Port ${port} is not available`,
        port: port
      });
    }

    platformState.deploymentServicePort = port;
    console.log(`✅ Deployment service port set to ${port}`);

    res.json({
      success: true,
      port: port,
      host: getHostAddress(),
      url: `http://${getHostAddress()}:${port}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Restart service
app.post('/api/services/:service/restart', async (req, res) => {
  try {
    const { service } = req.params;

    // This would trigger a docker-compose restart
    // For now, return success placeholder
    res.json({
      success: true,
      message: `Service ${service} restart initiated`,
      service
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - Get logs for a service
app.get('/api/services/:service/logs', async (req, res) => {
  try {
    const { service } = req.params;

    // Placeholder for log retrieval
    res.json({
      service,
      logs: 'Service logs would appear here'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Run installation and deployment
app.post('/api/install', async (req, res) => {
  try {
    const config = req.body;

    console.log('📝 Saving configuration...');

    // Save configuration to both systems
    const nlqConfig = {
      ANTHROPIC_API_KEY: config.apiKey,
      OPENWEBUI_DB_PASSWORD: config.openwebuiPassword,
      MCPDB_PASSWORD: config.mcpdbPassword,
      LITELLM_MASTER_KEY: config.litellmKey,
      WEBUI_SECRET_KEY: config.webuiSecret,
      MCP_REGISTRY: config.registry || 'rfinancials/mydocker-repo',
      MCP_VERSION: config.version || 'v1.0.0'
    };

    saveConfig(nlqConfig, 'nlq');

    if (config.includeMigration) {
      saveConfig({
        MIGRATION_DB_PASSWORD: config.migrationPassword || config.mcpdbPassword
      }, 'migration');
    }

    console.log('🚀 Initiating docker-compose deployment...');
    console.log(`📍 Using deployment service on port: ${platformState.deploymentServicePort || 3002}`);

    // Trigger docker-compose deployment asynchronously via host service
    // Don't wait for it to complete - return immediately and stream logs separately
    deploySystem('nlq', config.deploymentServicePort).catch(error => {
      console.error('❌ NLQ deployment error:', error);
    });

    if (config.includeMigration) {
      deploySystem('migration', config.deploymentServicePort).catch(error => {
        console.error('❌ Migration deployment error:', error);
      });
    }

    res.json({
      success: true,
      message: 'Configuration saved. Deployment starting in background. Check /api/services/status for progress.',
      config: { apiKey: '****', ...config }
    });
  } catch (error) {
    console.error('Installation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// SPA fallback - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(join(process.cwd(), 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 NLQ Platform Dashboard running on http://localhost:${port}`);
  console.log(`📦 API available at http://localhost:${port}/api`);

  // Check installation status
  setTimeout(() => {
    const isInstalled = checkInstallation();
    console.log(`✅ Installation status: ${isInstalled ? 'Complete' : 'Pending'}`);
  }, 1000);
});
