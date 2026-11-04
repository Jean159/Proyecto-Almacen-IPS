.PHONY: up down migrate makemigrations seed seed-demo test lint run shell front-install front-dev front-build front-test front-lint docker-dev docker-prod docker-down docker-logs docker-seed

# Comandos Docker DevOps (Recomendados)
docker-dev:
	docker compose up -d --build

docker-prod:
	docker compose -f docker-compose.prod.yml up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-seed:
	docker compose exec backend python manage.py seed_sunat
	docker compose exec backend python manage.py seed_demo

# Comandos locales individuales
up:
	docker compose up -d db

down:
	docker compose down

migrate:
	cd backend && .venv/bin/python manage.py migrate

makemigrations:
	cd backend && .venv/bin/python manage.py makemigrations

seed:
	cd backend && .venv/bin/python manage.py seed_sunat

seed-demo:
	cd backend && .venv/bin/python manage.py seed_demo

test:
	cd backend && .venv/bin/pytest

lint:
	cd backend && .venv/bin/ruff check .

run:
	cd backend && .venv/bin/python manage.py runserver 0.0.0.0:8001

shell:
	cd backend && .venv/bin/python manage.py shell

front-install:
	cd frontend && npm install

front-dev:
	cd frontend && npm run dev

front-build:
	cd frontend && npm run build

front-test:
	cd frontend && npm test

front-lint:
	cd frontend && npm run lint
