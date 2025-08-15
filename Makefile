install:
	@where uv >nul 2>&1 || (echo uv is not installed. Installing uv... && curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh)
	uv sync
	cd nextjs && npm install

dev:
	make dev-backend & make dev-frontend

dev-backend:
	uv run adk api_server app --allow_origins="*"

dev-frontend:
	cd nextjs && npm run dev

adk-web:
	uv run adk web --port 8501

lint:
	uv run codespell
	uv run ruff check . --diff
	uv run ruff format . --check --diff
	uv run mypy .

# Deploy the agent remotely
deploy-adk:
	uv export --no-hashes --no-header --no-dev --no-emit-project > .requirements.txt && uv run app/agent_engine_app.py
