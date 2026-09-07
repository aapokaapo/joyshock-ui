const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {
  defaultSocketPath,
  normalizeCommands,
  sendCommandsToSocket,
} = require('./socketClient');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

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
};
