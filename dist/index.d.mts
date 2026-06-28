import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, CSSProperties } from 'react';
import { D as DevNotesClientAdapter, a as DevNotesUser, b as DevNotesConfig, U as UserStoryDraft, c as UserStoryCreateResult, d as UserStoryStepDot, B as BugReport, e as BugReportType, T as TaskList, f as BugReportCreator, N as NotifyEvent, A as AiProvider, g as DevNotesRole, h as Task, i as TaskCaptureContext } from './types-jRq0zgJK.mjs';
export { j as AiAssistResult, k as AiConversationMessage, l as AiProviderOption, m as BugCaptureContext, n as BugReportCreateData, o as BugReportMessage, p as TaskCreateData, q as TaskCreator, r as TaskMessage, s as TaskType, t as USER_STORY_TYPE_NAME, u as UserStoryStepInput, v as UserStoryWithSteps } from './types-jRq0zgJK.mjs';
import { D as DevNotesCapabilities, a as DevNotesAppLinkStatus, F as ForgeStatus, b as ForgeError, c as DevNotesClientOptions } from './types-CN69T2nf.mjs';
export { d as DevNotesLinkAppInput } from './types-CN69T2nf.mjs';

type StoryStepAction = 'click' | 'input' | 'select' | 'navigate' | 'note';
type RecordedStep = {
    /** Stable client-side id (not persisted server-side). */
    id: string;
    action: StoryStepAction;
    /** Human-readable instruction, e.g. "Click the \"Save\" button". */
    body: string;
    /** CSS selector of the touched element (null for navigation/notes). */
    selector: string | null;
    /** The value the user entered/selected, when relevant. */
    value: string | null;
    /** Normalized page path the step occurred on. */
    page_url: string;
    /** Page-level coordinates (clientX + scrollX). null for navigation/notes. */
    x: number | null;
    y: number | null;
};

