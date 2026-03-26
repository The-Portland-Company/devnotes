import test from 'node:test';
import assert from 'node:assert/strict';

import { createDenoDevNotesHandler } from '../dist/server/deno.mjs';
import { createNextDevNotesHandler } from '../dist/server/next.mjs';

const REPORT_META_TOKEN =
  '[DEVNOTES_META:eyJraW5kIjoicmVwb3J0IiwidmVyc2lvbiI6MSwidGFza19saXN0X2lkIjoidGFzay1saXN0LTEiLCJwYWdlX3VybCI6Ii9hZG1pbi9jdXN0b21lcnMiLCJ4X3Bvc2l0aW9uIjowLCJ5X3Bvc2l0aW9uIjowLCJ0YXJnZXRfc2VsZWN0b3IiOm51bGwsInRhcmdldF9yZWxhdGl2ZV94IjpudWxsLCJ0YXJnZXRfcmVsYXRpdmVfeSI6bnVsbCwidHlwZXMiOlsidHlwZS0xIl0sInNldmVyaXR5IjoiTWVkaXVtIiwiZXhwZWN0ZWRfYmVoYXZpb3IiOm51bGwsImFjdHVhbF9iZWhhdmlvciI6bnVsbCwiY2FwdHVyZV9jb250ZXh0IjpudWxsLCJzdGF0dXMiOiJPcGVuIiwiY3JlYXRlZF9ieSI6InVzZXItMSIsImNyZWF0b3JfbmFtZSI6IlBlcnNvbiBFeGFtcGxlIiwiY3JlYXRvcl9lbWFpbCI6InBlcnNvbkBleGFtcGxlLmNvbSIsImFzc2lnbmVkX3RvIjoidXNlci0yIiwicmVzb2x2ZWRfYXQiOm51bGwsInJlc29sdmVkX2J5IjpudWxsLCJhcHByb3ZlZCI6ZmFsc2UsImFpX3JlYWR5IjpmYWxzZSwiYWlfZGVzY3JpcHRpb24iOm51bGwsInJlc3BvbnNlIjpudWxsfQ==]';

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

test('task creation sends Forge-compatible project and assignee fields', async () => {
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
      [
        'POST /api/mobile/tasks',
        async (_url, init) => {
          const body = JSON.parse(init.body);
          assert.equal(body.projectId, 'project-1');
          assert.equal(body.project_id, 'project-1');
          assert.equal(body.assignedTo, 'user-2');
          assert.equal(body.assigned_to, 'user-2');
          assert.equal(body.name, 'Visible task');
          assert.equal(body.description, 'Task description');
          assert.equal(body.devnotesMeta, REPORT_META_TOKEN);
          assert.equal(body.devnotes_meta, REPORT_META_TOKEN);
          return jsonResponse({ data: { task: { id: 'task-1' } } }, { status: 201 });
        },
      ],
      [
        'GET /api/mobile/tasks?projectId=project-1',
        async () =>
          jsonResponse({
            data: [
              {
                id: 'task-1',
                name: 'Visible task',
                description: 'Task description',
                devnotes_meta: REPORT_META_TOKEN,
                created_at: '2026-03-26T20:00:00.000Z',
                updated_at: '2026-03-26T20:00:00.000Z',
                completed: false,
                assigned_to: 'user-2',
              },
            ],
          }),
      ],
    ])
  );

  const handler = createNextDevNotesHandler(createOptions({ fetch }));
  const response = await handler(
    new Request('https://app.example.com/api/devnotes/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        task_list_id: 'task-list-1',
        page_url: '/admin/customers',
        x_position: 0,
        y_position: 0,
        target_selector: null,
        target_relative_x: null,
        target_relative_y: null,
        types: ['type-1'],
        severity: 'Medium',
        title: 'Visible task',
        description: 'Task description',
        expected_behavior: null,
        actual_behavior: null,
        response: null,
        status: 'Open',
        assigned_to: 'user-2',
        approved: false,
        ai_ready: false,
        ai_description: null,
        capture_context: null,
      }),
    })
  );

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.id, 'task-1');
  assert.equal(json.title, 'Visible task');
  assert.equal(json.description, 'Task description');
  assert.equal(json.assigned_to, 'user-2');
});

test('task creation strips legacy embedded metadata from description before sending to Forge', async () => {
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
      [
        'POST /api/mobile/tasks',
        async (_url, init) => {
          const body = JSON.parse(init.body);
          assert.equal(body.description, 'Task description');
          assert.equal(body.devnotesMeta, REPORT_META_TOKEN);
          assert.equal(body.devnotes_meta, REPORT_META_TOKEN);
          return jsonResponse({ data: { task: { id: 'task-legacy' } } }, { status: 201 });
        },
      ],
      [
        'GET /api/mobile/tasks?projectId=project-1',
        async () =>
          jsonResponse({
            data: [
              {
                id: 'task-legacy',
                name: 'Visible task',
                description: 'Task description',
                devnotesMeta: REPORT_META_TOKEN,
                created_at: '2026-03-26T20:00:00.000Z',
                updated_at: '2026-03-26T20:00:00.000Z',
                completed: false,
              },
            ],
          }),
      ],
    ])
  );

  const handler = createNextDevNotesHandler(createOptions({ fetch }));
  const response = await handler(
    new Request('https://app.example.com/api/devnotes/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        task_list_id: 'task-list-1',
        page_url: '/admin/customers',
        x_position: 0,
        y_position: 0,
        target_selector: null,
        target_relative_x: null,
        target_relative_y: null,
        types: ['type-1'],
        severity: 'Medium',
        title: 'Visible task',
        description: `Task description\n\n${REPORT_META_TOKEN}`,
        expected_behavior: null,
        actual_behavior: null,
        response: null,
        status: 'Open',
        assigned_to: 'user-2',
        approved: false,
        ai_ready: false,
        ai_description: null,
        capture_context: null,
      }),
    })
  );

  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.id, 'task-legacy');
  assert.equal(json.description, 'Task description');
});

test('tasks returned with dedicated devnotes_meta keep description human-readable', async () => {
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
            data: [
              {
                id: 'task-1',
                name: 'Visible task',
                description: 'Task description',
                devnotes_meta: REPORT_META_TOKEN,
                created_at: '2026-03-26T20:00:00.000Z',
                updated_at: '2026-03-26T20:00:00.000Z',
                completed: false,
                assigned_to: 'user-2',
              },
            ],
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
  assert.deepEqual(await response.json(), [
    {
      id: 'task-1',
      task_list_id: 'task-list-1',
      page_url: '/admin/customers',
      x_position: 0,
      y_position: 0,
      target_selector: null,
      target_relative_x: null,
      target_relative_y: null,
      types: ['type-1'],
      severity: 'Medium',
      title: 'Visible task',
      description: 'Task description',
      expected_behavior: null,
      actual_behavior: null,
      capture_context: null,
      response: null,
      status: 'Open',
      created_by: 'user-1',
      creator: {
        id: 'user-1',
        email: 'person@example.com',
        full_name: 'Person Example',
      },
      assigned_to: 'user-2',
      resolved_at: null,
      resolved_by: null,
      approved: false,
      ai_ready: false,
      ai_description: null,
      created_at: '2026-03-26T20:00:00.000Z',
      updated_at: '2026-03-26T20:00:00.000Z',
    },
  ]);
});
