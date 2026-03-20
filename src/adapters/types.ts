import type {
  Task,
  TaskType,
  TaskMessage,
  TaskCreator,
  TaskList,
  DevNotesAppLinkStatus,
  DevNotesLinkAppInput,
  DevNotesCapabilities,
} from '../types';

export type TaskCreateData = Omit<
  Task,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'
>;

export interface DevNotesClientAdapter {
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

export type BugReportCreateData = TaskCreateData;
