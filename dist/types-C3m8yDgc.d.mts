import { D as DevNotesCapabilities, a as DevNotesAppLinkStatus, c as DevNotesLinkAppInput } from './types-CrmObeqp.mjs';

type TaskCreator = {
    id: string;
    email: string | null;
    full_name: string | null;
};
type TaskType = {
    id: string;
    name: string;
    is_default: boolean;
    created_by: string | null;
    created_at: string;
};
type TaskCaptureContext = {
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
type Task = {
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
    capture_context?: TaskCaptureContext | null;
    response: string | null;
    status: 'Open' | 'In Progress' | 'Needs Review' | 'Resolved' | 'Closed';
    created_by: string;
    creator?: TaskCreator;
    assigned_to: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
    approved: boolean;
    ai_ready: boolean;
    ai_description: string | null;
    created_at: string;
    updated_at: string;
};
type TaskMessage = {
    id: string;
    task_id: string;
    bug_report_id?: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
    author?: TaskCreator;
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
            capture_context?: TaskCaptureContext;
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
type BugReportCreator = TaskCreator;
type BugReportType = TaskType;
type BugCaptureContext = TaskCaptureContext;
type BugReport = Task;
type BugReportMessage = TaskMessage;

type TaskCreateData = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'>;
interface DevNotesClientAdapter {
    fetchTasks(): Promise<Task[]>;
    createTask(data: TaskCreateData): Promise<Task>;
    updateTask(id: string, data: Partial<Task>): Promise<Task>;
    deleteTask(id: string): Promise<void>;
    fetchTaskTypes(): Promise<TaskType[]>;
    createTaskType(name: string): Promise<TaskType>;
    deleteTaskType(id: string): Promise<void>;
    fetchTaskLists(): Promise<TaskList[]>;
    createTaskList(name: string): Promise<TaskList>;
    fetchMessages(taskId: string): Promise<TaskMessage[]>;
    createMessage(taskId: string, body: string): Promise<TaskMessage>;
    updateMessage(id: string, body: string): Promise<TaskMessage>;
    deleteMessage(id: string): Promise<void>;
    markMessagesAsRead(messageIds: string[]): Promise<void>;
    fetchUnreadCounts(): Promise<Record<string, number>>;
    fetchCollaborators(ids?: string[]): Promise<TaskCreator[]>;
    fetchProfiles(ids: string[]): Promise<TaskCreator[]>;
    fetchCapabilities(): Promise<DevNotesCapabilities>;
    getAppLinkStatus(): Promise<DevNotesAppLinkStatus>;
    linkApp(input: DevNotesLinkAppInput): Promise<DevNotesAppLinkStatus>;
    unlinkApp(): Promise<void>;
    fetchBugReports(): Promise<Task[]>;
    createBugReport(data: TaskCreateData): Promise<Task>;
    updateBugReport(id: string, data: Partial<Task>): Promise<Task>;
    deleteBugReport(id: string): Promise<void>;
    fetchBugReportTypes(): Promise<TaskType[]>;
    createBugReportType(name: string): Promise<TaskType>;
    deleteBugReportType(id: string): Promise<void>;
}
type BugReportCreateData = TaskCreateData;

export type { AiProvider as A, BugReport as B, DevNotesClientAdapter as D, NotifyEvent as N, TaskList as T, DevNotesUser as a, DevNotesConfig as b, BugReportType as c, BugReportCreator as d, DevNotesRole as e, Task as f, TaskCaptureContext as g, AiAssistResult as h, AiConversationMessage as i, BugCaptureContext as j, BugReportCreateData as k, BugReportMessage as l, TaskCreateData as m, TaskCreator as n, TaskMessage as o, TaskType as p };