type DevNotesContextValue = {
    isEnabled: boolean;
    setIsEnabled: (enabled: boolean) => void;
    showTasksAlways: boolean;
    setShowTasksAlways: (show: boolean) => void;
    hideResolvedClosed: boolean;
    setHideResolvedClosed: (hide: boolean) => void;
    showStepDots: boolean;
    setShowStepDots: (show: boolean) => void;
    canRecordUserStory: boolean;
    isRecordingStory: boolean;
    recordedSteps: RecordedStep[];
    savingStory: boolean;
    storyError: string | null;
    startUserStoryRecording: () => void;
    stopUserStoryRecording: () => void;
    cancelUserStoryRecording: () => void;
    updateRecordedStep: (id: string, body: string) => void;
    deleteRecordedStep: (id: string) => void;
    moveRecordedStep: (id: string, direction: 'up' | 'down') => void;
    saveUserStory: (input: {
        title: string;
        description_md?: string | null;
        test_url?: string | null;
    }) => Promise<boolean>;
    /** Persist a fully-assembled User Story draft (manual + recorded steps). */
    createUserStory: (draft: UserStoryDraft) => Promise<UserStoryCreateResult>;
    userStoryStepDots: UserStoryStepDot[];
    currentPageStepDots: UserStoryStepDot[];
    tasks: BugReport[];
    taskTypes: BugReportType[];
    taskLists: TaskList[];
    userProfiles: Record<string, BugReportCreator>;
    unreadCounts: Record<string, number>;
    currentPageTasks: BugReport[];
    collaborators: BugReportCreator[];
    loadTasks: () => Promise<void>;
    loadTaskTypes: () => Promise<void>;
    loadTaskLists: () => Promise<void>;
    createTask: (report: Omit<BugReport, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by'>) => Promise<BugReport | null>;
    updateTask: (id: string, updates: Partial<BugReport>) => Promise<BugReport | null>;
    deleteTask: (id: string) => Promise<boolean>;
    createTaskList: (name: string) => Promise<TaskList | null>;
    addTaskType: (name: string) => Promise<BugReportType | null>;
    deleteTaskType: (id: string) => Promise<boolean>;
    loadUnreadCounts: () => Promise<void>;
    markMessagesAsRead: (reportId: string, messageIds: string[]) => Promise<void>;
    user: DevNotesUser;
    adapter: DevNotesClientAdapter;
    capabilities: DevNotesCapabilities;
    appLinkStatus: DevNotesAppLinkStatus | null;
    refreshCapabilities: () => Promise<void>;
    refreshAppLinkStatus: () => Promise<void>;
    onNotify?: (event: NotifyEvent) => void;
    aiProvider?: AiProvider;
    requireAi: boolean;
    role: DevNotesRole;
    loading: boolean;
    error: string | null;
    /** Latest Forge connectivity status from the backend (null until first probe). */
    forgeStatus: ForgeStatus | null;
    /** Convenience accessor: the structured Forge error when disconnected, else null. */
    forgeError: ForgeError | null;
    dotContainer: HTMLDivElement | null;
    compensate: (viewportX: number, viewportY: number) => {
        x: number;
        y: number;
    };
    bugReports: BugReport[];
    bugReportTypes: BugReportType[];
    currentPageBugReports: BugReport[];
    loadBugReports: () => Promise<void>;
    loadBugReportTypes: () => Promise<void>;
    createBugReport: DevNotesContextValue['createTask'];
    updateBugReport: DevNotesContextValue['updateTask'];
    deleteBugReport: DevNotesContextValue['deleteTask'];
    addBugReportType: DevNotesContextValue['addTaskType'];
    deleteBugReportType: DevNotesContextValue['deleteTaskType'];
    showBugsAlways: boolean;
    setShowBugsAlways: (show: boolean) => void;
};
type DevNotesProviderProps = {
    adapter: DevNotesClientAdapter;
    user: DevNotesUser;
    config?: DevNotesConfig;
    children: ReactNode;
};
declare function DevNotesProvider({ adapter, user, config, children }: DevNotesProviderProps): react_jsx_runtime.JSX.Element;
declare function useDevNotes(): DevNotesContextValue;

type DevNotesButtonProps = {
    /** Position of the floating button */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    /** Called when user clicks "Settings" in the menu */
    onSettings?: () => void;
    /** Custom icon component for the menu trigger */
    icon?: React.ComponentType<{
        size?: number;
        color?: string;
    }>;
    /** Optional: ID of a report to open immediately */
    openReportId?: string | null;
    /** Called when the opened report modal is closed */
    onOpenReportClose?: () => void;
    /** Called when user wants to navigate to a report's page (used by built-in task list) */
    onNavigateToPage?: (pageUrl: string, reportId: string) => void;
};
declare function DevNotesButton({ position, onSettings, icon, openReportId, onOpenReportClose, onNavigateToPage, }: DevNotesButtonProps): react_jsx_runtime.JSX.Element | null;

type DevNotesOverlayProps = {
    /** Optional: ID of a report to open immediately */
    openReportId?: string | null;
    /** Called when the opened report is closed */
    onOpenReportClose?: () => void;
};
declare function DevNotesOverlay({ openReportId, onOpenReportClose, }?: DevNotesOverlayProps): react_jsx_runtime.JSX.Element | null;

type DevNotesMenuProps = {
    /**
     * Called when the user clicks "View All Tasks". Optional — when omitted, the
     * menu opens its own built-in, self-contained All Tasks modal so the host app
     * doesn't have to render or wire one up.
     */
    onViewTasks?: () => void;
    /** Called when user clicks "Settings" */
    onSettings?: () => void;
    /** Custom icon component for the menu trigger */
    icon?: React.ComponentType<{
        size?: number;
        color?: string;
    }>;
    /** Position of the parent button — controls dropdown alignment */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    /** Direction the dropdown opens — default 'down' */
    dropdownDirection?: 'up' | 'down';
    /** Forwarded to the built-in modal: navigate to the page a report was filed on */
    onNavigateToPage?: (pageUrl: string, reportId: string) => void;
};
declare function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position, dropdownDirection, onNavigateToPage }: DevNotesMenuProps): react_jsx_runtime.JSX.Element | null;

type DevNotesFormProps = {
    pageUrl: string;
    xPosition?: number;
    yPosition?: number;
    targetSelector?: string | null;
    targetRelativeX?: number | null;
    targetRelativeY?: number | null;
    existingReport?: BugReport | null;
    onSave: (report: BugReport) => void;
    onCancel: () => void;
    onDelete?: () => void;
    onArchive?: () => void;
};
declare function DevNotesForm({ pageUrl, xPosition, yPosition, targetSelector, targetRelativeX, targetRelativeY, existingReport, onSave, onCancel, onDelete, onArchive, }: DevNotesFormProps): react_jsx_runtime.JSX.Element;

type DevNotesDotProps = {
    report: BugReport;
};
declare function DevNotesDot({ report }: DevNotesDotProps): react_jsx_runtime.JSX.Element | null;

type DevNotesStepDotProps = {
    dot: UserStoryStepDot;
};
declare function DevNotesStepDot({ dot }: DevNotesStepDotProps): react_jsx_runtime.JSX.Element | null;

