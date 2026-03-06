import type {
  BugReport,
  BugReportCreator,
  BugReportMessage,
  BugReportType,
  DevNotesAppLinkStatus,
  DevNotesCapabilities,
  DevNotesClientOptions,
  DevNotesLinkAppInput,
  TaskList,
} from './types';
import type { BugReportCreateData, DevNotesClientAdapter } from './adapters/types';

const DEFAULT_BASE_PATH = '/api/devnotes';

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

const normalizeBasePath = (basePath: string | undefined) => {
  const trimmed = (basePath || DEFAULT_BASE_PATH).trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const buildUrl = (
  basePath: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) => {
  const url = new URL(`${basePath}${path.startsWith('/') ? path : `/${path}`}`, 'http://localhost');
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
};

const defaultCapabilities: DevNotesCapabilities = {
  ai: false,
  appLink: true,
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function createDevNotesClient(options: DevNotesClientOptions): DevNotesClientAdapter {
  const basePath = normalizeBasePath(options.basePath);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('createDevNotesClient requires a fetch implementation.');
  }

  const request = async <T>(path: string, init: RequestOptions = {}): Promise<T> => {
    const token = await options.getAuthToken();
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetchImpl(buildUrl(basePath, path, init.query), {
      ...init,
      headers,
    });

    return await parseResponse<T>(response);
  };

  return {
    fetchBugReports: async () => await request<BugReport[]>('/reports'),
    createBugReport: async (data) =>
      await request<BugReport>('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateBugReport: async (id, data) =>
      await request<BugReport>(`/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteBugReport: async (id) => {
      await request<void>(`/reports/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    fetchBugReportTypes: async () => await request<BugReportType[]>('/report-types'),
    createBugReportType: async (name) =>
      await request<BugReportType>('/report-types', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    deleteBugReportType: async (id) => {
      await request<void>(`/report-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    fetchTaskLists: async () => await request<TaskList[]>('/task-lists'),
    createTaskList: async (name) =>
      await request<TaskList>('/task-lists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    fetchMessages: async (bugReportId) =>
      await request<BugReportMessage[]>(`/reports/${encodeURIComponent(bugReportId)}/messages`),
    createMessage: async (bugReportId, body) =>
      await request<BugReportMessage>(`/reports/${encodeURIComponent(bugReportId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    updateMessage: async (id, body) =>
      await request<BugReportMessage>(`/messages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      }),
    deleteMessage: async (id) => {
      await request<void>(`/messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    markMessagesAsRead: async (messageIds) => {
      await request<void>('/messages/read', {
        method: 'POST',
        body: JSON.stringify({ messageIds }),
      });
    },
    fetchUnreadCounts: async () => await request<Record<string, number>>('/unread-counts'),
    fetchCollaborators: async (ids) =>
      await request<BugReportCreator[]>('/collaborators', {
        query: ids && ids.length ? { ids: ids.join(',') } : undefined,
      }),
    fetchProfiles: async (ids) => {
      if (ids.length === 0) return [];
      return await request<BugReportCreator[]>('/collaborators', {
        query: { ids: ids.join(',') },
      });
    },
    fetchCapabilities: async () => {
      try {
        return await request<DevNotesCapabilities>('/capabilities');
      } catch {
        return defaultCapabilities;
      }
    },
    getAppLinkStatus: async () =>
      await request<DevNotesAppLinkStatus>('/app-link', { method: 'GET' }),
    linkApp: async (input: DevNotesLinkAppInput) =>
      await request<DevNotesAppLinkStatus>('/app-link', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    unlinkApp: async () => {
      await request<void>('/app-link', { method: 'DELETE' });
    },
  };
}
