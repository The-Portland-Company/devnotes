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
  ForgeStatus,
  ForgeError,
  UserStoryDraft,
  UserStoryCreateResult,
  UserStoryStepDot,
} from './types';
import { useDevNotesContainer } from './hooks/useContainerOffset';
import {
  startStoryRecording,
  type RecordedStep,
  type RecorderHandle,
} from './internal/storyRecorder';
import { USER_STORY_TYPE_NAME } from './internal/core-types';

type DevNotesContextValue = {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  showTasksAlways: boolean;
  setShowTasksAlways: (show: boolean) => void;
  hideResolvedClosed: boolean;
  setHideResolvedClosed: (hide: boolean) => void;
  showStepDots: boolean;
  setShowStepDots: (show: boolean) => void;
  // ----- User Stories (Test Cases) -----
  canRecordUserStory: boolean;
  isRecordingStory: boolean;
  recordedSteps: RecordedStep[];
  savingStory: boolean;
  storyError: string | null;
  startUserStoryRecording: () => void;
  stopUserStoryRecording: () => void;
  cancelUserStoryRecording: () => void;
  updateRecordedStep: (id: string, body: string) => void;
  deleteRecordedStep: (id: string) => void;
  moveRecordedStep: (id: string, direction: 'up' | 'down') => void;
  saveUserStory: (input: {
    title: string;
    description_md?: string | null;
    test_url?: string | null;
  }) => Promise<boolean>;
  userStoryStepDots: UserStoryStepDot[];
  currentPageStepDots: UserStoryStepDot[];
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
  /** Latest Forge connectivity status from the backend (null until first probe). */
  forgeStatus: ForgeStatus | null;
  /** Convenience accessor: the structured Forge error when disconnected, else null. */
  forgeError: ForgeError | null;
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
  const onCreateUserStory = config?.onCreateUserStory;
  const fetchUserStories = config?.fetchUserStories;
  const canRecordUserStory = Boolean(onCreateUserStory);

  const SHOW_BUGS_ALWAYS_KEY = `${storagePrefix}_show_bugs_always`;
  const HIDE_RESOLVED_CLOSED_KEY = `${storagePrefix}_hide_resolved_closed`;
  const SHOW_STEP_DOTS_KEY = `${storagePrefix}_show_step_dots`;
  const STORY_DOTS_KEY = `${storagePrefix}_user_story_dots`;

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
  const [showStepDots, setShowStepDotsState] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_STEP_DOTS_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [isRecordingStory, setIsRecordingStory] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<RecordedStep[]>([]);
  const [savingStory, setSavingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [userStoryStepDots, setUserStoryStepDots] = useState<UserStoryStepDot[]>([]);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const ensuredStoryTypeRef = useRef(false);
  const [tasks, setBugReports] = useState<BugReport[]>([]);
  const [taskTypes, setBugReportTypes] = useState<BugReportType[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, BugReportCreator>>({});
  const userProfilesRef = useRef<Record<string, BugReportCreator>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [collaborators, setCollaborators] = useState<BugReportCreator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgeStatus, setForgeStatus] = useState<ForgeStatus | null>(null);
  const loadingRef = useRef(false);
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

  const setShowStepDots = useCallback(
    (show: boolean) => {
      setShowStepDotsState(show);
      try {
        localStorage.setItem(SHOW_STEP_DOTS_KEY, String(show));
      } catch {}
    },
    [SHOW_STEP_DOTS_KEY]
  );

  // ----- User Story recording -----

  const persistStepDots = useCallback(
    (dots: UserStoryStepDot[]) => {
      try {
        localStorage.setItem(STORY_DOTS_KEY, JSON.stringify(dots));
      } catch {}
    },
    [STORY_DOTS_KEY]
  );

  const startUserStoryRecording = useCallback(() => {
    if (!canRecordUserStory) return;
    setStoryError(null);
    setRecordedSteps([]);
    recorderRef.current?.stop();
    recorderRef.current = startStoryRecording((step) => {
      setRecordedSteps((prev) => [...prev, step]);
    });
    setIsRecordingStory(true);
  }, [canRecordUserStory]);

  const stopUserStoryRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecordingStory(false);
  }, []);

  const cancelUserStoryRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecordingStory(false);
    setRecordedSteps([]);
    setStoryError(null);
  }, []);

  const updateRecordedStep = useCallback((id: string, body: string) => {
    setRecordedSteps((prev) => prev.map((s) => (s.id === id ? { ...s, body } : s)));
  }, []);

  const deleteRecordedStep = useCallback((id: string) => {
    setRecordedSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveRecordedStep = useCallback((id: string, direction: 'up' | 'down') => {
    setRecordedSteps((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const saveUserStory = useCallback(
    async (input: {
      title: string;
      description_md?: string | null;
      test_url?: string | null;
    }): Promise<boolean> => {
      if (!onCreateUserStory) {
        setStoryError('Saving user stories is not configured for this app.');
        return false;
      }
      const title = input.title.trim();
      if (!title) {
        setStoryError('Add a title before saving.');
        return false;
      }
      if (recordedSteps.length === 0) {
        setStoryError('Record at least one step before saving.');
        return false;
      }

      setSavingStory(true);
      setStoryError(null);
      const draft: UserStoryDraft = {
        title,
        description_md: input.description_md?.trim() || null,
        test_url: input.test_url?.trim() || null,
        steps: recordedSteps.map((s) => ({
          body: s.body,
          url: s.page_url || null,
          page_url: s.page_url || null,
          x_position: s.x,
          y_position: s.y,
          target_selector: s.selector,
        })),
      };

      let result: UserStoryCreateResult;
      try {
        result = await onCreateUserStory(draft);
      } catch (err: any) {
        setSavingStory(false);
        setStoryError(err?.message || 'Failed to save the user story.');
        return false;
      }
      setSavingStory(false);

      if (result?.error) {
        setStoryError(result.error);
        return false;
      }

      // Persist positioned step dots locally so they render immediately and
      // survive a reload, even when no fetchUserStories is configured.
      const slug = result?.slug || title;
      const newDots: UserStoryStepDot[] = recordedSteps.map((s, i) => ({
        id: `${slug}:${s.id}`,
        storySlug: slug,
        storyTitle: title,
        index: i + 1,
        body: s.body,
        page_url: s.page_url || null,
        x_position: s.x,
        y_position: s.y,
        target_selector: s.selector,
      }));
      setUserStoryStepDots((prev) => {
        const merged = [...prev.filter((d) => d.storySlug !== slug), ...newDots];
        persistStepDots(merged);
        return merged;
      });

      setRecordedSteps([]);
      setIsRecordingStory(false);
      recorderRef.current?.stop();
      recorderRef.current = null;
      return true;
    },
    [onCreateUserStory, recordedSteps, persistStepDots]
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

  const currentPageStepDots = useMemo(() => {
    const toPath = (url: string | null) =>
      (url || '').split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
    const currentPath = toPath(currentRoutePath);
    return userStoryStepDots.filter(
      (dot) =>
        dot.x_position != null &&
        dot.y_position != null &&
        toPath(dot.page_url) === currentPath
    );
  }, [userStoryStepDots, currentRoutePath]);

  // Load persisted step dots on mount, then hydrate from the host if available.
  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(STORY_DOTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setUserStoryStepDots(parsed as UserStoryStepDot[]);
      }
    } catch {}

    if (fetchUserStories) {
      fetchUserStories()
        .then((stories) => {
          if (cancelled || !Array.isArray(stories)) return;
          const dots: UserStoryStepDot[] = [];
          stories.forEach((story) => {
            (story.steps || []).forEach((step, i) => {
              dots.push({
                id: `${story.slug}:${step.id ?? i}`,
                storySlug: story.slug,
                storyTitle: story.title,
                index: i + 1,
                body: step.body,
                page_url: step.page_url ?? null,
                x_position: step.x_position ?? null,
                y_position: step.y_position ?? null,
                target_selector: step.target_selector ?? null,
              });
            });
          });
          setUserStoryStepDots(dots);
          try {
            localStorage.setItem(STORY_DOTS_KEY, JSON.stringify(dots));
          } catch {}
        })
        .catch((err) => console.error('[DevNotes] Error loading user stories:', err));
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detach the recorder if the provider unmounts mid-recording.
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      recorderRef.current = null;
    };
  }, []);

  // Make sure the "User Stories (Test Cases)" type exists in the project once
  // recording is enabled, so it shows up as a first-class type in DevNotes.
  useEffect(() => {
    if (!canRecordUserStory || ensuredStoryTypeRef.current) return;
    if (taskTypes.length === 0) return; // wait for the initial type load
    const exists = taskTypes.some(
      (t) => t.name.trim().toLowerCase() === USER_STORY_TYPE_NAME.toLowerCase()
    );
    ensuredStoryTypeRef.current = true;
    if (!exists) {
      adapter
        .createTaskType(USER_STORY_TYPE_NAME)
        .then((created) => setBugReportTypes((prev) => [...prev, created]))
        .catch((err) =>
          console.error('[DevNotes] Failed to ensure user story type:', err)
        );
    }
  }, [canRecordUserStory, taskTypes, adapter]);

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
    // Guard against overlapping loads (focus + interval + manual can race).
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await adapter.fetchTasks();
      setBugReports(data);
      // Reflect the connectivity reported on this successful response.
      setForgeStatus(adapter.getForgeStatus());
      await Promise.all([loadProfilesForReports(data), loadUnreadCounts()]);
    } catch (err: any) {
      console.error('[DevNotes] Error loading bug reports:', err);
      setError(err.message);
      // A tasks failure carries the structured Forge status — surface it so the
      // banner shows even if capabilities hasn't been probed yet.
      setForgeStatus(err?.forge ?? adapter.getForgeStatus());
    } finally {
      loadingRef.current = false;
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
    } finally {
      // The capabilities GET always returns 200 and carries `forge`; use it as
      // the connectivity probe even when the task list hasn't been loaded.
      setForgeStatus(adapter.getForgeStatus());
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
        // Only the id is essential to consider the task created — page_url and
        // created_by can legitimately be empty (e.g. tasks created from the All
        // Tasks modal with no page anchor), so requiring them silently dropped
        // valid creations.
        if (!data || !data.id) {
          throw new Error('Task creation returned an invalid response.');
        }
        // Backend now only returns 2xx on real Forge persistence. Add optimistically
        // for instant feedback, then reconcile against Forge so the list/count can
        // never silently diverge from the source of truth.
        setBugReports((prev) => [data, ...prev]);
        setForgeStatus(adapter.getForgeStatus());
        await loadProfilesForReports([data]);
        void loadTasks();
        return data;
      } catch (err: any) {
        console.error('[DevNotes] Error creating bug report:', err);
        setError(err.message);
        setForgeStatus(err?.forge ?? adapter.getForgeStatus());
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter, loadProfilesForReports, loadTasks]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<BugReport>): Promise<BugReport | null> => {
      setLoading(true);
      setError(null);

      try {
        const data = await adapter.updateTask(id, updates);
        if (!data || !data.id) {
          throw new Error('Task update returned an invalid response.');
        }

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

  // Keep the task count and Forge connectivity fresh rather than a permanent
  // mount-time snapshot: refetch on window focus and on a low-frequency poll.
  // loadTasks() guards against overlapping loads; refreshCapabilities() is the
  // lightweight connectivity probe that drives the disconnected banner.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const refresh = () => {
      loadTasks();
      refreshCapabilities();
    };

    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(refresh, 60000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [loadTasks, refreshCapabilities]);

  const value: DevNotesContextValue = useMemo(
    () => ({
      isEnabled,
      setIsEnabled,
      showTasksAlways,
      setShowTasksAlways,
      hideResolvedClosed,
      setHideResolvedClosed,
      showStepDots,
      setShowStepDots,
      canRecordUserStory,
      isRecordingStory,
      recordedSteps,
      savingStory,
      storyError,
      startUserStoryRecording,
      stopUserStoryRecording,
      cancelUserStoryRecording,
      updateRecordedStep,
      deleteRecordedStep,
      moveRecordedStep,
      saveUserStory,
      userStoryStepDots,
      currentPageStepDots,
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
      forgeStatus,
      forgeError: forgeStatus?.connected === false ? forgeStatus.error : null,
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
      showStepDots,
      setShowStepDots,
      canRecordUserStory,
      isRecordingStory,
      recordedSteps,
      savingStory,
      storyError,
      startUserStoryRecording,
      stopUserStoryRecording,
      cancelUserStoryRecording,
      updateRecordedStep,
      deleteRecordedStep,
      moveRecordedStep,
      saveUserStory,
      userStoryStepDots,
      currentPageStepDots,
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
      forgeStatus,
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
  showStepDots: true,
  setShowStepDots: () => {},
  canRecordUserStory: false,
  isRecordingStory: false,
  recordedSteps: [],
  savingStory: false,
  storyError: null,
  startUserStoryRecording: () => {},
  stopUserStoryRecording: () => {},
  cancelUserStoryRecording: () => {},
  updateRecordedStep: () => {},
  deleteRecordedStep: () => {},
  moveRecordedStep: () => {},
  saveUserStory: async () => false,
  userStoryStepDots: [],
  currentPageStepDots: [],
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
  forgeStatus: null,
  forgeError: null,
  dotContainer: null,
  compensate: (vx: number, vy: number) => ({ x: vx, y: vy }),
};

export function useDevNotes() {
  const context = useContext(DevNotesContext);
  return context || defaultContextValue;
}

export default DevNotesContext;
