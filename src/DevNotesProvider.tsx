import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import type { DevNotesClientAdapter } from './adapters/types';
import type {
  BugReport,
  BugReportType,
  BugReportCreator,
  TaskList,
  DevNotesUser,
  DevNotesConfig,
  DevNotesRole,
  NotifyEvent,
  AiProvider,
  DevNotesCapabilities,
  DevNotesAppLinkStatus,
} from './types';
import { useDevNotesContainer } from './hooks/useContainerOffset';

type DevNotesContextValue = {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  showTasksAlways: boolean;
  setShowTasksAlways: (show: boolean) => void;
  hideResolvedClosed: boolean;
  setHideResolvedClosed: (hide: boolean) => void;
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
  createTask: (
    report: Omit<
      BugReport,
      'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by'
    >
  ) => Promise<BugReport | null>;
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
  dotContainer: HTMLDivElement | null;
  compensate: (viewportX: number, viewportY: number) => { x: number; y: number };
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

const DevNotesContext = createContext<DevNotesContextValue | null>(null);

type DevNotesProviderProps = {
  adapter: DevNotesClientAdapter;
  user: DevNotesUser;
  config?: DevNotesConfig;
  children: ReactNode;
};

export function DevNotesProvider({ adapter, user, config, children }: DevNotesProviderProps) {
  const { container: dotContainer, compensate } = useDevNotesContainer();
  const storagePrefix = config?.storagePrefix || 'devnotes';
  const defaultGetPagePath = () => `${window.location.pathname}${window.location.search}`;
  const getPagePathRef = useRef(config?.getPagePath || defaultGetPagePath);
  getPagePathRef.current = config?.getPagePath || defaultGetPagePath;
  const getPagePath = useCallback(() => getPagePathRef.current(), []);
  const onNotify = config?.onNotify;
  const aiProvider = config?.disableAi ? undefined : config?.aiProvider;
  const requireAi = Boolean(config?.requireAi && aiProvider);
  const role: DevNotesRole = config?.role ?? 'admin';

  const SHOW_BUGS_ALWAYS_KEY = `${storagePrefix}_show_bugs_always`;
  const HIDE_RESOLVED_CLOSED_KEY = `${storagePrefix}_hide_resolved_closed`;

  const [isEnabled, setIsEnabled] = useState(false);
  const [showTasksAlways, setShowBugsAlwaysState] = useState(() => {
    try {
      return localStorage.getItem(SHOW_BUGS_ALWAYS_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [hideResolvedClosed, setHideResolvedClosedState] = useState(() => {
    try {
      const stored = localStorage.getItem(HIDE_RESOLVED_CLOSED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [tasks, setBugReports] = useState<BugReport[]>([]);
  const [taskTypes, setBugReportTypes] = useState<BugReportType[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, BugReportCreator>>({});
  const userProfilesRef = useRef<Record<string, BugReportCreator>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [collaborators, setCollaborators] = useState<BugReportCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<DevNotesCapabilities>({
    ai: Boolean(aiProvider),
    appLink: true,
  });
  const [appLinkStatus, setAppLinkStatus] = useState<DevNotesAppLinkStatus | null>(null);
  const [currentRoutePath, setCurrentRoutePath] = useState(() => {
    try {
      return getPagePath();
    } catch {
      if (typeof window !== 'undefined') return `${window.location.pathname}${window.location.search}`;
      return '/';
    }
  });

  const setShowTasksAlways = useCallback(
    (show: boolean) => {
      setShowBugsAlwaysState(show);
      try {
        localStorage.setItem(SHOW_BUGS_ALWAYS_KEY, String(show));
      } catch {}
    },
    [SHOW_BUGS_ALWAYS_KEY]
  );

  const setHideResolvedClosed = useCallback(
    (hide: boolean) => {
      setHideResolvedClosedState(hide);
      try {
        localStorage.setItem(HIDE_RESOLVED_CLOSED_KEY, String(hide));
      } catch {}
    },
    [HIDE_RESOLVED_CLOSED_KEY]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateRoutePath = () => {
      try {
        setCurrentRoutePath(getPagePath());
      } catch {
        setCurrentRoutePath(`${window.location.pathname}${window.location.search}`);
      }
    };

    updateRoutePath();

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const patchedPushState: History['pushState'] = (...args) => {
      originalPushState.apply(window.history, args);
      updateRoutePath();
    };

    const patchedReplaceState: History['replaceState'] = (...args) => {
      originalReplaceState.apply(window.history, args);
      updateRoutePath();
    };

    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;

    window.addEventListener('popstate', updateRoutePath);
    window.addEventListener('hashchange', updateRoutePath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', updateRoutePath);
      window.removeEventListener('hashchange', updateRoutePath);
    };
  }, [getPagePath]);

  const visibleTasks = useMemo(() => {
    if (role === 'reporter') {
      return tasks.filter((report) => report.created_by === user.id);
    }
    // admin and contributor see all reports
    return tasks;
  }, [tasks, role, user.id]);

  const currentPageTasks = useMemo(() => {
    const toPath = (url: string) => url.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
    const currentPath = toPath(currentRoutePath);
    return visibleTasks.filter((report) => toPath(report.page_url) === currentPath);
  }, [visibleTasks, currentRoutePath]);

  useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  const loadProfilesForReports = useCallback(
    async (reports: BugReport[]) => {
      if (!reports.length) return;

      const profileIds = new Set<string>();
      reports.forEach((report) => {
        if (report.created_by) profileIds.add(report.created_by);
        if (report.assigned_to) profileIds.add(report.assigned_to);
        if (report.resolved_by) profileIds.add(report.resolved_by);
      });

      const idsToFetch = Array.from(profileIds).filter((id) => !userProfilesRef.current[id]);
      if (idsToFetch.length === 0) return;

      try {
        const profiles = await adapter.fetchProfiles(idsToFetch);
        setUserProfiles((prev) => {
          const next = { ...prev };
          profiles.forEach((profile) => {
            next[profile.id] = profile;
          });
          return next;
        });
      } catch (err: any) {
        console.error('[DevNotes] Error loading profiles:', err);
      }
    },
    [adapter]
  );

  const loadUnreadCounts = useCallback(async () => {
    try {
      const counts = await adapter.fetchUnreadCounts();
      setUnreadCounts(counts);
    } catch (err: any) {
      console.error('[DevNotes] Error loading unread counts:', err);
    }
  }, [adapter]);

  const markMessagesAsRead = useCallback(
    async (reportId: string, messageIds: string[]) => {
      if (messageIds.length === 0) return;

      const uniqueIds = Array.from(new Set(messageIds));
      try {
        await adapter.markMessagesAsRead(uniqueIds);
        setUnreadCounts((prev) => {
          if (!prev[reportId]) return prev;
          const next = { ...prev };
          const nextValue = Math.max(0, (next[reportId] || 0) - uniqueIds.length);
          if (nextValue === 0) {
            delete next[reportId];
          } else {
            next[reportId] = nextValue;
          }
          return next;
        });
      } catch (err: any) {
        console.error('[DevNotes] Error marking messages as read:', err);
      }
    },
    [adapter]
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adapter.fetchTasks();
      setBugReports(data);
      await Promise.all([loadProfilesForReports(data), loadUnreadCounts()]);
    } catch (err: any) {
      console.error('[DevNotes] Error loading bug reports:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adapter, loadProfilesForReports, loadUnreadCounts]);

  const loadTaskTypes = useCallback(async () => {
    try {
      const data = await adapter.fetchTaskTypes();
      setBugReportTypes(data);
    } catch (err: any) {
      console.error('[DevNotes] Error loading bug report types:', err);
    }
  }, [adapter]);

  const loadTaskLists = useCallback(async () => {
    try {
      const data = await adapter.fetchTaskLists();
      setTaskLists(data);
    } catch (err: any) {
      console.error('[DevNotes] Error loading task lists:', err);
    }
  }, [adapter]);

  const loadCollaborators = useCallback(async () => {
    try {
      const data = await adapter.fetchCollaborators();
      setCollaborators(data);
    } catch (err: any) {
      console.error('[DevNotes] Error loading collaborators:', err);
    }
  }, [adapter]);

  const refreshCapabilities = useCallback(async () => {
    try {
      const data = await adapter.fetchCapabilities();
      setCapabilities(data);
    } catch (err: any) {
      console.error('[DevNotes] Error loading capabilities:', err);
    }
  }, [adapter]);

  const refreshAppLinkStatus = useCallback(async () => {
    try {
      const data = await adapter.getAppLinkStatus();
      setAppLinkStatus(data);
    } catch (err: any) {
      console.error('[DevNotes] Error loading app link status:', err);
      setAppLinkStatus(null);
    }
  }, [adapter]);

  const createTask = useCallback(
    async (
      report: Omit<
        BugReport,
        'id' | 'created_at' | 'updated_at' | 'created_by' | 'resolved_at' | 'resolved_by'
      >
    ): Promise<BugReport | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await adapter.createTask(report);
        setBugReports((prev) => [data, ...prev]);
        await loadProfilesForReports([data]);
        return data;
      } catch (err: any) {
        console.error('[DevNotes] Error creating bug report:', err);
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter, loadProfilesForReports]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<BugReport>): Promise<BugReport | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await adapter.updateTask(id, updates);

        setBugReports((prev) =>
          prev.map((report) =>
            report.id === id
              ? { ...report, ...data, creator: report.creator || data.creator }
              : report
          )
        );
        await loadProfilesForReports([data]);

        // Fire notification callback for status changes
        if (updates.status === 'Closed' && onNotify) {
          const originalReport = tasks.find((r) => r.id === id);
          const authorEmail = originalReport?.creator?.email;
          const authorName = originalReport?.creator?.full_name || 'there';
          const reportTitle = originalReport?.title || data.title || 'Untitled';
          const closerName = userProfilesRef.current[user.id]?.full_name || 'A team member';

          if (authorEmail && originalReport?.created_by !== user.id) {
            onNotify({
              type: 'bug_closed',
              recipientEmail: authorEmail,
              subject: `Dev Note Closed: ${reportTitle}`,
              textBody: `Hi ${authorName},\n\nYour dev note "${reportTitle}" has been closed by ${closerName}.\n\nThank you,\nDev Notes`,
              htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Dev Note Closed</h2>
  <p>Hi ${authorName},</p>
  <p>Your dev note <strong>"${reportTitle}"</strong> has been closed by <strong>${closerName}</strong>.</p>
  <p>Thank you,<br>Dev Notes</p>
</div>`,
            });
          }
        }

        return data;
      } catch (err: any) {
        console.error('[DevNotes] Error updating bug report:', err);
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter, loadProfilesForReports, tasks, user.id, onNotify]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        await adapter.deleteTask(id);
        setBugReports((prev) => prev.filter((report) => report.id !== id));
        return true;
      } catch (err: any) {
        console.error('[DevNotes] Error deleting bug report:', err);
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [adapter]
  );

  const createTaskList = useCallback(
    async (name: string): Promise<TaskList | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      try {
        const data = await adapter.createTaskList(trimmed);
        setTaskLists((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (err: any) {
        console.error('[DevNotes] Error creating task list:', err);
        return null;
      }
    },
    [adapter]
  );

  const addTaskType = useCallback(
    async (name: string): Promise<BugReportType | null> => {
      try {
        const data = await adapter.createTaskType(name);
        setBugReportTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (err: any) {
        console.error('[DevNotes] Error adding bug report type:', err);
        return null;
      }
    },
    [adapter]
  );

  const deleteTaskType = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await adapter.deleteTaskType(id);
        setBugReportTypes((prev) => prev.filter((type) => type.id !== id));
        return true;
      } catch (err: any) {
        console.error('[DevNotes] Error deleting bug report type:', err);
        return false;
      }
    },
    [adapter]
  );

  // Load data on mount
  useEffect(() => {
    loadTasks();
    loadTaskTypes();
    loadTaskLists();
    loadCollaborators();
    refreshCapabilities();
    refreshAppLinkStatus();
  }, [
    loadTasks,
    loadTaskTypes,
    loadTaskLists,
    loadCollaborators,
    refreshCapabilities,
    refreshAppLinkStatus,
  ]);

  const value: DevNotesContextValue = useMemo(
    () => ({
      isEnabled,
      setIsEnabled,
      showTasksAlways,
      setShowTasksAlways,
      hideResolvedClosed,
      setHideResolvedClosed,
      tasks: visibleTasks,
      bugReports: visibleTasks,
      taskTypes,
      bugReportTypes: taskTypes,
      taskLists,
      userProfiles,
      unreadCounts,
      currentPageTasks,
      currentPageBugReports: currentPageTasks,
      collaborators,
      loadTasks,
      loadBugReports: loadTasks,
      loadTaskTypes,
      loadBugReportTypes: loadTaskTypes,
      loadTaskLists,
      createTask,
      createBugReport: createTask,
      updateTask,
      updateBugReport: updateTask,
      deleteTask,
      deleteBugReport: deleteTask,
      createTaskList,
      addTaskType,
      addBugReportType: addTaskType,
      deleteTaskType,
      deleteBugReportType: deleteTaskType,
      loadUnreadCounts,
      markMessagesAsRead,
      user,
      adapter,
      capabilities,
      appLinkStatus,
      refreshCapabilities,
      refreshAppLinkStatus,
      onNotify,
      aiProvider,
      requireAi,
      role,
      loading,
      error,
      dotContainer,
      compensate,
      showBugsAlways: showTasksAlways,
      setShowBugsAlways: setShowTasksAlways,
    }),
    [
      isEnabled,
      setIsEnabled,
      showTasksAlways,
      setShowTasksAlways,
      hideResolvedClosed,
      setHideResolvedClosed,
      visibleTasks,
      taskTypes,
      taskLists,
      userProfiles,
      unreadCounts,
      currentPageTasks,
      collaborators,
      loadTasks,
      loadTaskTypes,
      loadTaskLists,
      createTask,
      updateTask,
      deleteTask,
      createTaskList,
      addTaskType,
      deleteTaskType,
      loadUnreadCounts,
      markMessagesAsRead,
      user,
      adapter,
      capabilities,
      appLinkStatus,
      refreshCapabilities,
      refreshAppLinkStatus,
      onNotify,
      aiProvider,
      requireAi,
      role,
      loading,
      error,
      dotContainer,
      compensate,
    ]
  );

  return <DevNotesContext.Provider value={value}>{children}</DevNotesContext.Provider>;
}

const defaultContextValue: DevNotesContextValue = {
  isEnabled: false,
  setIsEnabled: () => {},
  showTasksAlways: false,
  setShowTasksAlways: () => {},
  showBugsAlways: false,
  setShowBugsAlways: () => {},
  hideResolvedClosed: true,
  setHideResolvedClosed: () => {},
  tasks: [],
  bugReports: [],
  taskTypes: [],
  bugReportTypes: [],
  taskLists: [],
  userProfiles: {},
  unreadCounts: {},
  currentPageTasks: [],
  currentPageBugReports: [],
  collaborators: [],
  loadTasks: async () => {},
  loadBugReports: async () => {},
  loadTaskTypes: async () => {},
  loadBugReportTypes: async () => {},
  loadTaskLists: async () => {},
  createTask: async () => null,
  createBugReport: async () => null,
  updateTask: async () => null,
  updateBugReport: async () => null,
  deleteTask: async () => false,
  deleteBugReport: async () => false,
  createTaskList: async () => null,
  addTaskType: async () => null,
  addBugReportType: async () => null,
  deleteTaskType: async () => false,
  deleteBugReportType: async () => false,
  loadUnreadCounts: async () => {},
  markMessagesAsRead: async () => {},
  user: { id: '', email: '' },
  adapter: null as any,
  capabilities: { ai: false, appLink: true },
  appLinkStatus: null,
  refreshCapabilities: async () => {},
  refreshAppLinkStatus: async () => {},
  aiProvider: undefined,
  requireAi: false,
  role: 'none',
  loading: false,
  error: null,
  dotContainer: null,
  compensate: (vx: number, vy: number) => ({ x: vx, y: vy }),
};

export function useDevNotes() {
  const context = useContext(DevNotesContext);
  return context || defaultContextValue;
}

export default DevNotesContext;
