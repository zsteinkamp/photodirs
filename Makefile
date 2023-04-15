devup:
	cd dev && docker compose build && docker compose up -d --force-recreate && docker compose logs -f

devdown:
	cd dev && docker compose down

devshell:
	cd dev && docker compose exec watcher bash

prod:
	docker compose build && docker compose up -d --force-recreate && docker compose logs -f

prodlogs:
	docker compose logs -f

prodshell:
	docker compose exec watcher bash
