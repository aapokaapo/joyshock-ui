# joyshock-ui

UI for JoyShockMapper systemd service.

## What it does

- Connects to the JoyShockMapper UNIX socket (`/run/user/<uid>/joyshockmapper.sock` by default)
- Lets you edit a gyro acceleration curve (via `MIN_GYRO_THRESHOLD`, `MAX_GYRO_THRESHOLD`, `MIN_GYRO_SENS`, `MAX_GYRO_SENS`)
- Lets you add and edit controller button remap commands
- Sends generated commands to the running JoyShockMapper service
- Supports loading and saving the current UI config (socket path, gyro values, and mappings)

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

## Current config persistence

- `Load current config` reads from `/api/current-config`
- `Save current config` writes to `/api/current-config`
- Stored file path defaults to:
  - `$XDG_CONFIG_HOME/joyshock-ui/current-config.json`, or
  - `~/.config/joyshock-ui/current-config.json`
- You can override the storage file with:

```bash
JSM_UI_CONFIG_PATH=/absolute/path/current-config.json npm start
```

## Test

```bash
npm test
```
