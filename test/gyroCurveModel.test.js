const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeBounds,
  valueToPoint,
  pointToValue,
  round2,
} = require('../public/gyroCurveModel');

test('computeBounds keeps sensible minimum axis ranges', () => {
  const bounds = computeBounds({
    minThreshold: '0',
    maxThreshold: '1',
    minSensX: '0',
    maxSensX: '2',
  });

  assert.equal(bounds.xMax, 10);
  assert.equal(bounds.yMax, 10);
});

test('point conversion roundtrip keeps values near original', () => {
  const bounds = computeBounds({
    minThreshold: '2',
    maxThreshold: '8',
    minSensX: '1',
    maxSensX: '6',
  });

  const point = valueToPoint(4.2, 3.4, bounds, 420, 240, 32);
  const values = pointToValue(point.x, point.y, bounds, 420, 240, 32);

  assert.equal(round2(values.threshold), 4.2);
  assert.equal(round2(values.sensitivity), 3.4);
});
