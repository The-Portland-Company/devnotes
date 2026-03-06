export type {
  BugReport,
  BugReportType,
  BugReportCreator,
  BugReportMessage,
  TaskList,
  BugCaptureContext,
  DevNotesUser,
  DevNotesConfig,
  DevNotesRole,
  NotifyEvent,
  AiProvider,
  AiConversationMessage,
  AiAssistResult,
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
};

export type DevNotesLinkAppInput = {
  pat: string;
  projectName?: string;
};

export type DevNotesClientOptions = {
  basePath?: string;
  getAuthToken: () => Promise<string> | string;
  fetch?: typeof globalThis.fetch;
};
