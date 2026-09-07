const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeMappings,
  serializeMappings,
  setMapping,
} = require('../public/buttonMappingModel');

test('normalizeMappings keeps valid entries and trims values', () => {
  const mappings = normalizeMappings([
    { button: ' R ', action: ' RMOUSE ' },
    { button: 'ZR', action: 'LMOUSE' },
    { button: '', action: 'INVALID' },
  ]);

  assert.deepEqual(mappings, { R: 'RMOUSE', ZR: 'LMOUSE' });
});

test('setMapping removes mapping on empty action', () => {
  let mappings = setMapping({}, 'R', 'RMOUSE');
  mappings = setMapping(mappings, 'R', '');

  assert.deepEqual(mappings, {});
});

test('serializeMappings keeps known order and includes extras', () => {
  const serialized = serializeMappings({
    ZR: 'LMOUSE',
    R: 'RMOUSE',
    CUSTOM_BTN: 'SPACE',
  });

  assert.deepEqual(serialized.slice(0, 2), [
    { button: 'ZR', action: 'LMOUSE' },
    { button: 'R', action: 'RMOUSE' },
  ]);
  assert.equal(serialized.at(-1).button, 'CUSTOM_BTN');
});
