import { F as ForgeStatus, D as DevNotesCapabilities, a as DevNotesAppLinkStatus, d as DevNotesLinkAppInput } from './types-2MAsdo6u.mjs';

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
    devnotes_meta?: string | null;
    devnotesMeta?: string | null;
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
type AiProviderOption = {
    id: string;
    label: string;
};
type AiProvider = {
    options?: AiProviderOption[];
    defaultOptionId?: string;
    refineDescription(params: {
        description: string;
        conversationHistory: AiConversationMessage[];
        providerId?: string;
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
    /**
     * Persist a recorded User Story (Test Case) to the host's backend / the
     * Specs API. The host owns transport + auth (e.g. forwarding to
     * specs.politogyvrm.com with a server-side bearer token). When omitted, the
     * "Record User Story" affordance is hidden.
     */
    onCreateUserStory?: (draft: UserStoryDraft) => Promise<UserStoryCreateResult>;
    /**
     * Optional: load existing User Stories (with positioned steps) so their step
     * dots can be rendered across sessions/users. When omitted, DevNotes falls
     * back to locally-persisted stories recorded on this device.
     */
    fetchUserStories?: () => Promise<UserStoryWithSteps[]>;
};
type BugReportCreator = TaskCreator;
type BugReportType = TaskType;
type BugCaptureContext = TaskCaptureContext;
type BugReport = Task;
type BugReportMessage = TaskMessage;
/** Canonical name of the DevNotes type that switches the menu into recording. */
declare const USER_STORY_TYPE_NAME = "User Stories (Test Cases)";
/** A single recorded/edited step that is sent to the Specs API on save. */
type UserStoryStepInput = {
    body: string;
    app_mode?: string | null;
    url?: string | null;
    hitl?: boolean;
    page_url?: string | null;
    x_position?: number | null;
    y_position?: number | null;
    target_selector?: string | null;
};
/** The payload handed to the host app's onCreateUserStory callback on save. */
type UserStoryDraft = {
    title: string;
    description_md?: string | null;
    test_url?: string | null;
    steps: UserStoryStepInput[];
};
/** Result the host returns after persisting a story to the Specs API. */
type UserStoryCreateResult = {
    slug?: string | null;
    error?: string | null;
};
/** A persisted step as read back for rendering dots on the page. */
type UserStoryStepDot = {
    id: string;
    storySlug: string;
    storyTitle: string;
    /** 1-based ordinal within the story. */
    index: number;
    body: string;
    page_url: string | null;
    x_position: number | null;
    y_position: number | null;
    target_selector: string | null;
};
/** A story with the subset of step fields DevNotes needs to draw dots. */
type UserStoryWithSteps = {
    slug: string;
    title: string;
    test_url?: string | null;
    steps: Array<{
        id?: string;
        body: string;
        page_url?: string | null;
        x_position?: number | null;
        y_position?: number | null;
        target_selector?: string | null;
    }>;
};

type TaskCreateData = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'>;
interface DevNotesClientAdapter {
    /** Latest Forge connectivity status observed on any response (null until first request). */
    getForgeStatus(): ForgeStatus | null;
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

export { type AiProvider as A, type BugReport as B, type DevNotesUser as D, type NotifyEvent as N, type TaskList as T, type UserStoryDraft as U, type UserStoryCreateResult as a, type UserStoryStepDot as b, type BugReportType as c, type BugReportCreator as d, type DevNotesClientAdapter as e, type DevNotesRole as f, type DevNotesConfig as g, type Task as h, type TaskCaptureContext as i, type AiAssistResult as j, type AiConversationMessage as k, type AiProviderOption as l, type BugCaptureContext as m, type BugReportCreateData as n, type BugReportMessage as o, type TaskCreateData as p, type TaskCreator as q, type TaskMessage as r, type TaskType as s, USER_STORY_TYPE_NAME as t, type UserStoryStepInput as u, type UserStoryWithSteps as v };
