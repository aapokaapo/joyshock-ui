const socketPathInput = document.getElementById('socketPath');
const mappingsElement = document.getElementById('mappings');
const mappingTemplate = document.getElementById('mappingTemplate');
const commandsPreview = document.getElementById('commandsPreview');
const statusElement = document.getElementById('status');

const gyroFieldIds = [
  'minThreshold',
  'maxThreshold',
  'minSensX',
  'minSensY',
  'maxSensX',
  'maxSensY',
];

function rowToCommand(row) {
  const button = row.querySelector('.button-name').value.trim();
  const action = row.querySelector('.button-action').value.trim();

  if (!button || !action) {
    return null;
  }

  return `${button} = ${action}`;
}

function gyroCommands() {
  const minThreshold = document.getElementById('minThreshold').value;
  const maxThreshold = document.getElementById('maxThreshold').value;
  const minSensX = document.getElementById('minSensX').value;
  const minSensY = document.getElementById('minSensY').value;
  const maxSensX = document.getElementById('maxSensX').value;
  const maxSensY = document.getElementById('maxSensY').value;

  return [
    `MIN_GYRO_THRESHOLD = ${minThreshold}`,
    `MAX_GYRO_THRESHOLD = ${maxThreshold}`,
    `MIN_GYRO_SENS = ${minSensX} ${minSensY}`,
    `MAX_GYRO_SENS = ${maxSensX} ${maxSensY}`,
  ];
}

function buildCommands() {
  const mappings = [...mappingsElement.querySelectorAll('.mapping-row')]
    .map(rowToCommand)
    .filter(Boolean);

  return [...gyroCommands(), ...mappings];
}

function renderCommands() {
  commandsPreview.value = buildCommands().join('\n');
}

function addMappingRow(button = '', action = '') {
  const fragment = mappingTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.mapping-row');
  row.querySelector('.button-name').value = button;
  row.querySelector('.button-action').value = action;
  row.querySelector('.remove-mapping').addEventListener('click', () => {
    row.remove();
    renderCommands();
  });
  row.addEventListener('input', renderCommands);
  mappingsElement.appendChild(fragment);
}

async function loadDefaults() {
  const response = await fetch('/api/config');
  const config = await response.json();
  socketPathInput.value = config.defaultSocketPath;
}

async function applyConfig() {
  statusElement.textContent = 'Applying settings...';

  const response = await fetch('/api/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      socketPath: socketPathInput.value,
      commands: buildCommands(),
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    statusElement.textContent = `Failed: ${result.error || 'Unknown error'}`;
    return;
  }

  statusElement.textContent = `Applied ${result.sent} commands to ${result.socketPath}`;
}

document.getElementById('addMapping').addEventListener('click', () => {
  addMappingRow();
  renderCommands();
});

document.getElementById('apply').addEventListener('click', () => {
  applyConfig().catch((error) => {
    statusElement.textContent = `Failed: ${error.message}`;
  });
});

for (const id of gyroFieldIds) {
  document.getElementById(id).addEventListener('input', renderCommands);
}

addMappingRow('R', 'RMOUSE');
addMappingRow('ZR', 'LMOUSE');

loadDefaults()
  .then(renderCommands)
  .catch((error) => {
    statusElement.textContent = `Failed to load defaults: ${error.message}`;
    renderCommands();
  });
