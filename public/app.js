const socketPathInput = document.getElementById('socketPath');
const mappingsElement = document.getElementById('mappings');
const mappingTemplate = document.getElementById('mappingTemplate');
const commandsPreview = document.getElementById('commandsPreview');
const statusElement = document.getElementById('status');

const gyroCurveElement = document.getElementById('gyroCurve');
const curveGuideElement = document.getElementById('curveGuide');
const curveLineElement = document.getElementById('curveLine');
const minPointElement = document.getElementById('minPoint');
const maxPointElement = document.getElementById('maxPoint');
const xMaxLabelElement = document.getElementById('xMaxLabel');
const yMaxLabelElement = document.getElementById('yMaxLabel');

const gyroFieldIds = [
  'minThreshold',
  'maxThreshold',
  'minSensX',
  'minSensY',
  'maxSensX',
  'maxSensY',
];

const curveState = {
  dragging: null,
  width: 420,
  height: 240,
  padding: 32,
};

function rowToCommand(row) {
  const button = row.querySelector('.button-name').value.trim();
  const action = row.querySelector('.button-action').value.trim();

  if (!button || !action) {
    return null;
  }

  return `${button} = ${action}`;
}

function rowToMapping(row) {
  const button = row.querySelector('.button-name').value.trim();
  const action = row.querySelector('.button-action').value.trim();

  if (!button || !action) {
    return null;
  }

  return { button, action };
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

function currentGyroState() {
  return {
    minThreshold: document.getElementById('minThreshold').value,
    maxThreshold: document.getElementById('maxThreshold').value,
    minSensX: document.getElementById('minSensX').value,
    minSensY: document.getElementById('minSensY').value,
    maxSensX: document.getElementById('maxSensX').value,
    maxSensY: document.getElementById('maxSensY').value,
  };
}

function currentMappingsState() {
  return [...mappingsElement.querySelectorAll('.mapping-row')]
    .map(rowToMapping)
    .filter(Boolean);
}

function collectCurrentConfig() {
  return {
    socketPath: socketPathInput.value.trim(),
    gyro: currentGyroState(),
    mappings: currentMappingsState(),
  };
}

function applyGyroState(gyro) {
  for (const id of gyroFieldIds) {
    if (Object.hasOwn(gyro, id)) {
      document.getElementById(id).value = gyro[id];
    }
  }
  renderCurve();
}

function applyMappingsState(mappings) {
  mappingsElement.innerHTML = '';

  if (!Array.isArray(mappings) || mappings.length === 0) {
    addMappingRow();
    return;
  }

  for (const mapping of mappings) {
    addMappingRow(mapping.button, mapping.action);
  }
}

function applyCurrentConfig(currentConfig) {
  if (currentConfig.socketPath) {
    socketPathInput.value = currentConfig.socketPath;
  }

  applyGyroState(currentConfig.gyro || {});
  applyMappingsState(currentConfig.mappings || []);
  renderCommands();
}

function toFieldValue(value) {
  return String(window.GyroCurveModel.round2(value));
}

function getCurvePoints() {
  const state = currentGyroState();
  const model = window.GyroCurveModel;
  const bounds = model.computeBounds(state);

  const minPoint = model.valueToPoint(
    model.toNumber(state.minThreshold, 0),
    model.toNumber(state.minSensX, 0),
    bounds,
    curveState.width,
    curveState.height,
    curveState.padding,
  );

  const maxPoint = model.valueToPoint(
    model.toNumber(state.maxThreshold, 8),
    model.toNumber(state.maxSensX, 6),
    bounds,
    curveState.width,
    curveState.height,
    curveState.padding,
  );

  return { bounds, minPoint, maxPoint };
}

function renderCurve() {
  const { bounds, minPoint, maxPoint } = getCurvePoints();

  curveGuideElement.setAttribute('points', `${curveState.padding},${curveState.height - curveState.padding} ${maxPoint.x},${curveState.height - curveState.padding} ${maxPoint.x},${maxPoint.y}`);

  curveLineElement.setAttribute('x1', minPoint.x);
  curveLineElement.setAttribute('y1', minPoint.y);
  curveLineElement.setAttribute('x2', maxPoint.x);
  curveLineElement.setAttribute('y2', maxPoint.y);

  minPointElement.setAttribute('cx', minPoint.x);
  minPointElement.setAttribute('cy', minPoint.y);
  maxPointElement.setAttribute('cx', maxPoint.x);
  maxPointElement.setAttribute('cy', maxPoint.y);

  xMaxLabelElement.textContent = `threshold max ${window.GyroCurveModel.round2(bounds.xMax)}`;
  yMaxLabelElement.textContent = `sens max ${window.GyroCurveModel.round2(bounds.yMax)}`;
}

function pointerToSvgPoint(event) {
  const rect = gyroCurveElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * curveState.width;
  const y = ((event.clientY - rect.top) / rect.height) * curveState.height;
  return { x, y };
}

function updateCurveFromPointer(event) {
  if (!curveState.dragging) {
    return;
  }

  event.preventDefault();

  const model = window.GyroCurveModel;
  const state = currentGyroState();
  const bounds = model.computeBounds(state);
  const pointer = pointerToSvgPoint(event);
  const next = model.pointToValue(pointer.x, pointer.y, bounds, curveState.width, curveState.height, curveState.padding);

  const minThresholdInput = document.getElementById('minThreshold');
  const maxThresholdInput = document.getElementById('maxThreshold');
  const minSensXInput = document.getElementById('minSensX');
  const maxSensXInput = document.getElementById('maxSensX');

  if (curveState.dragging === 'min') {
    const maxThreshold = model.toNumber(maxThresholdInput.value, 8);
    const maxSens = model.toNumber(maxSensXInput.value, 6);

    minThresholdInput.value = toFieldValue(model.clamp(next.threshold, 0, maxThreshold));
    minSensXInput.value = toFieldValue(model.clamp(next.sensitivity, 0, maxSens));
  }

  if (curveState.dragging === 'max') {
    const minThreshold = model.toNumber(minThresholdInput.value, 0);
    const minSens = model.toNumber(minSensXInput.value, 0);

    maxThresholdInput.value = toFieldValue(Math.max(minThreshold, next.threshold));
    maxSensXInput.value = toFieldValue(Math.max(minSens, next.sensitivity));
  }

  renderCurve();
  renderCommands();
}

function stopCurveDrag() {
  curveState.dragging = null;
}

function startCurveDrag(pointName) {
  return (event) => {
    event.preventDefault();
    curveState.dragging = pointName;
  };
}

function bindCurveEditor() {
  minPointElement.addEventListener('pointerdown', startCurveDrag('min'));
  maxPointElement.addEventListener('pointerdown', startCurveDrag('max'));
  gyroCurveElement.addEventListener('pointermove', updateCurveFromPointer);
  gyroCurveElement.addEventListener('pointerup', stopCurveDrag);
  gyroCurveElement.addEventListener('pointerleave', stopCurveDrag);
}

async function loadDefaults() {
  const response = await fetch('/api/config');
  const config = await response.json();
  socketPathInput.value = config.defaultSocketPath;
}

async function loadCurrentConfig() {
  statusElement.textContent = 'Loading current config...';
  const response = await fetch('/api/current-config');
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Failed to load current config.');
  }

  applyCurrentConfig(result.currentConfig);
  statusElement.textContent = 'Loaded current config.';
}

