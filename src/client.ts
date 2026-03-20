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

  const fetchTasks = async () => await request<Task[]>('/tasks');
  const createTask = async (data: TaskCreateData) =>
      await request<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
  const updateTask = async (id: string, data: Partial<Task>) =>
      await request<Task>(`/tasks/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
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
