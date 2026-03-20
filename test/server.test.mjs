import test from 'node:test';
import assert from 'node:assert/strict';

import { createDenoDevNotesHandler } from '../dist/server/deno.mjs';
import { createNextDevNotesHandler } from '../dist/server/next.mjs';

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

function createFetchMock(routes) {
  return async function mockFetch(input, init = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const key = `${(init.method || 'GET').toUpperCase()} ${url.pathname}${url.search}`;
    const responder = routes.get(key) || routes.get(`${(init.method || 'GET').toUpperCase()} ${url.pathname}`);
    if (!responder) {
      throw new Error(`Unexpected fetch: ${key}`);
    }
    return await responder(url, init);
  };
}

function createOptions(overrides = {}) {
  return {
    basePath: '/api/devnotes',
    getCurrentUser: async () => ({
      id: 'user-1',
      email: 'person@example.com',
      fullName: 'Person Example',
    }),
    forge: {
      baseUrl: 'https://focusforge.example.com',
      pat: 'forge-secret',
      projectName: 'Politogy',
    },
    ...overrides,
  };
}

test('shared handler routes capabilities through the Next helper', async () => {
  const handler = createNextDevNotesHandler(
    createOptions({
      fetch: createFetchMock(new Map()),
    })
  );

  const response = await handler(new Request('https://app.example.com/api/devnotes/capabilities'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ai: false, appLink: true });
});

