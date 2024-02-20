.DEFAULT_GOAL := default

default: prod-compose
	docker compose build && docker compose up -d --force-recreate

ps: prod-compose
	docker compose ps

logs: prod-compose
	docker compose logs -f

shell: prod-compose
	docker compose exec watcher bash

down: prod-compose
	docker compose down

prod-compose: docker-compose.yml
	bin/gen-compose

clean:
	mv docker-compose.yml docker-compose.yml.BAK


## dev below

dev:
	cd photodirs-dev && docker compose build && docker compose up -d --force-recreate

devlogs:
	cd photodirs-dev && docker compose logs -f

devps:
	cd photodirs-dev && docker compose ps

devshell:
	cd photodirs-dev && docker compose exec watcher bash

devdown:
	cd photodirs-dev && docker compose down

devreset:
	cd photodirs-dev && docker volume rm photodirs-dev_dev_cache

