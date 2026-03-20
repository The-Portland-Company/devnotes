// Provider
export { DevNotesProvider, useDevNotes } from './DevNotesProvider';
export { default as DevNotesButton } from './DevNotesButton';

// Individual components (for custom layouts)
export { default as DevNotesOverlay } from './DevNotesOverlay';
export { default as DevNotesMenu } from './DevNotesMenu';
export { default as DevNotesForm } from './DevNotesForm';
export { default as DevNotesDot } from './DevNotesDot';
export { default as DevNotesDiscussion } from './DevNotesDiscussion';
export { default as DevNotesTaskList } from './DevNotesTaskList';

// Client
export type { TaskCreateData } from './adapters/types';
export { createDevNotesClient } from './client';
export type { BugReportCreateData } from './adapters/types';

// Types
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
  DevNotesCapabilities,
  DevNotesAppLinkStatus,
  DevNotesClientOptions,
  DevNotesLinkAppInput,
  NotifyEvent,
  AiProvider,
  AiConversationMessage,
  AiAssistResult,
  BugReport,
  BugReportType,
  BugReportCreator,
  BugReportMessage,
  BugCaptureContext,
} from './types';

// Utils
export {
  normalizePageUrl,
  calculateBugPositionFromPoint,
  resolveBugReportCoordinates,
} from './utils/bugAnchors';
export {
  deriveRouteLabelFromUrl,
  detectBrowserName,
  buildCaptureContext,
} from './internal/captureContext';
export { buildAiFixPayload, formatAiFixPayloadForCopy } from './internal/aiPayload';
export type { AiFixPayload, BuildAiFixPayloadParams } from './internal/aiPayload';

// Hooks
export { useBugReportPosition } from './hooks/useBugReportPosition';
