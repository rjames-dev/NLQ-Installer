# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is the **NLQ Platform Installer** - a guided web-based installation UI for the [rjames-dev/NLQ](https://github.com/rjames-dev/NLQ) project. It will eventually be integrated into the main NLQ GitHub repository as the recommended installation method for non-technical users.

**NLQ** (Natural Language Query) is a comprehensive platform that combines:
- **NLQ System**: AI-powered natural language database querying using Anthropic's Claude
- **Migration System**: Visual workflow builder for safe data migration between databases

This installer simplifies the setup process by providing a step-by-step graphical wizard instead of requiring users to manually configure environment variables and run CLI commands.

- **Status**: In Development (v0.9.0-beta, Testing Phase)
- **Target Release**: v1.1.0 (post v1.0.0 CLI-based release)
- **GitHub Destination**: Will be included in https://github.com/rjames-dev/NLQ
- **Tech Stack**: React 18 + Vite (frontend), Express.js + Node.js (backend), Docker/Dockerode integration
- **Dashboard Port**: 3001

## Common Development Commands

### Development
```bash
# Install dependencies
npm install

# Start full development (frontend :5173 + backend :3001 with file watching)
npm run dev

# Backend only (Node with --watch for auto-restart)
npm run server:dev

# Frontend only (Vite dev server)
npm run client:dev
```

### Production Build & Testing
```bash
# Build React frontend for production (outputs to public/)
npm run build

# Preview production build
npm run client:preview

# Start production server
npm start
```

## Architecture Overview

### System Components Being Installed

The installer configures and deploys these NLQ platform services:

**Core Services (Always Deployed)**
- **OpenWebUI** (port 3000) - Chat interface for natural language queries
- **LiteLLM Proxy** (port 4000) - Centralized model routing to Anthropic's Claude API
- **MCP Server** (port 8000) - Model Context Protocol server for custom database tools
- **PostgreSQL (System)** (port 5434) - Internal system database

**Query Database**
- **PostgreSQL (Query)** (port 5433) - External-facing query database

**Optional**
- **Migration UI** (port 8080) - Visual workflow builder for data migrations (toggled via checkbox)

### Installer Architecture

```
Browser (React/Vite SPA)
    ↓ HTTP API (/api/*)
Express Backend (server.js, port 3001)
    ├─ Configuration management (.env file I/O)
    ├─ Installation status checking
    ├─ Service health monitoring
    └─ Docker integration (Dockerode)
    ↓ Docker socket
Docker Daemon
    └─ Service orchestration via docker-compose
```

### Installation Wizard Flow (5 Steps)

1. **Welcome** - Introduction with feature list and system requirements overview
2. **Requirements Check** - Validates Docker running, disk space (10GB+), RAM (2GB+), and port availability
3. **Configure** - Form collection for:
   - Anthropic API key
   - Database passwords (OpenWebUI, MCP)
   - Security keys (LiteLLM, WebUI)
   - Optional Migration System toggle
   - Docker registry and version (advanced)
4. **Review** - Displays configuration summary with masked sensitive values
5. **Deploy** - Executes deployment (simulated for now) and shows live log updates

After successful installation, App.jsx routes to Dashboard showing service status.

## Project File Structure

```
03 Release Platform/
├── CLAUDE.md                # This file
├── README.md               # User-facing project documentation
├── ROADMAP.md              # Testing checklist and release plan
│
├── server.js               # Express backend (API routes, Docker integration)
├── vite.config.js          # Vite build & proxy configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
│
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main router (Setup vs Dashboard)
│   ├── pages/
│   │   ├── Setup.jsx       # Installation wizard (all 5 steps + sub-components)
│   │   └── Dashboard.jsx   # Post-install service monitoring dashboard
│   ├── components/
│   │   ├── ServiceStatus.jsx    # Service health display component
│   │   └── ProxyFrame.jsx       # iFrame proxy to external services
│   └── styles/
│       └── App.css         # Main stylesheet
│
├── public/                 # Static assets & built frontend
├── index.html              # HTML entry point
├── Dockerfile              # For future containerization
├── docker/                 # Docker-related resources
│
├── package.json            # Dependencies & scripts
└── package-lock.json       # Dependency lock file
```

