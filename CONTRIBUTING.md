# Contributing to NLQ Installer

Thanks for your interest in improving NLQ Installer! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Docker (for testing)
- Git

### Clone & Install

```bash
git clone https://github.com/rjames-dev/NLQ-Installer.git
cd NLQ-Installer
npm install
```

### Development Server

Start both backend and frontend:

```bash
npm run dev
```

This runs:
- **Backend**: Node.js server on port 3001
- **Frontend**: Vite dev server on port 5173

Open http://localhost:5173 (frontend will proxy to backend)

### Individual Commands

```bash
# Backend only (with auto-reload)
npm run server:dev

# Frontend only (Vite)
npm run client:dev

# Build for production
npm run build

# Test production build
npm start
```

## Project Structure

```
src/
├── App.jsx                 # Main router (Setup vs Dashboard)
├── pages/
│   ├── Setup.jsx          # Installation wizard (all 5 steps)
│   └── Dashboard.jsx      # Post-install monitoring dashboard
├── components/
│   ├── ServiceStatus.jsx  # Service health display
│   └── ProxyFrame.jsx     # iFrame proxies to external services
└── styles/
    └── App.css            # Styling

server.js                   # Express backend with API routes
vite.config.js             # Frontend build config
Dockerfile                 # Container definition
```

## Key Features to Understand

### Installation Wizard (5 Steps)
1. **Welcome** - Feature overview
2. **Requirements Check** - System validation
3. **Configuration** - Form collection
4. **Review** - Settings confirmation
5. **Deploy** - Real docker-compose execution

### Backend API Routes
- `GET /api/status` - Check installation status
- `GET /api/config` - Get current configuration
- `POST /api/config` - Save configuration
- `POST /api/install` - Execute deployment
- `GET /api/services/status` - Service health check
- `POST /api/services/:service/restart` - Restart service

### Docker Integration
- Detects Docker socket (cross-platform)
- Executes docker-compose commands
- Polls service health via HTTP

## Making Changes

### Code Style
- Use ES6+ syntax
- React functional components with hooks
- No PropTypes required (small app)
- Use Tailwind CSS for styling

### Testing Your Changes

**Locally:**
```bash
npm run dev
# Visit http://localhost:5173
```

**Docker:**
```bash
docker build -t my-nlq-installer:test .
docker run -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/test-nlq-system:/app/nlq-system \
  my-nlq-installer:test
# Visit http://localhost:3001
```

## Common Development Tasks

### Add a New API Endpoint

1. Create the handler in `server.js`
2. Call it from React components via `fetch('/api/...')`
3. Test with curl or Postman

Example:
```javascript
// server.js
app.post('/api/custom-action', async (req, res) => {
  try {
    // Your logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

```javascript
// React component
const response = await fetch('/api/custom-action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' })
});
```

### Modify the Wizard

Edit `src/pages/Setup.jsx`:
- Add/remove steps by modifying the `steps` array
- Create new step sub-components (e.g., `MyCustomStep()`)
- Update the step content rendering

### Change Styling

Edit `src/styles/App.css` or add Tailwind classes directly in JSX.

Tailwind is configured in `tailwind.config.js` (dark theme by default).

## Before You Submit a PR

- [ ] Code follows existing style
- [ ] Tested locally with `npm run dev`
- [ ] Built successfully with `npm run build`
- [ ] Tested in Docker container
- [ ] No console errors or warnings
- [ ] Changes work on macOS/Linux/Windows
- [ ] Updated README if behavior changed
- [ ] Updated CLAUDE.md if architecture changed

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Commit: `git commit -am 'Add my feature'`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request

## Reporting Issues

When reporting bugs, include:
- OS and version (macOS, Linux, Windows)
- Docker version (docker --version)
- Node.js version (node --version)
- Steps to reproduce
- Expected vs actual behavior
- Error messages (full stack trace if available)
- Screenshots if UI-related

## Questions?

- Check [CLAUDE.md](CLAUDE.md) for architecture overview
- Review existing code for examples
- Open an [issue](https://github.com/rjames-dev/NLQ-Installer/issues) to discuss

Thanks for contributing! 🎉
