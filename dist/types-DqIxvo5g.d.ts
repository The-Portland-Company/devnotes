import { D as DevNotesCapabilities, a as DevNotesAppLinkStatus, c as DevNotesLinkAppInput } from './types-CrmObeqp.js';

type BugReportCreator = {
    id: string;
    email: string | null;
    full_name: string | null;
};
type BugReportType = {
    id: string;
    name: string;
    is_default: boolean;
    created_by: string | null;
    created_at: string;
};
type BugCaptureContext = {
    captured_at: string;
    route_label: string;
    path: string;
    browser: {
        name: string;
        user_agent: string;
        platform: string | null;
        language: string | null;
    };
    viewport: {
        width: number;
        height: number;
        pixel_ratio: number;
    };
    timezone: string | null;
};
type BugReport = {
    id: string;
    task_list_id: string;
    page_url: string;
    x_position: number;
    y_position: number;
    target_selector?: string | null;
    target_relative_x?: number | null;
    target_relative_y?: number | null;
    types: string[];
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    title: string;
    description: string | null;
    expected_behavior?: string | null;
    actual_behavior?: string | null;
    capture_context?: BugCaptureContext | null;
    response: string | null;
    status: 'Open' | 'In Progress' | 'Needs Review' | 'Resolved' | 'Closed';
    created_by: string;
    creator?: BugReportCreator;
    assigned_to: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    approved: boolean;
    ai_ready: boolean;
    ai_description: string | null;
    created_at: string;
    updated_at: string;
};
type BugReportMessage = {
    id: string;
    bug_report_id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
    author?: BugReportCreator;
};
type TaskList = {
    id: string;
    name: string;
    share_slug: string;
    is_default: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
};
type DevNotesUser = {
    id: string;
    email: string;
    fullName?: string;
};
type NotifyEvent = {
    type: 'bug_closed' | 'new_comment';
    recipientEmail: string;
    subject: string;
    textBody: string;
    htmlBody: string;
};
type AiConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};
type AiAssistResult = {
    type: 'question';
    message: string;
} | {
    type: 'finalized';
    description: string;
} | {
    type: 'error';
    message: string;
};
type AiProvider = {
    refineDescription(params: {
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
    }): Promise<AiAssistResult>;
};
type DevNotesRole = 'admin' | 'contributor' | 'reporter' | 'none';
type DevNotesConfig = {
    /** Storage key prefix for localStorage (default: 'devnotes') */
    storagePrefix?: string;
    /** Optional callback for notifications (email, slack, etc.) */
    onNotify?: (event: NotifyEvent) => void;
    /** Optional callback to get the current page path (default: window.location.pathname) */
    getPagePath?: () => string;
    /** Optional AI provider for description refinement */
    aiProvider?: AiProvider;
    /** Disable AI description refinement entirely */
    disableAi?: boolean;
    /** Require AI refinement before submitting a new report */
    requireAi?: boolean;
    /** Email addresses of super users who have admin-level access to DevNotes */
    superUsers?: string[];
    /** Role of the current user for access control */
    role?: DevNotesRole;
};

type BugReportCreateData = Omit<BugReport, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'>;
interface DevNotesClientAdapter {
    fetchBugReports(): Promise<BugReport[]>;
    createBugReport(data: BugReportCreateData): Promise<BugReport>;
    updateBugReport(id: string, data: Partial<BugReport>): Promise<BugReport>;
    deleteBugReport(id: string): Promise<void>;
    fetchBugReportTypes(): Promise<BugReportType[]>;
    createBugReportType(name: string): Promise<BugReportType>;
    deleteBugReportType(id: string): Promise<void>;
    fetchTaskLists(): Promise<TaskList[]>;
    createTaskList(name: string): Promise<TaskList>;
    fetchMessages(bugReportId: string): Promise<BugReportMessage[]>;
    createMessage(bugReportId: string, body: string): Promise<BugReportMessage>;
    updateMessage(id: string, body: string): Promise<BugReportMessage>;
    deleteMessage(id: string): Promise<void>;
    markMessagesAsRead(messageIds: string[]): Promise<void>;
    fetchUnreadCounts(): Promise<Record<string, number>>;
    fetchCollaborators(ids?: string[]): Promise<BugReportCreator[]>;
    fetchProfiles(ids: string[]): Promise<BugReportCreator[]>;
    fetchCapabilities(): Promise<DevNotesCapabilities>;
    getAppLinkStatus(): Promise<DevNotesAppLinkStatus>;
    linkApp(input: DevNotesLinkAppInput): Promise<DevNotesAppLinkStatus>;
    unlinkApp(): Promise<void>;
}

export type { AiProvider as A, BugReport as B, DevNotesClientAdapter as D, NotifyEvent as N, TaskList as T, DevNotesUser as a, DevNotesConfig as b, BugReportType as c, BugReportCreator as d, DevNotesRole as e, BugCaptureContext as f, AiAssistResult as g, AiConversationMessage as h, BugReportCreateData as i, BugReportMessage as j };
