import assert from 'node:assert/strict';
import test from 'node:test';
import { diffuseHeat } from '../src/js/heat-experiment.js';

const width = 112;
const height = 72;
const lambda = 0.22;
const createField = () => new Float32Array(width * height);

function statistics(field) {
  let mass = 0;
  let energy = 0;
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of field) {
    mass += value;
    energy += value * value;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return { mass, energy, minimum, maximum };
}

function radialSecondMoment(field, cx, cy) {
  let mass = 0;
  let moment = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = field[y * width + x];
      mass += value;
      moment += value * ((x - cx) ** 2 + (y - cy) ** 2);
    }
  }
  return moment / mass;
}

test('bounded temperatures, zero-temperature edges, and dissipating mass and L2 energy', () => {
  let field = createField();
  let next = createField();
  // A deterministic, irregular initial condition exercises steep local gradients.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      field[y * width + x] = ((x * 193 + y * 67) % 997) / 997;
    }
  }
  let previous = statistics(field);
  const initial = previous;
  for (let step = 0; step < 2000; step += 1) {
    diffuseHeat(field, next, width, height, lambda);
    [field, next] = [next, field];
    const current = statistics(field);
    assert.ok(Number.isFinite(current.mass) && Number.isFinite(current.energy));
    assert.ok(current.minimum >= 0 && current.maximum <= 1);
    assert.ok(current.maximum <= previous.maximum + 1e-6, 'discrete maximum principle');
    assert.ok(current.mass <= previous.mass + 1e-5, 'mass must not increase without a source');
    assert.ok(current.energy <= previous.energy + 1e-5, 'L2 energy must not increase');
    for (let x = 0; x < width; x += 1) {
      assert.equal(field[x], 0);
      assert.equal(field[(height - 1) * width + x], 0);
    }
    for (let y = 0; y < height; y += 1) {
      assert.equal(field[y * width], 0);
      assert.equal(field[y * width + width - 1], 0);
    }
    previous = current;
  }
  assert.ok(previous.mass < initial.mass * 0.25, 'heat escapes through the edges');
  assert.ok(previous.energy < initial.energy * 0.1, 'the field dissipates');
});

test('an interior Gaussian spreads with radial second moment increasing by 4 lambda per step', () => {
  let field = createField();
  let next = createField();
  const cx = 56;
  const cy = 36;
  const sigma = 3;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      field[y * width + x] = Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sigma ** 2));
    }
  }
  const initialMass = statistics(field).mass;
  const initialMoment = radialSecondMoment(field, cx, cy);
  const steps = 20;
  for (let step = 0; step < steps; step += 1) {
    diffuseHeat(field, next, width, height, lambda);
    [field, next] = [next, field];
  }
  // At this time the Gaussian is far from the absorbing boundary.
  assert.ok(Math.abs(statistics(field).mass / initialMass - 1) < 1e-6);
  const actual = radialSecondMoment(field, cx, cy) - initialMoment;
  assert.ok(Math.abs(actual - 4 * lambda * steps) < 1e-4,
    `radial second-moment increase ${actual} should be ${4 * lambda * steps}`);
});

test('a sine eigenmode decays at the analytic rate of the discrete heat stencil', () => {
  let field = createField();
  let next = createField();
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      field[y * width + x] = Math.sin(Math.PI * x / (width - 1))
        * Math.sin(Math.PI * y / (height - 1));
    }
  }
  const peak = 36 * width + 56;
  const initialPeak = field[peak];
  const steps = 1000;
  const multiplier = 1 - 4 * lambda * (
    Math.sin(Math.PI / (2 * (width - 1))) ** 2
    + Math.sin(Math.PI / (2 * (height - 1))) ** 2
  );
  for (let step = 0; step < steps; step += 1) {
    diffuseHeat(field, next, width, height, lambda);
    [field, next] = [next, field];
  }
  const expected = initialPeak * multiplier ** steps;
  assert.ok(Math.abs(field[peak] / expected - 1) < 1e-5);
});

test('rejects nonfinite or unstable diffusion coefficients and accepts the stability endpoints', () => {
  const field = createField();
  const next = createField();
  for (const invalid of [-0.01, 0.251, Infinity, -Infinity, NaN]) {
    assert.throws(() => diffuseHeat(field, next, width, height, invalid), RangeError);
  }
  assert.doesNotThrow(() => diffuseHeat(field, next, width, height, 0));
  assert.doesNotThrow(() => diffuseHeat(field, next, width, height, 0.25));
});
