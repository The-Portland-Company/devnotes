import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  getInitialTaskStatus,
  getInitialNarrativeTab,
  shouldRequireExplicitStatusSelection,
} = require('../dist/index.js');

test('new tasks default status to Open', () => {
  assert.equal(getInitialTaskStatus(null), 'Open');
  assert.equal(getInitialTaskStatus(undefined), 'Open');
});

test('existing task status is preserved', () => {
  assert.equal(getInitialTaskStatus('Needs Review'), 'Needs Review');
});

test('narrative tab defaults to standard description', () => {
  assert.equal(getInitialNarrativeTab(), 'description');
});

test('only existing tasks require explicit status reselection', () => {
  assert.equal(shouldRequireExplicitStatusSelection(false), false);
  assert.equal(shouldRequireExplicitStatusSelection(true), true);
});
