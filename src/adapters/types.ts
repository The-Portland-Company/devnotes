import type {
  BugReport,
  BugReportType,
  BugReportMessage,
  BugReportCreator,
  TaskList,
  DevNotesAppLinkStatus,
  DevNotesLinkAppInput,
  DevNotesCapabilities,
} from '../types';

export type BugReportCreateData = Omit<
  BugReport,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by' | 'creator'
>;

export interface DevNotesClientAdapter {
  fetchBugReports(): Promise<BugReport[]>;
  createBugReport(data: BugReportCreateData): Promise<BugReport>;
  updateBugReport(id: string, data: Partial<BugReport>): Promise<BugReport>;
  deleteBugReport(id: string): Promise<void>;
  fetchBugReportTypes(): Promise<BugReportType[]>;
  createBugReportType(name: string): Promise<BugReportType>;
  deleteBugReportType(id: string): Promise<void>;
  fetchTaskLists(): Promise<TaskList[]>;
  createTaskList(name: string): Promise<TaskList>;
  fetchMessages(bugReportId: string): Promise<BugReportMessage[]>;
  createMessage(bugReportId: string, body: string): Promise<BugReportMessage>;
  updateMessage(id: string, body: string): Promise<BugReportMessage>;
  deleteMessage(id: string): Promise<void>;
  markMessagesAsRead(messageIds: string[]): Promise<void>;
  fetchUnreadCounts(): Promise<Record<string, number>>;
  fetchCollaborators(ids?: string[]): Promise<BugReportCreator[]>;
  fetchProfiles(ids: string[]): Promise<BugReportCreator[]>;
  fetchCapabilities(): Promise<DevNotesCapabilities>;
  getAppLinkStatus(): Promise<DevNotesAppLinkStatus>;
  linkApp(input: DevNotesLinkAppInput): Promise<DevNotesAppLinkStatus>;
  unlinkApp(): Promise<void>;
}
