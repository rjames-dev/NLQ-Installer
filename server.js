import express from 'express';
import Docker from 'dockerode';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

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
  services: {}
};

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

// Helper: Execute docker-compose deployment
async function deploySystem(system = 'nlq') {
  return new Promise((resolve, reject) => {
    // Determine the docker-compose directory
    let composePath;
    if (system === 'migration') {
      composePath = existsSync('/app/migration-system') ? '/app/migration-system' : './migration-system';
    } else {
      composePath = existsSync('/app/nlq-system') ? '/app/nlq-system' : './nlq-system';
    }

    const command = `docker-compose -f "${composePath}/docker-compose.yml" up -d`;

    console.log(`🚀 Starting deployment: ${command}`);

    const child = exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Deployment error:', error);
        reject({
          status: 'error',
          message: `Deployment failed: ${error.message}`,
          stderr: stderr
        });
      } else {
        console.log('✅ Deployment completed');
        console.log(stdout);
        resolve({
          status: 'success',
          message: `${system} system deployment initiated`,
          stdout: stdout
        });
      }
    });

    // Stream logs back to caller if WebSocket is available
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        console.log(data.toString());
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        console.log(data.toString());
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

    // Trigger docker-compose deployment asynchronously
    // Don't wait for it to complete - return immediately and stream logs separately
    deploySystem('nlq').catch(error => {
      console.error('❌ NLQ deployment error:', error);
    });

    if (config.includeMigration) {
      deploySystem('migration').catch(error => {
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