/**
 * Floating UI for recording a User Story (Test Case):
 *   1. While recording — a HUD showing the live step count + Stop / Cancel.
 *   2. After Stop (steps captured) — a review modal to title the story, edit /
 *      reorder / delete steps, then Save (writes to the Specs API via the host
 *      onCreateUserStory callback).
 *
 * Tagged data-devnotes-recorder so the recorder ignores clicks on its own UI.
 */
declare function DevNotesStoryRecorder(): react_jsx_runtime.JSX.Element | null;

type DevNotesDiscussionProps = {
    report: BugReport;
};
declare function DevNotesDiscussion({ report }: DevNotesDiscussionProps): react_jsx_runtime.JSX.Element;

type DevNotesTaskListProps = {
    /** Called when the user wants to navigate to the page where a report was filed */
    onNavigateToPage?: (pageUrl: string, reportId: string) => void;
    /** Called when the close/back button is clicked (if rendered as an overlay) */
    onClose?: () => void;
    /** Title shown at the top */
    title?: string;
};
declare function DevNotesTaskList({ onNavigateToPage, onClose, title, }: DevNotesTaskListProps): react_jsx_runtime.JSX.Element;

type DevNotesTaskListModalProps = {
    /** Whether the modal is shown */
    open: boolean;
    /** Called when the modal should close (backdrop, Escape, or the ✕ button) */
    onClose: () => void;
    /** Called when the user wants to navigate to the page where a report was filed */
    onNavigateToPage?: (pageUrl: string, reportId: string) => void;
    /** Title shown at the top */
    title?: string;
};
declare function DevNotesTaskListModal({ open, onClose, onNavigateToPage, title, }: DevNotesTaskListModalProps): react_jsx_runtime.JSX.Element | null;

/**
 * Builds the ready-to-paste AI debugging prompt embedding the exact Forge error.
 */
declare function buildForgeDebugPrompt(err: ForgeError): string;
/**
 * Red/warning banner shown at the top of the DevNotes panel and All-Tasks modal
 * whenever the backend reports it cannot reach Focus Forge. Renders nothing when
 * Forge is connected (or status is still unknown).
 */
declare function DevNotesForgeBanner({ style }: {
    style?: CSSProperties;
}): react_jsx_runtime.JSX.Element | null;

/**
 * A single step in the guided User Story (Test Case) builder. Shape is a superset
 * of the package's `UserStoryStepInput` (adds a stable client `id` for list keys);
 * positional fields are populated when a step is captured via the interaction
 * recorder and left null for manually-typed steps.
 */
type StoryBuilderStep = {
    id: string;
    body: string;
    page_url?: string | null;
    x_position?: number | null;
    y_position?: number | null;
    target_selector?: string | null;
};
type DevNotesStoryStepsBuilderProps = {
    steps: StoryBuilderStep[];
    onChange: (next: StoryBuilderStep[]) => void;
    /** Whether the interaction recorder is available (config.onCreateUserStory present). */
    canRecord: boolean;
    /** Whether the recorder is currently capturing. */
    isRecording: boolean;
    onStartRecording: () => void;
    onStopRecording: () => void;
    isSuperscriptLabels: boolean;
    fieldSurfaceClass: string;
    controlInputClass: string;
    floatingLabelClass: (isSuperscript: boolean) => string;
    showError?: boolean;
};
declare function DevNotesStoryStepsBuilder({ steps, onChange, canRecord, isRecording, onStartRecording, onStopRecording, isSuperscriptLabels, fieldSurfaceClass, controlInputClass, floatingLabelClass, showError, }: DevNotesStoryStepsBuilderProps): react_jsx_runtime.JSX.Element;

/** Error thrown by the client that also carries the structured Forge status. */
declare class DevNotesRequestError extends Error {
    forge: ForgeStatus | null;
    status: number;
    constructor(message: string, status: number, forge: ForgeStatus | null);
}
declare function createDevNotesClient(options: DevNotesClientOptions): DevNotesClientAdapter;

type BugAnchorMetadata = {
    targetSelector: string | null;
    targetRelativeX: number | null;
    targetRelativeY: number | null;
};
type BugPositionPayload = BugAnchorMetadata & {
    x: number;
    y: number;
};
/**
 * Normalize a page URL for bug report storage.
 * Strips hash fragments and trailing slashes. Preserves all query params.
 */
