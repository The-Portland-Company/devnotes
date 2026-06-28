import type {
  Task,
  TaskCreator,
  TaskMessage,
  TaskType,
  DevNotesAppLinkStatus,
  DevNotesCapabilities,
  DevNotesClientOptions,
  DevNotesLinkAppInput,
  TaskList,
  ForgeStatus,
  ForgeError,
} from './types';
import type { TaskCreateData, DevNotesClientAdapter } from './adapters/types';

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

/** Error thrown by the client that also carries the structured Forge status. */
export class DevNotesRequestError extends Error {
  forge: ForgeStatus | null;
  status: number;
  constructor(message: string, status: number, forge: ForgeStatus | null) {
    super(message);
    this.name = 'DevNotesRequestError';
    this.forge = forge;
    this.status = status;
  }
}

/** Coerce an arbitrary `forge` payload field into a typed ForgeStatus, or null. */
const normalizeForge = (raw: any): ForgeStatus | null => {
  if (!raw || typeof raw !== 'object') return null;
  const connected = Boolean(raw.connected);
  let error: ForgeError | null = null;
  if (raw.error && typeof raw.error === 'object') {
    error = {
      path: typeof raw.error.path === 'string' ? raw.error.path : '',
      status:
        typeof raw.error.status === 'number'
          ? raw.error.status
          : raw.error.status == null
          ? null
          : Number(raw.error.status) || null,
      code: typeof raw.error.code === 'string' ? raw.error.code : 'UNKNOWN',
      message:
        typeof raw.error.message === 'string'
          ? raw.error.message
          : 'Forge connection failed.',
    };
  }
  return { connected, error };
};

export function createDevNotesClient(options: DevNotesClientOptions): DevNotesClientAdapter {
  const basePath = normalizeBasePath(options.basePath);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('createDevNotesClient requires a fetch implementation.');
  }

  // Latest Forge connectivity status seen on ANY response (success or error).
  // The provider reads this via getForgeStatus() to drive the disconnected banner.
  let latestForgeStatus: ForgeStatus | null = null;

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

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    // Surface the `forge` connectivity field even on error responses.
    if (payload && typeof payload === 'object' && 'forge' in payload) {
      latestForgeStatus = normalizeForge(payload.forge);
    }

    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.error ||
        payload?.message ||
        `Request failed with status ${response.status}`;
      throw new DevNotesRequestError(
        typeof message === 'string' ? message : `Request failed with status ${response.status}`,
        response.status,
        latestForgeStatus
      );
    }

    return payload as T;
  };

  // The tasks/reports GET success body may be either a bare array (legacy) or an
  // object envelope `{ reports: [...], forge: {...} }` (current backend). The
  // top-level `forge` is already captured inside request(); here we just unwrap
  // the list regardless of shape.
  const extractReports = (payload: any): Task[] => {
    if (Array.isArray(payload)) return payload as Task[];
    if (payload && Array.isArray(payload.reports)) return payload.reports as Task[];
    if (payload && Array.isArray(payload.tasks)) return payload.tasks as Task[];
    return [];
  };
  // A create/update response may be a bare task object or an envelope that wraps
  // it as `{ report | task: {...}, forge: {...} }`.
  const extractTask = (payload: any): Task => {
    if (payload && typeof payload === 'object') {
      if (payload.report && typeof payload.report === 'object') return payload.report as Task;
      if (payload.task && typeof payload.task === 'object') return payload.task as Task;
    }
    return payload as Task;
  };

  const fetchTasks = async () => extractReports(await request<any>('/tasks'));
  const createTask = async (data: TaskCreateData) =>
      extractTask(
        await request<any>('/tasks', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
  const updateTask = async (id: string, data: Partial<Task>) =>
      extractTask(
        await request<any>(`/tasks/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      );
  const deleteTask = async (id: string) => {
      await request<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    };
  const fetchTaskTypes = async () => await request<TaskType[]>('/task-types');
  const createTaskType = async (name: string) =>
      await request<TaskType>('/task-types', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
  const deleteTaskType = async (id: string) => {
      await request<void>(`/task-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
    };
  const fetchTaskLists = async () => await request<TaskList[]>('/task-lists');
  const createTaskList = async (name: string) =>
      await request<TaskList>('/task-lists', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
  const fetchMessages = async (taskId: string) =>
      await request<TaskMessage[]>(`/tasks/${encodeURIComponent(taskId)}/messages`);
  const createMessage = async (taskId: string, body: string) =>
      await request<TaskMessage>(`/tasks/${encodeURIComponent(taskId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });

  return {
    getForgeStatus: () => latestForgeStatus,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    fetchTaskTypes,
    createTaskType,
    deleteTaskType,
    fetchTaskLists,
    createTaskList,
    fetchMessages,
    createMessage,
    updateMessage: async (id, body) =>
      await request<TaskMessage>(`/messages/${encodeURIComponent(id)}`, {
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
      await request<TaskCreator[]>('/collaborators', {
        query: ids && ids.length ? { ids: ids.join(',') } : undefined,
      }),
    fetchProfiles: async (ids) => {
      if (ids.length === 0) return [];
      return await request<TaskCreator[]>('/collaborators', {
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
    fetchBugReports: fetchTasks,
    createBugReport: createTask,
    updateBugReport: updateTask,
    deleteBugReport: deleteTask,
    fetchBugReportTypes: fetchTaskTypes,
    createBugReportType: createTaskType,
    deleteBugReportType: deleteTaskType,
  };
}
