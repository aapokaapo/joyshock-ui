const socketPathInput = document.getElementById('socketPath');
const commandsPreview = document.getElementById('commandsPreview');
const statusElement = document.getElementById('status');

const gyroCurveElement = document.getElementById('gyroCurve');
const curveGuideElement = document.getElementById('curveGuide');
const curveLineElement = document.getElementById('curveLine');
const minPointElement = document.getElementById('minPoint');
const maxPointElement = document.getElementById('maxPoint');
const xMaxLabelElement = document.getElementById('xMaxLabel');
const yMaxLabelElement = document.getElementById('yMaxLabel');

const mappingLinesElement = document.getElementById('mappingLines');
const mappingAnchorsElement = document.getElementById('mappingAnchors');
const buttonCapsulesElement = document.getElementById('buttonCapsules');
const mappingEditorTitleElement = document.getElementById('mappingEditorTitle');
const mappingActionInputElement = document.getElementById('mappingActionInput');
const mappingPresetGridElement = document.getElementById('mappingPresetGrid');

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

const mappingUiState = {
  mappingMap: {},
  activeButton: null,
};

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

function buttonMappingCommands() {
  return window.ButtonMappingModel
    .serializeMappings(mappingUiState.mappingMap)
    .map((mapping) => `${mapping.button} = ${mapping.action}`);
}

function buildCommands() {
  return [...gyroCommands(), ...buttonMappingCommands()];
}

function renderCommands() {
  commandsPreview.value = buildCommands().join('\n');
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
  return window.ButtonMappingModel.serializeMappings(mappingUiState.mappingMap);
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

function setMappingAction(buttonId, action) {
  mappingUiState.mappingMap = window.ButtonMappingModel.setMapping(mappingUiState.mappingMap, buttonId, action);
}

function selectMappingButton(buttonId) {
  mappingUiState.activeButton = buttonId;
  const action = mappingUiState.mappingMap[buttonId] || '';
  mappingEditorTitleElement.textContent = `${buttonId} → ${window.ButtonMappingModel.formatActionLabel(action)}`;
  mappingActionInputElement.value = action;
  renderMappingLayout();
}

function renderMappingLines() {
  mappingLinesElement.innerHTML = '';
  mappingAnchorsElement.innerHTML = '';

  for (const button of window.ButtonMappingModel.BUTTON_LAYOUT) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', `${button.cap[0]},${button.cap[1]} ${button.anchor[0]},${button.anchor[1]}`);
    line.setAttribute('class', button.id === mappingUiState.activeButton ? 'mapping-line active' : 'mapping-line');
    mappingLinesElement.appendChild(line);

    const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    anchor.setAttribute('cx', button.anchor[0]);
    anchor.setAttribute('cy', button.anchor[1]);
    anchor.setAttribute('r', '5');
    anchor.setAttribute('class', button.id === mappingUiState.activeButton ? 'mapping-anchor active' : 'mapping-anchor');
    mappingAnchorsElement.appendChild(anchor);
  }
}

function renderButtonCapsules() {
  buttonCapsulesElement.innerHTML = '';

  for (const button of window.ButtonMappingModel.BUTTON_LAYOUT) {
    const capsule = document.createElement('button');
    capsule.type = 'button';
    capsule.className = 'mapping-capsule';
    if (mappingUiState.activeButton === button.id) {
      capsule.classList.add('active');
    }

    const mapped = window.ButtonMappingModel.formatActionLabel(mappingUiState.mappingMap[button.id]);
    if (mapped !== 'UNMAPPED') {
      capsule.classList.add('mapped');
    }

    capsule.style.left = `${(button.cap[0] / window.ButtonMappingModel.STAGE.width) * 100}%`;
    capsule.style.top = `${(button.cap[1] / window.ButtonMappingModel.STAGE.height) * 100}%`;

    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'source';
    sourceSpan.textContent = button.label;

    const targetSpan = document.createElement('span');
    targetSpan.className = 'target';
    targetSpan.textContent = mapped;

    capsule.appendChild(sourceSpan);
    capsule.appendChild(targetSpan);
    capsule.addEventListener('click', () => {
      selectMappingButton(button.id);
      renderCommands();
    });

    buttonCapsulesElement.appendChild(capsule);
  }
}

function applyMappingsState(mappings) {
  mappingUiState.mappingMap = window.ButtonMappingModel.normalizeMappings(mappings);

  if (!mappingUiState.activeButton || !window.ButtonMappingModel.BUTTON_IDS.has(mappingUiState.activeButton)) {
    mappingUiState.activeButton = window.ButtonMappingModel.BUTTON_LAYOUT[0].id;
  }

  renderMappingLayout();
}

function renderMappingLayout() {
  renderMappingLines();
  renderButtonCapsules();

  if (mappingUiState.activeButton) {
    const action = mappingUiState.mappingMap[mappingUiState.activeButton] || '';
    mappingEditorTitleElement.textContent = `${mappingUiState.activeButton} → ${window.ButtonMappingModel.formatActionLabel(action)}`;
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

function initMappingPresets() {
  mappingPresetGridElement.innerHTML = '';
  for (const action of window.ButtonMappingModel.ACTION_PRESETS) {
    const presetButton = document.createElement('button');
    presetButton.type = 'button';
    presetButton.className = 'mapping-preset';
    presetButton.textContent = action;
    presetButton.addEventListener('click', () => {
      if (!mappingUiState.activeButton) {
        return;
      }
      setMappingAction(mappingUiState.activeButton, action);
      mappingActionInputElement.value = action;
      renderMappingLayout();
      renderCommands();
    });
    mappingPresetGridElement.appendChild(presetButton);
  }
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

mappingActionInputElement.addEventListener('input', () => {
  if (!mappingUiState.activeButton) {
    return;
  }
  setMappingAction(mappingUiState.activeButton, mappingActionInputElement.value);
  renderMappingLayout();
  renderCommands();
});

document.getElementById('clearMapping').addEventListener('click', () => {
  if (!mappingUiState.activeButton) {
    return;
  }
  setMappingAction(mappingUiState.activeButton, '');
  mappingActionInputElement.value = '';
  renderMappingLayout();
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
initMappingPresets();

loadDefaults()
  .then(loadCurrentConfig)
  .then(() => {
    renderCurve();
    renderMappingLayout();
    renderCommands();
  })
  .catch((error) => {
    statusElement.textContent = `Failed to load defaults: ${error.message}`;
    mappingUiState.mappingMap = {
      R: 'RMOUSE',
      ZR: 'LMOUSE',
    };
    mappingUiState.activeButton = 'R';
    renderCurve();
    renderMappingLayout();
    renderCommands();
  });