## Key Backend API Routes

### Status & Installation
- `GET /api/status` - Check installation status (reads nlq-system/.env)
  - Returns: `{ installed: boolean, hasApiKey: boolean, hasPasswords: boolean, timestamp }`
- `POST /api/install` - Execute installation configuration
  - Body: `{ apiKey, openwebuiPassword, mcpdbPassword, litellmKey, webuiSecret, includeMigration, registry, version }`
  - Saves to: `./nlq-system/.env` and `./migration-system/.env` (if toggled)

### Configuration
- `GET /api/config` - Retrieve current configuration (masks sensitive values)
- `POST /api/config` - Save configuration to .env files

### Service Management
- `GET /api/services/status` - Health check all services (HTTP GET to localhost:PORT/health)
- `POST /api/services/:service/restart` - Restart service (placeholder - not yet implemented)
- `GET /api/services/:service/logs` - Retrieve service logs (placeholder - not yet implemented)

### Health & SPA
- `GET /health` - Simple health check endpoint
- `GET /*` - SPA fallback serving index.html for client-side routing

## Environment Configuration

### .env File Format & Variables

Two .env files are managed:
- `./nlq-system/.env` - Always created
- `./migration-system/.env` - Created if migration system selected

**Core Variables:**
```
ANTHROPIC_API_KEY=sk-ant-...
OPENWEBUI_DB_PASSWORD=secure_password
MCPDB_PASSWORD=secure_password
LITELLM_MASTER_KEY=random_key
WEBUI_SECRET_KEY=random_key
MCP_REGISTRY=rfinancials/mydocker-repo
MCP_VERSION=v1.0.0
```

### Installation Status Detection

System is marked as "installed" when ALL conditions are met:
1. `ANTHROPIC_API_KEY` exists and doesn't contain placeholder value
2. `OPENWEBUI_DB_PASSWORD` exists and has content
3. `MCPDB_PASSWORD` exists and has content

See server.js:51-62 `checkInstallation()` function.

## Frontend Implementation Details

### React Component Patterns

**Setup.jsx** (Main Wizard Component)
- Manages step state (0-4) with form data
- Sub-components: WelcomeStep, RequirementsStep, ConfigureStep, ReviewStep, DeploymentStep
- Form validation on next/back navigation
- Simulated deployment with timed log messages
- Calls `POST /api/install` when deploying

**App.jsx** (Router)
- Fetches `/api/status` on mount
- Conditionally renders Setup (not installed) or Dashboard (installed)
- Passes `onComplete` callback to Setup

**Dashboard.jsx**
- Shows service health status via `/api/services/status`
- Displays OpenWebUI and Migration UI in iFrames via ProxyFrame
- Restart/stop buttons (placeholders for future implementation)

### Vite Proxy Configuration

Development server proxies requests to backend services:
```javascript
'/api' → http://localhost:3001
'/chat' → http://localhost:3000  (OpenWebUI)
'/migration' → http://localhost:8080  (Migration UI)
```

Allows frontend to develop locally without CORS issues.

### Tailwind CSS & Styling

- Dark theme (slate-900/slate-800 backgrounds)
- Responsive grid layouts (grid-cols-1 md:grid-cols-2)
- Status indicators: green (success), blue (info), yellow (loading), red (error)
- Icons from lucide-react for visual consistency

## Docker Integration

### Dockerode Configuration
```javascript
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
```
- Connects via Docker socket on Linux/Mac
- Docker Desktop on Windows/Mac exposes socket at standard location
- Used to query container status (not yet fully integrated with deployment)

### Service Health Checks
- Each service checked via HTTP GET to `http://localhost:PORT/health`
- 2-second timeout per check
- Returns true if status 200 received
- Runs on Dashboard page refresh

