# Photodirs Compose Example

This directory contains a `docker-compose.yml` file that you can customize for your needs.

It will fetch pre-built containers from the Github Container Registry, so the ony thing you need to do is to change the path to your originals directory in the `volumes:` section near the top of the file.

```
volumes:
  prod_cache:
  prod_albums:
    driver_opts:
      type: none
      ## CHANGE PATH BELOW FOR YOUR ORIGINALS DIRECTORY
      device: '/mnt/shared/photos/'
      o: bind
```

You may also want to change the port mapping for the `nginx` service. In the example, it's listening on port `5333` for the application and api, and port `6333` for the admin interface.

```
  nginx:
    image: ghcr.io/zsteinkamp/photodirs-nginx
    depends_on:
      - frontend
      - api
      - admin
    ports:
      - '5333:3333'
      - '6333:4333'
```

You can also choose not to expose the admin interface by deleting the second line (the one starting with `6333` above).

## Start the application

You can then run `docker compose up -d` and it will start a server after pulling the latest images.

```
> docker compose up -d
[+] Running 6/6
 ✔ Network photodirs-compose_default       Created        0.0s
 ✔ Container photodirs-compose-watcher-1   Created        0.0s
 ✔ Container photodirs-compose-frontend-1  Created        0.0s
 ✔ Container photodirs-compose-api-1       Created        0.0s
 ✔ Container photodirs-compose-admin-1     Created        0.0s
 ✔ Container photodirs-compose-nginx-1     Created        0.0s
>
```

The application is now running! You can check it out at http://hostname:5333/ (substituting the hostname where you're running these commands).

## Watching logs

To watch what is happening, you can run `docker compose logs -f`. This is just like `tail -f` that you may be familiar with. Press `Ctrl-C` to stop watching the logs.

## Stopping the application

While in the directory with your `docker-compose.yml` file, run:

```
docker compose down
```

The application will take about 10 seconds to stop.
