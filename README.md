# joyshock-ui

UI for JoyShockMapper systemd service.

## What it does

- Connects to the JoyShockMapper UNIX socket (`/run/user/<uid>/joyshockmapper.sock` by default)
- Lets you edit a gyro acceleration curve (via `MIN_GYRO_THRESHOLD`, `MAX_GYRO_THRESHOLD`, `MIN_GYRO_SENS`, `MAX_GYRO_SENS`)
- Lets you add and edit controller button remap commands
- Sends generated commands to the running JoyShockMapper service

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

If needed, override socket path:

```bash
JSM_SOCKET_PATH=/run/user/1000/joyshockmapper.sock npm start
```

## Test

```bash
npm test
```
