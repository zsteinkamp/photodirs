# node-tdd-base

The most basic test-driven-development environment for node. Fork this repo to begin your real work.

Bring up your editor in one window on one side of the screen.
Bring up a terminal window on the other side of the screen.
In the terminal window, run:

```
docker-compose run dev
```

Any time you edit a source file in the editor, the app will be killed, the terminal screen will clear, linter run, unit tests run, and the app executed again.

If the lint or unit tests fail, it will wait until you change a file again.

This lets you truly start with test-driven-development, or at the very least give you the tightest possible save/test/run loop time.

## Fork It

Fork this repo to start your own project.

## Installing NPM Modules

To install a new NPM module, first stop your dev container. To do this, run (in another terminal window):
```
docker-compose down
```
Then you can run the npm command this way:
```
docker-compose run dev npm install --save my-cool-module
```
NPM will do its thing inside the container, and afterward you will see that the `package.json` and `package-lock.json` files have been updated.

Now rebuild the container:
```
docker-compose build
```
And then bring up the dev container again:
```
docker-compose run dev
```
