import type {
  Task,
  TaskCreator,
  TaskMessage,
  TaskType,
  DevNotesAppLinkStatus,
  DevNotesCapabilities,
  DevNotesLinkAppInput,
  TaskList,
  AiAssistResult,
  AiConversationMessage,
  TaskCaptureContext,
} from '../types';
import type { TaskCreateData } from '../adapters/types';

export type DevNotesProxyRequest = {
  method: string;
  slug: string[];
  request: Request;
  authToken: string | null;
  query: URLSearchParams;
  body: any;
};

export type DevNotesProxyResponse = {
  status?: number;
  body?: unknown;
};

export interface DevNotesProxyBackend {
  getCapabilities(req: DevNotesProxyRequest): Promise<DevNotesCapabilities>;
  getAppLinkStatus(req: DevNotesProxyRequest): Promise<DevNotesAppLinkStatus>;
  linkApp(input: DevNotesLinkAppInput, req: DevNotesProxyRequest): Promise<DevNotesAppLinkStatus>;
  unlinkApp(req: DevNotesProxyRequest): Promise<void>;
  listReports(req: DevNotesProxyRequest): Promise<Task[]>;
  createReport(data: TaskCreateData, req: DevNotesProxyRequest): Promise<Task>;
  updateReport(id: string, data: Partial<Task>, req: DevNotesProxyRequest): Promise<Task>;
  deleteReport(id: string, req: DevNotesProxyRequest): Promise<void>;
  listReportTypes(req: DevNotesProxyRequest): Promise<TaskType[]>;
  createReportType(name: string, req: DevNotesProxyRequest): Promise<TaskType>;
  deleteReportType(id: string, req: DevNotesProxyRequest): Promise<void>;
  listTaskLists(req: DevNotesProxyRequest): Promise<TaskList[]>;
  createTaskList(name: string, req: DevNotesProxyRequest): Promise<TaskList>;
  listMessages(reportId: string, req: DevNotesProxyRequest): Promise<TaskMessage[]>;
  createMessage(
    reportId: string,
    body: string,
    req: DevNotesProxyRequest
  ): Promise<TaskMessage>;
  updateMessage(id: string, body: string, req: DevNotesProxyRequest): Promise<TaskMessage>;
  deleteMessage(id: string, req: DevNotesProxyRequest): Promise<void>;
  getUnreadCounts(req: DevNotesProxyRequest): Promise<Record<string, number>>;
  markMessagesRead(messageIds: string[], req: DevNotesProxyRequest): Promise<void>;
  listCollaborators(ids: string[] | null, req: DevNotesProxyRequest): Promise<TaskCreator[]>;
  refineDescription?: (
    input: {
      description: string;
      conversationHistory: AiConversationMessage[];
      context: {
        title?: string;
        page_url?: string;
        route_label?: string;
        severity?: string;
        types?: string[];
        target_selector?: string;
        expected_behavior?: string;
        actual_behavior?: string;
        capture_context?: TaskCaptureContext;
      };
    },
    req: DevNotesProxyRequest
  ) => Promise<AiAssistResult>;
}

export function isDevNotesProxyBackend(value: unknown): value is DevNotesProxyBackend {
  const candidate = value as Partial<DevNotesProxyBackend> | null;
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof candidate.getCapabilities === 'function' &&
      typeof candidate.getAppLinkStatus === 'function' &&
      typeof candidate.listReports === 'function'
  );
}

const json = (body: unknown, status = 200): DevNotesProxyResponse => ({ status, body });

const getId = (slug: string[], index: number) => decodeURIComponent(slug[index] || '');
const isTaskResource = (resource: string | undefined) => resource === 'tasks' || resource === 'reports';
const isTaskTypeResource = (resource: string | undefined) =>
  resource === 'task-types' || resource === 'report-types';

export async function routeDevNotesProxy(
  backend: DevNotesProxyBackend,
  req: DevNotesProxyRequest
): Promise<DevNotesProxyResponse> {
  const [resource, resourceId, nested] = req.slug;
  const method = req.method.toUpperCase();

  if (resource === 'capabilities' && method === 'GET') {
    return json(await backend.getCapabilities(req));
  }

  if (resource === 'app-link') {
    if (method === 'GET') return json(await backend.getAppLinkStatus(req));
    if (method === 'POST') return json(await backend.linkApp(req.body, req));
    if (method === 'DELETE') {
      await backend.unlinkApp(req);
      return json({ success: true });
    }
  }

  if (isTaskResource(resource) && method === 'GET' && !resourceId) {
    return json(await backend.listReports(req));
  }
  if (isTaskResource(resource) && method === 'POST' && !resourceId) {
    return json(await backend.createReport(req.body, req));
  }
  if (isTaskResource(resource) && method === 'PATCH' && resourceId && !nested) {
    return json(await backend.updateReport(getId(req.slug, 1), req.body, req));
  }
  if (isTaskResource(resource) && method === 'DELETE' && resourceId && !nested) {
    await backend.deleteReport(getId(req.slug, 1), req);
    return json({ success: true });
  }
  if (isTaskResource(resource) && resourceId && nested === 'messages') {
    if (method === 'GET') return json(await backend.listMessages(getId(req.slug, 1), req));
    if (method === 'POST') {
      return json(await backend.createMessage(getId(req.slug, 1), String(req.body?.body || ''), req));
    }
  }

  if (isTaskTypeResource(resource)) {
    if (method === 'GET' && !resourceId) return json(await backend.listReportTypes(req));
    if (method === 'POST' && !resourceId) {
      return json(await backend.createReportType(String(req.body?.name || ''), req));
    }
    if (method === 'DELETE' && resourceId) {
      await backend.deleteReportType(getId(req.slug, 1), req);
      return json({ success: true });
    }
  }

  if (resource === 'task-lists') {
    if (method === 'GET' && !resourceId) return json(await backend.listTaskLists(req));
    if (method === 'POST' && !resourceId) {
      return json(await backend.createTaskList(String(req.body?.name || ''), req));
    }
  }

  if (resource === 'messages' && resourceId && method === 'PATCH') {
    return json(await backend.updateMessage(getId(req.slug, 1), String(req.body?.body || ''), req));
  }
  if (resource === 'messages' && resourceId && method === 'DELETE') {
    await backend.deleteMessage(getId(req.slug, 1), req);
    return json({ success: true });
  }
  if (resource === 'messages' && resourceId === 'read' && method === 'POST') {
    await backend.markMessagesRead(Array.isArray(req.body?.messageIds) ? req.body.messageIds : [], req);
    return json({ success: true });
  }

  if (resource === 'unread-counts' && method === 'GET') {
    return json(await backend.getUnreadCounts(req));
  }

  if (resource === 'collaborators' && method === 'GET') {
    const ids = req.query.get('ids');
    return json(await backend.listCollaborators(ids ? ids.split(',').filter(Boolean) : null, req));
  }

  if (resource === 'ai' && resourceId === 'refine-description' && method === 'POST') {
    if (!backend.refineDescription) {
      return json({ error: 'AI refinement is not configured.' }, 404);
    }
    return json(await backend.refineDescription(req.body, req));
  }

  return json({ error: 'Not found' }, 404);
}
