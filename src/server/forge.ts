import type { BugReportCreateData } from '../adapters/types';
import type {
  BugCaptureContext,
  BugReport,
  BugReportCreator,
  BugReportMessage,
  BugReportType,
  DevNotesAppLinkStatus,
  DevNotesCapabilities,
  DevNotesProjectSummary,
  DevNotesResolvedUser,
  DevNotesServerOptions,
  DevNotesServerUser,
  TaskList,
} from '../types';

const DEFAULT_BASE_PATH = '/api/devnotes';
const DEVNOTES_META_MARKER = '[DEVNOTES_META:';
const DEVNOTES_DEFAULT_TYPE_NAMES = ['Bug', 'Feature Request', 'UI Issue', 'Performance'];
const DEVNOTES_DEFAULT_TASK_LIST_NAME = 'General';

type ForgeProject = DevNotesProjectSummary;

type DevNotesMetadataKind =
  | 'report'
  | 'report_patch'
  | 'report_deleted'
  | 'message'
  | 'message_read'
  | 'report_type'
  | 'task_list';

type DevNotesParsedComment = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  body: string;
  meta: Record<string, unknown>;
};

type ForgeResponse = {
  status: number;
  ok: boolean;
  text: string;
  payload: any;
  contentType: string | null;
};

type ForgeProjectDiscoveryResult =
  | {
      ok: true;
      project: ForgeProject | null;
      matched: boolean;
      preferredProjectName: string | null;
      projects: ForgeProject[];
      resolvedBaseUrl: string;
      discoveryPath: '/api/mobile/bootstrap' | '/api/mobile/projects' | null;
    }
  | {
      ok: false;
      preferredProjectName: string | null;
      resolvedBaseUrl: string;
      discoveryPath: '/api/mobile/bootstrap' | '/api/mobile/projects' | null;
      response: ForgeResponse;
    };

class UpstreamForgeError extends Error {
  readonly path: string;
  readonly baseUrl: string;
  readonly response: ForgeResponse;

  constructor(path: string, baseUrl: string, response: ForgeResponse) {
    super(`Focus Forge request failed for ${path}`);
    this.name = 'UpstreamForgeError';
    this.path = path;
    this.baseUrl = baseUrl;
    this.response = response;
  }
}

function coerceObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseJsonSafe(text: string): any {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeForgeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function normalizeForgeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeForgeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function mapBugStatusToForge(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'in progress') return 'in_progress';
  if (normalized === 'resolved' || normalized === 'closed') return 'completed';
  return 'open';
}

function encodeDevNotesMeta(meta: Record<string, unknown>): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(meta)));
}

function decodeDevNotesMeta(encoded: string): Record<string, unknown> | null {
  try {
    const text = new TextDecoder().decode(base64ToBytes(encoded));
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function splitDevNotesMeta(text: string | null | undefined): {
  body: string;
  meta: Record<string, unknown> | null;
} {
  const value = String(text || '');
  const markerIndex = value.lastIndexOf(DEVNOTES_META_MARKER);
  if (markerIndex === -1) {
    return { body: value, meta: null };
  }

  const endIndex = value.indexOf(']', markerIndex);
  if (endIndex === -1) {
    return { body: value, meta: null };
  }

  const encoded = value.slice(markerIndex + DEVNOTES_META_MARKER.length, endIndex).trim();
  const meta = decodeDevNotesMeta(encoded);
  if (!meta) {
    return { body: value, meta: null };
  }

  const body = value.slice(0, markerIndex).replace(/\n+$/, '');
  return { body, meta };
}

function appendDevNotesMeta(text: string | null | undefined, meta: Record<string, unknown>): string {
  const body = String(text || '').trimEnd();
  const marker = `${DEVNOTES_META_MARKER}${encodeDevNotesMeta(meta)}]`;
  return body ? `${body}\n\n${marker}` : marker;
}

function parseLegacyDevNotesDescription(description: string): Record<string, unknown> {
  const legacyMarker = '\n\n---\nSource: Politogy bug report';
  const index = description.indexOf(legacyMarker);
  if (index === -1) {
    return {
      description: description.trim() || null,
    };
  }

  const leading = description.slice(0, index).trim() || null;
  const detailLines = description
    .slice(index + '\n\n---\n'.length)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const values = new Map<string, string>();
  detailLines.forEach((line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key) values.set(key, value);
  });

  return {
    description: leading,
    page_url: values.get('page url') || '',
    x_position: normalizeForgeNumber(values.get('coordinates')?.split(',')[0]?.trim(), 0),
    y_position: normalizeForgeNumber(values.get('coordinates')?.split(',')[1]?.trim(), 0),
    severity: values.get('severity') || 'Medium',
    status: values.get('status') || 'Open',
    types: values
      .get('types')
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) || [],
    creator_name: values.get('created by') || '',
  };
}

