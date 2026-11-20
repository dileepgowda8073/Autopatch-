# AutoPatch Makefile
# Usage: make <target>

.PHONY: all install dev build test lint format clean seed-demo help

help:
	@echo "AutoPatch Build Targets:"
	@echo "  make install      Install backend and frontend dependencies"
	@echo "  make dev          Run frontend dev server (default mock mode)"
	@echo "  make dev-backend  Run FastAPI backend server"
	@echo "  make build        Build Docker images"
	@echo "  make test         Run backend tests"
	@echo "  make seed-demo    Seed the demo python_marks project into SQLite"
	@echo "  make clean        Remove cache and build artifacts"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install --legacy-peer-deps

dev:
	cd frontend && npm run dev

dev-backend:
	python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload

build:
	docker compose build

test:
	pytest backend/tests/ -v

seed-demo:
	python backend/scripts/seed_demo.py

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null; true
	find . -type d -name .ruff_cache  -exec rm -rf {} + 2>/dev/null; true
	rm -rf frontend/dist data/workspaces
