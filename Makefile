.PHONY: install dev up down test lint typecheck migrate revision seed recover deploy
install:
	cd backend && pip install -e ".[dev]"
up:
	docker compose up -d
down:
	docker compose down
dev:
	cd backend && uvicorn ada.main:app --reload --port 8080
test:
	cd backend && pytest -q
lint:
	cd backend && ruff check src tests
typecheck:
	cd backend && mypy src
migrate:
	cd backend && alembic upgrade head
revision:
	cd backend && alembic revision --autogenerate -m "$(m)"
seed:
	cd backend && python -m ada.seed
recover:
	cd backend && python -m ada.recover
deploy:
	cd backend && gcloud run deploy ada --source . --region $${GCP_LOCATION:-us-central1} \
	  --set-secrets PAYSTACK_SECRET_KEY=paystack-secret:latest,STRIPE_SECRET_KEY=stripe-secret:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest \
	  --allow-unauthenticated