function buildDevNotesReportDescription(report: Record<string, unknown>): string {
  const description = typeof report.description === 'string' ? report.description : '';
  return appendDevNotesMeta(description, {
    kind: 'report',
    version: 1,
    task_list_id: String(report.task_list_id || ''),
    page_url: String(report.page_url || ''),
    x_position: normalizeForgeNumber(report.x_position),
    y_position: normalizeForgeNumber(report.y_position),
    target_selector:
      report.target_selector === null || report.target_selector === undefined
        ? null
        : String(report.target_selector),
    target_relative_x:
      report.target_relative_x === null || report.target_relative_x === undefined
        ? null
        : normalizeForgeNumber(report.target_relative_x),
    target_relative_y:
      report.target_relative_y === null || report.target_relative_y === undefined
        ? null
        : normalizeForgeNumber(report.target_relative_y),
    types: normalizeForgeStringArray(report.types),
    severity: String(report.severity || 'Medium'),
    expected_behavior:
      report.expected_behavior === null || report.expected_behavior === undefined
        ? null
        : String(report.expected_behavior),
    actual_behavior:
      report.actual_behavior === null || report.actual_behavior === undefined
        ? null
        : String(report.actual_behavior),
    capture_context:
      report.capture_context && typeof report.capture_context === 'object'
        ? report.capture_context
        : null,
    status: String(report.status || 'Open'),
    created_by: String(report.created_by || ''),
    creator_name:
      report.creator && typeof report.creator === 'object'
        ? String((report.creator as Record<string, unknown>).full_name || '')
        : '',
    creator_email:
      report.creator && typeof report.creator === 'object'
        ? String((report.creator as Record<string, unknown>).email || '')
        : '',
    assigned_to:
      report.assigned_to === null || report.assigned_to === undefined
        ? null
        : String(report.assigned_to),
    resolved_at:
      report.resolved_at === null || report.resolved_at === undefined
        ? null
        : String(report.resolved_at),
    resolved_by:
      report.resolved_by === null || report.resolved_by === undefined
        ? null
        : String(report.resolved_by),
    approved: normalizeForgeBoolean(report.approved),
    ai_ready: normalizeForgeBoolean(report.ai_ready),
    ai_description:
      report.ai_description === null || report.ai_description === undefined
        ? null
        : String(report.ai_description),
    response:
      report.response === null || report.response === undefined ? null : String(report.response),
  });
}

function isDevNotesForgeTask(task: Record<string, unknown>): boolean {
  const description = String(task.description || '');
  const parsed = splitDevNotesMeta(description);
  if (parsed.meta?.kind === 'report') return true;
  return description.includes('Source: Politogy bug report');
}

function extractProjectsFromPayload(payload: any): ForgeProject[] {
  const root = coerceObject(payload);
  const data = coerceObject(root.data);
  const bootstrap = coerceObject(data.bootstrap);
  const projectArrays: any[][] = [
    Array.isArray(root.projects) ? root.projects : [],
    Array.isArray(data.projects) ? data.projects : [],
    Array.isArray(bootstrap.projects) ? bootstrap.projects : [],
  ];

  const seen = new Set<string>();
  const projects: ForgeProject[] = [];

  for (const group of projectArrays) {
    for (const projectRaw of group) {
      const project = coerceObject(projectRaw);
      const id = typeof project.id === 'string' ? project.id.trim() : '';
      const name = typeof project.name === 'string' ? project.name.trim() : '';
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      const organizationId =
        (typeof project.organization_id === 'string' && project.organization_id.trim()) ||
        (typeof project.organizationId === 'string' && project.organizationId.trim()) ||
        undefined;
      projects.push({ id, name, organizationId });
    }
  }

  return projects;
}

function extractForgeTaskId(payload: any): string | null {
  const root = coerceObject(payload);
  const data = coerceObject(root.data);
  const task = coerceObject(root.task);
  const dataTask = coerceObject(data.task);
  const candidates = [root.id, task.id, data.id, dataTask.id];
  const invalidSentinelValues = new Set(['NOT_FOUND', 'not_found', 'null', 'undefined', '']);
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const value = candidate.trim();
      if (invalidSentinelValues.has(value)) continue;
      if (value.toLowerCase().startsWith('error-')) continue;
      return value;
    }
  }
  return null;
}

