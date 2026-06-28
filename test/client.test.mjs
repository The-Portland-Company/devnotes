import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createDevNotesClient, DevNotesRequestError } = require('../dist/index.js');

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

const makeClient = (responder) =>
  createDevNotesClient({
    basePath: '/api/devnotes',
    getAuthToken: () => 'token',
    fetch: async (input, init = {}) => responder(input, init),
  });

const TASK = { id: 'task-1', title: 'A', status: 'Open', severity: 'Medium', types: [] };

test('fetchTasks unwraps the { reports, forge } envelope and captures forge', async () => {
  const client = makeClient((_input) =>
    jsonResponse({ reports: [TASK], forge: { connected: true, error: null } })
  );
  const tasks = await client.fetchTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'task-1');
  assert.deepEqual(client.getForgeStatus(), { connected: true, error: null });
});

test('fetchTasks still accepts a bare array (legacy shape)', async () => {
  const client = makeClient(() => jsonResponse([TASK]));
  const tasks = await client.fetchTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'task-1');
});

test('fetchTasks surfaces forge disconnect on a 502 error body', async () => {
  const forge = {
    connected: false,
    error: { path: '/api/sync/comments', status: 504, code: 'TIMEOUT', message: 'Forge timed out (504)' },
  };
  const client = makeClient(() =>
    jsonResponse({ error: 'Forge timed out (504)', forge }, { status: 502 })
  );
  await assert.rejects(
    () => client.fetchTasks(),
    (err) => {
      assert.ok(err instanceof DevNotesRequestError);
      assert.equal(err.status, 502);
      assert.deepEqual(err.forge, forge);
      return true;
    }
  );
  assert.deepEqual(client.getForgeStatus(), forge);
});

test('createTask reads the created task from a { report, forge } envelope', async () => {
  const client = makeClient(() =>
    jsonResponse({ report: TASK, forge: { connected: true, error: null } })
  );
  const created = await client.createTask({ title: 'A', types: [] });
  assert.equal(created.id, 'task-1');
});

test('createTask still reads a bare task object', async () => {
  const client = makeClient(() => jsonResponse(TASK));
  const created = await client.createTask({ title: 'A', types: [] });
  assert.equal(created.id, 'task-1');
});
