.PHONY: install backend frontend dev build run docker-build docker-run clean

# --- setup ------------------------------------------------------------------
install:
	cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
	cd frontend && npm install

# --- local development (two processes) --------------------------------------
backend:
	cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

# Run both dev servers together (API on :8000, Vite on :5173 with proxy).
dev:
	@echo "Starting API (:8000) and Vite (:5173)…"
	@( cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000 ) & \
	 ( cd frontend && npm run dev ) ; wait

# --- production single process ----------------------------------------------
build:
	cd frontend && npm run build

run: build
	cd backend && ./.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# --- container --------------------------------------------------------------
docker-build:
	docker build -t liquid-assets .

docker-run:
	docker run --rm -p 8000:8000 -v liquid-assets-data:/data liquid-assets

clean:
	rm -rf frontend/dist frontend/node_modules backend/.venv backend/data