## Development Workflow

### Adding a Feature
1. **Frontend UI**: Add React component or update Setup.jsx step
2. **Backend API**: Add Express route to server.js
3. **Test locally**: `npm run dev` and verify in browser
4. **Test production build**: `npm run build && npm start`

### Debugging
- **Frontend**: Browser DevTools (Console, Network, React DevTools)
- **Backend**: Node console output + server logs
- **Docker**: Check Docker Desktop for service status
- **API**: Use `curl`, Postman, or browser Network tab

### Common Tasks

**Run single dev environment**
```bash
npm run dev  # Starts both backend and frontend
```

**Test API endpoints**
```bash
curl http://localhost:3001/api/status
curl -X POST http://localhost:3001/api/install -H "Content-Type: application/json" -d '...'
```

**View service logs**
```bash
docker logs <service-name>
docker-compose logs -f
```

**Rebuild and deploy locally**
```bash
npm run build
npm start
# Visit http://localhost:3001
```

## Testing & Known Limitations

**See ROADMAP.md for:**
- Complete 10-phase testing checklist
- Known issues and workarounds
- Performance testing procedures
- Browser compatibility testing
- Integration testing guidance

### Current Limitations (Pre-Release)

1. **Deployment Simulation** - Deployment logs are simulated with timed messages, not integrated with actual docker-compose execution
2. **Service Control** - Restart/stop buttons in Dashboard are placeholders
3. **Configuration Editing** - Cannot modify configuration after initial installation (requires manual .env editing)
4. **Log Retrieval** - No real-time service log viewing in Dashboard
5. **Port Customization** - All ports are hardcoded (no configuration during setup)
6. **Error Recovery** - Limited error handling for failed deployments

## Integration with Main NLQ Repository

When this project is merged into https://github.com/rjames-dev/NLQ:

1. This directory becomes: `nlq-repo/installer/` or similar
2. Updated README references it as the recommended installation method
3. Main repo's INSTALL.md references both:
   - CLI method (for servers/advanced users)
   - Web UI method (for desktop/graphical preference)
4. Automated setup scripts may use this installer as a fallback option
5. CI/CD pipelines may test this installer alongside CLI installation

## Key Functions & Implementation Notes

### server.js Critical Functions

**loadConfig()** (line 26)
- Reads and parses .env files
- Handles missing files gracefully
- Returns object with all environment variables

**checkInstallation()** (line 51)
- Validates presence of required configuration variables
- Used by App.jsx to determine routing
- Single source of truth for installation status

**getServiceStatus()** (line 64)
- Performs health checks on all 5+ services
- Sets `healthy: true/false` based on HTTP response
- Runs async with parallel checks

**saveConfig()** (line 93)
- Writes configuration to .env format
- Supports both nlq-system and migration-system
- Overwrites existing files

### Setup.jsx Key State & Handlers

**State:**
- `step` - Current wizard step (0-4)
- `formData` - Configuration form values
- `deploymentLogs` - Array of log messages with timestamps
- `deploying` - Boolean for deployment in progress

**Handlers:**
- `handleNext()` / `handleBack()` - Step navigation
- `handleDeploy()` - Triggers deployment and log simulation
- `handleInputChange()` - Form input handling
- `addLog()` - Accumulates deployment log messages

## Security Considerations

1. **Sensitive Data Masking** - API responses mask values with `****` or `••••••••`
2. **Password Fields** - Use `type="password"` in all credential inputs
3. **No Client-Side Validation** - Rely on backend validation
4. **Environment Variable Storage** - .env files should NOT be committed to git
5. **.gitignore** - Must exclude: .env, .env.local, nlq-system/.env, migration-system/.env

## Performance Notes

- Frontend builds with Vite (fast HMR in dev, optimized bundles for production)
- Backend is lightweight Express.js (minimal overhead)
- Docker integration is read-only (no CPU-intensive operations)
- Health checks have 2-second timeout to avoid UI blocking
- Deployment simulation uses async/await with proper sequencing
