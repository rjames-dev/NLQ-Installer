# NLQ Installer

**Guided installer for the NLQ System.** Makes setup simple with a step-by-step wizard.

⚠️ **Important:** You do NOT need to clone this repository. The installer runs as a pre-built Docker image. Simply clone the [main NLQ repository](https://github.com/rjames-dev/NLQ) instead.

This is the easiest way to get NLQ running. If you prefer CLI installation or want more control, see the [main NLQ repository](https://github.com/rjames-dev/NLQ).

---

## Understanding the Workflow

This repository contains the **source code** for the NLQ Installer. Here's how it fits in:

1. **You clone:** The main [NLQ repository](https://github.com/rjames-dev/NLQ)
2. **You run:** The pre-built installer Docker image (from Docker Hub)
3. **The installer:** Uses this repository's code (already built into the Docker image)
4. **You don't clone:** This NLQ-Installer repository

**Why this repository exists:**
- 📦 Source code for developers who want to build/modify the installer
- 📖 Documentation for understanding how the installer works
- 🐳 Dockerfile for building custom versions

**For end users:** Just clone NLQ and run the docker command below. The installer image is ready to go!

---

## Quick Start

### Prerequisites
- ✅ Docker Desktop or Docker Engine installed and running
- ✅ NLQ repository [cloned](https://github.com/rjames-dev/NLQ) to your machine
- ✅ ~15 minutes of time
- ✅ 50GB available disk space

### 1. Run the Installer

Navigate to your cloned NLQ repository and run:

```bash
docker run -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/nlq-system:/app/nlq-system \
  -v $(pwd)/migration-system:/app/migration-system \
  rfinancials/mydocker-repo:nlq-installer-v1.0.0
```

**Windows (PowerShell):**
```powershell
docker run -p 3001:3001 `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v ${PWD}/nlq-system:/app/nlq-system `
  -v ${PWD}/migration-system:/app/migration-system `
  rfinancials/mydocker-repo:nlq-installer-v1.0.0
```

### 2. Open Your Browser

Navigate to: **http://localhost:3001**

You'll see the installation wizard.

### 3. Follow the Wizard

The installer will guide you through:
1. **Welcome** - Review features and requirements
2. **Requirements Check** - Verify your system is ready
3. **Configuration** - Enter your Anthropic API key and passwords
4. **Review** - Confirm settings before deployment
5. **Deploy** - Watch services start in real-time

That's it! The app handles the rest.

### 4. Next Steps

Once deployment completes, the installer will show you:
- ✅ Where to access OpenWebUI: **http://localhost:3000**
- ✅ Link to OpenWebUI setup guide: [First Time Login - NLQ System](https://github.com/rjames-dev/NLQ/blob/main/QUICK-START-WITH-IMAGES.md#first-time-login---nlq-system)

---

## What You Need

<details>
<summary><strong>Expand: Docker Installation</strong></summary>

**macOS & Windows:**
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install and run it

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

Verify installation:
```bash
docker --version
```

</details>

<details>
<summary><strong>Expand: Get Anthropic API Key</strong></summary>

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Generate an API key
4. You'll use this during the wizard

The installer will prompt you for this.

</details>

---

## Troubleshooting

<details>
<summary><strong>Port 3001 already in use</strong></summary>

Use a different port:
```bash
docker run -p 3002:3001 \  # Use 3002 instead
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/nlq-system:/app/nlq-system \
  rfinancials/mydocker-repo:nlq-installer-v1.0.0
```

Then open: http://localhost:3002

</details>

<details>
<summary><strong>Docker socket not found / permission denied</strong></summary>

Ensure Docker is running:
```bash
docker ps
```

If you get permission errors on Linux:
```bash
sudo usermod -aG docker $USER
# Log out and back in, or:
newgrp docker
```

</details>

<details>
<summary><strong>Container exits immediately</strong></summary>

Check the logs:
```bash
docker logs <container-id>
```

Common causes:
- Docker socket not accessible
- Insufficient disk space
- Port already in use

</details>

<details>
<summary><strong>Still having issues?</strong></summary>

- Check the [main NLQ repository](https://github.com/rjames-dev/NLQ) for detailed troubleshooting
- Open an [issue](https://github.com/rjames-dev/NLQ-Installer/issues) with error details
- Include your system info: OS, Docker version, error messages

</details>

---

## Building from Source

Want to modify the installer? Build locally:

```bash
# Clone this repository
git clone https://github.com/rjames-dev/NLQ-Installer.git
cd NLQ-Installer

# Build the Docker image
docker build -t my-nlq-installer:latest .

# Run it
docker run -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/../nlq-system:/app/nlq-system \
  my-nlq-installer:latest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## What's Next?

After the installer completes:

1. **Access OpenWebUI**: Open http://localhost:3000
2. **Follow Setup Guide**: Use [NLQ Quick Start](https://github.com/rjames-dev/NLQ/blob/main/QUICK-START-WITH-IMAGES.md#first-time-login---nlq-system)
3. **Create Your First Query**: Ask NLQ a natural language question

---

## Need Help?

- 📚 [NLQ Documentation](https://github.com/rjames-dev/NLQ)
- 🐛 [Report Issues](https://github.com/rjames-dev/NLQ-Installer/issues)
- 💬 [Discussions](https://github.com/rjames-dev/NLQ/discussions)
- 📧 Email: support@chatnlq.com

---

## License

MIT License - See [LICENSE](LICENSE) file for details

---

**Questions?** Start with the [NLQ repository](https://github.com/rjames-dev/NLQ) - it has comprehensive documentation.
