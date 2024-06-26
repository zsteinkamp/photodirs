.DEFAULT_GOAL := default

GREP               ?= $(shell command -v ggrep 2> /dev/null || command -v grep 2> /dev/null)
AWK                ?= $(shell command -v gawk 2> /dev/null || command -v awk 2> /dev/null)

help: ## Show makefile targets and their descriptions
	@$(GREP) --no-filename -E '^[ a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		$(AWK) 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-28s\033[0m %s\n", $$1, $$2}' | sort

default: config ## Start production containers
	docker compose build && docker compose up -d --force-recreate --remove-orphans

ps: config ## Show running production containers
	docker compose ps

logs: config ## Tail production container logs
	docker compose logs -f --tail 100 -t

shell: config ## Get a shell in the production 'watcher' container
	docker compose exec watcher bash

down: config ## Stop and rm production containers
	docker compose down

rmvol: config ## Reset the production cache docker volume
	docker volume rm photodirs_prod_albums

config: docker-compose.yml nginx.conf ## Run setup script to generate docker-compose.yml and nginx.conf files

docker-compose.yml nginx.conf:
	bin/gen-config

clean: config ## Remove docker-compose.yml and nginx.conf files
	mv docker-compose.yml docker-compose.yml.BAK


## dev below

dev: ## Start dev containers
	cd photodirs-dev && docker compose build && docker compose up -d --force-recreate --remove-orphans

devlogs: ## Tail dev container logs
	cd photodirs-dev && docker compose logs -f

devps: ## Show running dev containers
	cd photodirs-dev && docker compose ps

devshell: ## Get a shell in the dev 'watcher' container
	cd photodirs-dev && docker compose exec watcher bash

devdown: ## Stop and rm dev containers
	cd photodirs-dev && docker compose down

devrmvol: ## Reset the dev originals docker volume
	cd photodirs-dev && docker volume rm photodirs-dev_dev_cache