function generateDevNotesShareSlug(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

function normalizeBasePath(basePath: string | undefined): string {
  const trimmed = (basePath || DEFAULT_BASE_PATH).trim();
  if (!trimmed) return DEFAULT_BASE_PATH;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalized.endsWith('/') && normalized !== '/' ? normalized.slice(0, -1) : normalized;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function normalizeUser(user: DevNotesServerUser | null): DevNotesServerUser | null {
  if (!user?.id) return null;
  return {
    id: String(user.id).trim(),
    email: user.email == null ? null : String(user.email).trim(),
    fullName: user.fullName == null ? null : String(user.fullName).trim(),
    role: user.role == null ? null : String(user.role).trim(),
  };
}

function toCreatorRecord(user: DevNotesResolvedUser): BugReportCreator {
  return {
    id: user.id,
    email: user.email == null ? null : user.email,
    full_name: user.fullName == null ? null : user.fullName,
  };
}

async function resolveCorsHeaders(
  request: Request,
  corsHeaders: DevNotesServerOptions['corsHeaders']
): Promise<Headers> {
  const headers = new Headers();
  if (!corsHeaders) return headers;
  const resolved = typeof corsHeaders === 'function' ? await corsHeaders(request) : corsHeaders;
  new Headers(resolved).forEach((value, key) => headers.set(key, value));
  return headers;
}

async function jsonResponse(
  request: Request,
  corsHeaders: DevNotesServerOptions['corsHeaders'],
  body: unknown,
  status = 200
): Promise<Response> {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

async function emptyResponse(
  request: Request,
  corsHeaders: DevNotesServerOptions['corsHeaders'],
  status = 204
): Promise<Response> {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  return new Response(null, { status, headers });
}

async function passthroughUpstreamResponse(
  request: Request,
  corsHeaders: DevNotesServerOptions['corsHeaders'],
  error: UpstreamForgeError
): Promise<Response> {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  if (error.response.contentType) {
    headers.set('Content-Type', error.response.contentType);
  }
  if (error.response.text) {
    headers.set('X-DevNotes-Upstream-Path', error.path);
    headers.set('X-DevNotes-Upstream-Base-Url', error.baseUrl);
    return new Response(error.response.text, {
      status: error.response.status,
      headers,
    });
  }

  headers.set('Content-Type', 'application/json');
  return new Response(
    JSON.stringify({
      error: 'Focus Forge request failed',
      path: error.path,
      baseUrl: error.baseUrl,
      status: error.response.status,
    }),
    {
      status: error.response.status,
      headers,
    }
  );
}

async function readJsonBody(request: Request): Promise<any> {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseRequestPath(pathname: string, basePath: string): string[] | null {
  if (pathname === basePath) return [];
  if (!pathname.startsWith(`${basePath}/`)) return null;
  return pathname
    .slice(basePath.length + 1)
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

function toProjectDiscovery(discovery: ForgeProjectDiscoveryResult): DevNotesAppLinkStatus['projectDiscovery'] {
  return {
    path: discovery.discoveryPath,
    baseUrl: discovery.resolvedBaseUrl,
  };
}

function buildKnownUsers(
  metadataComments: DevNotesParsedComment[],
  reports: BugReport[],
  currentUser: DevNotesServerUser
): Map<string, BugReportCreator> {
  const users = new Map<string, BugReportCreator>();
  users.set(currentUser.id, {
    id: currentUser.id,
    email: currentUser.email ?? null,
    full_name: currentUser.fullName ?? null,
  });

  reports.forEach((report) => {
    users.set(report.created_by, report.creator || {
      id: report.created_by,
      email: null,
      full_name: null,
    });
    if (report.assigned_to && !users.has(report.assigned_to)) {
      users.set(report.assigned_to, { id: report.assigned_to, email: null, full_name: null });
    }
    if (report.resolved_by && !users.has(report.resolved_by)) {
      users.set(report.resolved_by, { id: report.resolved_by, email: null, full_name: null });
    }
  });

  metadataComments.forEach((comment) => {
    if (comment.meta.kind !== 'message') return;
    const authorId = String(comment.meta.authorId || comment.user_id || '').trim();
    if (!authorId) return;
    users.set(authorId, {
      id: authorId,
      email:
        comment.meta.authorEmail === null || comment.meta.authorEmail === undefined
          ? null
          : String(comment.meta.authorEmail),
      full_name:
        comment.meta.authorName === null || comment.meta.authorName === undefined
          ? null
          : String(comment.meta.authorName),
    });
  });

  return users;
}

async function maybeResolveUsers(
  resolveUsers: DevNotesServerOptions['resolveUsers'],
  ids: string[]
): Promise<BugReportCreator[]> {
  if (!resolveUsers || ids.length === 0) return [];
  const resolved = await resolveUsers(ids);
  return resolved
    .filter((user) => Boolean(user?.id))
    .map((user) => toCreatorRecord({
      id: String(user.id).trim(),
      email: user.email ?? null,
      fullName: user.fullName ?? null,
    }));
}

function pickTaskArray(payload: any): Record<string, unknown>[] {
  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return data.map((item: unknown) => coerceObject(item));
}

function parseDevNotesProjectComment(comment: Record<string, unknown>): DevNotesParsedComment | null {
  const id = typeof comment.id === 'string' ? comment.id.trim() : '';
  if (!id) return null;
  const parsed = splitDevNotesMeta(String(comment.content || ''));
  const kind = typeof parsed.meta?.kind === 'string' ? parsed.meta.kind : '';
  if (!kind) return null;
  return {
    id,
    created_at: String(comment.created_at || new Date().toISOString()),
    updated_at: String(comment.updated_at || comment.created_at || new Date().toISOString()),
    user_id: comment.user_id === null || comment.user_id === undefined ? null : String(comment.user_id),
    author_name:
      comment.author_name === null || comment.author_name === undefined
        ? null
        : String(comment.author_name),
    author_email:
      comment.author_email === null || comment.author_email === undefined
        ? null
        : String(comment.author_email),
    body: parsed.body,
    meta: parsed.meta || {},
  };
}

function buildTaskListsFromMetadata(comments: DevNotesParsedComment[]): TaskList[] {
  return comments
    .filter((item) => item.meta.kind === 'task_list')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((item) => ({
      id: item.id,
      name: String(item.meta.name || DEVNOTES_DEFAULT_TASK_LIST_NAME),
      share_slug: String(item.meta.share_slug || generateDevNotesShareSlug()),
      is_default: normalizeForgeBoolean(item.meta.is_default),
      created_by:
        item.meta.created_by === null || item.meta.created_by === undefined
          ? null
          : String(item.meta.created_by),
      created_at: String(item.meta.created_at || item.created_at),
      updated_at: String(item.meta.updated_at || item.updated_at),
    }));
}

function buildReportTypesFromMetadata(comments: DevNotesParsedComment[]): BugReportType[] {
  return comments
    .filter((item) => item.meta.kind === 'report_type')
    .sort((a, b) => String(a.meta.name || '').localeCompare(String(b.meta.name || '')))
    .map((item) => ({
      id: item.id,
      name: String(item.meta.name || ''),
      is_default: normalizeForgeBoolean(item.meta.is_default),
      created_by:
        item.meta.created_by === null || item.meta.created_by === undefined
          ? null
          : String(item.meta.created_by),
      created_at: String(item.meta.created_at || item.created_at),
    }));
}

function buildDevNotesReportFromForgeTask(
  task: Record<string, unknown>,
  overrides: Record<string, unknown> | null,
  defaultTaskListId: string
): BugReport | null {
  if (!isDevNotesForgeTask(task)) return null;

  const taskId = typeof task.id === 'string' ? task.id.trim() : '';
  if (!taskId) return null;

  const parsed = splitDevNotesMeta(String(task.description || ''));
  const base =
    parsed.meta?.kind === 'report'
      ? parsed.meta
      : parseLegacyDevNotesDescription(String(task.description || ''));
  const combined = {
    ...base,
    ...(overrides || {}),
  };

  const creatorName = String(combined.creator_name || combined.created_by || '').trim();
  const creatorEmail = String(combined.creator_email || '').trim() || null;
  const createdBy = String(combined.created_by || '').trim() || `forge:${taskId}:creator`;
  const taskCompleted = normalizeForgeBoolean(task.completed);
  const status = String(combined.status || (taskCompleted ? 'Resolved' : 'Open')) as BugReport['status'];
  const description =
    overrides && Object.prototype.hasOwnProperty.call(overrides, 'description')
      ? overrides.description === null
        ? null
        : String(overrides.description || '')
      : parsed.body.trim() || (base.description ? String(base.description) : null);

  return {
    id: taskId,
    task_list_id: String(combined.task_list_id || defaultTaskListId || ''),
    page_url: String(combined.page_url || ''),
    x_position: normalizeForgeNumber(combined.x_position),
    y_position: normalizeForgeNumber(combined.y_position),
    target_selector:
      combined.target_selector === null || combined.target_selector === undefined
        ? null
        : String(combined.target_selector),
    target_relative_x:
      combined.target_relative_x === null || combined.target_relative_x === undefined
        ? null
        : normalizeForgeNumber(combined.target_relative_x),
    target_relative_y:
      combined.target_relative_y === null || combined.target_relative_y === undefined
        ? null
        : normalizeForgeNumber(combined.target_relative_y),
    types: normalizeForgeStringArray(combined.types),
    severity: String(combined.severity || 'Medium') as BugReport['severity'],
    title: String(overrides?.title || task.name || ''),
    description,
    expected_behavior:
      combined.expected_behavior === null || combined.expected_behavior === undefined
        ? null
        : String(combined.expected_behavior),
    actual_behavior:
      combined.actual_behavior === null || combined.actual_behavior === undefined
        ? null
        : String(combined.actual_behavior),
    capture_context:
      combined.capture_context && typeof combined.capture_context === 'object'
        ? (combined.capture_context as BugCaptureContext)
        : null,
    response:
      combined.response === null || combined.response === undefined ? null : String(combined.response),
    status,
    created_by: createdBy,
    creator: {
      id: createdBy,
      email: creatorEmail,
      full_name: creatorName || null,
    },
    assigned_to:
      overrides && Object.prototype.hasOwnProperty.call(overrides, 'assigned_to')
        ? overrides.assigned_to === null || overrides.assigned_to === undefined
          ? null
          : String(overrides.assigned_to)
        : task.assigned_to === null || task.assigned_to === undefined
          ? null
          : String(task.assigned_to),
    resolved_at:
      combined.resolved_at === null || combined.resolved_at === undefined
        ? taskCompleted
          ? String(task.completed_at || task.updated_at || task.created_at || '')
          : null
        : String(combined.resolved_at),
    resolved_by:
      combined.resolved_by === null || combined.resolved_by === undefined
        ? null
        : String(combined.resolved_by),
    approved: normalizeForgeBoolean(combined.approved),
    ai_ready: normalizeForgeBoolean(combined.ai_ready),
    ai_description:
      combined.ai_description === null || combined.ai_description === undefined
        ? null
        : String(combined.ai_description),
    created_at: String(task.created_at || new Date().toISOString()),
    updated_at: String(
      overrides?.updated_at || task.updated_at || task.created_at || new Date().toISOString()
    ),
  };
}

type ForgeContext = {
  baseUrl: string;
  pat: string;
  projectName: string | null;
  fetchImpl: typeof globalThis.fetch;
};

async function fetchFocusForge(
  context: ForgeContext,
  path: string,
  init: RequestInit = {}
): Promise<ForgeResponse> {
  const url = `${context.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${context.pat}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await context.fetchImpl(url, {
    ...init,
    headers,
  });
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    payload: parseJsonSafe(text),
    contentType: response.headers.get('content-type'),
  };
}

async function fetchForgeOrThrow(
  context: ForgeContext,
  path: string,
  init: RequestInit = {}
): Promise<ForgeResponse> {
  const response = await fetchFocusForge(context, path, init);
  if (!response.ok) {
    throw new UpstreamForgeError(path, context.baseUrl, response);
  }
  return response;
}

async function discoverForgeProjects(context: ForgeContext): Promise<ForgeProjectDiscoveryResult> {
  const bootstrap = await fetchFocusForge(context, '/api/mobile/bootstrap', { method: 'GET' });
  if (!bootstrap.ok) {
    return {
      ok: false,
      preferredProjectName: context.projectName,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: '/api/mobile/bootstrap',
      response: bootstrap,
    };
  }

  const bootstrapProjects = extractProjectsFromPayload(bootstrap.payload);
  if (bootstrapProjects.length > 0) {
    return {
      ok: true,
      project: null,
      matched: false,
      preferredProjectName: context.projectName,
      projects: bootstrapProjects,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: '/api/mobile/bootstrap',
    };
  }

  const projectsResponse = await fetchFocusForge(context, '/api/mobile/projects', { method: 'GET' });
  if (!projectsResponse.ok) {
    return {
      ok: false,
      preferredProjectName: context.projectName,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: '/api/mobile/projects',
      response: projectsResponse,
    };
  }

  return {
    ok: true,
    project: null,
    matched: false,
    preferredProjectName: context.projectName,
    projects: extractProjectsFromPayload(projectsResponse.payload),
    resolvedBaseUrl: context.baseUrl,
    discoveryPath: '/api/mobile/projects',
  };
}

async function resolveForgeProject(context: ForgeContext): Promise<ForgeProjectDiscoveryResult> {
  const discovery = await discoverForgeProjects(context);
  if (!discovery.ok) return discovery;

  if (!context.projectName) {
    return {
      ...discovery,
      preferredProjectName: null,
      matched: false,
      project: null,
    };
  }

  const matchedProject = discovery.projects.find(
    (project) => project.name.trim().toLowerCase() === context.projectName!.trim().toLowerCase()
  );

  return {
    ...discovery,
    preferredProjectName: context.projectName,
    matched: Boolean(matchedProject),
    project: matchedProject || null,
  };
}

async function fetchForgeTasksForProject(context: ForgeContext, projectId: string): Promise<Record<string, unknown>[]> {
  const response = await fetchForgeOrThrow(
    context,
    `/api/mobile/tasks?projectId=${encodeURIComponent(projectId)}`,
    { method: 'GET' }
  );
  return pickTaskArray(response.payload);
}

async function fetchForgeProjectComments(
  context: ForgeContext,
  projectId: string
): Promise<Record<string, unknown>[]> {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments?projectId=${encodeURIComponent(projectId)}`,
    { method: 'GET' }
  );
  return pickTaskArray(response.payload);
}

async function fetchForgeTaskComments(
  context: ForgeContext,
  taskId: string
): Promise<Record<string, unknown>[]> {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments?taskId=${encodeURIComponent(taskId)}`,
    { method: 'GET' }
  );
  return pickTaskArray(response.payload);
}

async function fetchForgeCommentById(
  context: ForgeContext,
  commentId: string
): Promise<Record<string, unknown> | null> {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments/${encodeURIComponent(commentId)}`,
    { method: 'GET' }
  );
  const payload = coerceObject(response.payload?.data || response.payload);
  return Object.keys(payload).length > 0 ? payload : null;
}

async function createForgeProjectComment(
  context: ForgeContext,
  projectId: string,
  body: string,
  meta: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetchForgeOrThrow(context, '/api/sync/comments', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      content: appendDevNotesMeta(body, meta),
    }),
  });
  return coerceObject(response.payload?.data || response.payload);
}

