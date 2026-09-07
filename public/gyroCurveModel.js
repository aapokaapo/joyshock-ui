(function initGyroCurveModel(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.GyroCurveModel = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function toNumber(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return numeric;
  }

  function computeBounds(state) {
    const minThreshold = toNumber(state.minThreshold, 0);
    const maxThreshold = toNumber(state.maxThreshold, 8);
    const minSensX = toNumber(state.minSensX, 0);
    const maxSensX = toNumber(state.maxSensX, 6);

    const xMax = Math.max(10, maxThreshold * 1.25, minThreshold + 0.5);
    const yMax = Math.max(10, maxSensX * 1.25, minSensX + 0.5);

    return { xMax, yMax };
  }

  function valueToPoint(threshold, sensitivity, bounds, width, height, padding) {
    const xRatio = clamp(threshold / bounds.xMax, 0, 1);
    const yRatio = clamp(sensitivity / bounds.yMax, 0, 1);

    return {
      x: padding + xRatio * (width - 2 * padding),
      y: height - padding - yRatio * (height - 2 * padding),
    };
  }

  function pointToValue(x, y, bounds, width, height, padding) {
    const innerWidth = width - 2 * padding;
    const innerHeight = height - 2 * padding;

    const xRatio = clamp((x - padding) / innerWidth, 0, 1);
    const yRatio = clamp((height - padding - y) / innerHeight, 0, 1);

    return {
      threshold: xRatio * bounds.xMax,
      sensitivity: yRatio * bounds.yMax,
    };
  }

  function round2(value) {
    return Math.round(value * 100) / 100;
  }

  return {
    clamp,
    toNumber,
    computeBounds,
    valueToPoint,
    pointToValue,
    round2,
  };
}));
