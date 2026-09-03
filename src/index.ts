// Provider
export { DevNotesProvider, useDevNotes } from './DevNotesProvider';
export { default as DevNotesContext } from './DevNotesProvider';
export {
  menuPanelStyle,
  menuRowStyle,
  menuPanelStyleFor,
  menuRowStyleFor,
  computeMenuRowBoxes,
  boxesOverlap,
  menuKnobStyle,
} from './menuLayout';
export { resolveMenuScheme, menuPalette, readDocumentMenuScheme } from './menuTheme';
export type { MenuScheme } from './menuTheme';
export { default as DevNotesButton } from './DevNotesButton';

// Individual components (for custom layouts)
export { default as DevNotesOverlay } from './DevNotesOverlay';
export { default as DevNotesMenu } from './DevNotesMenu';
export { default as DevNotesForm } from './DevNotesForm';
export { default as DevNotesDot } from './DevNotesDot';
export { default as DevNotesStepDot } from './DevNotesStepDot';
export { default as DevNotesStoryRecorder } from './DevNotesStoryRecorder';
export { default as DevNotesDiscussion } from './DevNotesDiscussion';
export { default as DevNotesTaskList } from './DevNotesTaskList';
export { default as DevNotesTaskListModal } from './DevNotesTaskListModal';
export { default as DevNotesForgeBanner, buildForgeDebugPrompt } from './DevNotesForgeBanner';
export { default as DevNotesStoryStepsBuilder } from './DevNotesStoryStepsBuilder';
export type { StoryBuilderStep } from './DevNotesStoryStepsBuilder';

// Client
export type { TaskCreateData } from './adapters/types';
export { createDevNotesClient, DevNotesRequestError } from './client';
export type { BugReportCreateData } from './adapters/types';

// Types
export type {
  Task,
  TaskType,
  TaskCreator,
  TaskMessage,
  TaskList,
  TaskCaptureContext,
  DevNotesAttachment,
  DevNotesUser,
  DevNotesConfig,
  DevNotesRole,
  DevNotesCapabilities,
  ForgeStatus,
  ForgeError,
  DevNotesAppLinkStatus,
  DevNotesClientOptions,
  DevNotesLinkAppInput,
  NotifyEvent,
  AiProvider,
  AiProviderOption,
  AiConversationMessage,
  AiAssistResult,
  BugReport,
  BugReportType,
  BugReportCreator,
  BugReportMessage,
  BugCaptureContext,
  UserStoryStepInput,
  UserStoryDraft,
  UserStoryCreateResult,
  UserStoryStepDot,
  UserStoryWithSteps,
} from './types';
export { USER_STORY_TYPE_NAME } from './types';
export type { RecordedStep, StoryStepAction } from './internal/storyRecorder';

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
export {
  getInitialTaskStatus,
  shouldRequireExplicitStatusSelection,
  getInitialNarrativeTab,
} from './internal/formState';
export type { NarrativeTab } from './internal/formState';
export {
  captureScreenshot,
  startRecording,
  isProofCaptureSupported,
  isRecordingSupported,
} from './internal/proofCapture';
export type {
  ProofCaptureResult,
  ProofCaptureKind,
  ProofRecorder,
} from './internal/proofCapture';
export type { UploadAttachmentMeta } from './adapters/types';

// Hooks
export { useBugReportPosition } from './hooks/useBugReportPosition';