test('Next helper accepts canonical /tasks routes', async () => {
  const fetch = createFetchMock(
    new Map([
      [
        'GET /api/mobile/bootstrap',
        async () =>
          jsonResponse({
            data: {
              bootstrap: {
                projects: [{ id: 'project-1', name: 'Politogy' }],
              },
            },
          }),
      ],
      [
        'GET /api/mobile/tasks?projectId=project-1',
        async () =>
          jsonResponse({
            data: [],
          }),
      ],
      [
        'GET /api/sync/comments?projectId=project-1',
        async () =>
          jsonResponse({
            data: [
              {
                id: 'task-list-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoidGFza19saXN0IiwibmFtZSI6IkdlbmVyYWwiLCJzaGFyZV9zbHVnIjoiZ2VuZXJhbC1zbHVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1cGRhdGVkX2F0IjoiMjAyNi0wMS0wMVQwMDowMDowMC4wMDBaIn0=]',
              },
              {
                id: 'type-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoicmVwb3J0X3R5cGUiLCJuYW1lIjoiQnVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==]',
              },
            ],
          }),
      ],
    ])
  );

  const handler = createNextDevNotesHandler(createOptions({ fetch }));
  const response = await handler(new Request('https://app.example.com/api/devnotes/tasks'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('Next helper accepts canonical /task-types routes', async () => {
  const fetch = createFetchMock(
    new Map([
      [
        'GET /api/mobile/bootstrap',
        async () =>
          jsonResponse({
            data: {
              bootstrap: {
                projects: [{ id: 'project-1', name: 'Politogy' }],
              },
            },
          }),
      ],
      [
        'GET /api/mobile/tasks?projectId=project-1',
        async () =>
          jsonResponse({
            data: [],
          }),
      ],
      [
        'GET /api/sync/comments?projectId=project-1',
        async () =>
          jsonResponse({
            data: [
              {
                id: 'type-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoicmVwb3J0X3R5cGUiLCJuYW1lIjoiQnVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==]',
              },
              {
                id: 'task-list-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoidGFza19saXN0IiwibmFtZSI6IkdlbmVyYWwiLCJzaGFyZV9zbHVnIjoiZ2VuZXJhbC1zbHVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1cGRhdGVkX2F0IjoiMjAyNi0wMS0wMVQwMDowMDowMC4wMDBaIn0=]',
              },
            ],
          }),
      ],
    ])
  );

  const handler = createNextDevNotesHandler(createOptions({ fetch }));
  const response = await handler(new Request('https://app.example.com/api/devnotes/task-types'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      id: 'type-1',
      name: 'Bug',
      is_default: true,
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
});

test('Deno handler returns discovered projects when projectName is unset', async () => {
  const fetch = createFetchMock(
    new Map([
      ['GET /api/mobile/bootstrap', async () => jsonResponse({ data: { bootstrap: { projects: [] } } })],
      [
        'GET /api/mobile/projects',
        async () =>
          jsonResponse({
            data: {
              projects: [
                { id: 'project-1', name: 'Politogy' },
                { id: 'project-2', name: 'Campaign Hub' },
              ],
            },
          }),
      ],
    ])
  );

  const handler = createDenoDevNotesHandler(
    createOptions({
      forge: {
        baseUrl: 'https://focusforge.example.com',
        pat: 'forge-secret',
        projectName: null,
      },
      fetch,
      corsHeaders: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  );

  const response = await handler(new Request('https://backend.example.com/api/devnotes/app-link'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.deepEqual(await response.json(), {
    linked: true,
    projectName: null,
    tokenLast4: 'cret',
    linkedAt: null,
    projectMatched: false,
    availableProjects: [
      { id: 'project-1', name: 'Politogy' },
      { id: 'project-2', name: 'Campaign Hub' },
    ],
    projectDiscovery: {
      path: '/api/mobile/projects',
      baseUrl: 'https://focusforge.example.com',
    },
  });
});

test('Deno handler resolves a configured project name and returns task list defaults', async () => {
  const fetch = createFetchMock(
    new Map([
      [
        'GET /api/mobile/bootstrap',
        async () =>
          jsonResponse({
            data: {
              bootstrap: {
                projects: [{ id: 'project-1', name: 'Politogy' }],
              },
            },
          }),
      ],
      [
        'GET /api/sync/comments?projectId=project-1',
        async () =>
          jsonResponse({
            data: [
              {
                id: 'task-list-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoidGFza19saXN0IiwibmFtZSI6IkdlbmVyYWwiLCJzaGFyZV9zbHVnIjoiZ2VuZXJhbC1zbHVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1cGRhdGVkX2F0IjoiMjAyNi0wMS0wMVQwMDowMDowMC4wMDBaIn0=]',
              },
              {
                id: 'type-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
                content:
                  '[DEVNOTES_META:eyJraW5kIjoicmVwb3J0X3R5cGUiLCJuYW1lIjoiQnVnIiwiaXNfZGVmYXVsdCI6dHJ1ZSwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0ZWRfYXQiOiIyMDI2LTAxLTAxVDAwOjAwOjAwLjAwMFoifQ==]',
              },
            ],
          }),
      ],
    ])
  );

  const handler = createDenoDevNotesHandler(createOptions({ fetch }));
  const response = await handler(new Request('https://backend.example.com/api/devnotes/task-lists'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [
    {
      id: 'task-list-1',
      name: 'General',
      share_slug: 'general-slug',
      is_default: true,
      created_by: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ]);
});

test('app-link reports a configured project match from bootstrap discovery', async () => {
  const fetch = createFetchMock(
    new Map([
      [
        'GET /api/mobile/bootstrap',
        async () =>
          jsonResponse({
            data: {
              bootstrap: {
                projects: [{ id: 'project-1', name: 'Politogy', organization_id: 'org-1' }],
              },
            },
          }),
      ],
    ])
  );

  const handler = createDenoDevNotesHandler(createOptions({ fetch }));
  const response = await handler(new Request('https://backend.example.com/api/devnotes/app-link'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    linked: true,
    projectName: 'Politogy',
    tokenLast4: 'cret',
    linkedAt: null,
    projectMatched: true,
    availableProjects: [],
    projectDiscovery: {
      path: '/api/mobile/bootstrap',
      baseUrl: 'https://focusforge.example.com',
    },
  });
});

test('raw upstream status and body are preserved on Forge failures', async () => {
  const fetch = createFetchMock(
    new Map([
      [
        'GET /api/mobile/bootstrap',
        async () =>
          new Response('upstream exploded', {
            status: 502,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }),
      ],
    ])
  );

  const handler = createDenoDevNotesHandler(createOptions({ fetch }));
  const response = await handler(new Request('https://backend.example.com/api/devnotes/reports'));
  assert.equal(response.status, 502);
  assert.equal(await response.text(), 'upstream exploded');
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(response.headers.get('x-devnotes-upstream-path'), '/api/mobile/bootstrap');
});
