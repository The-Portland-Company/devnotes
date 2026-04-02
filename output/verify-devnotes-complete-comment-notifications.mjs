import fs from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.APP_URL || 'https://app.politogyvrm.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '');
const TEST_USER_ID =
  process.env.TEST_USER_ID || 'ca3fa9af-f6f1-45af-8f83-ce0388c7ad15';
const TEST_USER_EMAIL =
  process.env.TEST_USER_EMAIL || 'agency@theportlandcompany.com';
const FOCUS_FORGE_BASE_URL = process.env.FOCUS_FORGE_BASE_URL || 'https://focusforge.theportlandcompany.com';
const FOCUS_FORGE_PAT = process.env.FOCUS_FORGE_PAT;
const FOCUS_FORGE_PROJECT_NAME = process.env.FOCUS_FORGE_PROJECT_NAME || 'Politogy: VRM';
const OUTPUT_DIR =
  process.env.OUTPUT_DIR || '/Users/spencerhill/Desktop/politogy-notification-followup-2026-04-01';

const DEVNOTES_META_MARKER = '[DEVNOTES_META:';

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function encodeDevNotesMeta(meta) {
  return Buffer.from(JSON.stringify(meta), 'utf8').toString('base64');
}

function appendDevNotesMeta(text, meta) {
  const body = String(text || '').trimEnd();
  const marker = `${DEVNOTES_META_MARKER}${encodeDevNotesMeta(meta)}]`;
  return body ? `${body}\n\n${marker}` : marker;
}