declare const normalizePageUrl: (value: string) => string;
declare const calculateBugPositionFromPoint: ({ clientX, clientY, elementsToIgnore, }: {
    clientX: number;
    clientY: number;
    elementsToIgnore?: Array<HTMLElement | null | undefined>;
}) => BugPositionPayload;
/**
 * Resolve a bug report's position to viewport coordinates for `position: fixed` rendering.
 *
 * Priority 1: Find the anchored element by CSS selector and calculate viewport-relative
 *             position from its current bounding rect. This makes the dot track the element.
 * Priority 2: Fall back to stored page coordinates converted to viewport coordinates.
 */
declare const resolveBugReportCoordinates: (report: Task) => {
    x: number;
    y: number;
} | null;

declare function deriveRouteLabelFromUrl(rawUrl: string): string;
declare function detectBrowserName(userAgent: string): string;
declare function buildCaptureContext(pageUrl: string): TaskCaptureContext | null;

type AiFixPayload = {
    source: string;
    copied_at: string;
    report: {
        id: string | null;
        title: string | null;
        status: Task['status'];
        severity: Task['severity'];
        task_list_id: string | null;
        types: string[];
        type_names: string[];
        approved: boolean;
        ai_ready: boolean;
    };
    narrative: {
        description: string | null;
        expected_behavior: string | null;
        actual_behavior: string | null;
        ai_description: string | null;
        response: string | null;
    };
    context: {
        page_url: string;
        route_label: string;
        x_position: number;
        y_position: number;
        target_selector: string | null;
        target_relative_x: number | null;
        target_relative_y: number | null;
        capture_context: TaskCaptureContext | null;
    };
    workflow: {
        assigned_to: string | null;
        resolved_by: string | null;
        created_by: string;
        created_at: string | null;
        updated_at: string | null;
    };
};
type BuildAiFixPayloadParams = {
    source?: string;
    copiedAt?: string;
    report: {
        id?: string | null;
        title?: string | null;
        status: Task['status'];
        severity: Task['severity'];
        taskListId?: string | null;
        types: string[];
        typeNames: string[];
        approved: boolean;
        aiReady: boolean;
    };
    narrative: {
        description?: string | null;
        expectedBehavior?: string | null;
        actualBehavior?: string | null;
        aiDescription?: string | null;
        response?: string | null;
    };
    context: {
        pageUrl: string;
        routeLabel: string;
        xPosition: number;
        yPosition: number;
        targetSelector?: string | null;
        targetRelativeX?: number | null;
        targetRelativeY?: number | null;
        captureContext?: TaskCaptureContext | null;
    };
    workflow: {
        assignedTo?: string | null;
        resolvedBy?: string | null;
        createdBy: string;
        createdAt?: string | null;
        updatedAt?: string | null;
    };
};
declare function buildAiFixPayload(params: BuildAiFixPayloadParams): AiFixPayload;
declare function formatAiFixPayloadForCopy(payload: AiFixPayload): string;

type NarrativeTab = 'description' | 'issue-details';
declare function getInitialTaskStatus(existingStatus?: Task['status'] | null): Task['status'];
declare function shouldRequireExplicitStatusSelection(hasExistingReport: boolean): boolean;
declare function getInitialNarrativeTab(): NarrativeTab;

declare const useBugReportPosition: (report: Task | null) => {
    x: number;
    y: number;
} | null;

export { type AiFixPayload, AiProvider, BugReport, BugReportCreator, BugReportType, type BuildAiFixPayloadParams, DevNotesAppLinkStatus, DevNotesButton, DevNotesCapabilities, DevNotesClientOptions, DevNotesConfig, DevNotesDiscussion, DevNotesDot, DevNotesForgeBanner, DevNotesForm, DevNotesMenu, DevNotesOverlay, DevNotesProvider, DevNotesRequestError, DevNotesRole, DevNotesStepDot, DevNotesStoryRecorder, DevNotesStoryStepsBuilder, DevNotesTaskList, DevNotesTaskListModal, DevNotesUser, ForgeError, ForgeStatus, type NarrativeTab, NotifyEvent, type RecordedStep, type StoryBuilderStep, type StoryStepAction, Task, TaskCaptureContext, TaskList, UserStoryCreateResult, UserStoryDraft, UserStoryStepDot, buildAiFixPayload, buildCaptureContext, buildForgeDebugPrompt, calculateBugPositionFromPoint, createDevNotesClient, deriveRouteLabelFromUrl, detectBrowserName, formatAiFixPayloadForCopy, getInitialNarrativeTab, getInitialTaskStatus, normalizePageUrl, resolveBugReportCoordinates, shouldRequireExplicitStatusSelection, useBugReportPosition, useDevNotes };
