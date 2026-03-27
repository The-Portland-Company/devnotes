export type {
  Task,
  TaskType,
  TaskCreator,
  TaskMessage,
  TaskList,
  TaskCaptureContext,
  DevNotesUser,
  DevNotesConfig,
  DevNotesRole,
  NotifyEvent,
  AiProvider,
  AiConversationMessage,
  AiAssistResult,
  BugReport,
  BugReportType,
  BugReportCreator,
  BugReportMessage,
  BugCaptureContext,
} from './internal/core-types';

export type DevNotesCapabilities = {
  ai: boolean;
  appLink: boolean;
};

export type DevNotesAppLinkStatus = {
  linked: boolean;
  projectName: string | null;
  tokenLast4: string | null;
  linkedAt: string | null;
  projectMatched?: boolean;
  availableProjects?: DevNotesProjectSummary[];
  projectDiscovery?: DevNotesProjectDiscovery | null;
};

export type DevNotesLinkAppInput = {
  pat: string;
  projectName?: string;
};

export type DevNotesProjectSummary = {
  id: string;
  name: string;
  organizationId?: string;
};

export type DevNotesProjectDiscovery = {
  path: string | null;
  baseUrl: string;
};

export type DevNotesServerUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
};

export type DevNotesResolvedUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
};

export type DevNotesForgeOptions = {
  baseUrl: string;
  pat: string;
  projectName?: string | null;
};

export type DevNotesCorsHeaders =
  | HeadersInit
  | ((request: Request) => HeadersInit | Promise<HeadersInit>);

export type DevNotesTaskCreatedEmailOptions = {
  enabled?: boolean;
  apiKey: string;
  fromEmail?: string | null;
  fromName?: string | null;
  projectOwnerEmails?: string[] | null;
  replyTo?: string[] | null;
};

export type DevNotesServerNotifications = {
  taskCreatedEmail?: DevNotesTaskCreatedEmailOptions | null;
};

export type DevNotesServerOptions = {
  basePath?: string;
  getCurrentUser: (request: Request) => Promise<DevNotesServerUser | null> | DevNotesServerUser | null;
  forge: DevNotesForgeOptions;
  resolveUsers?: (ids: string[]) => Promise<DevNotesResolvedUser[]> | DevNotesResolvedUser[];
  fetch?: typeof globalThis.fetch;
  corsHeaders?: DevNotesCorsHeaders;
  notifications?: DevNotesServerNotifications;
};

export type DevNotesClientOptions = {
  basePath?: string;
  getAuthToken: () => Promise<string> | string;
  fetch?: typeof globalThis.fetch;
};