async function jsonRequest(url, { method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

function encodeBase64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function buildSyntheticToken() {
  if (!SUPABASE_PROJECT_REF || !TEST_USER_ID || !TEST_USER_EMAIL) {
    throw new Error('Missing required auth environment for verification script');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = encodeBase64Url(
    JSON.stringify({
      aud: 'authenticated',
      exp: now + 60 * 60,
      iat: now,
      iss: `https://${SUPABASE_PROJECT_REF}.supabase.co/auth/v1`,
      sub: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      role: 'authenticated',
      user_metadata: {},
      app_metadata: {},
    })
  );

  return `${header}.${payload}.`;
}

async function waitFor(condition, { timeoutMs = 15000, intervalMs = 1000, label }) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await condition();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function apiRequest(token, pathname, { method = 'GET', body } = {}) {
  return await jsonRequest(`${APP_URL}/api/devnotes${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function fetchForge(pathname, { method = 'GET', body } = {}) {
  if (!FOCUS_FORGE_PAT) {
    throw new Error('Missing FOCUS_FORGE_PAT');
  }

  const response = await fetch(`${FOCUS_FORGE_BASE_URL}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${FOCUS_FORGE_PAT}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function resolveForgeProjectId() {
  const bootstrap = await fetchForge('/api/mobile/bootstrap');
  const bootstrapProjects = Array.isArray(bootstrap?.data?.projects)
    ? bootstrap.data.projects
    : Array.isArray(bootstrap?.projects)
      ? bootstrap.projects
      : [];
  const projectFromBootstrap = bootstrapProjects.find(
    (project) => String(project?.name || '').trim() === FOCUS_FORGE_PROJECT_NAME
  );
  if (projectFromBootstrap?.id) {
    return String(projectFromBootstrap.id);
  }

  const projectsPayload = await fetchForge('/api/mobile/projects');
  const projects = Array.isArray(projectsPayload?.data)
    ? projectsPayload.data
    : Array.isArray(projectsPayload)
      ? projectsPayload
      : [];
  const matched = projects.find(
    (project) => String(project?.name || '').trim() === FOCUS_FORGE_PROJECT_NAME
  );
  if (!matched?.id) {
    throw new Error(`Could not resolve Forge project id for ${FOCUS_FORGE_PROJECT_NAME}`);
  }
  return String(matched.id);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const token = buildSyntheticToken();
  const taskTypes = await apiRequest(token, '/task-types');
  const taskLists = await apiRequest(token, '/task-lists');
  const forgeProjectId = await resolveForgeProjectId();

  const taskTypeId = Array.isArray(taskTypes) && taskTypes.length > 0 ? String(taskTypes[0].id) : null;
  const taskListId = Array.isArray(taskLists) && taskLists.length > 0 ? String(taskLists[0].id) : null;
  if (!taskListId) {
    throw new Error('No task list available for verification');
  }

  const runStamp = stamp();
  const title = `Codex completion/comment notification verification ${runStamp}`;
  const pageUrl = '/relationship/roadmap/tasks?org=748aec&roadmap-task-tab=active';

  const createdTask = await apiRequest(token, '/tasks', {
    method: 'POST',
    body: {
      title,
      description:
        'Verifies task comment and task completion notifications for creator, assignee email, and prior commenter email.',
      expected_behavior: 'Comment and completion notifications should go to the three specified recipients.',
      actual_behavior: 'Triggered by Codex verification script.',
      severity: 'Medium',
      page_url: pageUrl,
      task_list_id: taskListId,
      types: taskTypeId ? [taskTypeId] : [],
      status: 'Open',
      x_position: 893,
      y_position: 695,
    },
  });

  const taskId = String(createdTask?.id || '').trim();
  if (!taskId) {
    throw new Error(`Task creation did not return an id: ${JSON.stringify(createdTask)}`);
  }

  const patchedTask = await apiRequest(token, `/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: {
      assigned_to: 'spencerdhill@protonmail.com',
      status: 'Open',
    },
  });

  const seededComment = await fetchForge('/api/sync/comments', {
    method: 'POST',
    body: {
      projectId: forgeProjectId,
      content: appendDevNotesMeta('Seeded commenter for notification routing.', {
        kind: 'message',
        reportId: taskId,
        authorId: 'email:spencerhill@theportlandcompany.com',
        authorEmail: 'spencerhill@theportlandcompany.com',
        authorName: 'Spencer Hill',
      }),
    },
  });

  const seededCommentId =
    seededComment?.data?.id || seededComment?.id || seededComment?.data?.commentId || null;

  const messagesAfterSeed = await waitFor(
    async () => {
      const messages = await apiRequest(token, `/tasks/${encodeURIComponent(taskId)}/messages`);
      return Array.isArray(messages) &&
          messages.some((message) => String(message.id || '') === String(seededCommentId || ''))
        ? messages
        : null;
    },
    {
      timeoutMs: 30000,
      intervalMs: 1500,
      label: `seeded comment ${seededCommentId}`,
    }
  );

  const commentResponse = await apiRequest(token, `/tasks/${encodeURIComponent(taskId)}/messages`, {
    method: 'POST',
    body: {
      body: `Agency comment notification verification ${runStamp}`,
    },
  });

  const messagesAfterComment = await waitFor(
    async () => {
      const messages = await apiRequest(token, `/tasks/${encodeURIComponent(taskId)}/messages`);
      return Array.isArray(messages) &&
          messages.some((message) => String(message.id || '') === String(commentResponse?.id || ''))
        ? messages
        : null;
    },
    {
      timeoutMs: 30000,
      intervalMs: 1500,
      label: `comment ${commentResponse?.id || 'unknown'}`,
    }
  );

  const completedTask = await apiRequest(token, `/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: {
      status: 'Resolved',
    },
  });

  const result = {
    runStamp,
    title,
    taskId,
    forgeProjectId,
    createdTask,
    patchedTask,
    seededCommentId,
    messagesAfterSeed,
    commentResponse,
    messagesAfterComment,
    completedTask,
    expectedRecipients: [
      'agency@theportlandcompany.com',
      'spencerdhill@protonmail.com',
      'spencerhill@theportlandcompany.com',
    ],
    expectedSubjects: {
      comment: 'agency@theportlandcompany.com has commented on a Task on Politogy: VRM',
      completed: 'agency@theportlandcompany.com has completed a Task on Politogy: VRM',
    },
  };

  const outputPath = path.join(OUTPUT_DIR, 'notification-api-run.json');
  await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
