.PHONY: install backend frontend dev build start up down clean

# --- setup ------------------------------------------------------------------
install:
	cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
	cd frontend && npm install

# --- local development (API :8000 + Vite dev server :5173, proxying /api) ----
backend:
	cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting API (:8000) and Vite dev server (:5173)…  → http://localhost:5173"
	@( cd backend && ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000 ) & \
	 ( cd frontend && npm run dev ) ; wait

# --- production-style: built SPA served by the Node server, proxying the API -
build:
	cd frontend && npm run build

start: build
	@echo "Starting API (:8000) and Node frontend server (:3000)…  → http://localhost:3000"
	@( cd backend && ./.venv/bin/python -m uvicorn app.main:app --port 8000 ) & \
	 ( cd frontend && BACKEND_URL=http://localhost:8000 PORT=3000 npm start ) ; wait

# --- containers (both services via docker compose) --------------------------
up:
	docker compose up --build

down:
	docker compose down

clean:
	rm -rf frontend/dist frontend/node_modules backend/.venv backend/data
