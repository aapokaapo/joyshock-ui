const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  defaultSocketPath,
  normalizeCommands,
  sendCommandsToSocket,
} = require('./socketClient');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const DEFAULT_CURRENT_CONFIG = {
  socketPath: '',
  gyro: {
    minThreshold: '0',
    maxThreshold: '8',
    minSensX: '0',
    minSensY: '0',
    maxSensX: '6',
    maxSensY: '6',
  },
  mappings: [
    { button: 'R', action: 'RMOUSE' },
    { button: 'ZR', action: 'LMOUSE' },
  ],
};

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function getMimeType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large.'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function toNumericString(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return String(num);
}

function sanitizeToken(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  if (trimmed.includes('\n') || trimmed.includes('\r')) {
    throw new Error(`${fieldName} must not contain newlines.`);
  }
  return trimmed;
}

function normalizeCurrentConfig(currentConfig) {
  if (!currentConfig || typeof currentConfig !== 'object') {
    throw new Error('currentConfig must be an object.');
  }

  const gyro = currentConfig.gyro || {};
  const mappings = Array.isArray(currentConfig.mappings)
    ? currentConfig.mappings.map((mapping, index) => {
      if (!mapping || typeof mapping !== 'object') {
        throw new Error(`mappings[${index}] must be an object.`);
      }

      return {
        button: sanitizeToken(mapping.button, `mappings[${index}].button`),
        action: sanitizeToken(mapping.action, `mappings[${index}].action`),
      };
    })
    : [];

  return {
    socketPath:
      typeof currentConfig.socketPath === 'string' ? currentConfig.socketPath.trim() : '',
    gyro: {
      minThreshold: toNumericString(gyro.minThreshold, DEFAULT_CURRENT_CONFIG.gyro.minThreshold),
      maxThreshold: toNumericString(gyro.maxThreshold, DEFAULT_CURRENT_CONFIG.gyro.maxThreshold),
      minSensX: toNumericString(gyro.minSensX, DEFAULT_CURRENT_CONFIG.gyro.minSensX),
      minSensY: toNumericString(gyro.minSensY, DEFAULT_CURRENT_CONFIG.gyro.minSensY),
      maxSensX: toNumericString(gyro.maxSensX, DEFAULT_CURRENT_CONFIG.gyro.maxSensX),
      maxSensY: toNumericString(gyro.maxSensY, DEFAULT_CURRENT_CONFIG.gyro.maxSensY),
    },
    mappings,
  };
}

function getCurrentConfigPath() {
  if (process.env.JSM_UI_CONFIG_PATH && process.env.JSM_UI_CONFIG_PATH.trim()) {
    return process.env.JSM_UI_CONFIG_PATH.trim();
  }

  const base =
    process.env.XDG_CONFIG_HOME && process.env.XDG_CONFIG_HOME.trim()
      ? process.env.XDG_CONFIG_HOME.trim()
      : path.join(os.homedir(), '.config');

  return path.join(base, 'joyshock-ui', 'current-config.json');
}

function getDefaultCurrentConfig() {
  return {
    ...DEFAULT_CURRENT_CONFIG,
    socketPath: defaultSocketPath(),
  };
}

function readCurrentConfig() {
  const filePath = getCurrentConfigPath();

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return normalizeCurrentConfig(parsed);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return getDefaultCurrentConfig();
    }
    throw error;
  }
}

function writeCurrentConfig(currentConfig) {
  const normalized = normalizeCurrentConfig(currentConfig);
  const filePath = getCurrentConfigPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function createServer() {
  return http.createServer(async (req, res) => {
    if (!req.url) {
      sendJson(res, 400, { error: 'Invalid request URL.' });
      return;
    }

    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/config') {
      sendJson(res, 200, { defaultSocketPath: defaultSocketPath() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/current-config') {
      try {
        const currentConfig = readCurrentConfig();
        sendJson(res, 200, { ok: true, currentConfig });
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/current-config') {
      try {
        const rawBody = await readBody(req);
        const parsed = rawBody ? JSON.parse(rawBody) : {};
        const currentConfig = writeCurrentConfig(parsed.currentConfig || parsed);
        sendJson(res, 200, { ok: true, currentConfig });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/apply') {
      try {
        const rawBody = await readBody(req);
        const parsed = rawBody ? JSON.parse(rawBody) : {};
        const socketPath =
          typeof parsed.socketPath === 'string' && parsed.socketPath.trim()
            ? parsed.socketPath.trim()
            : defaultSocketPath();
        const commands = normalizeCommands(parsed.commands);

        const result = await sendCommandsToSocket(socketPath, commands);

        sendJson(res, 200, {
          ok: true,
          socketPath,
          sent: result.sent,
        });
      } catch (error) {
        sendJson(res, 400, {
          ok: false,
          error: error.message,
        });
      }
      return;
    }

    const requestedPath =
      url.pathname === '/'
        ? path.join(PUBLIC_DIR, 'index.html')
        : path.join(PUBLIC_DIR, url.pathname);

    const normalizedPath = path.normalize(requestedPath);
    if (!normalizedPath.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { error: 'Forbidden path.' });
      return;
    }

    fs.readFile(normalizedPath, (error, file) => {
      if (error) {
        sendJson(res, 404, { error: 'Not found.' });
        return;
      }

      res.writeHead(200, { 'Content-Type': getMimeType(normalizedPath) });
      res.end(file);
    });
  });
}

function startServer(port = Number(process.env.PORT) || 3000) {
  const server = createServer();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`joyshock-ui listening on http://localhost:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  startServer,
  normalizeCurrentConfig,
  getCurrentConfigPath,
};