async function updateForgeProjectComment(
  context: ForgeContext,
  commentId: string,
  body: string,
  meta: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments/${encodeURIComponent(commentId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        content: appendDevNotesMeta(body, meta),
      }),
    }
  );
  return coerceObject(response.payload?.data || response.payload);
}

async function deleteForgeProjectComment(context: ForgeContext, commentId: string): Promise<void> {
  await fetchForgeOrThrow(context, `/api/sync/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}

async function ensureDevNotesProjectDefaults(
  context: ForgeContext,
  projectId: string,
  user: DevNotesServerUser
): Promise<DevNotesParsedComment[]> {
  let parsed = (await fetchForgeProjectComments(context, projectId))
    .map(parseDevNotesProjectComment)
    .filter((item): item is DevNotesParsedComment => Boolean(item));

  const typeComments = parsed.filter((item) => item.meta.kind === 'report_type');
  const taskListComments = parsed.filter((item) => item.meta.kind === 'task_list');

  if (typeComments.length === 0) {
    for (const name of DEVNOTES_DEFAULT_TYPE_NAMES) {
      await createForgeProjectComment(context, projectId, '', {
        kind: 'report_type',
        name,
        is_default: true,
        created_by: user.id,
        created_at: new Date().toISOString(),
      });
    }
  }

  if (taskListComments.length === 0) {
    await createForgeProjectComment(context, projectId, '', {
      kind: 'task_list',
      name: DEVNOTES_DEFAULT_TASK_LIST_NAME,
      share_slug: generateDevNotesShareSlug(),
      is_default: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  if (typeComments.length === 0 || taskListComments.length === 0) {
    parsed = (await fetchForgeProjectComments(context, projectId))
      .map(parseDevNotesProjectComment)
      .filter((item): item is DevNotesParsedComment => Boolean(item));
  }

  return parsed;
}

function buildCapabilities(): DevNotesCapabilities {
  return { ai: false, appLink: true };
}

function buildAppLinkStatus(
  context: ForgeContext,
  discovery: ForgeProjectDiscoveryResult
): DevNotesAppLinkStatus {
  if (!context.pat) {
    return {
      linked: false,
      projectName: context.projectName,
      tokenLast4: null,
      linkedAt: null,
      projectMatched: false,
      availableProjects: [],
      projectDiscovery: null,
    };
  }

  if (!discovery.ok) {
    return {
      linked: true,
      projectName: context.projectName,
      tokenLast4: context.pat.slice(-4),
      linkedAt: null,
      projectMatched: false,
      availableProjects: [],
      projectDiscovery: toProjectDiscovery(discovery),
    };
  }

  return {
    linked: true,
    projectName: context.projectName,
    tokenLast4: context.pat.slice(-4),
    linkedAt: null,
    projectMatched: discovery.matched,
    availableProjects: discovery.matched ? [] : discovery.projects,
    projectDiscovery: toProjectDiscovery(discovery),
  };
}

function sortCreators(creators: BugReportCreator[]): BugReportCreator[] {
  return creators.sort((left, right) => {
    const a = left.full_name || left.email || left.id;
    const b = right.full_name || right.email || right.id;
    return a.localeCompare(b);
  });
}

export function createDevNotesServerHandler(options: DevNotesServerOptions) {
  const basePath = normalizeBasePath(options.basePath);
  const baseUrl = normalizeBaseUrl(options.forge.baseUrl);

  if (!baseUrl) {
    throw new Error('DevNotes server helpers require forge.baseUrl.');
  }

  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('DevNotes server helpers require a fetch implementation.');
  }

  return async function handleDevNotesRequest(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return await emptyResponse(request, options.corsHeaders);
    }

    const url = new URL(request.url);
    const slug = parseRequestPath(url.pathname, basePath);
    if (!slug) {
      return await jsonResponse(request, options.corsHeaders, { error: 'Not found' }, 404);
    }

    const user = normalizeUser(await options.getCurrentUser(request));
    if (!user) {
      return await jsonResponse(request, options.corsHeaders, { error: 'Unauthorized' }, 401);
    }

    const method = request.method.toUpperCase();
    const body = (await readJsonBody(request)) || {};
    const [resource, resourceId, nested] = slug;
    const forgeContext: ForgeContext = {
      baseUrl,
      pat: String(options.forge.pat || '').trim(),
      projectName: options.forge.projectName?.trim() || null,
      fetchImpl,
    };

    if (resource === 'capabilities' && method === 'GET') {
      return await jsonResponse(request, options.corsHeaders, buildCapabilities());
    }

    if (!forgeContext.pat && resource === 'app-link' && method === 'GET') {
      return await jsonResponse(
        request,
        options.corsHeaders,
        buildAppLinkStatus(forgeContext, {
          ok: true,
          project: null,
          matched: false,
          preferredProjectName: forgeContext.projectName,
          projects: [],
          resolvedBaseUrl: forgeContext.baseUrl,
          discoveryPath: null,
        })
      );
    }

    if (!forgeContext.pat) {
      return await jsonResponse(
        request,
        options.corsHeaders,
        {
          error: 'FOCUS_FORGE_PAT is not configured.',
        },
        503
      );
    }

    try {
      const projectResolution = await resolveForgeProject(forgeContext);

      if (resource === 'app-link') {
        if (method === 'GET') {
          return await jsonResponse(
            request,
            options.corsHeaders,
            buildAppLinkStatus(forgeContext, projectResolution)
          );
        }
        return await jsonResponse(
          request,
          options.corsHeaders,
          {
            error:
              'App-level Forge credentials are managed through server environment configuration.',
          },
          405
        );
      }

      if (!projectResolution.ok) {
        throw new UpstreamForgeError(
          projectResolution.discoveryPath || '/api/mobile/bootstrap',
          projectResolution.resolvedBaseUrl,
          projectResolution.response
        );
      }

      if (!projectResolution.project?.id) {
        return await jsonResponse(
          request,
          options.corsHeaders,
          {
            error: projectResolution.preferredProjectName
              ? `Could not find Focus Forge project "${projectResolution.preferredProjectName}"`
              : 'FOCUS_FORGE_PROJECT_NAME is not configured',
            available_projects: projectResolution.projects,
          },
          projectResolution.preferredProjectName ? 404 : 409
        );
      }

      const project = projectResolution.project;
      const metadataComments = await ensureDevNotesProjectDefaults(forgeContext, project.id, user);
      const taskLists = buildTaskListsFromMetadata(metadataComments);
      const defaultTaskListId = String(
        taskLists.find((item) => item.is_default)?.id || taskLists[0]?.id || ''
      );
      const reportPatchById = new Map<string, Record<string, unknown>>();
      const deletedReportIds = new Set<string>();
      const readMarkers = new Set<string>();

      metadataComments.forEach((comment) => {
        const kind = String(comment.meta.kind || '') as DevNotesMetadataKind;
        const reportId = String(comment.meta.reportId || '').trim();
        if (kind === 'report_patch' && reportId) {
          const previous = reportPatchById.get(reportId);
          if (!previous || String(previous.updated_at || '') <= comment.updated_at) {
            reportPatchById.set(reportId, {
              ...(comment.meta.report && typeof comment.meta.report === 'object'
                ? (comment.meta.report as Record<string, unknown>)
                : {}),
              updated_at: comment.updated_at,
            });
          }
        }
        if (kind === 'report_deleted' && reportId) {
          deletedReportIds.add(reportId);
        }
        if (kind === 'message_read') {
          const targetMessageId = String(comment.meta.messageId || '').trim();
          const targetUserId = String(comment.meta.userId || '').trim();
          if (targetMessageId && targetUserId === user.id) {
            readMarkers.add(targetMessageId);
          }
        }
      });

      if (resource === 'reports' && method === 'GET' && !resourceId) {
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const reports = tasks
          .map((task) =>
            buildDevNotesReportFromForgeTask(
              task,
              reportPatchById.get(String(task.id || '').trim()) || null,
              defaultTaskListId
            )
          )
          .filter((item): item is BugReport => Boolean(item))
          .filter((item) => !deletedReportIds.has(String(item.id)));
        return await jsonResponse(request, options.corsHeaders, reports);
      }

      if (resource === 'reports' && method === 'POST' && !resourceId) {
        const payload: Record<string, unknown> = {
          ...body,
          created_by: user.id,
          creator: {
            id: user.id,
            email: user.email || null,
            full_name: user.fullName || null,
          },
          task_list_id: String(body.task_list_id || defaultTaskListId),
          status: String(body.status || 'Open'),
        };
        const createPath = '/api/mobile/tasks';
        const response = await fetchForgeOrThrow(forgeContext, createPath, {
          method: 'POST',
          body: JSON.stringify({
            name: String(payload.title || ''),
            description: buildDevNotesReportDescription(payload),
            project_id: project.id,
            completed: mapBugStatusToForge(String(payload.status || 'Open')) === 'completed',
            assigned_to:
              payload.assigned_to === null || payload.assigned_to === undefined
                ? undefined
                : String(payload.assigned_to),
          }),
        });

        const taskId = extractForgeTaskId(response.payload);
        if (!taskId) {
          throw new UpstreamForgeError(createPath, forgeContext.baseUrl, {
            ...response,
            status: response.status || 502,
            text:
              response.text ||
              JSON.stringify({
                error: 'Task endpoint succeeded but did not return a task id',
              }),
            contentType: response.contentType || 'application/json',
          });
        }

        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const createdTask = tasks.find((task) => String(task.id || '') === taskId) || {
          id: taskId,
          name: payload.title,
          description: buildDevNotesReportDescription(payload),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed: false,
        };
        const report = buildDevNotesReportFromForgeTask(createdTask, null, defaultTaskListId);
        return await jsonResponse(request, options.corsHeaders, report);
      }

      if (resource === 'reports' && resourceId && !nested && method === 'PATCH') {
        const reportId = decodeURIComponent(resourceId);
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const existingTask = tasks.find((task) => String(task.id || '') === reportId);
        if (!existingTask) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: 'Bug report not found' },
            404
          );
        }
        const existing = buildDevNotesReportFromForgeTask(
          existingTask,
          reportPatchById.get(reportId) || null,
          defaultTaskListId
        );
        if (!existing) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: 'Bug report not found' },
            404
          );
        }
        const merged = {
          ...existing,
          ...body,
          id: existing.id,
          updated_at: new Date().toISOString(),
          resolved_at:
            body.status === 'Resolved' || body.status === 'Closed'
              ? new Date().toISOString()
              : existing.resolved_at,
          resolved_by:
            body.status === 'Resolved' || body.status === 'Closed'
              ? body.resolved_by || user.id
              : existing.resolved_by,
        };
        const existingPatch = metadataComments.find(
          (comment) =>
            comment.meta.kind === 'report_patch' && String(comment.meta.reportId || '') === reportId
        );
        if (existingPatch) {
          await updateForgeProjectComment(forgeContext, existingPatch.id, '', {
            kind: 'report_patch',
            reportId,
            report: merged,
          });
        } else {
          await createForgeProjectComment(forgeContext, project.id, '', {
            kind: 'report_patch',
            reportId,
            report: merged,
          });
        }
        return await jsonResponse(request, options.corsHeaders, merged);
      }

      if (resource === 'reports' && resourceId && !nested && method === 'DELETE') {
        const reportId = decodeURIComponent(resourceId);
        const existingDelete = metadataComments.find(
          (comment) =>
            comment.meta.kind === 'report_deleted' && String(comment.meta.reportId || '') === reportId
        );
        if (existingDelete) {
          await updateForgeProjectComment(forgeContext, existingDelete.id, '', {
            kind: 'report_deleted',
            reportId,
            deletedBy: user.id,
            deletedAt: new Date().toISOString(),
          });
        } else {
          await createForgeProjectComment(forgeContext, project.id, '', {
            kind: 'report_deleted',
            reportId,
            deletedBy: user.id,
            deletedAt: new Date().toISOString(),
          });
        }
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }

      if (resource === 'reports' && resourceId && nested === 'messages' && method === 'GET') {
        const reportId = decodeURIComponent(resourceId);
        const projectMessages = metadataComments
          .filter(
            (comment) =>
              comment.meta.kind === 'message' && String(comment.meta.reportId || '') === reportId
          )
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((comment): BugReportMessage => ({
            id: comment.id,
            bug_report_id: reportId,
            author_id: String(comment.meta.authorId || comment.user_id || ''),
            body: comment.body,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            author: {
              id: String(comment.meta.authorId || comment.user_id || ''),
              email:
                comment.meta.authorEmail === null || comment.meta.authorEmail === undefined
                  ? null
                  : String(comment.meta.authorEmail),
              full_name:
                comment.meta.authorName === null || comment.meta.authorName === undefined
                  ? null
                  : String(comment.meta.authorName),
            },
          }));

        const legacyTaskMessages = (await fetchForgeTaskComments(forgeContext, reportId))
          .filter((comment) => String(comment.project_id || '') === '')
          .map((comment): BugReportMessage => ({
            id: String(comment.id || ''),
            bug_report_id: reportId,
            author_id: String(comment.user_id || ''),
            body: String(comment.content || ''),
            created_at: String(comment.created_at || new Date().toISOString()),
            updated_at: String(comment.updated_at || comment.created_at || new Date().toISOString()),
            author: {
              id: String(comment.user_id || ''),
              email:
                comment.author_email === null || comment.author_email === undefined
                  ? null
                  : String(comment.author_email),
              full_name:
                comment.author_name === null || comment.author_name === undefined
                  ? null
                  : String(comment.author_name),
            },
          }));

        const merged = [...legacyTaskMessages, ...projectMessages].sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        );
        return await jsonResponse(request, options.corsHeaders, merged);
      }

      if (resource === 'reports' && resourceId && nested === 'messages' && method === 'POST') {
        const reportId = decodeURIComponent(resourceId);
        const created = await createForgeProjectComment(
          forgeContext,
          project.id,
          String(body.body || '').trim(),
          {
            kind: 'message',
            reportId,
            authorId: user.id,
            authorEmail: user.email || null,
            authorName: user.fullName || user.email || '',
          }
        );
        const parsed = parseDevNotesProjectComment(created);
        if (!parsed) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: 'Failed to create message' },
            500
          );
        }
        const message: BugReportMessage = {
          id: parsed.id,
          bug_report_id: reportId,
          author_id: String(parsed.meta.authorId || user.id),
          body: parsed.body,
          created_at: parsed.created_at,
          updated_at: parsed.updated_at,
          author: {
            id: String(parsed.meta.authorId || user.id),
            email:
              parsed.meta.authorEmail === null || parsed.meta.authorEmail === undefined
                ? null
                : String(parsed.meta.authorEmail),
            full_name:
              parsed.meta.authorName === null || parsed.meta.authorName === undefined
                ? null
                : String(parsed.meta.authorName),
          },
        };
        return await jsonResponse(request, options.corsHeaders, message);
      }

      if (resource === 'report-types' && method === 'GET' && !resourceId) {
        return await jsonResponse(
          request,
          options.corsHeaders,
          buildReportTypesFromMetadata(metadataComments)
        );
      }

      if (resource === 'report-types' && method === 'POST' && !resourceId) {
        const created = await createForgeProjectComment(forgeContext, project.id, '', {
          kind: 'report_type',
          name: String(body.name || '').trim(),
          is_default: false,
          created_by: user.id,
          created_at: new Date().toISOString(),
        });
        const parsed = parseDevNotesProjectComment(created);
        return await jsonResponse(request, options.corsHeaders, {
          id: parsed?.id || String(created.id || ''),
          name: String(body.name || '').trim(),
          is_default: false,
          created_by: user.id,
          created_at: parsed?.created_at || new Date().toISOString(),
        } satisfies BugReportType);
      }

      if (resource === 'report-types' && resourceId && method === 'DELETE') {
        await deleteForgeProjectComment(forgeContext, decodeURIComponent(resourceId));
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }

      if (resource === 'task-lists' && method === 'GET' && !resourceId) {
        return await jsonResponse(request, options.corsHeaders, taskLists);
      }

      if (resource === 'task-lists' && method === 'POST' && !resourceId) {
        const created = await createForgeProjectComment(forgeContext, project.id, '', {
          kind: 'task_list',
          name: String(body.name || '').trim(),
          share_slug: generateDevNotesShareSlug(),
          is_default: false,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        const parsed = parseDevNotesProjectComment(created);
        return await jsonResponse(request, options.corsHeaders, {
          id: parsed?.id || String(created.id || ''),
          name: String(body.name || '').trim(),
          share_slug: String(parsed?.meta.share_slug || generateDevNotesShareSlug()),
          is_default: false,
          created_by: user.id,
          created_at: parsed?.created_at || new Date().toISOString(),
          updated_at: parsed?.updated_at || new Date().toISOString(),
        } satisfies TaskList);
      }

      if (resource === 'messages' && resourceId === 'read' && method === 'POST') {
        const messageIds = Array.isArray(body.messageIds)
          ? (body.messageIds as unknown[])
              .map((value: unknown) => String(value || '').trim())
              .filter((value): value is string => Boolean(value))
          : [];
        for (const messageId of Array.from(new Set(messageIds))) {
          if (readMarkers.has(messageId)) continue;
          await createForgeProjectComment(forgeContext, project.id, '', {
            kind: 'message_read',
            messageId,
            userId: user.id,
            readAt: new Date().toISOString(),
          });
        }
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }

      if (resource === 'messages' && resourceId && method === 'PATCH') {
        const current = await fetchForgeCommentById(forgeContext, decodeURIComponent(resourceId));
        if (!current) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: 'Message not found' },
            404
          );
        }
        const parsed = parseDevNotesProjectComment(current);
        if (!parsed || parsed.meta.kind !== 'message') {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: 'Message not found' },
            404
          );
        }
        const updated = await updateForgeProjectComment(
          forgeContext,
          decodeURIComponent(resourceId),
          String(body.body || '').trim(),
          parsed.meta
        );
        const updatedParsed = parseDevNotesProjectComment(updated);
        return await jsonResponse(request, options.corsHeaders, {
          id: updatedParsed?.id || decodeURIComponent(resourceId),
          bug_report_id: String(parsed.meta.reportId || ''),
          author_id: String(parsed.meta.authorId || parsed.user_id || ''),
          body: updatedParsed?.body || String(body.body || '').trim(),
          created_at: updatedParsed?.created_at || parsed.created_at,
          updated_at: updatedParsed?.updated_at || new Date().toISOString(),
          author: {
            id: String(parsed.meta.authorId || parsed.user_id || ''),
            email:
              parsed.meta.authorEmail === null || parsed.meta.authorEmail === undefined
                ? null
                : String(parsed.meta.authorEmail),
            full_name:
              parsed.meta.authorName === null || parsed.meta.authorName === undefined
                ? null
                : String(parsed.meta.authorName),
          },
        } satisfies BugReportMessage);
      }

      if (resource === 'messages' && resourceId && method === 'DELETE') {
        await deleteForgeProjectComment(forgeContext, decodeURIComponent(resourceId));
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }

      if (resource === 'unread-counts' && method === 'GET') {
        const counts: Record<string, number> = {};
        metadataComments
          .filter((comment) => comment.meta.kind === 'message')
          .forEach((comment) => {
            const reportId = String(comment.meta.reportId || '').trim();
            const authorId = String(comment.meta.authorId || '').trim();
            if (!reportId || authorId === user.id || readMarkers.has(comment.id)) return;
            counts[reportId] = (counts[reportId] || 0) + 1;
          });
        return await jsonResponse(request, options.corsHeaders, counts);
      }

      if (resource === 'collaborators' && method === 'GET') {
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const reports = tasks
          .map((task) =>
            buildDevNotesReportFromForgeTask(
              task,
              reportPatchById.get(String(task.id || '').trim()) || null,
              defaultTaskListId
            )
          )
          .filter((item): item is BugReport => Boolean(item));

        const knownUsers = buildKnownUsers(metadataComments, reports, user);
        const ids = (url.searchParams.get('ids') || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const resolvedUsers = await maybeResolveUsers(options.resolveUsers, ids);
        resolvedUsers.forEach((resolved) => knownUsers.set(resolved.id, resolved));

        const collaborators = ids.length > 0
          ? ids
              .map((id) => knownUsers.get(id))
              .filter((value): value is BugReportCreator => Boolean(value))
          : Array.from(knownUsers.values());

        return await jsonResponse(
          request,
          options.corsHeaders,
          sortCreators(collaborators)
        );
      }

      return await jsonResponse(request, options.corsHeaders, { error: 'Not found' }, 404);
    } catch (error) {
      if (error instanceof UpstreamForgeError) {
        return await passthroughUpstreamResponse(request, options.corsHeaders, error);
      }

      return await jsonResponse(
        request,
        options.corsHeaders,
        { error: error instanceof Error ? error.message : 'Unexpected error' },
        500
      );
    }
  };
}
