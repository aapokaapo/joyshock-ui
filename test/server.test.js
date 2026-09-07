const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const {
  normalizeCommands,
  sendCommandsToSocket,
} = require('../src/socketClient');
const { createServer, getCurrentConfigPath } = require('../src/server');

function request(server, route, method = 'GET', body) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method,
        hostname: '127.0.0.1',
        port: address.port,
        path: route,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null });
        });
      },
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('normalizeCommands rejects multiline command', () => {
  assert.throws(
    () => normalizeCommands(['A = B\nC = D']),
    /must not contain newlines/,
  );
});

test('sendCommandsToSocket sends all commands to unix socket', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsm-ui-test-'));
  const socketPath = path.join(tempDir, 'joyshockmapper.sock');
  const receivedLines = [];

  const server = net.createServer((client) => {
    let buffer = '';
    client.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
    });
    client.on('end', () => {
      receivedLines.push(...buffer.split('\n').filter(Boolean));
    });
  });

  await new Promise((resolve) => server.listen(socketPath, resolve));

  const result = await sendCommandsToSocket(socketPath, ['A = B', 'C = D']);
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(result.sent, 2);
  assert.deepEqual(receivedLines, ['A = B', 'C = D']);

  await new Promise((resolve) => server.close(resolve));
});

test('POST /api/apply validates command input', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const response = await request(server, '/api/apply', 'POST', {
    commands: ['A = B\nINVALID'],
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /must not contain newlines/);

  await new Promise((resolve) => server.close(resolve));
});

test('current config can be saved and loaded', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsm-ui-config-'));
  const configPath = path.join(tempDir, 'current-config.json');
  process.env.JSM_UI_CONFIG_PATH = configPath;

  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const savePayload = {
    currentConfig: {
      socketPath: '/run/user/1000/joyshockmapper.sock',
      gyro: {
        minThreshold: '0.1',
        maxThreshold: '6.5',
        minSensX: '0.2',
        minSensY: '0.3',
        maxSensX: '7',
        maxSensY: '8',
      },
      mappings: [
        { button: 'R', action: 'RMOUSE' },
        { button: 'ZR', action: 'LMOUSE' },
      ],
    },
  };

  const saveResponse = await request(server, '/api/current-config', 'POST', savePayload);
  assert.equal(saveResponse.statusCode, 200);
  assert.equal(saveResponse.body.ok, true);

  const loadResponse = await request(server, '/api/current-config');
  assert.equal(loadResponse.statusCode, 200);
  assert.equal(loadResponse.body.ok, true);
  assert.deepEqual(loadResponse.body.currentConfig, savePayload.currentConfig);
  assert.equal(getCurrentConfigPath(), configPath);

  await new Promise((resolve) => server.close(resolve));
  delete process.env.JSM_UI_CONFIG_PATH;
});

test('saving current config rejects invalid mapping', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsm-ui-config-'));
  process.env.JSM_UI_CONFIG_PATH = path.join(tempDir, 'current-config.json');

  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const response = await request(server, '/api/current-config', 'POST', {
    currentConfig: {
      socketPath: '/tmp/joyshockmapper.sock',
      gyro: {},
      mappings: [{ button: 'R\nBAD', action: 'RMOUSE' }],
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.ok, false);
  assert.match(response.body.error, /must not contain newlines/);

  await new Promise((resolve) => server.close(resolve));
  delete process.env.JSM_UI_CONFIG_PATH;
});
