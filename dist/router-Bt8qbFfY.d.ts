import { e as DevNotesCapabilities, f as DevNotesAppLinkStatus, n as DevNotesLinkAppInput, B as BugReport, l as BugReportCreateData, c as BugReportType, T as TaskList, m as BugReportMessage, d as BugReportCreator, k as AiConversationMessage, i as BugCaptureContext, j as AiAssistResult } from './types-xqGNcAbZ.js';

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
    listReports(req: DevNotesProxyRequest): Promise<BugReport[]>;
    createReport(data: BugReportCreateData, req: DevNotesProxyRequest): Promise<BugReport>;
    updateReport(id: string, data: Partial<BugReport>, req: DevNotesProxyRequest): Promise<BugReport>;
    deleteReport(id: string, req: DevNotesProxyRequest): Promise<void>;
    listReportTypes(req: DevNotesProxyRequest): Promise<BugReportType[]>;
    createReportType(name: string, req: DevNotesProxyRequest): Promise<BugReportType>;
    deleteReportType(id: string, req: DevNotesProxyRequest): Promise<void>;
    listTaskLists(req: DevNotesProxyRequest): Promise<TaskList[]>;
    createTaskList(name: string, req: DevNotesProxyRequest): Promise<TaskList>;
    listMessages(reportId: string, req: DevNotesProxyRequest): Promise<BugReportMessage[]>;
    createMessage(reportId: string, body: string, req: DevNotesProxyRequest): Promise<BugReportMessage>;
    updateMessage(id: string, body: string, req: DevNotesProxyRequest): Promise<BugReportMessage>;
    deleteMessage(id: string, req: DevNotesProxyRequest): Promise<void>;
    getUnreadCounts(req: DevNotesProxyRequest): Promise<Record<string, number>>;
    markMessagesRead(messageIds: string[], req: DevNotesProxyRequest): Promise<void>;
    listCollaborators(ids: string[] | null, req: DevNotesProxyRequest): Promise<BugReportCreator[]>;
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
            capture_context?: BugCaptureContext;
        };
    }, req: DevNotesProxyRequest) => Promise<AiAssistResult>;
}

export type { DevNotesProxyBackend as D };
