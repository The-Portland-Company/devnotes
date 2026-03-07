import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { D as DevNotesClientAdapter, a as DevNotesUser, b as DevNotesConfig, B as BugReport, c as BugReportType, T as TaskList, d as BugReportCreator, N as NotifyEvent, A as AiProvider, e as DevNotesRole, f as BugCaptureContext } from './types-CBHExs2F.mjs';
export { g as AiAssistResult, h as AiConversationMessage, i as BugReportCreateData, j as BugReportMessage } from './types-CBHExs2F.mjs';
import { D as DevNotesCapabilities, a as DevNotesAppLinkStatus, b as DevNotesClientOptions } from './types-CrmObeqp.mjs';
export { c as DevNotesLinkAppInput } from './types-CrmObeqp.mjs';

type DevNotesContextValue = {
    isEnabled: boolean;
    setIsEnabled: (enabled: boolean) => void;
    showBugsAlways: boolean;
    setShowBugsAlways: (show: boolean) => void;
    hideResolvedClosed: boolean;
    setHideResolvedClosed: (hide: boolean) => void;
    bugReports: BugReport[];
    bugReportTypes: BugReportType[];
    taskLists: TaskList[];
    userProfiles: Record<string, BugReportCreator>;
    unreadCounts: Record<string, number>;
    currentPageBugReports: BugReport[];
    collaborators: BugReportCreator[];
    loadBugReports: () => Promise<void>;
    loadBugReportTypes: () => Promise<void>;
    loadTaskLists: () => Promise<void>;
    createBugReport: (report: Omit<BugReport, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by'>) => Promise<BugReport | null>;
    updateBugReport: (id: string, updates: Partial<BugReport>) => Promise<BugReport | null>;
    deleteBugReport: (id: string) => Promise<boolean>;
    createTaskList: (name: string) => Promise<TaskList | null>;
    addBugReportType: (name: string) => Promise<BugReportType | null>;
    deleteBugReportType: (id: string) => Promise<boolean>;
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
    dotContainer: HTMLDivElement | null;
    compensate: (viewportX: number, viewportY: number) => {
        x: number;
        y: number;
    };
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
    /** Called when user clicks "View Tasks" in the menu. If omitted, a built-in task panel opens. */
    onViewTasks?: () => void;
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
declare function DevNotesButton({ position, onViewTasks, onSettings, icon, openReportId, onOpenReportClose, onNavigateToPage, }: DevNotesButtonProps): react_jsx_runtime.JSX.Element | null;

type DevNotesOverlayProps = {
    /** Optional: ID of a report to open immediately */
    openReportId?: string | null;
    /** Called when the opened report is closed */
    onOpenReportClose?: () => void;
};
declare function DevNotesOverlay({ openReportId, onOpenReportClose, }?: DevNotesOverlayProps): react_jsx_runtime.JSX.Element | null;

type DevNotesMenuProps = {
    /** Called when user clicks "View Tasks" */
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
};
declare function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position, dropdownDirection }: DevNotesMenuProps): react_jsx_runtime.JSX.Element | null;

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
};
declare function DevNotesForm({ pageUrl, xPosition, yPosition, targetSelector, targetRelativeX, targetRelativeY, existingReport, onSave, onCancel, onDelete, }: DevNotesFormProps): react_jsx_runtime.JSX.Element;

type DevNotesDotProps = {
    report: BugReport;
};
declare function DevNotesDot({ report }: DevNotesDotProps): react_jsx_runtime.JSX.Element | null;

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
declare const resolveBugReportCoordinates: (report: BugReport) => {
    x: number;
    y: number;
} | null;

declare function deriveRouteLabelFromUrl(rawUrl: string): string;
declare function detectBrowserName(userAgent: string): string;
declare function buildCaptureContext(pageUrl: string): BugCaptureContext | null;

type AiFixPayload = {
    source: string;
    copied_at: string;
    report: {
        id: string | null;
        title: string | null;
        status: BugReport['status'];
        severity: BugReport['severity'];
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
        capture_context: BugCaptureContext | null;
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
        status: BugReport['status'];
        severity: BugReport['severity'];
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
        captureContext?: BugCaptureContext | null;
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

declare const useBugReportPosition: (report: BugReport | null) => {
    x: number;
    y: number;
} | null;

export { type AiFixPayload, AiProvider, BugCaptureContext, BugReport, BugReportCreator, BugReportType, type BuildAiFixPayloadParams, DevNotesAppLinkStatus, DevNotesButton, DevNotesCapabilities, DevNotesClientOptions, DevNotesConfig, DevNotesDiscussion, DevNotesDot, DevNotesForm, DevNotesMenu, DevNotesOverlay, DevNotesProvider, DevNotesRole, DevNotesTaskList, DevNotesUser, NotifyEvent, TaskList, buildAiFixPayload, buildCaptureContext, calculateBugPositionFromPoint, createDevNotesClient, deriveRouteLabelFromUrl, detectBrowserName, formatAiFixPayloadForCopy, normalizePageUrl, resolveBugReportCoordinates, useBugReportPosition, useDevNotes };
