.DEFAULT_GOAL := prod

devup:
	cd photodirs-dev && docker compose build && docker compose up -d --force-recreate && docker compose logs -f

devlogs:
	cd photodirs-dev && docker compose logs -f

devdown:
	cd photodirs-dev && docker compose down

devshell:
	cd photodirs-dev && docker compose exec watcher bash

prod: prod-compose
	docker compose build && docker compose up -d --force-recreate && docker compose logs -f

prodlogs: prod-compose
	docker compose logs -f

prodshell: prod-compose
	docker compose exec watcher bash

prod-compose: docker-compose.yml
	bin/gen-compose