async function saveCurrentConfig() {
  statusElement.textContent = 'Saving current config...';

  const response = await fetch('/api/current-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentConfig: collectCurrentConfig() }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || 'Failed to save current config.');
  }

  applyCurrentConfig(result.currentConfig);
  statusElement.textContent = 'Saved current config.';
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

document.getElementById('loadCurrentConfig').addEventListener('click', () => {
  loadCurrentConfig().catch((error) => {
    statusElement.textContent = `Failed: ${error.message}`;
  });
});

document.getElementById('saveCurrentConfig').addEventListener('click', () => {
  saveCurrentConfig().catch((error) => {
    statusElement.textContent = `Failed: ${error.message}`;
  });
});

document.getElementById('apply').addEventListener('click', () => {
  applyConfig().catch((error) => {
    statusElement.textContent = `Failed: ${error.message}`;
  });
});

for (const id of gyroFieldIds) {
  document.getElementById(id).addEventListener('input', () => {
    renderCurve();
    renderCommands();
  });
}

bindCurveEditor();

loadDefaults()
  .then(loadCurrentConfig)
  .then(() => {
    renderCurve();
    renderCommands();
  })
  .catch((error) => {
    statusElement.textContent = `Failed to load defaults: ${error.message}`;
    addMappingRow('R', 'RMOUSE');
    addMappingRow('ZR', 'LMOUSE');
    renderCurve();
    renderCommands();
  });
