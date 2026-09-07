(function initButtonMappingModel(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.ButtonMappingModel = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const STAGE = { width: 1000, height: 620 };

  const BUTTON_LAYOUT = [
    { id: 'ZL', label: 'ZL', cap: [90, 70], anchor: [300, 170] },
    { id: 'L', label: 'L', cap: [90, 145], anchor: [320, 230] },
    { id: 'MINUS', label: '-', cap: [90, 225], anchor: [420, 240] },
    { id: 'UP', label: 'UP', cap: [90, 305], anchor: [325, 285] },
    { id: 'LEFT', label: 'LEFT', cap: [90, 385], anchor: [285, 325] },
    { id: 'DOWN', label: 'DOWN', cap: [90, 465], anchor: [325, 365] },
    { id: 'L3', label: 'L3', cap: [90, 545], anchor: [415, 430] },

    { id: 'ZR', label: 'ZR', cap: [910, 70], anchor: [700, 170] },
    { id: 'R', label: 'R', cap: [910, 145], anchor: [680, 230] },
    { id: 'PLUS', label: '+', cap: [910, 225], anchor: [580, 240] },
    { id: 'TRIANGLE', label: '△', cap: [910, 305], anchor: [670, 285] },
    { id: 'SQUARE', label: '□', cap: [910, 385], anchor: [630, 325] },
    { id: 'CIRCLE', label: '○', cap: [910, 465], anchor: [670, 365] },
    { id: 'R3', label: 'R3', cap: [910, 545], anchor: [585, 430] },

    { id: 'CROSS', label: '✕', cap: [780, 545], anchor: [700, 410] },
    { id: 'HOME', label: 'HOME', cap: [500, 595], anchor: [500, 450] },
    { id: 'CAPTURE', label: 'CAP', cap: [220, 545], anchor: [300, 410] },
  ];

  const BUTTON_IDS = new Set(BUTTON_LAYOUT.map((button) => button.id));

  const ACTION_PRESETS = [
    'RMOUSE',
    'LMOUSE',
    'MMOUSE',
    'SPACE',
    'LCTRL',
    'LSHIFT',
    'R',
    'F',
    'E',
    'NONE',
    'GYRO_ON',
    'GYRO_OFF',
  ];

  function isCleanToken(value) {
    return (
      typeof value === 'string'
      && value.trim().length > 0
      && !value.includes('\n')
      && !value.includes('\r')
    );
  }

  function normalizeMappings(mappings) {
    const normalized = {};
    if (!Array.isArray(mappings)) {
      return normalized;
    }

    for (const mapping of mappings) {
      if (!mapping || typeof mapping !== 'object') {
        continue;
      }
      if (!isCleanToken(mapping.button) || !isCleanToken(mapping.action)) {
        continue;
      }
      normalized[mapping.button.trim()] = mapping.action.trim();
    }

    return normalized;
  }

  function serializeMappings(mappingMap) {
    const normalized = mappingMap && typeof mappingMap === 'object' ? mappingMap : {};
    const seen = new Set();
    const ordered = [];

    for (const button of BUTTON_LAYOUT) {
      const action = normalized[button.id];
      if (isCleanToken(action)) {
        ordered.push({ button: button.id, action: action.trim() });
      }
      seen.add(button.id);
    }

    const extraButtons = Object.keys(normalized)
      .filter((button) => !seen.has(button) && isCleanToken(button) && isCleanToken(normalized[button]))
      .sort();

    for (const button of extraButtons) {
      ordered.push({ button, action: normalized[button].trim() });
    }

    return ordered;
  }

  function setMapping(mappingMap, button, action) {
    const next = { ...(mappingMap || {}) };
    if (!isCleanToken(button)) {
      return next;
    }

    const cleanButton = button.trim();
    if (!isCleanToken(action)) {
      delete next[cleanButton];
      return next;
    }

    next[cleanButton] = action.trim();
    return next;
  }

  function formatActionLabel(action) {
    if (!isCleanToken(action)) {
      return 'UNMAPPED';
    }
    return action.trim();
  }

  return {
    STAGE,
    BUTTON_LAYOUT,
    BUTTON_IDS,
    ACTION_PRESETS,
    isCleanToken,
    normalizeMappings,
    serializeMappings,
    setMapping,
    formatActionLabel,
  };
}));
