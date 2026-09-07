const net = require('node:net');
const os = require('node:os');

const MAX_COMMAND_LENGTH = 512;

function defaultSocketPath() {
  if (process.env.JSM_SOCKET_PATH && process.env.JSM_SOCKET_PATH.trim()) {
    return process.env.JSM_SOCKET_PATH.trim();
  }

  if (typeof process.getuid === 'function') {
    return `/run/user/${process.getuid()}/joyshockmapper.sock`;
  }

  return `/tmp/joyshockmapper.sock`;
}

function normalizeCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error('At least one command is required.');
  }

  return commands.map((command, index) => {
    if (typeof command !== 'string') {
      throw new Error(`Command at index ${index} must be a string.`);
    }

    const trimmed = command.trim();
    if (!trimmed) {
      throw new Error(`Command at index ${index} cannot be empty.`);
    }

    if (trimmed.length > MAX_COMMAND_LENGTH) {
      throw new Error(`Command at index ${index} is too long.`);
    }

    if (trimmed.includes('\n') || trimmed.includes('\r')) {
      throw new Error(`Command at index ${index} must not contain newlines.`);
    }

    return trimmed;
  });
}

function sendCommandsToSocket(socketPath, commands, timeoutMs = 3000) {
  const normalizedCommands = normalizeCommands(commands);

  return new Promise((resolve, reject) => {
    const client = net.createConnection(socketPath);
    let settled = false;

    const onFailure = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      client.destroy();
      reject(error);
    };

    client.setTimeout(timeoutMs, () => {
      onFailure(new Error('Timed out while sending commands to JoyShockMapper socket.'));
    });

    client.once('error', onFailure);

    client.once('connect', () => {
      client.write(`${normalizedCommands.join('\n')}\n`, (error) => {
        if (error) {
          onFailure(error);
          return;
        }
        client.end();
      });
    });

    client.once('close', (hadError) => {
      if (settled || hadError) {
        return;
      }
      settled = true;
      resolve({ sent: normalizedCommands.length });
    });
  });
}

module.exports = {
  MAX_COMMAND_LENGTH,
  defaultSocketPath,
  normalizeCommands,
  sendCommandsToSocket,
};
