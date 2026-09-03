import type {
  Task,
  TaskType,
  TaskMessage,
  TaskCreator,
  TaskList,
  DevNotesAppLinkStatus,
  DevNotesLinkAppInput,
  DevNotesCapabilities,
  DevNotesAttachment,
  ForgeStatus,
} from '../types';

/** Optional metadata sent alongside a proof-media upload. */
export type UploadAttachmentMeta = {
  /** The page the proof was captured on. */
  pageUrl?: string;
  /** A note/task id when attaching to an existing note. */
  taskId?: string;
};

export type TaskCreateData = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'
>;

export interface DevNotesClientAdapter {
  /** Latest Forge connectivity status observed on any response (null until first request). */
  getForgeStatus(): ForgeStatus | null;
  fetchTasks(): Promise<Task[]>;
  createTask(data: TaskCreateData): Promise<Task>;
  /**
   * Upload a captured proof file (screenshot / screen recording) and get back a
   * stored attachment ref to pin onto a note. Optional: present only when the
   * host proxy exposes an attachments upload route; the capture UI hides itself
   * when this is absent.
   */
  uploadAttachment?(
    file: Blob,
    filename: string,
    meta?: UploadAttachmentMeta,
  ): Promise<DevNotesAttachment>;
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

export type BugReportCreateData = TaskCreateData;
