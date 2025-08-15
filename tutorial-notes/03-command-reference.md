# Command Reference Guide

## Essential Commands for Development

### 1. Setup & Installation

#### `make install`
**Purpose**: Complete project setup
**What it does**:
```bash
# 1. Installs UV if not present
curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh

# 2. Syncs Python dependencies using UV
uv sync  # Creates .venv and installs from pyproject.toml

# 3. Installs Node.js dependencies
npm --prefix nextjs install
```
**When to use**: First time setup or after pulling new changes

### 2. Development Commands

#### `make dev`
**Purpose**: Start the full application
**What it does**:
```bash
make dev-backend &  # Starts Python server in background
make dev-frontend   # Starts Next.js server
```
**Result**: 
- Backend API: http://127.0.0.1:8000
- Frontend UI: http://localhost:3000

#### `make dev-backend`
**Purpose**: Run only the Python ADK server
**Actual command**: `uv run adk api_server app --allow_origins="*"`
**Breakdown**:
- `uv run`: Execute in virtual environment
- `adk api_server`: ADK's built-in HTTP server
- `app`: The Python module containing your agent
- `--allow_origins="*"`: Enable CORS for dev

#### `make dev-frontend`
**Purpose**: Run only the Next.js frontend
**Actual command**: `npm --prefix nextjs run dev`
**Breakdown**:
- `npm --prefix nextjs`: Run npm in the nextjs folder
- `run dev`: Execute the "dev" script from package.json

#### `make adk-web`
**Purpose**: Launch ADK's web UI for testing
**Actual command**: `uv run adk web --port 8501`
**What it provides**: A Streamlit-based UI for testing your agent

### 3. Code Quality Commands

#### `make lint`
**Purpose**: Check code quality and formatting
**What it runs**:
```bash
uv run codespell              # Spell check
uv run ruff check . --diff    # Python linting
uv run ruff format . --check  # Python formatting
uv run mypy .                 # Type checking
```

### 4. Frontend-Specific Commands

Run these from the project root with npm --prefix:

#### `npm --prefix nextjs run build`
**Purpose**: Create production build
**What it does**: Compiles and optimizes the Next.js app

#### `npm --prefix nextjs run lint`
**Purpose**: Lint TypeScript/JavaScript code
**What it does**: Runs ESLint on frontend code

#### `npm --prefix nextjs run test`
**Purpose**: Run frontend tests
**What it does**: Executes Jest test suite

### 5. Deployment Commands

#### `make deploy-adk`
**Purpose**: Deploy agent to Google Cloud
**What it does**:
1. Exports dependencies to requirements file
2. Packages the agent
3. Deploys to Vertex AI Agent Engine
**Prerequisites**:
- Google Cloud authentication
- Configured environment variables

### 6. Google Cloud Commands (for deployment)

#### `gcloud auth application-default login`
**Purpose**: Authenticate with Google Cloud
**What it does**: Opens browser for Google account login
**When to use**: Before deploying to Google Cloud

#### `gcloud config set project YOUR_PROJECT_ID`
**Purpose**: Set default GCP project
**What it does**: Configures which project to deploy to

## UV-Specific Commands (Package Management)

### Basic UV Commands

#### `uv sync`
**Purpose**: Install/update dependencies
**What it does**: 
- Reads pyproject.toml
- Creates/updates .venv
- Installs exact versions from uv.lock

#### `uv add package-name`
**Purpose**: Add new Python package
**Example**: `uv add pandas`
**Result**: Updates pyproject.toml and uv.lock

#### `uv remove package-name`
**Purpose**: Remove Python package
**Example**: `uv remove pandas`

#### `uv run python script.py`
**Purpose**: Run Python script in virtual env
**Why use**: Ensures correct environment without activation

## NPM Commands (Frontend Package Management)

### From nextjs directory or with --prefix

#### `npm install package-name`
**Purpose**: Add new Node package
**With prefix**: `npm --prefix nextjs install react-icons`

#### `npm uninstall package-name`
**Purpose**: Remove Node package
**With prefix**: `npm --prefix nextjs uninstall react-icons`

## Understanding Command Patterns

### The Makefile Pattern
```makefile
target-name:
    command-to-run
```
- `make target-name` executes the command
- Simplifies complex commands
- Ensures consistency

### The UV Pattern
```bash
uv run <command>
```
- Always runs in virtual environment
- No need to activate/deactivate
- Handles Python path automatically

### The NPM Prefix Pattern
```bash
npm --prefix nextjs <command>
```
- Runs npm command in nextjs folder
- Avoids changing directories
- Useful for monorepo structure

## Quick Command Cheatsheet

| Task | Command |
|------|---------|
| First setup | `make install` |
| Start everything | `make dev` |
| Backend only | `make dev-backend` |
| Frontend only | `make dev-frontend` |
| Check code | `make lint` |
| Add Python package | `uv add package-name` |
| Add Node package | `npm --prefix nextjs install package-name` |
| Deploy to cloud | `make deploy-adk` |

## Troubleshooting Commands

### Check what's running
```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :8000
lsof -i :3000
```

### Kill processes (if needed)
```bash
# Windows
taskkill /F /PID <process-id>

# Mac/Linux
kill -9 <process-id>
```

### Verify installations
```bash
uv --version      # Check UV is installed
node --version    # Check Node.js version
python --version  # Check Python version
```