export type TaskCreator = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export type TaskType = {
  id: string;
  name: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
};

export type TaskCaptureContext = {
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

export type Task = {
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

export type TaskMessage = {
  id: string;
  task_id: string;
  bug_report_id?: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: TaskCreator;
};

export type TaskList = {
  id: string;
  name: string;
  share_slug: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DevNotesUser = {
  id: string;
  email: string;
  fullName?: string;
};

export type NotifyEvent = {
  type: 'bug_closed' | 'new_comment';
  recipientEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

export type AiConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiAssistResult =
  | { type: 'question'; message: string }
  | { type: 'finalized'; description: string }
  | { type: 'error'; message: string };

export type AiProviderOption = {
  id: string;
  label: string;
};

export type AiProvider = {
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

export type DevNotesRole = 'admin' | 'contributor' | 'reporter' | 'none';

export type DevNotesConfig = {
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

export type BugReportCreator = TaskCreator;
export type BugReportType = TaskType;
export type BugCaptureContext = TaskCaptureContext;
export type BugReport = Task;
export type BugReportMessage = TaskMessage;

// ---------------------------------------------------------------------------
// User Stories (Test Cases)
// ---------------------------------------------------------------------------

/** Canonical name of the DevNotes type that switches the menu into recording. */
export const USER_STORY_TYPE_NAME = 'User Stories (Test Cases)';

/** A single recorded/edited step that is sent to the Specs API on save. */
export type UserStoryStepInput = {
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
export type UserStoryDraft = {
  title: string;
  description_md?: string | null;
  test_url?: string | null;
  steps: UserStoryStepInput[];
};

/** Result the host returns after persisting a story to the Specs API. */
export type UserStoryCreateResult = {
  slug?: string | null;
  error?: string | null;
};

/** A persisted step as read back for rendering dots on the page. */
export type UserStoryStepDot = {
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
export type UserStoryWithSteps = {
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
