import { D as DevNotesCapabilities, a as DevNotesAppLinkStatus, c as DevNotesLinkAppInput } from './types-CrmObeqp.mjs';
import { f as Task, m as TaskCreateData, p as TaskType, T as TaskList, o as TaskMessage, n as TaskCreator, i as AiConversationMessage, g as TaskCaptureContext, h as AiAssistResult } from './types-C3m8yDgc.mjs';

type DevNotesProxyRequest = {
    method: string;
    slug: string[];
    request: Request;
    authToken: string | null;
    query: URLSearchParams;
    body: any;
};
interface DevNotesProxyBackend {
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
    createMessage(reportId: string, body: string, req: DevNotesProxyRequest): Promise<TaskMessage>;
    updateMessage(id: string, body: string, req: DevNotesProxyRequest): Promise<TaskMessage>;
    deleteMessage(id: string, req: DevNotesProxyRequest): Promise<void>;
    getUnreadCounts(req: DevNotesProxyRequest): Promise<Record<string, number>>;
    markMessagesRead(messageIds: string[], req: DevNotesProxyRequest): Promise<void>;
    listCollaborators(ids: string[] | null, req: DevNotesProxyRequest): Promise<TaskCreator[]>;
    refineDescription?: (input: {
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
    }, req: DevNotesProxyRequest) => Promise<AiAssistResult>;
}

export type { DevNotesProxyBackend as D };
