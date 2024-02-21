.DEFAULT_GOAL := default

default: config
	docker compose build && docker compose up -d --force-recreate --remove-orphans

ps: config
	docker compose ps

logs: config
	docker compose logs -f

shell: config
	docker compose exec watcher bash

down: config
	docker compose down

rmvol: config
	docker volume rm photodirs_prod_prod_albums

config: docker-compose.yml nginx.conf

docker-compose.yml nginx.conf:
	bin/gen-config

clean: config
	mv docker-compose.yml docker-compose.yml.BAK


## dev below

dev:
	cd photodirs-dev && docker compose build && docker compose up -d --force-recreate --remove-orphans

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

