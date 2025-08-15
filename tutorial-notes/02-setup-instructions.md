# Setup Instructions: Virtual Environment & Dependencies

## Understanding Virtual Environments

### What is a Python Virtual Environment?

A **virtual environment** is an isolated Python environment that allows you to:
- Install packages for a specific project without affecting your system Python
- Avoid conflicts between different projects' dependencies
- Ensure reproducible builds across different machines
- Keep your global Python installation clean

Think of it like a separate "bubble" for each project where you can install specific versions of packages.

## This Project Uses UV (Not Traditional venv)

**UV** is a modern Python package manager that's:
- **Much faster** than pip (10-100x faster)
- **Automatically creates** virtual environments
- **Handles dependencies** more intelligently
- Written in Rust for performance

### How UV Works

When you run UV commands, it:
1. Automatically creates a `.venv` folder (virtual environment)
2. Installs packages into that environment
3. Manages the `uv.lock` file for exact reproducibility

## Setup Commands Explained

### 1. Initial Setup - The Master Command

```bash
make install
```

**What this does:**
1. **Checks for UV**: If UV isn't installed, downloads and installs it
2. **Creates Python virtual environment**: UV creates `.venv` automatically
3. **Installs Python packages**: Reads from `pyproject.toml`
4. **Installs Node packages**: Runs `npm install` for the frontend

**Behind the scenes:**
```bash
# This is what make install actually runs:
uv sync                      # Install Python deps & create venv
npm --prefix nextjs install  # Install Node deps
```

### 2. Running the Application

```bash
make dev
```

**What this does:**
- Starts BOTH the backend (Python) and frontend (Next.js) simultaneously
- Backend runs on `http://127.0.0.1:8000`
- Frontend runs on `http://localhost:3000`

**Behind the scenes:**
```bash
# make dev runs these in parallel:
make dev-backend &  # Start Python ADK server
make dev-frontend   # Start Next.js dev server
```

### 3. Individual Components

#### Backend Only
```bash
make dev-backend
```
- Runs: `uv run adk api_server app --allow_origins="*"`
- `uv run`: Executes command in the virtual environment
- `adk api_server`: ADK's built-in API server
- `app`: Your agent module
- `--allow_origins="*"`: Allows CORS for development

#### Frontend Only
```bash
make dev-frontend
```
- Runs: `npm --prefix nextjs run dev`
- `--prefix nextjs`: Runs npm in the nextjs folder
- `run dev`: Starts Next.js development server

## Manual Virtual Environment Commands (FYI)

If you weren't using UV, here's what traditional Python venv looks like:

```bash
# Traditional way (NOT needed for this project)
python -m venv .venv          # Create virtual env
.venv\Scripts\activate        # Activate on Windows
source .venv/bin/activate     # Activate on Mac/Linux
pip install -r requirements.txt
```

UV handles all of this automatically!

## Environment Variables Setup

### Backend (.env file)
Create `app/.env`:
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_STAGING_BUCKET=your-bucket-name
MODEL=gemini-2.5-flash
```

### Frontend (.env.local file)
Create `nextjs/.env.local`:
```bash
BACKEND_URL=http://127.0.0.1:8000
NODE_ENV=development
```

## Verifying Your Setup

After running `make install`, you should see:
- A `.venv` folder in the root directory (Python virtual env)
- A `node_modules` folder in the `nextjs` directory
- A `uv.lock` file (Python dependency lock file)

## Common Issues & Solutions

### UV Not Found
If you see "uv is not installed", the Makefile will auto-install it.

### Port Already in Use
If port 8000 or 3000 is busy:
- Check for other running processes
- Or modify the ports in the configuration

### Permission Errors on Windows
Run your terminal as Administrator if you encounter permission issues.

## Next Steps

Once setup is complete:
1. Run `make dev` to start both servers
2. Open `http://localhost:3000` in your browser
3. Start chatting with the AI agent!