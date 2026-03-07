// src/DevNotesProvider.tsx
import {
  createContext,
  useContext,
  useState as useState2,
  useEffect as useEffect2,
  useCallback as useCallback2,
  useRef as useRef2,
  useMemo
} from "react";

// src/hooks/useContainerOffset.ts
import { useState, useEffect, useCallback, useRef } from "react";
var sharedContainer = null;
var refCount = 0;
function syncBodyStyles(el) {
  const bodyStyles = getComputedStyle(document.body);
  el.style.fontFamily = bodyStyles.fontFamily;
  el.style.color = bodyStyles.color;
  el.style.fontSize = bodyStyles.fontSize;
  el.style.lineHeight = bodyStyles.lineHeight;
}
function getOrCreateContainer() {
  if (sharedContainer) return sharedContainer;
  const el = document.createElement("div");
  el.setAttribute("data-devnotes-layer", "");
  el.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "width:100vw",
    "height:100vh",
    "pointer-events:none",
    "z-index:2147483646",
    "overflow:visible"
  ].join(";");
  syncBodyStyles(el);
  return el;
}
function useDevNotesContainer() {
  const [container, setContainer] = useState(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = getOrCreateContainer();
    if (!sharedContainer) {
      sharedContainer = el;
    }
    refCount++;
    document.documentElement.appendChild(el);
    setContainer(el);
    const rect = el.getBoundingClientRect();
    offsetRef.current = { x: rect.left, y: rect.top };
    let rafId2 = null;
    const recalc = () => {
      const r = el.getBoundingClientRect();
      offsetRef.current = { x: r.left, y: r.top };
      syncBodyStyles(el);
    };
    const scheduleRecalc = () => {
      if (rafId2 !== null) return;
      rafId2 = window.requestAnimationFrame(() => {
        rafId2 = null;
        recalc();
      });
    };
    const observer = new MutationObserver(scheduleRecalc);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
    window.addEventListener("resize", scheduleRecalc);
    window.addEventListener("scroll", scheduleRecalc, true);
    document.addEventListener("scroll", scheduleRecalc, true);
    window.visualViewport?.addEventListener("resize", scheduleRecalc);
    window.visualViewport?.addEventListener("scroll", scheduleRecalc);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleRecalc);
      window.removeEventListener("scroll", scheduleRecalc, true);
      document.removeEventListener("scroll", scheduleRecalc, true);
      window.visualViewport?.removeEventListener("resize", scheduleRecalc);
      window.visualViewport?.removeEventListener("scroll", scheduleRecalc);
      if (rafId2 !== null) {
        window.cancelAnimationFrame(rafId2);
        rafId2 = null;
      }
      refCount--;
      if (refCount <= 0) {
        el.parentNode?.removeChild(el);
        sharedContainer = null;
        refCount = 0;
      }
      setContainer(null);
    };
  }, []);
  const compensate = useCallback(
    (viewportX, viewportY) => {
      return {
        x: viewportX - offsetRef.current.x,
        y: viewportY - offsetRef.current.y
      };
    },
    []
  );
  return { container, compensate };
}

// src/DevNotesProvider.tsx
import { jsx } from "react/jsx-runtime";
var DevNotesContext = createContext(null);
function DevNotesProvider({ adapter, user, config, children }) {
  const { container: dotContainer, compensate } = useDevNotesContainer();
  const storagePrefix = config?.storagePrefix || "devnotes";
  const defaultGetPagePath = () => `${window.location.pathname}${window.location.search}`;
  const getPagePathRef = useRef2(config?.getPagePath || defaultGetPagePath);
  getPagePathRef.current = config?.getPagePath || defaultGetPagePath;
  const getPagePath = useCallback2(() => getPagePathRef.current(), []);
  const onNotify = config?.onNotify;
  const aiProvider = config?.disableAi ? void 0 : config?.aiProvider;
  const requireAi = Boolean(config?.requireAi && aiProvider);
  const role = config?.role ?? "admin";
  const SHOW_BUGS_ALWAYS_KEY = `${storagePrefix}_show_bugs_always`;
  const HIDE_RESOLVED_CLOSED_KEY = `${storagePrefix}_hide_resolved_closed`;
  const [isEnabled, setIsEnabled] = useState2(false);
  const [showBugsAlways, setShowBugsAlwaysState] = useState2(() => {
    try {
      return localStorage.getItem(SHOW_BUGS_ALWAYS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [hideResolvedClosed, setHideResolvedClosedState] = useState2(() => {
    try {
      const stored = localStorage.getItem(HIDE_RESOLVED_CLOSED_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [bugReports, setBugReports] = useState2([]);
  const [bugReportTypes, setBugReportTypes] = useState2([]);
  const [taskLists, setTaskLists] = useState2([]);
  const [userProfiles, setUserProfiles] = useState2({});
  const userProfilesRef = useRef2({});
  const [unreadCounts, setUnreadCounts] = useState2({});
  const [collaborators, setCollaborators] = useState2([]);
  const [loading, setLoading] = useState2(false);
  const [error, setError] = useState2(null);
  const [capabilities, setCapabilities] = useState2({
    ai: Boolean(aiProvider),
    appLink: true
  });
  const [appLinkStatus, setAppLinkStatus] = useState2(null);
  const [currentRoutePath, setCurrentRoutePath] = useState2(() => {
    try {
      return getPagePath();
    } catch {
      if (typeof window !== "undefined") return `${window.location.pathname}${window.location.search}`;
      return "/";
    }
  });
  const setShowBugsAlways = useCallback2(
    (show) => {
      setShowBugsAlwaysState(show);
      try {
        localStorage.setItem(SHOW_BUGS_ALWAYS_KEY, String(show));
      } catch {
      }
    },
    [SHOW_BUGS_ALWAYS_KEY]
  );
  const setHideResolvedClosed = useCallback2(
    (hide) => {
      setHideResolvedClosedState(hide);
      try {
        localStorage.setItem(HIDE_RESOLVED_CLOSED_KEY, String(hide));
      } catch {
      }
    },
    [HIDE_RESOLVED_CLOSED_KEY]
  );
  useEffect2(() => {
    if (typeof window === "undefined") return void 0;
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
    const patchedPushState = (...args) => {
      originalPushState.apply(window.history, args);
      updateRoutePath();
    };
    const patchedReplaceState = (...args) => {
      originalReplaceState.apply(window.history, args);
      updateRoutePath();
    };
    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;
    window.addEventListener("popstate", updateRoutePath);
    window.addEventListener("hashchange", updateRoutePath);
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", updateRoutePath);
      window.removeEventListener("hashchange", updateRoutePath);
    };
  }, [getPagePath]);
  const visibleBugReports = useMemo(() => {
    if (role === "reporter") {
      return bugReports.filter((report) => report.created_by === user.id);
    }
    return bugReports;
  }, [bugReports, role, user.id]);
  const currentPageBugReports = useMemo(() => {
    const toPath = (url) => url.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
    const currentPath = toPath(currentRoutePath);
    return visibleBugReports.filter((report) => toPath(report.page_url) === currentPath);
  }, [visibleBugReports, currentRoutePath]);
  useEffect2(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);
  const loadProfilesForReports = useCallback2(
    async (reports) => {
      if (!reports.length) return;
      const profileIds = /* @__PURE__ */ new Set();
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
      } catch (err) {
        console.error("[DevNotes] Error loading profiles:", err);
      }
    },
    [adapter]
  );
  const loadUnreadCounts = useCallback2(async () => {
    try {
      const counts = await adapter.fetchUnreadCounts();
      setUnreadCounts(counts);
    } catch (err) {
      console.error("[DevNotes] Error loading unread counts:", err);
    }
  }, [adapter]);
  const markMessagesAsRead = useCallback2(
    async (reportId, messageIds) => {
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
      } catch (err) {
        console.error("[DevNotes] Error marking messages as read:", err);
      }
    },
    [adapter]
  );
  const loadBugReports = useCallback2(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adapter.fetchBugReports();
      setBugReports(data);
      await Promise.all([loadProfilesForReports(data), loadUnreadCounts()]);
    } catch (err) {
      console.error("[DevNotes] Error loading bug reports:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adapter, loadProfilesForReports, loadUnreadCounts]);
  const loadBugReportTypes = useCallback2(async () => {
    try {
      const data = await adapter.fetchBugReportTypes();
      setBugReportTypes(data);
    } catch (err) {
      console.error("[DevNotes] Error loading bug report types:", err);
    }
  }, [adapter]);
  const loadTaskLists = useCallback2(async () => {
    try {
      const data = await adapter.fetchTaskLists();
      setTaskLists(data);
    } catch (err) {
      console.error("[DevNotes] Error loading task lists:", err);
    }
  }, [adapter]);
  const loadCollaborators = useCallback2(async () => {
    try {
      const data = await adapter.fetchCollaborators();
      setCollaborators(data);
    } catch (err) {
      console.error("[DevNotes] Error loading collaborators:", err);
    }
  }, [adapter]);
  const refreshCapabilities = useCallback2(async () => {
    try {
      const data = await adapter.fetchCapabilities();
      setCapabilities(data);
    } catch (err) {
      console.error("[DevNotes] Error loading capabilities:", err);
    }
  }, [adapter]);
  const refreshAppLinkStatus = useCallback2(async () => {
    try {
      const data = await adapter.getAppLinkStatus();
      setAppLinkStatus(data);
    } catch (err) {
      console.error("[DevNotes] Error loading app link status:", err);
      setAppLinkStatus(null);
    }
  }, [adapter]);
  const createBugReport = useCallback2(
    async (report) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adapter.createBugReport(report);
        setBugReports((prev) => [data, ...prev]);
        await loadProfilesForReports([data]);
        return data;
      } catch (err) {
        console.error("[DevNotes] Error creating bug report:", err);
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter, loadProfilesForReports]
  );
  const updateBugReport = useCallback2(
    async (id, updates) => {
      setLoading(true);
      setError(null);
      try {
        const data = await adapter.updateBugReport(id, updates);
        setBugReports(
          (prev) => prev.map(
            (report) => report.id === id ? { ...report, ...data, creator: report.creator || data.creator } : report
          )
        );
        await loadProfilesForReports([data]);
        if (updates.status === "Closed" && onNotify) {
          const originalReport = bugReports.find((r) => r.id === id);
          const authorEmail = originalReport?.creator?.email;
          const authorName = originalReport?.creator?.full_name || "there";
          const reportTitle = originalReport?.title || data.title || "Untitled";
          const closerName = userProfilesRef.current[user.id]?.full_name || "A team member";
          if (authorEmail && originalReport?.created_by !== user.id) {
            onNotify({
              type: "bug_closed",
              recipientEmail: authorEmail,
              subject: `Dev Note Closed: ${reportTitle}`,
              textBody: `Hi ${authorName},

Your dev note "${reportTitle}" has been closed by ${closerName}.

Thank you,
Dev Notes`,
              htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">Dev Note Closed</h2>
  <p>Hi ${authorName},</p>
  <p>Your dev note <strong>"${reportTitle}"</strong> has been closed by <strong>${closerName}</strong>.</p>
  <p>Thank you,<br>Dev Notes</p>
</div>`
            });
          }
        }
        return data;
      } catch (err) {
        console.error("[DevNotes] Error updating bug report:", err);
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [adapter, loadProfilesForReports, bugReports, user.id, onNotify]
  );
  const deleteBugReport = useCallback2(
    async (id) => {
      setLoading(true);
      setError(null);
      try {
        await adapter.deleteBugReport(id);
        setBugReports((prev) => prev.filter((report) => report.id !== id));
        return true;
      } catch (err) {
        console.error("[DevNotes] Error deleting bug report:", err);
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [adapter]
  );
  const createTaskList = useCallback2(
    async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      try {
        const data = await adapter.createTaskList(trimmed);
        setTaskLists((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (err) {
        console.error("[DevNotes] Error creating task list:", err);
        return null;
      }
    },
    [adapter]
  );
  const addBugReportType = useCallback2(
    async (name) => {
      try {
        const data = await adapter.createBugReportType(name);
        setBugReportTypes((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      } catch (err) {
        console.error("[DevNotes] Error adding bug report type:", err);
        return null;
      }
    },
    [adapter]
  );
  const deleteBugReportType = useCallback2(
    async (id) => {
      try {
        await adapter.deleteBugReportType(id);
        setBugReportTypes((prev) => prev.filter((type) => type.id !== id));
        return true;
      } catch (err) {
        console.error("[DevNotes] Error deleting bug report type:", err);
        return false;
      }
    },
    [adapter]
  );
  useEffect2(() => {
    loadBugReports();
    loadBugReportTypes();
    loadTaskLists();
    loadCollaborators();
    refreshCapabilities();
    refreshAppLinkStatus();
  }, [
    loadBugReports,
    loadBugReportTypes,
    loadTaskLists,
    loadCollaborators,
    refreshCapabilities,
    refreshAppLinkStatus
  ]);
  const value = useMemo(
    () => ({
      isEnabled,
      setIsEnabled,
      showBugsAlways,
      setShowBugsAlways,
      hideResolvedClosed,
      setHideResolvedClosed,
      bugReports: visibleBugReports,
      bugReportTypes,
      taskLists,
      userProfiles,
      unreadCounts,
      currentPageBugReports,
      collaborators,
      loadBugReports,
      loadBugReportTypes,
      loadTaskLists,
      createBugReport,
      updateBugReport,
      deleteBugReport,
      createTaskList,
      addBugReportType,
      deleteBugReportType,
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
      compensate
    }),
    [
      isEnabled,
      setIsEnabled,
      showBugsAlways,
      setShowBugsAlways,
      hideResolvedClosed,
      setHideResolvedClosed,
      visibleBugReports,
      bugReportTypes,
      taskLists,
      userProfiles,
      unreadCounts,
      currentPageBugReports,
      collaborators,
      loadBugReports,
      loadBugReportTypes,
      loadTaskLists,
      createBugReport,
      updateBugReport,
      deleteBugReport,
      createTaskList,
      addBugReportType,
      deleteBugReportType,
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
      compensate
    ]
  );
  return /* @__PURE__ */ jsx(DevNotesContext.Provider, { value, children });
}
var defaultContextValue = {
  isEnabled: false,
  setIsEnabled: () => {
  },
  showBugsAlways: false,
  setShowBugsAlways: () => {
  },
  hideResolvedClosed: true,
  setHideResolvedClosed: () => {
  },
  bugReports: [],
  bugReportTypes: [],
  taskLists: [],
  userProfiles: {},
  unreadCounts: {},
  currentPageBugReports: [],
  collaborators: [],
  loadBugReports: async () => {
  },
  loadBugReportTypes: async () => {
  },
  loadTaskLists: async () => {
  },
  createBugReport: async () => null,
  updateBugReport: async () => null,
  deleteBugReport: async () => false,
  createTaskList: async () => null,
  addBugReportType: async () => null,
  deleteBugReportType: async () => false,
  loadUnreadCounts: async () => {
  },
  markMessagesAsRead: async () => {
  },
  user: { id: "", email: "" },
  adapter: null,
  capabilities: { ai: false, appLink: true },
  appLinkStatus: null,
  refreshCapabilities: async () => {
  },
  refreshAppLinkStatus: async () => {
  },
  aiProvider: void 0,
  requireAi: false,
  role: "none",
  loading: false,
  error: null,
  dotContainer: null,
  compensate: (vx, vy) => ({ x: vx, y: vy })
};
function useDevNotes() {
  const context = useContext(DevNotesContext);
  return context || defaultContextValue;
}

// src/DevNotesButton.tsx
import { useState as useState11 } from "react";
import { createPortal as createPortal2 } from "react-dom";

// src/DevNotesMenu.tsx
import { useState as useState3, useEffect as useEffect3, useRef as useRef3 } from "react";
import {
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiList,
  FiSettings,
  FiToggleLeft,
  FiToggleRight
} from "react-icons/fi";
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position = "bottom-right", dropdownDirection = "down" }) {
  const {
    isEnabled,
    setIsEnabled,
    showBugsAlways,
    setShowBugsAlways,
    hideResolvedClosed,
    setHideResolvedClosed,
    bugReports,
    role
  } = useDevNotes();
  const [open, setOpen] = useState3(false);
  const menuRef = useRef3(null);
  useEffect3(() => {
    if (!open) return void 0;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const openBugCount = bugReports.filter(
    (r) => r.status === "Open" || r.status === "In Progress" || r.status === "Needs Review"
  ).length;
  if (role === "none") return null;
  const handleIconClick = (e) => {
    if (isEnabled) {
      e.preventDefault();
      e.stopPropagation();
      setIsEnabled(false);
      return;
    }
    setOpen((prev) => !prev);
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: menuRef,
      "data-bug-menu": true,
      className: "relative",
      style: { zIndex: isEnabled ? 9995 : "auto" },
      children: [
        /* @__PURE__ */ jsx2(
          "button",
          {
            type: "button",
            "aria-label": isEnabled ? "Click to disable bug reporting" : "Bug reporting menu",
            onClick: handleIconClick,
            className: "inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:text-emerald-600",
            title: "Bug reports",
            children: /* @__PURE__ */ jsxs("span", { className: "relative", children: [
              IconComponent ? /* @__PURE__ */ jsx2(IconComponent, { size: 20, color: isEnabled ? "#E53E3E" : void 0 }) : /* @__PURE__ */ jsx2(FiAlertTriangle, { size: 20, color: isEnabled ? "#E53E3E" : void 0 }),
              openBugCount > 0 && /* @__PURE__ */ jsx2("span", { className: "absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white", children: openBugCount })
            ] })
          }
        ),
        open && /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              position: "absolute",
              ...position?.includes("left") ? { left: 0 } : { right: 0 },
              ...dropdownDirection === "up" ? { bottom: "100%", marginBottom: 8 } : { top: "100%", marginTop: 8 },
              width: 320,
              zIndex: 50,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              paddingTop: 8,
              paddingBottom: 8,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)"
            },
            children: [
              /* @__PURE__ */ jsx2("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsx2("p", { className: "text-xs font-semibold text-gray-500", children: "DEV NOTES" }) }),
              /* @__PURE__ */ jsx2("div", { className: "my-1 border-t border-gray-200" }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "data-menu-item": true,
                  onClick: () => {
                    setIsEnabled(!isEnabled);
                    setOpen(false);
                  },
                  className: "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50",
                  children: [
                    /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 whitespace-nowrap", children: [
                      isEnabled ? /* @__PURE__ */ jsx2(FiToggleRight, { className: "text-green-600" }) : /* @__PURE__ */ jsx2(FiToggleLeft, {}),
                      isEnabled ? "Stop Reporting" : "Report Bug / Request Feature"
                    ] }),
                    /* @__PURE__ */ jsx2(
                      "span",
                      {
                        role: "switch",
                        "aria-checked": isEnabled,
                        className: `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isEnabled ? "bg-green-500" : "bg-gray-300"}`,
                        children: /* @__PURE__ */ jsx2(
                          "span",
                          {
                            className: `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? "translate-x-4" : "translate-x-0.5"} mt-0.5`
                          }
                        )
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "data-menu-item": true,
                  onClick: () => setShowBugsAlways(!showBugsAlways),
                  className: "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50",
                  children: [
                    /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 whitespace-nowrap", children: [
                      showBugsAlways ? /* @__PURE__ */ jsx2(FiEye, { className: "text-blue-600" }) : /* @__PURE__ */ jsx2(FiEyeOff, {}),
                      "Show Bugs Always"
                    ] }),
                    /* @__PURE__ */ jsx2(
                      "span",
                      {
                        role: "switch",
                        "aria-checked": showBugsAlways,
                        className: `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${showBugsAlways ? "bg-green-500" : "bg-gray-300"}`,
                        children: /* @__PURE__ */ jsx2(
                          "span",
                          {
                            className: `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showBugsAlways ? "translate-x-4" : "translate-x-0.5"} mt-0.5`
                          }
                        )
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "data-menu-item": true,
                  onClick: () => setHideResolvedClosed(!hideResolvedClosed),
                  className: "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50",
                  children: [
                    /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 whitespace-nowrap", children: [
                      /* @__PURE__ */ jsx2(
                        FiFilter,
                        {
                          className: hideResolvedClosed ? "text-green-600" : "text-gray-500"
                        }
                      ),
                      "Hide Resolved/Closed"
                    ] }),
                    /* @__PURE__ */ jsx2(
                      "span",
                      {
                        role: "switch",
                        "aria-checked": hideResolvedClosed,
                        className: `relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${hideResolvedClosed ? "bg-green-500" : "bg-gray-300"}`,
                        children: /* @__PURE__ */ jsx2(
                          "span",
                          {
                            className: `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${hideResolvedClosed ? "translate-x-4" : "translate-x-0.5"} mt-0.5`
                          }
                        )
                      }
                    )
                  ]
                }
              ),
              (onViewTasks || onSettings) && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx2("div", { className: "my-1 border-t border-gray-200" }),
                onViewTasks && /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    "data-menu-item": true,
                    onClick: () => {
                      setOpen(false);
                      onViewTasks();
                    },
                    className: "flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50",
                    children: [
                      /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 whitespace-nowrap", children: [
                        /* @__PURE__ */ jsx2(FiList, { className: "flex-shrink-0" }),
                        "View Tasks"
                      ] }),
                      openBugCount > 0 && /* @__PURE__ */ jsx2("span", { className: "inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700", children: openBugCount })
                    ]
                  }
                ),
                onSettings && /* @__PURE__ */ jsx2(
                  "button",
                  {
                    type: "button",
                    "data-menu-item": true,
                    onClick: () => {
                      setOpen(false);
                      onSettings();
                    },
                    className: "flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50",
                    children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-2 whitespace-nowrap", children: [
                      /* @__PURE__ */ jsx2(FiSettings, { className: "flex-shrink-0" }),
                      "Settings"
                    ] })
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/DevNotesOverlay.tsx
import { useState as useState9, useCallback as useCallback7, useEffect as useEffect9, useRef as useRef8, useMemo as useMemo4 } from "react";
import { createPortal } from "react-dom";
import { FiCrosshair, FiMove as FiMove2 } from "react-icons/fi";

// src/DevNotesForm.tsx
import { useState as useState6, useEffect as useEffect6, useRef as useRef6, useMemo as useMemo3 } from "react";
import {
  FiX as FiX2,
  FiTrash2 as FiTrash22,
  FiCheck as FiCheck2,
  FiExternalLink,
  FiLink2,
  FiCopy,
  FiAlertCircle,
  FiLoader,
  FiEye as FiEye2,
  FiCheckCircle,
  FiArchive,
  FiZap as FiZap2
} from "react-icons/fi";

// src/DevNotesDiscussion.tsx
import { useState as useState4, useEffect as useEffect4, useCallback as useCallback3, useMemo as useMemo2, useRef as useRef4 } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var messageCache = /* @__PURE__ */ new Map();
var MESSAGE_CACHE_MAX = 50;
var getCachedMessages = (reportId) => {
  const cached = messageCache.get(reportId);
  if (!cached) return void 0;
  messageCache.delete(reportId);
  messageCache.set(reportId, cached);
  return cached;
};
var setCachedMessages = (reportId, messages) => {
  if (messageCache.has(reportId)) {
    messageCache.delete(reportId);
  }
  messageCache.set(reportId, messages);
  while (messageCache.size > MESSAGE_CACHE_MAX) {
    const oldestKey = messageCache.keys().next().value;
    if (!oldestKey) break;
    messageCache.delete(oldestKey);
  }
};
var detectActiveMention = (value, cursor) => {
  const slice = value.slice(0, cursor);
  const atIndex = slice.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0 && /\S/.test(slice.charAt(atIndex - 1))) {
    return null;
  }
  const query = slice.slice(atIndex + 1);
  if (query.includes(" ") || query.includes("\n") || query.includes("	")) {
    return null;
  }
  return { start: atIndex, end: cursor, query };
};
function DevNotesDiscussion({ report }) {
  const { user, adapter, markMessagesAsRead, userProfiles, collaborators, onNotify } = useDevNotes();
  const [messages, setMessages] = useState4([]);
  const [loadingMessages, setLoadingMessages] = useState4(true);
  const [sending, setSending] = useState4(false);
  const [newMessage, setNewMessage] = useState4("");
  const [editingMessageId, setEditingMessageId] = useState4(null);
  const [editDraft, setEditDraft] = useState4("");
  const [editLoading, setEditLoading] = useState4(false);
  const [deletingId, setDeletingId] = useState4(null);
  const textareaRef = useRef4(null);
  const [mentionRange, setMentionRange] = useState4(null);
  const [mentionQuery, setMentionQuery] = useState4("");
  const [mentionHighlight, setMentionHighlight] = useState4(0);
  const updateMentionTracking = useCallback3((value, cursor) => {
    const mention = detectActiveMention(value, cursor);
    if (mention) {
      setMentionRange({ start: mention.start, end: mention.end });
      setMentionQuery(mention.query.toLowerCase());
      setMentionHighlight(0);
    } else {
      setMentionRange(null);
      setMentionQuery("");
      setMentionHighlight(0);
    }
  }, []);
  const mentionCandidates = useMemo2(() => {
    const map = /* @__PURE__ */ new Map();
    collaborators.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    Object.entries(userProfiles).forEach(([id, profile]) => {
      if (!map.has(id)) {
        map.set(id, {
          id,
          full_name: profile.full_name || null,
          email: profile.email || null
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const aLabel = (a.full_name || a.email || "").toLowerCase();
      const bLabel = (b.full_name || b.email || "").toLowerCase();
      return aLabel.localeCompare(bLabel);
    });
  }, [collaborators, userProfiles]);
  const mentionOptions = useMemo2(() => {
    if (!mentionRange) return [];
    const query = mentionQuery.trim();
    if (!query) return mentionCandidates;
    return mentionCandidates.filter((c) => {
      const label = (c.full_name || c.email || "").toLowerCase();
      return label.includes(query);
    });
  }, [mentionCandidates, mentionQuery, mentionRange]);
  useEffect4(() => {
    if (!mentionRange) {
      setMentionHighlight(0);
      return;
    }
    setMentionHighlight((prev) => {
      if (mentionOptions.length === 0) return 0;
      return Math.min(prev, mentionOptions.length - 1);
    });
  }, [mentionOptions, mentionRange]);
  const insertMention = (collaborator) => {
    if (!mentionRange) return;
    const label = collaborator.full_name || collaborator.email || "User";
    const before = newMessage.slice(0, mentionRange.start);
    const after = newMessage.slice(mentionRange.end);
    const insertion = `@${label} `;
    const nextValue = `${before}${insertion}${after}`;
    setNewMessage(nextValue);
    setMentionRange(null);
    setMentionQuery("");
    setMentionHighlight(0);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPosition = before.length + insertion.length;
        textarea.focus();
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  };
  const loadMessages = useCallback3(
    async (reportId, { silent } = { silent: false }) => {
      if (!reportId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }
      if (!silent) {
        setLoadingMessages(true);
      }
      try {
        const data = await adapter.fetchMessages(reportId);
        setMessages(data);
        setCachedMessages(reportId, data);
      } catch (err) {
        console.error("[DevNotes] Failed to load messages", err);
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [adapter]
  );
  useEffect4(() => {
    if (!report?.id) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    const cached = getCachedMessages(report.id);
    if (cached) {
      setMessages(cached);
      setLoadingMessages(false);
      loadMessages(report.id, { silent: true });
    } else {
      loadMessages(report.id);
    }
  }, [report?.id, loadMessages]);
  useEffect4(() => {
    if (!report?.id || !messages.length) return;
    const unreadMessageIds = messages.filter((message) => message.author_id !== user?.id).map((message) => message.id);
    if (unreadMessageIds.length) {
      markMessagesAsRead(report.id, unreadMessageIds);
    }
  }, [messages, report?.id, user?.id, markMessagesAsRead]);
  const formatTimestamp = (value) => {
    const parsed = new Date(value);
    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };
  const directionBadge = (authorId) => {
    if (authorId === report.created_by) {
      return { label: "Reporter", className: "bg-purple-100 text-purple-800" };
    }
    return { label: "Team", className: "bg-blue-100 text-blue-800" };
  };
  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditDraft(message.body);
  };
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditDraft("");
  };
  const handleMentionCursorUpdate = useCallback3(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    updateMentionTracking(textarea.value, cursor);
  }, [updateMentionTracking]);
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    const cursor = e.target.selectionStart ?? value.length;
    updateMentionTracking(value, cursor);
  };
  const handleTextareaKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
      return;
    }
    if (mentionRange && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionHighlight((prev) => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionHighlight((prev) => prev - 1 < 0 ? mentionOptions.length - 1 : prev - 1);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionOptions[mentionHighlight]);
        return;
      }
    }
    if (mentionRange && e.key === "Escape") {
      e.preventDefault();
      setMentionRange(null);
      setMentionQuery("");
      setMentionHighlight(0);
    }
  };
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !report?.id || !user?.id) return;
    setSending(true);
    try {
      const data = await adapter.createMessage(report.id, newMessage.trim());
      setMessages((prev) => {
        const next = [...prev, data];
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      setNewMessage("");
      setMentionRange(null);
      setMentionQuery("");
      if (onNotify) {
        try {
          const commenterName = data.author?.full_name || "Someone";
          const reportTitle = report.title || "Untitled";
          const snippet = data.body.length > 200 ? data.body.slice(0, 200) + "..." : data.body;
          const recipientEmails = /* @__PURE__ */ new Set();
          if (report.creator?.email && report.created_by !== user.id) {
            recipientEmails.add(report.creator.email);
          }
          const priorMessages = getCachedMessages(report.id) || [];
          for (const msg of priorMessages) {
            if (msg.author_id !== user.id && msg.author?.email) {
              recipientEmails.add(msg.author.email);
            }
          }
          for (const email of recipientEmails) {
            onNotify({
              type: "new_comment",
              recipientEmail: email,
              subject: `New comment on Dev Note: ${reportTitle}`,
              textBody: `Hi,

${commenterName} commented on the dev note "${reportTitle}":

"${snippet}"

Thank you,
Dev Notes`,
              htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">New Comment on Dev Note</h2>
  <p><strong>${commenterName}</strong> commented on <strong>"${reportTitle}"</strong>:</p>
  <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; color: #555; margin: 16px 0;">${snippet}</blockquote>
  <p>Thank you,<br>Dev Notes</p>
</div>`
            });
          }
        } catch (notifyErr) {
          console.error("[DevNotes] Error building comment notifications:", notifyErr);
        }
      }
    } catch (err) {
      console.error("[DevNotes] Failed to add message", err);
    } finally {
      setSending(false);
    }
  };
  const handleUpdateMessage = async () => {
    if (!editingMessageId || !editDraft.trim() || !user?.id) return;
    setEditLoading(true);
    try {
      const data = await adapter.updateMessage(editingMessageId, editDraft.trim());
      setMessages((prev) => {
        const next = prev.map((msg) => msg.id === data.id ? data : msg);
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      cancelEditing();
    } catch (err) {
      console.error("[DevNotes] Failed to update message", err);
    } finally {
      setEditLoading(false);
    }
  };
  const handleDeleteMessage = async (messageId) => {
    if (!user?.id) return;
    const confirmed = window.confirm("Delete this note? This cannot be undone.");
    if (!confirmed) return;
    setDeletingId(messageId);
    try {
      await adapter.deleteMessage(messageId);
      setMessages((prev) => {
        const next = prev.filter((msg) => msg.id !== messageId);
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      if (editingMessageId === messageId) {
        cancelEditing();
      }
    } catch (err) {
      console.error("[DevNotes] Failed to delete message", err);
    } finally {
      setDeletingId(null);
    }
  };
  if (!report?.id) {
    return /* @__PURE__ */ jsx3("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-100 min-h-[250px]", children: /* @__PURE__ */ jsx3("p", { className: "text-sm text-gray-600", children: "Save this task first to start a conversation." }) });
  }
  const getInitials = (name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };
  return /* @__PURE__ */ jsxs2("div", { className: "flex flex-col gap-4 bg-gray-50 rounded-lg border border-gray-100 p-4 h-full", children: [
    /* @__PURE__ */ jsx3("div", { children: /* @__PURE__ */ jsx3("p", { className: "text-sm font-semibold", children: "Comments" }) }),
    /* @__PURE__ */ jsx3("div", { className: "flex-1 min-h-[220px] max-h-[360px] overflow-y-auto pr-2", children: loadingMessages ? /* @__PURE__ */ jsx3("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ jsx3("div", { className: "w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" }) }) : messages.length === 0 ? /* @__PURE__ */ jsx3("div", { className: "flex items-center bg-white rounded-md border border-dashed border-gray-200 p-4", children: /* @__PURE__ */ jsx3("p", { className: "text-sm text-gray-500", children: "No notes yet. Start the conversation below." }) }) : /* @__PURE__ */ jsx3("div", { className: "flex flex-col gap-3", children: messages.map((message) => {
      const badge = directionBadge(message.author_id);
      const authorLabel = message.author?.full_name || message.author?.email || (message.author_id === report.created_by ? "Reporter" : "Team");
      const canManage = user?.id && message.author_id === user.id;
      const wasUpdated = message.updated_at && new Date(message.updated_at).toISOString() !== new Date(message.created_at).toISOString();
      return /* @__PURE__ */ jsxs2(
        "div",
        {
          className: "bg-white rounded-lg border border-gray-200 p-3",
          children: [
            /* @__PURE__ */ jsxs2("div", { className: "flex justify-between items-start mb-1", children: [
              /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx3("div", { className: "w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white flex-shrink-0", children: getInitials(authorLabel) }),
                /* @__PURE__ */ jsxs2("div", { children: [
                  /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-2", children: [
                    /* @__PURE__ */ jsx3("span", { className: "text-sm font-semibold", children: authorLabel }),
                    /* @__PURE__ */ jsx3("span", { className: `text-[0.65rem] px-1.5 py-0.5 rounded ${badge.className}`, children: badge.label })
                  ] }),
                  /* @__PURE__ */ jsxs2("p", { className: "text-xs text-gray-500", children: [
                    formatTimestamp(message.created_at),
                    wasUpdated && /* @__PURE__ */ jsxs2("span", { className: "text-gray-400", children: [
                      " ",
                      "\xB7 Updated ",
                      formatTimestamp(message.updated_at)
                    ] })
                  ] })
                ] })
              ] }),
              canManage && /* @__PURE__ */ jsxs2("div", { className: "flex items-center gap-1", children: [
                /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    className: "p-1 rounded hover:bg-gray-100 text-gray-500",
                    onClick: () => startEditing(message),
                    "aria-label": "Edit note",
                    children: /* @__PURE__ */ jsx3(FiEdit2, { size: 14 })
                  }
                ),
                /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    className: "p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50",
                    onClick: () => handleDeleteMessage(message.id),
                    disabled: deletingId === message.id,
                    "aria-label": "Delete note",
                    children: deletingId === message.id ? /* @__PURE__ */ jsx3("div", { className: "w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" }) : /* @__PURE__ */ jsx3(FiTrash2, { size: 14 })
                  }
                )
              ] })
            ] }),
            editingMessageId === message.id ? /* @__PURE__ */ jsxs2("div", { className: "flex flex-col gap-2 mt-2", children: [
              /* @__PURE__ */ jsx3(
                "textarea",
                {
                  value: editDraft,
                  onChange: (e) => setEditDraft(e.target.value),
                  rows: 4,
                  className: "w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                }
              ),
              /* @__PURE__ */ jsxs2("div", { className: "flex justify-end gap-2", children: [
                /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    className: "px-3 py-1 text-xs rounded hover:bg-gray-100",
                    onClick: cancelEditing,
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ jsx3(
                  "button",
                  {
                    type: "button",
                    className: "px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
                    onClick: handleUpdateMessage,
                    disabled: !editDraft.trim() || editLoading,
                    children: editLoading ? "Saving..." : "Save"
                  }
                )
              ] })
            ] }) : /* @__PURE__ */ jsx3("p", { className: "text-sm text-gray-700 whitespace-pre-wrap", children: message.body })
          ]
        },
        message.id
      );
    }) }) }),
    /* @__PURE__ */ jsxs2("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsxs2("div", { className: "relative", children: [
        /* @__PURE__ */ jsx3(
          "textarea",
          {
            ref: textareaRef,
            placeholder: "Add a reply or request more info...",
            value: newMessage,
            onChange: handleMessageChange,
            onKeyDown: handleTextareaKeyDown,
            onKeyUp: handleMentionCursorUpdate,
            onClick: handleMentionCursorUpdate,
            rows: 4,
            className: "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          }
        ),
        mentionRange && /* @__PURE__ */ jsx3("div", { className: "absolute bottom-3 left-3 bg-white border border-gray-200 rounded-md shadow-lg min-w-[220px] max-h-[200px] overflow-y-auto z-[2]", children: mentionOptions.length === 0 ? /* @__PURE__ */ jsx3("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsxs2("p", { className: "text-sm text-gray-500", children: [
          'No collaborators match "',
          mentionQuery,
          '"'
        ] }) }) : mentionOptions.map((collaborator, index) => /* @__PURE__ */ jsxs2(
          "div",
          {
            className: `px-3 py-2 cursor-pointer hover:bg-gray-100 ${mentionHighlight === index ? "bg-gray-100" : ""}`,
            onMouseDown: (e) => {
              e.preventDefault();
              insertMention(collaborator);
              setMentionHighlight(index);
            },
            children: [
              /* @__PURE__ */ jsx3("p", { className: "text-sm font-semibold", children: collaborator.full_name || collaborator.email || "Unknown" }),
              collaborator.email && collaborator.full_name && /* @__PURE__ */ jsx3("p", { className: "text-xs text-gray-500", children: collaborator.email })
            ]
          },
          collaborator.id
        )) })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsxs2("p", { className: "text-xs text-gray-500", children: [
          "Notes are visible to everyone with access to Dev Notes. Use",
          " ",
          /* @__PURE__ */ jsx3("span", { className: "font-bold", children: "@" }),
          " to mention a teammate."
        ] }),
        /* @__PURE__ */ jsx3(
          "button",
          {
            type: "button",
            className: "px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
            onClick: handleSendMessage,
            disabled: !newMessage.trim() || sending,
            children: sending ? "Sending..." : "Send"
          }
        )
      ] })
    ] })
  ] });
}

// src/AiDescriptionChat.tsx
import { useState as useState5, useEffect as useEffect5, useRef as useRef5, useCallback as useCallback4 } from "react";
import { FiCheck, FiEdit2 as FiEdit22, FiX, FiZap } from "react-icons/fi";
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function AiDescriptionChat({
  initialDescription,
  context,
  aiProvider,
  onAccept,
  onCancel
}) {
  const [conversationHistory, setConversationHistory] = useState5([]);
  const [userInput, setUserInput] = useState5("");
  const [isLoading, setIsLoading] = useState5(false);
  const [error, setError] = useState5(null);
  const [finalizedDescription, setFinalizedDescription] = useState5(null);
  const [isEditing, setIsEditing] = useState5(false);
  const [editDraft, setEditDraft] = useState5("");
  const scrollRef = useRef5(null);
  const textareaRef = useRef5(null);
  const scrollToBottom = useCallback4(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);
  useEffect5(() => {
    scrollToBottom();
  }, [conversationHistory, finalizedDescription, scrollToBottom]);
  const callAiAssist = useCallback4(
    async (history) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await aiProvider.refineDescription({
          description: initialDescription,
          conversationHistory: history,
          context
        });
        if (result.type === "error") {
          throw new Error(result.message);
        }
        if (result.type === "finalized") {
          setFinalizedDescription(result.description);
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: result.description }
          ]);
        } else if (result.type === "question") {
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: result.message }
          ]);
        }
      } catch (err) {
        console.error("[AiDescriptionChat] Error calling AI assist:", err);
        const message = err?.message || "Failed to get AI response. Please try again.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [initialDescription, context, aiProvider]
  );
  const [hasStarted, setHasStarted] = useState5(false);
  useEffect5(() => {
    if (initialDescription.trim() && !hasStarted) {
      setHasStarted(true);
      callAiAssist([]);
    }
  }, [initialDescription, hasStarted]);
  const handleSendReply = async () => {
    const trimmed = userInput.trim();
    if (!trimmed || isLoading) return;
    const newUserMessage = { role: "user", content: trimmed };
    const updatedHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(updatedHistory);
    setUserInput("");
    await callAiAssist(updatedHistory);
  };
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendReply();
    }
  };
  const handleForceFinalize = async () => {
    const forceMessage = {
      role: "user",
      content: "Please finalize the description now with whatever information you have."
    };
    const updatedHistory = [...conversationHistory, forceMessage];
    setConversationHistory(updatedHistory);
    await callAiAssist(updatedHistory);
  };
  const handleAccept = () => {
    if (isEditing && editDraft.trim()) {
      onAccept(editDraft.trim());
    } else if (finalizedDescription) {
      onAccept(finalizedDescription);
    }
  };
  const handleEdit = () => {
    setIsEditing(true);
    setEditDraft(finalizedDescription || "");
  };
  const handleRetry = async () => {
    setError(null);
    await callAiAssist(conversationHistory);
  };
  const assistantMessageCount = conversationHistory.filter((m) => m.role === "assistant").length;
  const showFinalizeButton = !finalizedDescription && assistantMessageCount >= 3;
  return /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-3 rounded-xl border-2 border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-4 min-h-[200px] shadow-[0_0_0_3px_rgba(167,139,250,0.1)]", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx4(FiZap, { size: 16, className: "text-purple-600" }),
        /* @__PURE__ */ jsx4("span", { className: "text-sm font-semibold text-purple-700", children: "AI Description Refinement" }),
        /* @__PURE__ */ jsx4("span", { className: "text-[0.65rem] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold", children: "GPT-4" })
      ] }),
      /* @__PURE__ */ jsxs3(
        "button",
        {
          type: "button",
          className: "inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600",
          onClick: onCancel,
          children: [
            /* @__PURE__ */ jsx4(FiX, { size: 12 }),
            "Close"
          ]
        }
      )
    ] }),
    !hasStarted && !initialDescription.trim() && /* @__PURE__ */ jsx4("div", { className: "flex-1 flex items-center justify-center min-h-[120px]", children: /* @__PURE__ */ jsxs3("div", { className: "text-center", children: [
      /* @__PURE__ */ jsx4(FiZap, { size: 28, className: "mx-auto mb-2 text-purple-300" }),
      /* @__PURE__ */ jsx4("p", { className: "text-sm text-gray-500", children: "Add a title above and AI will help build a full description" })
    ] }) }),
    hasStarted && /* @__PURE__ */ jsx4(
      "div",
      {
        ref: scrollRef,
        className: "flex-1 min-h-[200px] max-h-[350px] overflow-y-auto pr-1",
        children: /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-3", children: [
          /* @__PURE__ */ jsx4("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs3("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-3 max-w-[85%]", children: [
            /* @__PURE__ */ jsx4("p", { className: "text-xs text-purple-600 font-medium mb-1", children: "Your Description" }),
            /* @__PURE__ */ jsx4("p", { className: "text-sm whitespace-pre-wrap", children: initialDescription })
          ] }) }),
          conversationHistory.map((msg, idx) => {
            const isAssistant = msg.role === "assistant";
            const isFinalMessage = finalizedDescription && idx === conversationHistory.length - 1;
            if (isFinalMessage) return null;
            return /* @__PURE__ */ jsxs3(
              "div",
              {
                className: `flex ${isAssistant ? "justify-start" : "justify-end"}`,
                children: [
                  isAssistant && /* @__PURE__ */ jsx4("div", { className: "w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2 mt-1", children: "AI" }),
                  /* @__PURE__ */ jsxs3(
                    "div",
                    {
                      className: `border rounded-lg p-3 max-w-[85%] ${isAssistant ? "bg-white border-gray-200" : "bg-purple-50 border-purple-200"}`,
                      children: [
                        isAssistant && /* @__PURE__ */ jsx4("p", { className: "text-xs text-purple-600 font-medium mb-1", children: "AI Assistant" }),
                        /* @__PURE__ */ jsx4("p", { className: "text-sm whitespace-pre-wrap", children: msg.content })
                      ]
                    }
                  )
                ]
              },
              idx
            );
          }),
          isLoading && /* @__PURE__ */ jsxs3("div", { className: "flex justify-start", children: [
            /* @__PURE__ */ jsx4("div", { className: "w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2 mt-1", children: "AI" }),
            /* @__PURE__ */ jsx4("div", { className: "bg-white border border-gray-200 rounded-lg p-3", children: /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx4("div", { className: "w-4 h-4 border-2 border-purple-300 border-t-purple-500 rounded-full animate-spin" }),
              /* @__PURE__ */ jsx4("span", { className: "text-sm text-gray-500", children: "Analyzing..." })
            ] }) })
          ] }),
          error && !isLoading && (() => {
            const isConfigError = /edge function|fetch|network/i.test(error);
            return isConfigError ? /* @__PURE__ */ jsxs3("div", { className: "bg-gray-50 border border-gray-200 rounded-lg p-3", children: [
              /* @__PURE__ */ jsx4("p", { className: "text-sm text-gray-600 mb-2", children: "AI refinement is not available. Your description will be saved as-is." }),
              /* @__PURE__ */ jsx4(
                "button",
                {
                  type: "button",
                  className: "px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100",
                  onClick: onCancel,
                  children: "Dismiss"
                }
              )
            ] }) : /* @__PURE__ */ jsxs3("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3", children: [
              /* @__PURE__ */ jsx4("p", { className: "text-sm text-red-600 mb-2", children: error }),
              /* @__PURE__ */ jsx4(
                "button",
                {
                  type: "button",
                  className: "px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-100",
                  onClick: handleRetry,
                  children: "Retry"
                }
              )
            ] });
          })(),
          finalizedDescription && /* @__PURE__ */ jsxs3("div", { className: "bg-green-50 border-2 border-green-300 rounded-lg p-4", children: [
            /* @__PURE__ */ jsx4("div", { className: "flex justify-between items-center mb-2", children: /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx4("span", { className: "text-xs font-bold text-green-700", children: "AI-Refined Description" }),
              /* @__PURE__ */ jsx4("span", { className: "text-[0.6rem] px-1.5 py-0.5 rounded bg-green-100 text-green-800", children: "Ready" })
            ] }) }),
            isEditing ? /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-2", children: [
              /* @__PURE__ */ jsx4(
                "textarea",
                {
                  value: editDraft,
                  onChange: (e) => setEditDraft(e.target.value),
                  rows: 8,
                  className: "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                }
              ),
              /* @__PURE__ */ jsxs3("div", { className: "flex justify-end gap-2", children: [
                /* @__PURE__ */ jsx4(
                  "button",
                  {
                    type: "button",
                    className: "px-2 py-1 text-xs rounded hover:bg-gray-100",
                    onClick: () => setIsEditing(false),
                    children: "Cancel Edit"
                  }
                ),
                /* @__PURE__ */ jsxs3(
                  "button",
                  {
                    type: "button",
                    className: "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50",
                    onClick: handleAccept,
                    disabled: !editDraft.trim(),
                    children: [
                      /* @__PURE__ */ jsx4(FiCheck, { size: 14 }),
                      "Accept Edited"
                    ]
                  }
                )
              ] })
            ] }) : /* @__PURE__ */ jsxs3(Fragment2, { children: [
              /* @__PURE__ */ jsx4("p", { className: "text-sm whitespace-pre-wrap text-gray-800", children: finalizedDescription }),
              /* @__PURE__ */ jsxs3("div", { className: "flex justify-end gap-2 mt-3", children: [
                /* @__PURE__ */ jsxs3(
                  "button",
                  {
                    type: "button",
                    className: "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100",
                    onClick: handleEdit,
                    children: [
                      /* @__PURE__ */ jsx4(FiEdit22, { size: 14 }),
                      "Edit"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs3(
                  "button",
                  {
                    type: "button",
                    className: "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700",
                    onClick: handleAccept,
                    children: [
                      /* @__PURE__ */ jsx4(FiCheck, { size: 14 }),
                      "Accept"
                    ]
                  }
                )
              ] })
            ] })
          ] })
        ] })
      }
    ),
    hasStarted && !finalizedDescription && !isLoading && /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx4(
        "textarea",
        {
          ref: textareaRef,
          placeholder: "Answer the AI's questions...",
          value: userInput,
          onChange: (e) => setUserInput(e.target.value),
          onKeyDown: handleKeyDown,
          rows: 3,
          className: "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        }
      ),
      /* @__PURE__ */ jsxs3("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ jsx4("span", { className: "text-xs text-gray-500", children: "Ctrl/Cmd + Enter to send" }),
        /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-2", children: [
          showFinalizeButton && /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              className: "px-3 py-1.5 text-sm rounded border border-purple-300 text-purple-700 hover:bg-purple-50",
              onClick: handleForceFinalize,
              children: "Finalize Now"
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              className: "px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50",
              onClick: handleSendReply,
              disabled: !userInput.trim(),
              children: "Send"
            }
          )
        ] })
      ] })
    ] })
  ] });
}

// src/internal/bugAnchors.ts
var normalizePageUrl = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const [pathAndQuery] = trimmed.split("#");
  const [rawPath, queryString] = pathAndQuery.split("?");
  const withoutTrailing = rawPath.replace(/\/+$/, "") || "/";
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const normalizedQuery = params.toString();
    if (normalizedQuery) {
      return `${withoutTrailing}?${normalizedQuery}`;
    }
  }
  return withoutTrailing;
};
var ELEMENT_SELECTOR_MAX_DEPTH = 8;
var PREFERRED_ATTRIBUTES = ["data-bug-anchor", "data-testid", "data-id", "data-role", "aria-label"];
var cssEscape = typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape : (value) => value.replace(/([ #.;?+<>~*:()[\]\\])/g, "\\$1");
var clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
var isNumber = (value) => typeof value === "number" && !Number.isNaN(value);
var parseNumberish = (value) => {
  if (isNumber(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};
var shouldIgnoreClass = (className) => {
  return !className || className.startsWith("css-");
};
var buildSelectorSegment = (element) => {
  if (element.id) {
    return `#${cssEscape(element.id)}`;
  }
  for (const attr of PREFERRED_ATTRIBUTES) {
    const attrValue = element.getAttribute(attr);
    if (attrValue) {
      return `${element.tagName.toLowerCase()}[${attr}="${cssEscape(attrValue)}"]`;
    }
  }
  const stableClass = Array.from(element.classList).find(
    (className) => !shouldIgnoreClass(className)
  );
  const base = stableClass ? `${element.tagName.toLowerCase()}.${cssEscape(stableClass)}` : element.tagName.toLowerCase();
  if (!element.parentElement) {
    return base;
  }
  let index = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index += 1;
    }
    sibling = sibling.previousElementSibling;
  }
  return `${base}:nth-of-type(${index})`;
};
var buildElementSelector = (element) => {
  if (!element || typeof document === "undefined") {
    return null;
  }
  const segments = [];
  let current = element;
  let depth = 0;
  while (current && depth < ELEMENT_SELECTOR_MAX_DEPTH) {
    const segment = buildSelectorSegment(current);
    segments.unshift(segment);
    if (segment.startsWith("#") || segment.includes("[")) {
      break;
    }
    current = current.parentElement;
    depth += 1;
  }
  if (!segments.length) {
    return null;
  }
  return segments.join(" > ");
};
var disablePointerEvents = (elements) => {
  const restored = [];
  elements.forEach((element) => {
    if (!element) return;
    restored.push({ element, pointerEvents: element.style.pointerEvents });
    element.style.pointerEvents = "none";
  });
  return () => {
    restored.forEach(({ element, pointerEvents }) => {
      element.style.pointerEvents = pointerEvents;
    });
  };
};
var calculateBugPositionFromPoint = ({
  clientX,
  clientY,
  elementsToIgnore = []
}) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      x: clientX,
      y: clientY,
      targetSelector: null,
      targetRelativeX: null,
      targetRelativeY: null
    };
  }
  const restorePointerEvents = disablePointerEvents(elementsToIgnore);
  let target = document.elementFromPoint(clientX, clientY);
  restorePointerEvents();
  if (target && (target.hasAttribute("data-bug-dot") || target.closest("[data-bug-dot]"))) {
    target = target.closest("[data-bug-dot]");
  }
  let targetSelector = null;
  let targetRelativeX = null;
  let targetRelativeY = null;
  if (target && target !== document.documentElement && target !== document.body) {
    targetSelector = buildElementSelector(target);
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      targetRelativeX = clamp((clientX - rect.left) / rect.width);
      targetRelativeY = clamp((clientY - rect.top) / rect.height);
    }
  }
  return {
    x: clientX + window.scrollX,
    y: clientY + window.scrollY,
    targetSelector,
    targetRelativeX,
    targetRelativeY
  };
};
var resolveStoredCoordinates = (x, y) => {
  if (typeof window === "undefined") {
    return { x, y };
  }
  if (x <= 100 && y <= 100) {
    return {
      x: x / 100 * window.innerWidth,
      y: y / 100 * window.innerHeight
    };
  }
  return {
    x: x - window.scrollX,
    y: y - window.scrollY
  };
};
var isElementVisible = (element) => {
  if (element === document.body || element === document.documentElement) {
    return true;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  if (element.offsetParent === null && style.position !== "fixed") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }
  return true;
};
var resolveBugReportCoordinates = (report) => {
  if (typeof document !== "undefined") {
    const relativeX = parseNumberish(report.target_relative_x);
    const relativeY = parseNumberish(report.target_relative_y);
    if (report.target_selector && relativeX !== null && relativeY !== null) {
      let element = null;
      try {
        element = document.querySelector(report.target_selector);
      } catch {
      }
      if (element) {
        if (!isElementVisible(element)) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width * relativeX;
        const y = rect.top + rect.height * relativeY;
        return { x, y };
      }
    }
  }
  return resolveStoredCoordinates(report.x_position, report.y_position);
};

// src/internal/captureContext.ts
function deriveRouteLabelFromUrl(rawUrl) {
  const fallback = "Current Page";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://localhost";
    const parsed = new URL(rawUrl || "/", origin);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Home";
    const last = decodeURIComponent(parts[parts.length - 1]).replace(/[-_]+/g, " ").trim();
    if (!last) return fallback;
    return last.split(/\s+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  } catch {
    return fallback;
  }
}
function detectBrowserName(userAgent) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("firefox/")) return "Firefox";
  return "Unknown";
}
function buildCaptureContext(pageUrl) {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  const normalizedUrl = normalizePageUrl(pageUrl || window.location.pathname);
  let path = window.location.pathname;
  try {
    path = new URL(normalizedUrl, window.location.origin).pathname;
  } catch {
    path = normalizedUrl;
  }
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || null : null;
  return {
    captured_at: (/* @__PURE__ */ new Date()).toISOString(),
    route_label: deriveRouteLabelFromUrl(normalizedUrl),
    path,
    browser: {
      name: detectBrowserName(navigator.userAgent || ""),
      user_agent: navigator.userAgent || "unknown",
      platform: navigator.platform || null,
      language: navigator.language || null
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio || 1
    },
    timezone
  };
}

// src/internal/aiPayload.ts
function buildAiFixPayload(params) {
  return {
    source: params.source || "@the-portland-company/devnotes",
    copied_at: params.copiedAt || (/* @__PURE__ */ new Date()).toISOString(),
    report: {
      id: params.report.id ?? null,
      title: params.report.title ?? null,
      status: params.report.status,
      severity: params.report.severity,
      task_list_id: params.report.taskListId ?? null,
      types: params.report.types,
      type_names: params.report.typeNames,
      approved: params.report.approved,
      ai_ready: params.report.aiReady
    },
    narrative: {
      description: params.narrative.description ?? null,
      expected_behavior: params.narrative.expectedBehavior ?? null,
      actual_behavior: params.narrative.actualBehavior ?? null,
      ai_description: params.narrative.aiDescription ?? null,
      response: params.narrative.response ?? null
    },
    context: {
      page_url: params.context.pageUrl,
      route_label: params.context.routeLabel,
      x_position: params.context.xPosition,
      y_position: params.context.yPosition,
      target_selector: params.context.targetSelector ?? null,
      target_relative_x: params.context.targetRelativeX ?? null,
      target_relative_y: params.context.targetRelativeY ?? null,
      capture_context: params.context.captureContext ?? null
    },
    workflow: {
      assigned_to: params.workflow.assignedTo ?? null,
      resolved_by: params.workflow.resolvedBy ?? null,
      created_by: params.workflow.createdBy,
      created_at: params.workflow.createdAt ?? null,
      updated_at: params.workflow.updatedAt ?? null
    }
  };
}
var normalizeText = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};
var buildNarrativeFallback = (payload) => {
  const description = normalizeText(payload.narrative.description);
  const expectedBehavior = normalizeText(payload.narrative.expected_behavior);
  const actualBehavior = normalizeText(payload.narrative.actual_behavior);
  const sections = [];
  if (description) sections.push(`Description: ${description}`);
  if (expectedBehavior) sections.push(`Expected behavior: ${expectedBehavior}`);
  if (actualBehavior) sections.push(`Actual behavior: ${actualBehavior}`);
  return {
    description,
    expected_behavior: expectedBehavior,
    actual_behavior: actualBehavior,
    derived_scope: sections.length > 0 ? sections.join("\n") : null
  };
};
function formatAiFixPayloadForCopy(payload) {
  const refinedSpec = normalizeText(payload.narrative.ai_description);
  const narrative = buildNarrativeFallback(payload);
  const aiReadyWithRefinement = Boolean(payload.report.ai_ready && refinedSpec);
  const copyPayload = {
    agent_brief: {
      objective: "Implement and verify the fix for this issue in the current codebase.",
      scope_directive: aiReadyWithRefinement ? "AI_READY: Use ai_refinement.primary_spec as the source of truth. Use narrative as supporting context only." : "NO_AI_REFINEMENT: Derive scope from narrative.description, narrative.expected_behavior, and narrative.actual_behavior.",
      implementation_notes: [
        "Follow existing project patterns and UI conventions.",
        "If required detail is missing, inspect the referenced page/component before coding.",
        "Prefer a direct fix over broad refactors."
      ]
    },
    issue: {
      report_id: payload.report.id,
      title: payload.report.title,
      severity: payload.report.severity,
      status: payload.report.status,
      type_names: payload.report.type_names,
      location: {
        page_url: payload.context.page_url,
        route_label: payload.context.route_label,
        target_selector: payload.context.target_selector
      }
    },
    ai_refinement: {
      ai_ready: payload.report.ai_ready,
      primary_spec: aiReadyWithRefinement ? refinedSpec : null
    },
    narrative,
    diagnostic_context: payload.context.capture_context ? {
      browser: payload.context.capture_context.browser.name,
      viewport: payload.context.capture_context.viewport,
      timezone: payload.context.capture_context.timezone
    } : null
  };
  return [
    "AI_FIX_PAYLOAD",
    "Use this payload to scope and implement the fix.",
    "```json",
    JSON.stringify(copyPayload, null, 2),
    "```"
  ].join("\n");
}

// src/DevNotesForm.tsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var COMPACT_BEHAVIOR_HEIGHT = 56;
var EXPANDED_BEHAVIOR_MIN_HEIGHT = 92;
function SearchableSingleSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  isSuperscript = false
}) {
  const [searchTerm, setSearchTerm] = useState6("");
  const [showDropdown, setShowDropdown] = useState6(false);
  const selectedOption = useMemo3(
    () => options.find((option) => option.id === value) || null,
    [options, value]
  );
  const filteredOptions = useMemo3(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);
  const handleSelect = (optionId) => {
    onChange(optionId);
    setSearchTerm("");
    setShowDropdown(false);
  };
  return /* @__PURE__ */ jsxs4("div", { className: isSuperscript ? "relative" : "", children: [
    /* @__PURE__ */ jsx5(
      "label",
      {
        className: isSuperscript ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
        children: label
      }
    ),
    /* @__PURE__ */ jsxs4("div", { className: "relative", children: [
      /* @__PURE__ */ jsx5("div", { className: "border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center", children: /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-1", children: [
        selectedOption && /* @__PURE__ */ jsxs4("span", { className: "inline-flex items-center gap-1 rounded-sm bg-transparent px-1 py-0.5 text-xs font-medium text-gray-700", children: [
          selectedOption.label,
          /* @__PURE__ */ jsx5(
            "button",
            {
              type: "button",
              className: "ml-0.5 text-gray-400 hover:text-gray-700",
              onClick: () => {
                onChange(null);
                setSearchTerm("");
                setShowDropdown(false);
              },
              children: "\xD7"
            }
          )
        ] }),
        /* @__PURE__ */ jsx5(
          "input",
          {
            type: "text",
            className: "flex-1 min-w-[120px] border-none outline-none text-sm bg-transparent",
            placeholder: selectedOption ? "Type to search..." : placeholder,
            value: searchTerm,
            onChange: (e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            },
            onFocus: () => setShowDropdown(true),
            onBlur: () => setTimeout(() => setShowDropdown(false), 200),
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  handleSelect(filteredOptions[0].id);
                }
              }
            }
          }
        )
      ] }) }),
      showDropdown && /* @__PURE__ */ jsx5("div", { className: "absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[220px] overflow-y-auto z-20", children: filteredOptions.length > 0 ? filteredOptions.map((option) => /* @__PURE__ */ jsx5(
        "div",
        {
          className: `flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${option.id === value ? "bg-blue-50" : ""}`,
          onMouseDown: () => handleSelect(option.id),
          children: /* @__PURE__ */ jsx5("span", { className: "text-sm", children: option.label })
        },
        option.id
      )) : /* @__PURE__ */ jsx5("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsx5("span", { className: "text-sm text-gray-500", children: "No matches" }) }) })
    ] })
  ] });
}
function DevNotesForm({
  pageUrl,
  xPosition = 0,
  yPosition = 0,
  targetSelector = null,
  targetRelativeX = null,
  targetRelativeY = null,
  existingReport,
  onSave,
  onCancel,
  onDelete
}) {
  const {
    bugReportTypes,
    createBugReport,
    updateBugReport,
    addBugReportType,
    deleteBugReportType,
    taskLists,
    createTaskList,
    loading,
    userProfiles,
    collaborators,
    user,
    aiProvider,
    requireAi,
    error: bugReportingError,
    role
  } = useDevNotes();
  const isAdmin = role === "admin" || role === "contributor";
  const getFirstName = (value) => {
    if (!value) return "\u2014";
    const trimmed = value.trim();
    if (!trimmed) return "\u2014";
    if (trimmed.includes("@")) {
      const localPart = trimmed.split("@")[0];
      return localPart || "\u2014";
    }
    const firstToken = trimmed.split(/\s+/)[0];
    return firstToken || "\u2014";
  };
  const availableCollaborators = useMemo3(() => {
    const map = /* @__PURE__ */ new Map();
    collaborators.forEach((c) => {
      if (c.id) {
        map.set(c.id, {
          id: c.id,
          label: getFirstName(c.full_name || c.email)
        });
      }
    });
    Object.entries(userProfiles).forEach(([id, profile]) => {
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: getFirstName(profile.full_name || profile.email)
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [collaborators, userProfiles]);
  const [selectedTypes, setSelectedTypes] = useState6(existingReport?.types || []);
  useEffect6(() => {
    if (existingReport || selectedTypes.length > 0) return;
    const bugType = bugReportTypes.find((t) => t.name.toLowerCase() === "bug");
    if (bugType) {
      setSelectedTypes([bugType.id]);
    }
  }, [bugReportTypes, existingReport, selectedTypes.length]);
  const [severity, setSeverity] = useState6(
    existingReport?.severity || "Medium"
  );
  const [title, setTitle] = useState6(existingReport?.title || "");
  const [description, setDescription] = useState6(existingReport?.description || "");
  const [expectedBehavior, setExpectedBehavior] = useState6(
    existingReport?.expected_behavior || ""
  );
  const [actualBehavior, setActualBehavior] = useState6(existingReport?.actual_behavior || "");
  const [status, setStatus] = useState6(existingReport?.status || "Open");
  const [assignedTo, setAssignedTo] = useState6(existingReport?.assigned_to || null);
  const [resolvedBy, setResolvedBy] = useState6(existingReport?.resolved_by || null);
  const [approved, setApproved] = useState6(existingReport?.approved || false);
  const [aiReady, setAiReady] = useState6(existingReport?.ai_ready || false);
  const [aiDescription, setAiDescription] = useState6(
    existingReport?.ai_description || null
  );
  const [reportPageUrl, setReportPageUrl] = useState6(existingReport?.page_url || pageUrl);
  const defaultTaskListId = useMemo3(() => {
    const defaultList = taskLists.find((list) => list.is_default);
    return defaultList?.id || taskLists[0]?.id || "";
  }, [taskLists]);
  const [taskListId, setTaskListId] = useState6(existingReport?.task_list_id || defaultTaskListId);
  const [newTypeName, setNewTypeName] = useState6("");
  const [showTypeDropdown, setShowTypeDropdown] = useState6(false);
  const [pendingTypeName, setPendingTypeName] = useState6(null);
  const typeInputRef = useRef6(null);
  const [showCopied, setShowCopied] = useState6(false);
  const copyTimeoutRef = useRef6(null);
  const [showLinkCopied, setShowLinkCopied] = useState6(false);
  const linkCopyTimeoutRef = useRef6(null);
  const [showAiPayloadCopied, setShowAiPayloadCopied] = useState6(false);
  const aiPayloadCopyTimeoutRef = useRef6(null);
  const [taskListSearchTerm, setTaskListSearchTerm] = useState6("");
  const [showTaskListDropdown, setShowTaskListDropdown] = useState6(false);
  const [pendingTaskListName, setPendingTaskListName] = useState6(null);
  const taskListInputRef = useRef6(null);
  const descriptionRef = useRef6(null);
  const expectedBehaviorRef = useRef6(null);
  const actualBehaviorRef = useRef6(null);
  const [descriptionHeight, setDescriptionHeight] = useState6("120px");
  const [expectedBehaviorHeight, setExpectedBehaviorHeight] = useState6(
    `${expectedBehavior.trim() ? EXPANDED_BEHAVIOR_MIN_HEIGHT : COMPACT_BEHAVIOR_HEIGHT}px`
  );
  const [actualBehaviorHeight, setActualBehaviorHeight] = useState6(
    `${actualBehavior.trim() ? EXPANDED_BEHAVIOR_MIN_HEIGHT : COMPACT_BEHAVIOR_HEIGHT}px`
  );
  const [showAiChat, setShowAiChat] = useState6(false);
  const [submitAttempted, setSubmitAttempted] = useState6(false);
  const capturedContext = useMemo3(
    () => existingReport?.capture_context || buildCaptureContext(reportPageUrl),
    [existingReport?.capture_context, reportPageUrl]
  );
  const isSuperscriptLabels = Boolean(existingReport);
  const severityOptions = [
    { id: "Critical", label: "Critical" },
    { id: "High", label: "High" },
    { id: "Medium", label: "Medium" },
    { id: "Low", label: "Low" }
  ];
  const statusIcons = {
    Open: { icon: FiAlertCircle, colorClass: "bg-red-100 text-red-800" },
    "In Progress": { icon: FiLoader, colorClass: "bg-blue-100 text-blue-800" },
    "Needs Review": { icon: FiEye2, colorClass: "bg-purple-100 text-purple-800" },
    Resolved: { icon: FiCheckCircle, colorClass: "bg-green-100 text-green-800" },
    Closed: { icon: FiArchive, colorClass: "bg-gray-100 text-gray-800" }
  };
  const statusOptions = [
    { id: "Open", label: "Open" },
    { id: "In Progress", label: "In Progress" },
    { id: "Needs Review", label: "Needs Review" },
    { id: "Resolved", label: "Resolved" },
    { id: "Closed", label: "Closed" }
  ];
  const collaboratorOptions = useMemo3(
    () => availableCollaborators.map((c) => ({
      id: c.id,
      label: c.label
    })),
    [availableCollaborators]
  );
  const formatCreatedDate = (value) => {
    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return value;
    const monthMap = [
      "Jan.",
      "Feb.",
      "Mar.",
      "Apr.",
      "May",
      "Jun.",
      "Jul.",
      "Aug.",
      "Sep.",
      "Oct.",
      "Nov.",
      "Dec."
    ];
    const month = monthMap[createdAt.getMonth()];
    const day = createdAt.getDate();
    const year = createdAt.getFullYear();
    const hours24 = createdAt.getHours();
    const minutes = String(createdAt.getMinutes()).padStart(2, "0");
    const meridiem = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const suffix = day % 10 === 1 && day % 100 !== 11 ? "st" : day % 10 === 2 && day % 100 !== 12 ? "nd" : day % 10 === 3 && day % 100 !== 13 ? "rd" : "th";
    return `${month} ${day}${suffix}, ${year} at ${hours12}:${minutes}${meridiem}.`;
  };
  const resizeDescriptionField = () => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.max(element.scrollHeight, 120);
    setDescriptionHeight(`${nextHeight}px`);
  };
  const resizeBehaviorField = (element, value, setHeight) => {
    if (!element) return;
    if (!value.trim()) {
      const compact = `${COMPACT_BEHAVIOR_HEIGHT}px`;
      element.style.height = compact;
      setHeight(compact);
      return;
    }
    element.style.height = "auto";
    const nextHeight = Math.max(element.scrollHeight, EXPANDED_BEHAVIOR_MIN_HEIGHT);
    setHeight(`${nextHeight}px`);
  };
  const composePageUrlWithTab = (value) => {
    return normalizePageUrl(value || "");
  };
  useEffect6(() => {
    setReportPageUrl(existingReport?.page_url || pageUrl);
  }, [existingReport?.page_url, pageUrl]);
  useEffect6(() => {
    if (!existingReport?.task_list_id && defaultTaskListId && !taskListId) {
      setTaskListId(defaultTaskListId);
    }
  }, [defaultTaskListId, existingReport?.task_list_id, taskListId]);
  useEffect6(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      if (linkCopyTimeoutRef.current) window.clearTimeout(linkCopyTimeoutRef.current);
      if (aiPayloadCopyTimeoutRef.current) window.clearTimeout(aiPayloadCopyTimeoutRef.current);
    };
  }, []);
  useEffect6(() => {
    if ((status === "Closed" || status === "Resolved") && !resolvedBy && user?.id) {
      setResolvedBy(user.id);
    }
  }, [status, resolvedBy, user?.id]);
  useEffect6(() => {
    resizeDescriptionField();
  }, [description]);
  useEffect6(() => {
    resizeBehaviorField(expectedBehaviorRef.current, expectedBehavior, setExpectedBehaviorHeight);
  }, [expectedBehavior]);
  useEffect6(() => {
    resizeBehaviorField(actualBehaviorRef.current, actualBehavior, setActualBehaviorHeight);
  }, [actualBehavior]);
  const availableTypes = bugReportTypes.filter((type) => !selectedTypes.includes(type.id));
  const handleTypeSelect = (typeId) => {
    setSelectedTypes((prev) => [...prev, typeId]);
    setShowTypeDropdown(false);
    setNewTypeName("");
  };
  const handleTypeRemove = (typeId) => {
    setSelectedTypes((prev) => prev.filter((id) => id !== typeId));
  };
  const createTypeFromValue = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;
    const existingType = bugReportTypes.find(
      (type) => type.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (existingType) {
      if (!selectedTypes.includes(existingType.id)) {
        setSelectedTypes((prev) => [...prev, existingType.id]);
      }
      setNewTypeName("");
      setShowTypeDropdown(false);
      setPendingTypeName(null);
      return;
    }
    const newType = await addBugReportType(trimmedValue);
    if (newType) {
      setSelectedTypes((prev) => [...prev, newType.id]);
      setNewTypeName("");
      setShowTypeDropdown(false);
      setPendingTypeName(null);
    }
  };
  const handleTypeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (pendingTypeName && e.shiftKey) {
        createTypeFromValue(pendingTypeName);
        return;
      }
      const trimmedValue = newTypeName.trim();
      if (!trimmedValue) return;
      const existingType = bugReportTypes.find(
        (type) => type.name.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (existingType) {
        handleTypeSelect(existingType.id);
        return;
      }
      setPendingTypeName(trimmedValue);
    }
  };
  const handleDeleteType = async (typeId, e) => {
    e.stopPropagation();
    const typeToDelete = bugReportTypes.find((t) => t.id === typeId);
    if (typeToDelete?.is_default) return;
    const success = await deleteBugReportType(typeId);
    if (success) {
      setSelectedTypes((prev) => prev.filter((id) => id !== typeId));
    }
  };
  const handleCopyTaskId = async () => {
    if (!existingReport?.id) return;
    try {
      await navigator.clipboard.writeText(existingReport.id);
      setShowCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setShowCopied(false), 1200);
    } catch (err) {
      console.error("[DevNotesForm] Failed to copy task id", err);
    }
  };
  const handleCopyLink = async () => {
    if (!existingReport?.id) return;
    try {
      const link = `${window.location.origin}/bug-reports/${existingReport.id}`;
      await navigator.clipboard.writeText(link);
      setShowLinkCopied(true);
      if (linkCopyTimeoutRef.current) window.clearTimeout(linkCopyTimeoutRef.current);
      linkCopyTimeoutRef.current = window.setTimeout(() => setShowLinkCopied(false), 1200);
    } catch (err) {
      console.error("[DevNotesForm] Failed to copy link", err);
    }
  };
  const handleCopyAiPayload = async () => {
    const typeNames = selectedTypes.map((typeId) => {
      const type = bugReportTypes.find((item) => item.id === typeId);
      return type?.name || typeId;
    });
    const normalizedPageUrl = normalizePageUrl(composePageUrlWithTab(reportPageUrl));
    const payload = buildAiFixPayload({
      source: "@the-portland-company/devnotes",
      report: {
        id: existingReport?.id || null,
        title: title.trim() || null,
        status,
        severity,
        taskListId: taskListId || null,
        types: selectedTypes,
        typeNames,
        approved,
        aiReady
      },
      narrative: {
        description: description.trim() || null,
        expectedBehavior: expectedBehavior.trim() || null,
        actualBehavior: actualBehavior.trim() || null,
        aiDescription: aiDescription || null,
        response: existingReport?.response || null
      },
      context: {
        pageUrl: normalizedPageUrl,
        routeLabel: capturedContext?.route_label || deriveRouteLabelFromUrl(normalizedPageUrl),
        xPosition: existingReport?.x_position ?? xPosition,
        yPosition: existingReport?.y_position ?? yPosition,
        targetSelector: existingReport?.target_selector ?? targetSelector ?? null,
        targetRelativeX: existingReport?.target_relative_x ?? targetRelativeX ?? null,
        targetRelativeY: existingReport?.target_relative_y ?? targetRelativeY ?? null,
        captureContext: capturedContext
      },
      workflow: {
        assignedTo: assignedTo || null,
        resolvedBy: resolvedBy || null,
        createdBy: existingReport?.created_by || user.id,
        createdAt: existingReport?.created_at || null,
        updatedAt: existingReport?.updated_at || null
      }
    });
    const copyText = formatAiFixPayloadForCopy(payload);
    try {
      await navigator.clipboard.writeText(copyText);
      setShowAiPayloadCopied(true);
      if (aiPayloadCopyTimeoutRef.current) {
        window.clearTimeout(aiPayloadCopyTimeoutRef.current);
      }
      aiPayloadCopyTimeoutRef.current = window.setTimeout(
        () => setShowAiPayloadCopied(false),
        1400
      );
    } catch (err) {
      console.error("[DevNotesForm] Failed to copy AI payload", err);
    }
  };
  const trimmedDescription = description.trim();
  const trimmedExpectedBehavior = expectedBehavior.trim();
  const trimmedActualBehavior = actualBehavior.trim();
  const hasDescription = trimmedDescription.length > 0;
  const hasBehavior = trimmedExpectedBehavior.length > 0 || trimmedActualBehavior.length > 0;
  const hasNarrative = hasDescription || hasBehavior;
  const aiRequired = requireAi && !existingReport && !aiDescription;
  const submitDisabled = loading || aiRequired || !hasNarrative;
  const submitTitle = aiRequired ? "AI refinement is required before submitting" : !hasNarrative ? "Add a description, expected behavior, or actual behavior" : existingReport ? "Update" : "Save";
  const aiSeedDescription = hasDescription ? trimmedDescription : hasBehavior ? [trimmedExpectedBehavior, trimmedActualBehavior].filter(Boolean).join("\n") : title.trim();
  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!title.trim() || !taskListId || selectedTypes.length === 0 || !hasNarrative) return;
    if (aiRequired) return;
    const reportData = {
      task_list_id: taskListId,
      page_url: normalizePageUrl(composePageUrlWithTab(reportPageUrl)),
      x_position: xPosition,
      y_position: yPosition,
      target_selector: targetSelector,
      target_relative_x: targetRelativeX,
      target_relative_y: targetRelativeY,
      types: selectedTypes,
      severity,
      title: title.trim(),
      description: trimmedDescription || null,
      expected_behavior: trimmedExpectedBehavior || null,
      actual_behavior: trimmedActualBehavior || null,
      response: null,
      status,
      assigned_to: assignedTo,
      resolved_by: resolvedBy,
      approved,
      ai_ready: aiReady,
      ai_description: aiDescription
    };
    let result = null;
    if (existingReport) {
      result = await updateBugReport(existingReport.id, {
        ...reportData,
        capture_context: existingReport.capture_context || capturedContext,
        assigned_to: assignedTo,
        resolved_by: resolvedBy
      });
    } else {
      result = await createBugReport({
        ...reportData,
        capture_context: capturedContext
      });
    }
    if (result) {
      onSave(result);
    }
  };
  const getTypeName = (typeId) => {
    const type = bugReportTypes.find((t) => t.id === typeId);
    return type?.name || "Unknown";
  };
  const getTaskListName = (listId) => {
    const list = taskLists.find((l) => l.id === listId);
    return list?.name || "";
  };
  const handleTaskListSelect = (listId) => {
    setTaskListId(listId);
    setTaskListSearchTerm("");
    setShowTaskListDropdown(false);
    setPendingTaskListName(null);
  };
  const createTaskListFromValue = async (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;
    const existingList = taskLists.find(
      (list) => list.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (existingList) {
      setTaskListId(existingList.id);
      setTaskListSearchTerm("");
      setShowTaskListDropdown(false);
      setPendingTaskListName(null);
      return;
    }
    const created = await createTaskList(trimmedValue);
    if (created) {
      setTaskListId(created.id);
      setTaskListSearchTerm("");
      setShowTaskListDropdown(false);
      setPendingTaskListName(null);
    }
  };
  const handleTaskListKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (pendingTaskListName && e.shiftKey) {
        createTaskListFromValue(pendingTaskListName);
        return;
      }
      const trimmedValue = taskListSearchTerm.trim();
      if (!trimmedValue) return;
      const existingList = taskLists.find(
        (list) => list.name.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (existingList) {
        handleTaskListSelect(existingList.id);
        return;
      }
      setPendingTaskListName(trimmedValue);
    }
  };
  const StatusIcon = statusIcons[status]?.icon || FiAlertCircle;
  const statusColorClass = statusIcons[status]?.colorClass || "bg-red-100 text-red-800";
  return /* @__PURE__ */ jsxs4("div", { className: "bg-white rounded-xl p-4 md:p-6 min-w-[320px] w-full max-w-[960px] mx-auto relative shadow-sm", children: [
    /* @__PURE__ */ jsxs4("div", { className: "flex justify-between items-start mb-3", children: [
      /* @__PURE__ */ jsx5("div", { className: "flex flex-col gap-1", children: /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx5("span", { className: "font-bold text-base", children: existingReport ? "Edit Bug Report" : "Report Bug" }),
        existingReport && /* @__PURE__ */ jsxs4("span", { className: `text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColorClass}`, children: [
          /* @__PURE__ */ jsx5(StatusIcon, { size: 12 }),
          status
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-1 flex-shrink-0", children: [
        /* @__PURE__ */ jsx5(
          "button",
          {
            type: "button",
            className: "p-1.5 rounded hover:bg-gray-100 text-gray-500",
            onClick: onCancel,
            "aria-label": "Cancel",
            title: "Cancel",
            children: /* @__PURE__ */ jsx5(FiX2, { size: 16 })
          }
        ),
        /* @__PURE__ */ jsx5(
          "button",
          {
            type: "button",
            className: "p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
            onClick: handleSubmit,
            disabled: submitDisabled,
            "aria-label": existingReport ? "Update" : "Save",
            title: submitTitle,
            children: loading ? /* @__PURE__ */ jsx5("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }) : /* @__PURE__ */ jsx5(FiCheck2, { size: 16 })
          }
        )
      ] })
    ] }),
    existingReport && /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-2 mb-3 text-xs relative", children: [
      /* @__PURE__ */ jsxs4("span", { className: "text-gray-500", children: [
        "Created by",
        " ",
        /* @__PURE__ */ jsx5("span", { className: "font-medium text-gray-700", children: getFirstName(
          existingReport.creator?.full_name || existingReport.creator?.email || "Unknown"
        ) }),
        " on ",
        /* @__PURE__ */ jsx5("span", { className: "text-gray-600", children: formatCreatedDate(existingReport.created_at) })
      ] }),
      /* @__PURE__ */ jsx5("span", { className: "text-gray-400", children: "|" }),
      /* @__PURE__ */ jsx5("span", { className: "text-gray-500", children: "Task ID" }),
      /* @__PURE__ */ jsx5(
        "button",
        {
          type: "button",
          className: "font-mono text-gray-800 hover:underline",
          onClick: handleCopyTaskId,
          children: existingReport.id
        }
      ),
      /* @__PURE__ */ jsx5("span", { className: "text-gray-400", children: "|" }),
      /* @__PURE__ */ jsxs4(
        "button",
        {
          type: "button",
          className: "inline-flex items-center gap-1 text-blue-600 hover:underline",
          onClick: handleCopyLink,
          title: "Copy shareable link",
          children: [
            /* @__PURE__ */ jsx5(FiLink2, { size: 12 }),
            "Copy Link"
          ]
        }
      ),
      /* @__PURE__ */ jsx5("span", { className: "text-gray-400", children: "|" }),
      /* @__PURE__ */ jsxs4(
        "button",
        {
          type: "button",
          className: "inline-flex items-center gap-1 text-purple-700 hover:underline",
          onClick: handleCopyAiPayload,
          title: "Copy AI fix payload",
          children: [
            /* @__PURE__ */ jsx5(FiCopy, { size: 12 }),
            "Copy AI Payload"
          ]
        }
      ),
      (showCopied || showLinkCopied) && /* @__PURE__ */ jsx5("span", { className: "absolute left-0 top-full mt-1 text-xs text-black animate-devnotes-fade-up pointer-events-none", children: showLinkCopied ? "Link copied!" : "Copied!" }),
      showAiPayloadCopied && /* @__PURE__ */ jsx5("span", { className: "absolute left-0 top-full mt-1 text-xs text-black animate-devnotes-fade-up pointer-events-none", children: "AI payload copied!" })
    ] }),
    /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-5", children: [
      /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-4", children: [
        /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative my-3" : "my-3", children: [
          /* @__PURE__ */ jsxs4(
            "label",
            {
              className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
              children: [
                "Title ",
                /* @__PURE__ */ jsx5("span", { className: "text-red-500", children: "*" })
              ]
            }
          ),
          /* @__PURE__ */ jsx5(
            "input",
            {
              type: "text",
              className: "w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none hover:border-gray-400",
              placeholder: "Brief description of the issue",
              value: title,
              onChange: (e) => setTitle(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
          /* @__PURE__ */ jsx5(
            "label",
            {
              className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
              children: "Description"
            }
          ),
          /* @__PURE__ */ jsx5(
            "textarea",
            {
              ref: descriptionRef,
              className: "w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400",
              placeholder: "Detailed description (optional)",
              value: description,
              onChange: (e) => setDescription(e.target.value),
              onInput: resizeDescriptionField,
              rows: 5,
              style: { minHeight: "120px", height: descriptionHeight }
            }
          )
        ] }),
        /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2 py-1", children: [
          /* @__PURE__ */ jsx5("div", { className: "h-px flex-1 bg-gray-200" }),
          /* @__PURE__ */ jsx5("span", { className: "inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-gray-500", children: "OR" }),
          /* @__PURE__ */ jsx5("div", { className: "h-px flex-1 bg-gray-200" })
        ] }),
        /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Expected Behavior"
              }
            ),
            /* @__PURE__ */ jsx5(
              "textarea",
              {
                ref: expectedBehaviorRef,
                className: "w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400",
                placeholder: "What should have happened?",
                value: expectedBehavior,
                onChange: (e) => setExpectedBehavior(e.target.value),
                onInput: (e) => resizeBehaviorField(
                  e.currentTarget,
                  e.currentTarget.value,
                  setExpectedBehaviorHeight
                ),
                rows: 2,
                style: {
                  minHeight: `${COMPACT_BEHAVIOR_HEIGHT}px`,
                  height: expectedBehaviorHeight
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Actual Behavior"
              }
            ),
            /* @__PURE__ */ jsx5(
              "textarea",
              {
                ref: actualBehaviorRef,
                className: "w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400",
                placeholder: "What actually happened?",
                value: actualBehavior,
                onChange: (e) => setActualBehavior(e.target.value),
                onInput: (e) => resizeBehaviorField(
                  e.currentTarget,
                  e.currentTarget.value,
                  setActualBehaviorHeight
                ),
                rows: 2,
                style: {
                  minHeight: `${COMPACT_BEHAVIOR_HEIGHT}px`,
                  height: actualBehaviorHeight
                }
              }
            )
          ] })
        ] }),
        submitAttempted && !hasNarrative && /* @__PURE__ */ jsx5("p", { className: "text-xs text-red-600", children: "Add a description, expected behavior, or actual behavior." }),
        !aiProvider && !aiDescription && /* @__PURE__ */ jsx5("p", { className: "text-xs text-gray-400 italic", children: "AI Refinement Off" }),
        aiProvider && !aiDescription && !showAiChat && /* @__PURE__ */ jsxs4(
          "button",
          {
            type: "button",
            className: `w-full py-3 rounded-xl border-2 bg-white text-purple-700 font-medium hover:bg-purple-50 flex items-center justify-center gap-2 transition-all ${requireAi && !existingReport ? "border-purple-500 shadow-[0_0_0_3px_rgba(167,139,250,0.3)] hover:border-purple-600" : "border-purple-300 shadow-[0_0_0_3px_rgba(167,139,250,0.15)] hover:border-purple-400"}`,
            onClick: () => setShowAiChat(true),
            children: [
              /* @__PURE__ */ jsx5(FiZap2, { size: 18 }),
              "Refine with AI",
              /* @__PURE__ */ jsx5("span", { className: `text-[0.65rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${requireAi && !existingReport ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`, children: requireAi && !existingReport ? "Required" : "Recommended" })
            ]
          }
        ),
        showAiChat && aiProvider && /* @__PURE__ */ jsx5(
          AiDescriptionChat,
          {
            initialDescription: aiSeedDescription,
            context: {
              title,
              page_url: reportPageUrl,
              route_label: capturedContext?.route_label || deriveRouteLabelFromUrl(reportPageUrl),
              severity,
              types: selectedTypes,
              target_selector: targetSelector ?? void 0,
              expected_behavior: expectedBehavior || void 0,
              actual_behavior: actualBehavior || void 0,
              capture_context: capturedContext || void 0
            },
            aiProvider,
            onAccept: (refined) => {
              setAiDescription(refined);
              setAiReady(true);
              setShowAiChat(false);
            },
            onCancel: () => setShowAiChat(false)
          }
        ),
        aiDescription && /* @__PURE__ */ jsxs4("div", { className: "bg-green-50 border border-green-300 rounded-lg p-3", children: [
          /* @__PURE__ */ jsxs4("div", { className: "flex justify-between items-center mb-1", children: [
            /* @__PURE__ */ jsx5("span", { className: "text-xs font-bold text-green-700", children: "AI-Refined Description" }),
            /* @__PURE__ */ jsx5(
              "button",
              {
                type: "button",
                className: "text-xs text-red-600 hover:text-red-700",
                onClick: () => {
                  setAiDescription(null);
                  setAiReady(false);
                },
                children: "Remove"
              }
            )
          ] }),
          /* @__PURE__ */ jsx5("p", { className: "text-sm whitespace-pre-wrap text-gray-800", children: aiDescription }),
          /* @__PURE__ */ jsx5("div", { className: "mt-2 flex justify-end", children: /* @__PURE__ */ jsxs4(
            "button",
            {
              type: "button",
              className: "inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-800",
              onClick: handleCopyAiPayload,
              children: [
                /* @__PURE__ */ jsx5(FiCopy, { size: 12 }),
                "Copy AI Fix Payload"
              ]
            }
          ) }),
          showAiPayloadCopied && /* @__PURE__ */ jsx5("p", { className: "mt-1 text-xs text-purple-700 text-right", children: "AI payload copied!" })
        ] }),
        /* @__PURE__ */ jsxs4("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Type(s)"
              }
            ),
            /* @__PURE__ */ jsxs4("div", { className: "relative", children: [
              /* @__PURE__ */ jsx5("div", { className: "border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center", children: /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-1", children: [
                selectedTypes.map((typeId) => /* @__PURE__ */ jsxs4(
                  "span",
                  {
                    className: "inline-flex items-center gap-1 rounded-sm bg-transparent px-1 py-0.5 text-xs font-medium text-gray-700",
                    children: [
                      getTypeName(typeId),
                      /* @__PURE__ */ jsx5(
                        "button",
                        {
                          type: "button",
                          className: "ml-0.5 text-gray-400 hover:text-gray-700",
                          onClick: () => handleTypeRemove(typeId),
                          children: "\xD7"
                        }
                      )
                    ]
                  },
                  typeId
                )),
                /* @__PURE__ */ jsx5(
                  "input",
                  {
                    ref: typeInputRef,
                    type: "text",
                    className: "flex-1 min-w-[120px] border-none outline-none text-sm bg-transparent",
                    placeholder: "Type to search or add...",
                    value: newTypeName,
                    onChange: (e) => {
                      setPendingTypeName(null);
                      setNewTypeName(e.target.value);
                      setShowTypeDropdown(true);
                    },
                    onFocus: () => setShowTypeDropdown(true),
                    onBlur: () => setTimeout(() => setShowTypeDropdown(false), 200),
                    onKeyDown: handleTypeKeyDown
                  }
                )
              ] }) }),
              showTypeDropdown && /* @__PURE__ */ jsxs4("div", { className: "absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[200px] overflow-y-auto z-20", children: [
                availableTypes.filter(
                  (type) => type.name.toLowerCase().includes(newTypeName.toLowerCase())
                ).map((type) => /* @__PURE__ */ jsxs4(
                  "div",
                  {
                    className: "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100",
                    onMouseDown: () => handleTypeSelect(type.id),
                    children: [
                      /* @__PURE__ */ jsx5("span", { className: "text-sm", children: type.name }),
                      !type.is_default && /* @__PURE__ */ jsx5(
                        "button",
                        {
                          type: "button",
                          className: "p-1 text-red-500 hover:text-red-700",
                          "aria-label": "Delete type",
                          onMouseDown: (e) => handleDeleteType(type.id, e),
                          children: /* @__PURE__ */ jsx5(FiTrash22, { size: 12 })
                        }
                      )
                    ]
                  },
                  type.id
                )),
                newTypeName.trim() && !bugReportTypes.some(
                  (t) => t.name.toLowerCase() === newTypeName.trim().toLowerCase()
                ) && /* @__PURE__ */ jsx5(
                  "div",
                  {
                    className: "px-3 py-2 cursor-pointer bg-blue-50 hover:bg-blue-100",
                    onMouseDown: () => setPendingTypeName(newTypeName.trim()),
                    children: /* @__PURE__ */ jsxs4("span", { className: "text-sm text-blue-600", children: [
                      '+ Queue "',
                      newTypeName.trim(),
                      '" for approval'
                    ] })
                  }
                ),
                availableTypes.length === 0 && !newTypeName.trim() && /* @__PURE__ */ jsx5("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsx5("span", { className: "text-sm text-gray-500", children: "No more types available" }) })
              ] }),
              pendingTypeName && /* @__PURE__ */ jsx5("div", { className: "absolute top-[calc(100%+8px)] left-0 bg-white border border-yellow-300 rounded-md shadow-md p-2 z-30", children: /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsxs4("p", { className: "text-xs text-gray-700", children: [
                  'Add "',
                  pendingTypeName,
                  '"? Press Shift+Enter or approve.'
                ] }),
                /* @__PURE__ */ jsxs4("div", { className: "flex justify-end gap-2", children: [
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      className: "px-2 py-1 text-xs rounded hover:bg-gray-100",
                      onClick: () => setPendingTypeName(null),
                      children: "Cancel"
                    }
                  ),
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      className: "px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500",
                      onClick: () => createTypeFromValue(pendingTypeName),
                      children: "Approve"
                    }
                  )
                ] })
              ] }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx5(
            SearchableSingleSelect,
            {
              label: "Severity",
              options: severityOptions,
              value: severity,
              onChange: (value) => {
                if (!value) return;
                setSeverity(value);
              },
              placeholder: "Search severity...",
              isSuperscript: isSuperscriptLabels
            }
          ),
          isAdmin && /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Assignment & Workflow"
              }
            ),
            /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-2", children: [
              /* @__PURE__ */ jsx5(
                SearchableSingleSelect,
                {
                  label: "Assignee",
                  options: [{ id: "", label: "Unassigned" }, ...collaboratorOptions],
                  value: assignedTo ?? "",
                  onChange: (value) => setAssignedTo(value || null),
                  placeholder: "Search assignee...",
                  isSuperscript: isSuperscriptLabels
                }
              ),
              /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-4 flex-wrap", children: [
                /* @__PURE__ */ jsxs4("label", { className: "inline-flex items-center gap-1.5 text-sm cursor-pointer", children: [
                  /* @__PURE__ */ jsx5(
                    "input",
                    {
                      type: "checkbox",
                      checked: approved,
                      onChange: (e) => setApproved(e.target.checked),
                      className: "rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    }
                  ),
                  /* @__PURE__ */ jsx5("span", { title: "When a Senior Engineer has reviewed this task from the Submitter it should be marked as Approved for the development team to complete.", children: "Approved" })
                ] }),
                /* @__PURE__ */ jsxs4("label", { className: "inline-flex items-center gap-1.5 text-sm cursor-pointer", children: [
                  /* @__PURE__ */ jsx5(
                    "input",
                    {
                      type: "checkbox",
                      checked: aiReady,
                      onChange: (e) => {
                        setAiReady(e.target.checked);
                        if (e.target.checked) setApproved(true);
                      },
                      className: "rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    }
                  ),
                  "AI Ready"
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Task List"
              }
            ),
            /* @__PURE__ */ jsxs4("div", { className: "relative", children: [
              /* @__PURE__ */ jsx5("div", { className: "border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center", children: /* @__PURE__ */ jsxs4("div", { className: "flex flex-wrap items-center gap-1", children: [
                taskListId && /* @__PURE__ */ jsxs4("span", { className: "inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full", children: [
                  getTaskListName(taskListId),
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      className: "ml-0.5 hover:text-blue-600",
                      onClick: () => setTaskListId(""),
                      children: "\xD7"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx5(
                  "input",
                  {
                    ref: taskListInputRef,
                    type: "text",
                    className: "flex-1 min-w-[120px] border-none outline-none text-sm bg-transparent",
                    placeholder: "Type to search or add...",
                    value: taskListSearchTerm,
                    onChange: (e) => {
                      setPendingTaskListName(null);
                      setTaskListSearchTerm(e.target.value);
                      setShowTaskListDropdown(true);
                    },
                    onFocus: () => setShowTaskListDropdown(true),
                    onBlur: () => setTimeout(() => setShowTaskListDropdown(false), 200),
                    onKeyDown: handleTaskListKeyDown
                  }
                )
              ] }) }),
              showTaskListDropdown && /* @__PURE__ */ jsxs4("div", { className: "absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[200px] overflow-y-auto z-20", children: [
                taskLists.filter(
                  (list) => list.name.toLowerCase().includes(taskListSearchTerm.toLowerCase())
                ).map((list) => /* @__PURE__ */ jsxs4(
                  "div",
                  {
                    className: `flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 ${list.id === taskListId ? "bg-blue-50" : ""}`,
                    onMouseDown: () => handleTaskListSelect(list.id),
                    children: [
                      /* @__PURE__ */ jsx5(
                        "span",
                        {
                          className: `text-sm ${list.id === taskListId ? "font-medium" : ""}`,
                          children: list.name
                        }
                      ),
                      list.is_default && /* @__PURE__ */ jsx5("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800", children: "Default" })
                    ]
                  },
                  list.id
                )),
                taskListSearchTerm.trim() && !taskLists.some(
                  (list) => list.name.toLowerCase() === taskListSearchTerm.trim().toLowerCase()
                ) && /* @__PURE__ */ jsx5(
                  "div",
                  {
                    className: "px-3 py-2 cursor-pointer bg-blue-50 hover:bg-blue-100",
                    onMouseDown: () => setPendingTaskListName(taskListSearchTerm.trim()),
                    children: /* @__PURE__ */ jsxs4("span", { className: "text-sm text-blue-600", children: [
                      '+ Queue "',
                      taskListSearchTerm.trim(),
                      '" for approval'
                    ] })
                  }
                ),
                taskLists.length === 0 && !taskListSearchTerm.trim() && /* @__PURE__ */ jsx5("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsx5("span", { className: "text-sm text-gray-500", children: "No task lists available" }) })
              ] }),
              pendingTaskListName && /* @__PURE__ */ jsx5("div", { className: "absolute top-[calc(100%+8px)] left-0 bg-white border border-yellow-300 rounded-md shadow-md p-2 z-30", children: /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-2", children: [
                /* @__PURE__ */ jsxs4("p", { className: "text-xs text-gray-700", children: [
                  'Add "',
                  pendingTaskListName,
                  '"? Press Shift+Enter or approve.'
                ] }),
                /* @__PURE__ */ jsxs4("div", { className: "flex justify-end gap-2", children: [
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      className: "px-2 py-1 text-xs rounded hover:bg-gray-100",
                      onClick: () => setPendingTaskListName(null),
                      children: "Cancel"
                    }
                  ),
                  /* @__PURE__ */ jsx5(
                    "button",
                    {
                      type: "button",
                      className: "px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500",
                      onClick: () => createTaskListFromValue(pendingTaskListName),
                      children: "Approve"
                    }
                  )
                ] })
              ] }) })
            ] })
          ] }),
          existingReport && isAdmin && /* @__PURE__ */ jsx5(
            SearchableSingleSelect,
            {
              label: "Status",
              options: statusOptions,
              value: status,
              onChange: (value) => {
                if (!value) return;
                setStatus(value);
              },
              placeholder: "Search status...",
              isSuperscript: isSuperscriptLabels
            }
          ),
          existingReport && isAdmin && (status === "Closed" || status === "Resolved") && /* @__PURE__ */ jsx5(
            SearchableSingleSelect,
            {
              label: "Resolved By",
              options: [{ id: "", label: "Not Set" }, ...collaboratorOptions],
              value: resolvedBy ?? "",
              onChange: (value) => setResolvedBy(value || null),
              placeholder: "Search resolver...",
              isSuperscript: isSuperscriptLabels
            }
          ),
          /* @__PURE__ */ jsxs4("div", { className: isSuperscriptLabels ? "relative" : "", children: [
            /* @__PURE__ */ jsx5(
              "label",
              {
                className: isSuperscriptLabels ? "absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700" : "block text-sm mb-1 text-gray-700",
                children: "Page URL"
              }
            ),
            /* @__PURE__ */ jsxs4("div", { className: "relative", children: [
              /* @__PURE__ */ jsx5(
                "input",
                {
                  type: "text",
                  className: `w-full rounded-md border border-gray-200 px-3 py-1.5 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none hover:border-gray-400 ${!existingReport ? "bg-gray-50 cursor-not-allowed" : ""}`,
                  value: reportPageUrl,
                  onChange: (e) => setReportPageUrl(e.target.value),
                  readOnly: !existingReport
                }
              ),
              /* @__PURE__ */ jsx5(
                "a",
                {
                  href: composePageUrlWithTab(reportPageUrl),
                  target: "_blank",
                  rel: "noreferrer",
                  className: "absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600",
                  title: "Open in new tab",
                  children: /* @__PURE__ */ jsx5(FiExternalLink, { size: 14 })
                }
              )
            ] })
          ] })
        ] }),
        existingReport && /* @__PURE__ */ jsx5(DevNotesDiscussion, { report: existingReport })
      ] }),
      /* @__PURE__ */ jsxs4("div", { className: "flex justify-between pt-2", children: [
        existingReport && onDelete ? /* @__PURE__ */ jsx5(
          "button",
          {
            type: "button",
            className: "p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-50",
            onClick: onDelete,
            disabled: loading,
            "aria-label": "Delete",
            title: "Delete",
            children: /* @__PURE__ */ jsx5(FiTrash22, { size: 16 })
          }
        ) : /* @__PURE__ */ jsx5("div", {}),
        /* @__PURE__ */ jsxs4("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx5(
            "button",
            {
              type: "button",
              className: "p-1.5 rounded hover:bg-gray-100 text-gray-500",
              onClick: onCancel,
              "aria-label": "Cancel",
              title: "Cancel",
              children: /* @__PURE__ */ jsx5(FiX2, { size: 16 })
            }
          ),
          /* @__PURE__ */ jsx5(
            "button",
            {
              type: "button",
              className: "p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
              onClick: handleSubmit,
              disabled: submitDisabled,
              "aria-label": existingReport ? "Update" : "Save",
              title: submitTitle,
              children: loading ? /* @__PURE__ */ jsx5("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }) : /* @__PURE__ */ jsx5(FiCheck2, { size: 16 })
            }
          )
        ] })
      ] })
    ] })
  ] });
}

// src/DevNotesDot.tsx
import {
  useState as useState8,
  useCallback as useCallback6,
  useEffect as useEffect8,
  useRef as useRef7
} from "react";
import {
  FiAlertCircle as FiAlertCircle2,
  FiLoader as FiLoader2,
  FiEye as FiEye3,
  FiCheckCircle as FiCheckCircle2,
  FiArchive as FiArchive2,
  FiMove,
  FiCheck as FiCheck3,
  FiX as FiX3
} from "react-icons/fi";

// src/hooks/useBugReportPosition.ts
import { useState as useState7, useEffect as useEffect7, useCallback as useCallback5 } from "react";
var subscribers = /* @__PURE__ */ new Set();
var cleanupGlobalListeners = null;
var rafId = null;
var schedulePositionUpdate = () => {
  if (typeof window === "undefined") return;
  if (rafId !== null) return;
  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    subscribers.forEach((subscriber) => {
      try {
        subscriber();
      } catch {
      }
    });
  });
};
var ensureGlobalListeners = () => {
  if (cleanupGlobalListeners || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const handleUpdate = () => {
    schedulePositionUpdate();
  };
  const observer = new MutationObserver(handleUpdate);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  window.addEventListener("resize", handleUpdate);
  window.addEventListener("scroll", handleUpdate, true);
  document.addEventListener("scroll", handleUpdate, true);
  cleanupGlobalListeners = () => {
    window.removeEventListener("resize", handleUpdate);
    window.removeEventListener("scroll", handleUpdate, true);
    document.removeEventListener("scroll", handleUpdate, true);
    observer.disconnect();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    cleanupGlobalListeners = null;
  };
};
var subscribeToPositionUpdates = (subscriber) => {
  subscribers.add(subscriber);
  ensureGlobalListeners();
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && cleanupGlobalListeners) {
      cleanupGlobalListeners();
    }
  };
};
var useBugReportPosition = (report) => {
  const calculate = useCallback5(() => {
    if (!report) return null;
    return resolveBugReportCoordinates(report);
  }, [report]);
  const [position, setPosition] = useState7(() => calculate());
  useEffect7(() => {
    setPosition(calculate());
  }, [calculate]);
  useEffect7(() => {
    if (!report) return void 0;
    return subscribeToPositionUpdates(() => {
      setPosition(calculate());
    });
  }, [report, calculate]);
  return position;
};

// src/DevNotesDot.tsx
import { Fragment as Fragment3, jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var statusConfig = {
  Open: { color: "red", bgClass: "bg-red-500", bgHoverClass: "bg-red-600", icon: FiAlertCircle2 },
  "In Progress": { color: "blue", bgClass: "bg-blue-500", bgHoverClass: "bg-blue-600", icon: FiLoader2 },
  "Needs Review": { color: "purple", bgClass: "bg-purple-500", bgHoverClass: "bg-purple-600", icon: FiEye3 },
  Resolved: { color: "green", bgClass: "bg-green-500", bgHoverClass: "bg-green-600", icon: FiCheckCircle2 },
  Closed: { color: "gray", bgClass: "bg-gray-500", bgHoverClass: "bg-gray-600", icon: FiArchive2 }
};
var severityBadgeColors = {
  Critical: "bg-red-100 text-red-800",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800"
};
var MIN_DRAG_DISTANCE = 5;
var DEFAULT_DOT_Z_INDEX = 9998;
var resolveAttachedElementZIndex = (selector) => {
  if (!selector || typeof document === "undefined" || typeof window === "undefined") return null;
  const targetElement = document.querySelector(selector);
  if (!targetElement) return null;
  let currentElement = targetElement;
  while (currentElement && currentElement !== document.body && currentElement !== document.documentElement) {
    const computed = window.getComputedStyle(currentElement).zIndex;
    if (computed !== "auto") {
      const parsed = Number.parseInt(computed, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    currentElement = currentElement.parentElement;
  }
  return 0;
};
function DevNotesDot({ report }) {
  const { deleteBugReport, bugReportTypes, updateBugReport, compensate } = useDevNotes();
  const [isFormOpen, setIsFormOpen] = useState8(false);
  const [isDragging, setIsDragging] = useState8(false);
  const [dragPosition, setDragPosition] = useState8(null);
  const [pendingMove, setPendingMove] = useState8(null);
  const [showTooltip, setShowTooltip] = useState8(false);
  const dragStartRef = useRef7(null);
  const didDragRef = useRef7(false);
  const dotRef = useRef7(null);
  const handleDelete = async () => {
    const success = await deleteBugReport(report.id);
    if (success) {
      setIsFormOpen(false);
    }
  };
  const getTypeNames = useCallback6(() => {
    return report.types.map((typeId) => {
      const type = bugReportTypes.find((t) => t.id === typeId);
      return type?.name || "Unknown";
    }).join(", ");
  }, [report.types, bugReportTypes]);
  const persistPosition = useCallback6(
    async (clientX, clientY) => {
      const payload = calculateBugPositionFromPoint({
        clientX,
        clientY,
        elementsToIgnore: [dotRef.current]
      });
      await updateBugReport(report.id, {
        x_position: payload.x,
        y_position: payload.y,
        target_selector: payload.targetSelector,
        target_relative_x: payload.targetRelativeX,
        target_relative_y: payload.targetRelativeY,
        page_url: normalizePageUrl(`${window.location.pathname}${window.location.search}`)
      });
    },
    [report.id, updateBugReport]
  );
  const anchoredPosition = useBugReportPosition(report);
  const resolvedPosition = anchoredPosition ?? resolveBugReportCoordinates(report);
  const handleDragStart = useCallback6(
    (event) => {
      if (!event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      didDragRef.current = false;
      const currentPosition = dragPosition || resolvedPosition;
      if (!currentPosition) return;
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        dotX: currentPosition.x,
        dotY: currentPosition.y,
        hasMoved: false
      };
      setIsDragging(true);
      setDragPosition(currentPosition);
    },
    [dragPosition, resolvedPosition]
  );
  const handleDragMove = useCallback6(
    (event) => {
      if (!isDragging || !dragStartRef.current) return;
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;
      if (!dragStartRef.current.hasMoved && Math.sqrt(deltaX * deltaX + deltaY * deltaY) > MIN_DRAG_DISTANCE) {
        dragStartRef.current.hasMoved = true;
      }
      setDragPosition({
        x: dragStartRef.current.dotX + deltaX,
        y: dragStartRef.current.dotY + deltaY
      });
    },
    [isDragging]
  );
  const handleDragEnd = useCallback6(
    (event) => {
      if (!isDragging || !dragStartRef.current) return;
      const hasMoved = dragStartRef.current.hasMoved;
      didDragRef.current = hasMoved;
      setIsDragging(false);
      dragStartRef.current = null;
      if (hasMoved && event) {
        setPendingMove({ clientX: event.clientX, clientY: event.clientY });
      } else {
        setDragPosition(null);
      }
    },
    [isDragging]
  );
  const confirmMove = useCallback6(async () => {
    if (!pendingMove) return;
    await persistPosition(pendingMove.clientX, pendingMove.clientY);
    setPendingMove(null);
    setDragPosition(null);
  }, [pendingMove, persistPosition]);
  const cancelMove = useCallback6(() => {
    setPendingMove(null);
    setDragPosition(null);
  }, []);
  useEffect8(() => {
    if (!isDragging) return void 0;
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);
  if (!resolvedPosition && !dragPosition) {
    return null;
  }
  const displayPosition = dragPosition || resolvedPosition;
  const attachedElementZIndex = resolveAttachedElementZIndex(report.target_selector);
  const dotZIndex = attachedElementZIndex !== null ? attachedElementZIndex + 1 : DEFAULT_DOT_Z_INDEX;
  const config = statusConfig[report.status] || statusConfig.Open;
  const StatusIcon = config.icon;
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsFormOpen(true);
    }
  };
  const creatorName = report.creator?.full_name || report.creator?.email || report.created_by || "Unknown";
  const descriptionPreview = report.description?.trim() || "No description provided.";
  const createdLabel = new Date(report.created_at).toLocaleString();
  const needsApproval = !report.approved && !report.ai_ready;
  const compensated = compensate(displayPosition.x, displayPosition.y);
  return /* @__PURE__ */ jsxs5(Fragment3, { children: [
    /* @__PURE__ */ jsxs5(
      "div",
      {
        className: "group",
        style: {
          position: "absolute",
          left: `${compensated.x}px`,
          top: `${compensated.y}px`,
          transform: "translate(-50%, -50%)",
          zIndex: isDragging ? dotZIndex + 1 : dotZIndex
        },
        onMouseEnter: () => !isFormOpen && !isDragging && setShowTooltip(true),
        onMouseLeave: () => setShowTooltip(false),
        children: [
          /* @__PURE__ */ jsxs5(
            "div",
            {
              ref: dotRef,
              className: `${isDragging ? `${config.bgHoverClass} w-8 h-8` : `${config.bgClass} w-6 h-6`} rounded-full border-[3px] border-white flex items-center justify-center transition-all duration-150 ${isDragging ? "shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-grabbing" : "shadow-[0_2px_8px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-[1.2] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"}`,
              onMouseDown: handleDragStart,
              onClick: () => {
                if (didDragRef.current) {
                  didDragRef.current = false;
                  return;
                }
                if (pendingMove) return;
                setIsFormOpen(true);
              },
              onKeyDown: handleKeyDown,
              tabIndex: 0,
              role: "button",
              children: [
                isDragging ? /* @__PURE__ */ jsx6(FiMove, { color: "white", size: 14 }) : /* @__PURE__ */ jsx6(StatusIcon, { color: "white", size: 12 }),
                needsApproval && /* @__PURE__ */ jsx6("span", { className: "absolute -top-2 -right-2 text-base font-bold text-orange-500 pointer-events-none leading-none", children: "*" })
              ]
            }
          ),
          showTooltip && !pendingMove && /* @__PURE__ */ jsxs5("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] bg-gray-800 text-white rounded-lg p-3 shadow-xl z-[2147483647] pointer-events-none", children: [
            /* @__PURE__ */ jsx6("div", { className: "font-bold text-sm mb-1", children: report.title }),
            /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: [
              /* @__PURE__ */ jsx6("span", { className: `text-xs px-1.5 py-0.5 rounded ${severityBadgeColors[report.severity] || "bg-gray-100 text-gray-800"}`, children: report.severity }),
              /* @__PURE__ */ jsxs5("span", { className: `text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${config.color === "red" ? "bg-red-100 text-red-800" : config.color === "blue" ? "bg-blue-100 text-blue-800" : config.color === "purple" ? "bg-purple-100 text-purple-800" : config.color === "green" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`, children: [
                /* @__PURE__ */ jsx6(StatusIcon, { size: 10 }),
                report.status
              ] }),
              report.approved && /* @__PURE__ */ jsx6("span", { className: "text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800", children: "Approved" }),
              report.ai_ready && /* @__PURE__ */ jsx6("span", { className: "text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800", children: "AI Ready" })
            ] }),
            /* @__PURE__ */ jsx6("div", { className: "text-xs text-gray-300", children: getTypeNames() }),
            /* @__PURE__ */ jsx6("div", { className: "text-xs text-gray-200 mt-2", children: descriptionPreview }),
            /* @__PURE__ */ jsxs5("div", { className: "text-xs text-gray-300 mt-2", children: [
              "Created by ",
              creatorName,
              " on ",
              createdLabel
            ] }),
            /* @__PURE__ */ jsx6("div", { className: "text-xs text-gray-400 mt-1", children: "Click to view/edit \xB7 Hold Shift + drag to reposition" }),
            /* @__PURE__ */ jsx6("div", { className: "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" })
          ] }),
          pendingMove && !isDragging && /* @__PURE__ */ jsxs5("div", { className: "absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-1.5", style: { pointerEvents: "auto" }, children: [
            /* @__PURE__ */ jsx6(
              "button",
              {
                className: "w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-colors",
                onClick: (e) => {
                  e.stopPropagation();
                  confirmMove();
                },
                title: "Confirm new position",
                children: /* @__PURE__ */ jsx6(FiCheck3, { color: "white", size: 14 })
              }
            ),
            /* @__PURE__ */ jsx6(
              "button",
              {
                className: "w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-colors",
                onClick: (e) => {
                  e.stopPropagation();
                  cancelMove();
                },
                title: "Cancel move",
                children: /* @__PURE__ */ jsx6(FiX3, { color: "white", size: 14 })
              }
            )
          ] })
        ]
      }
    ),
    isFormOpen && /* @__PURE__ */ jsxs5(Fragment3, { children: [
      /* @__PURE__ */ jsx6(
        "div",
        {
          style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9998, pointerEvents: "auto" },
          onClick: () => setIsFormOpen(false)
        }
      ),
      /* @__PURE__ */ jsx6("div", { style: { position: "absolute", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 16 }, children: /* @__PURE__ */ jsx6("div", { className: "pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl", children: /* @__PURE__ */ jsx6(
        DevNotesForm,
        {
          pageUrl: report.page_url,
          xPosition: report.x_position,
          yPosition: report.y_position,
          targetSelector: report.target_selector ?? null,
          targetRelativeX: report.target_relative_x ?? null,
          targetRelativeY: report.target_relative_y ?? null,
          existingReport: report,
          onSave: () => setIsFormOpen(false),
          onCancel: () => setIsFormOpen(false),
          onDelete: handleDelete
        }
      ) }) })
    ] })
  ] });
}

// src/DevNotesOverlay.tsx
import { Fragment as Fragment4, jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
function DevNotesOverlay({
  openReportId,
  onOpenReportClose
} = {}) {
  const {
    isEnabled,
    setIsEnabled,
    showBugsAlways,
    hideResolvedClosed,
    bugReports,
    currentPageBugReports,
    deleteBugReport,
    dotContainer,
    compensate,
    role
  } = useDevNotes();
  const [pendingDot, setPendingDot] = useState9(null);
  const [showPendingForm, setShowPendingForm] = useState9(false);
  const [openedReport, setOpenedReport] = useState9(null);
  const pendingDotRef = useRef8(null);
  const [isDragging, setIsDragging] = useState9(false);
  const dragStartRef = useRef8(null);
  const didDragRef = useRef8(false);
  const justEnabledRef = useRef8(false);
  useEffect9(() => {
    if (isEnabled) {
      justEnabledRef.current = true;
      const timer = setTimeout(() => {
        justEnabledRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
    justEnabledRef.current = false;
    return void 0;
  }, [isEnabled]);
  useEffect9(() => {
    if (openReportId) {
      const report = bugReports.find((r) => r.id === openReportId);
      if (report) {
        setOpenedReport(report);
      }
    }
  }, [openReportId, bugReports]);
  useEffect9(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPendingForm) {
          setShowPendingForm(false);
        } else if (pendingDot) {
          setPendingDot(null);
        } else if (isEnabled) {
          setIsEnabled(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled, setIsEnabled, pendingDot, showPendingForm]);
  useEffect9(() => {
    if (isEnabled && !showPendingForm) {
      document.body.style.cursor = "crosshair";
      return () => {
        document.body.style.cursor = "";
      };
    }
    return void 0;
  }, [isEnabled, showPendingForm]);
  const handleCloseOpenedReport = useCallback7(() => {
    setOpenedReport(null);
    onOpenReportClose?.();
  }, [onOpenReportClose]);
  const handleDeleteOpenedReport = useCallback7(async () => {
    if (openedReport) {
      await deleteBugReport(openedReport.id);
      setOpenedReport(null);
      onOpenReportClose?.();
    }
  }, [openedReport, deleteBugReport, onOpenReportClose]);
  useEffect9(() => {
    if (!isEnabled || showPendingForm) return void 0;
    const handleDocumentClick = (e) => {
      if (justEnabledRef.current) return;
      const target = e.target;
      if (target.closest("[data-bug-form]") || target.closest("[data-bug-dot]") || target.closest("[data-bug-menu]") || target.closest("[data-pending-dot]")) {
        return;
      }
      const position = calculateBugPositionFromPoint({
        clientX: e.clientX,
        clientY: e.clientY
      });
      setPendingDot(position);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [isEnabled, showPendingForm]);
  const handleSave = useCallback7((_report) => {
    setPendingDot(null);
    setShowPendingForm(false);
  }, []);
  const handleCancel = useCallback7(() => {
    setPendingDot(null);
    setShowPendingForm(false);
  }, []);
  const handlePendingDotClick = useCallback7((e) => {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setIsDragging(false);
    setShowPendingForm(true);
  }, []);
  const handleDragStart = useCallback7(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pendingDot) return;
      didDragRef.current = false;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        dotX: pendingDot.x,
        dotY: pendingDot.y
      };
    },
    [pendingDot]
  );
  const handleDragMove = useCallback7(
    (e) => {
      if (!isDragging || !dragStartRef.current || !pendingDot) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        didDragRef.current = true;
      }
      setPendingDot(
        (prev) => prev ? {
          ...prev,
          x: dragStartRef.current.dotX + deltaX,
          y: dragStartRef.current.dotY + deltaY
        } : prev
      );
    },
    [isDragging, pendingDot]
  );
  const handleDragEnd = useCallback7((event) => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (event && didDragRef.current) {
      const position = calculateBugPositionFromPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        elementsToIgnore: [pendingDotRef.current]
      });
      setPendingDot(position);
    }
  }, []);
  useEffect9(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
    return void 0;
  }, [isDragging, handleDragMove, handleDragEnd]);
  const visiblePageReports = useMemo4(
    () => currentPageBugReports.filter((report) => {
      if (hideResolvedClosed) {
        return report.status !== "Closed" && report.status !== "Resolved";
      }
      return true;
    }),
    [currentPageBugReports, hideResolvedClosed]
  );
  const renderOpenedReportModal = () => {
    if (!openedReport) return null;
    return /* @__PURE__ */ jsxs6(Fragment4, { children: [
      /* @__PURE__ */ jsx7(
        "div",
        {
          style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9997, pointerEvents: "auto" },
          onClick: handleCloseOpenedReport
        }
      ),
      /* @__PURE__ */ jsx7("div", { style: { position: "absolute", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 16 }, children: /* @__PURE__ */ jsx7(
        "div",
        {
          className: "pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl",
          "data-bug-form": true,
          children: /* @__PURE__ */ jsx7(
            DevNotesForm,
            {
              pageUrl: openedReport.page_url,
              xPosition: openedReport.x_position,
              yPosition: openedReport.y_position,
              targetSelector: openedReport.target_selector ?? null,
              targetRelativeX: openedReport.target_relative_x ?? null,
              targetRelativeY: openedReport.target_relative_y ?? null,
              existingReport: openedReport,
              onSave: handleCloseOpenedReport,
              onCancel: handleCloseOpenedReport,
              onDelete: handleDeleteOpenedReport
            }
          )
        }
      ) })
    ] });
  };
  if (role === "none") return null;
  if (!isEnabled) {
    if (!showBugsAlways && !openedReport) {
      return null;
    }
    return /* @__PURE__ */ jsxs6(Fragment4, { children: [
      showBugsAlways && dotContainer && createPortal(
        /* @__PURE__ */ jsxs6(Fragment4, { children: [
          visiblePageReports.map((report) => /* @__PURE__ */ jsx7("div", { "data-bug-dot": true, style: { pointerEvents: "auto" }, children: /* @__PURE__ */ jsx7(DevNotesDot, { report }) }, report.id)),
          renderOpenedReportModal()
        ] }),
        dotContainer
      ),
      !dotContainer && renderOpenedReportModal()
    ] });
  }
  if (!dotContainer) return null;
  const pendingViewport = pendingDot ? compensate(
    pendingDot.x - (typeof window !== "undefined" ? window.scrollX : 0),
    pendingDot.y - (typeof window !== "undefined" ? window.scrollY : 0)
  ) : null;
  return createPortal(
    /* @__PURE__ */ jsxs6(Fragment4, { children: [
      /* @__PURE__ */ jsxs6(
        "div",
        {
          style: { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9991, pointerEvents: "auto" },
          className: "bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2",
          children: [
            pendingDot && !showPendingForm ? /* @__PURE__ */ jsx7(FiMove2, {}) : /* @__PURE__ */ jsx7(FiCrosshair, {}),
            /* @__PURE__ */ jsx7("span", { className: "text-sm font-medium", children: pendingDot && !showPendingForm ? "Click pin to add details, or click elsewhere to reposition" : "Click anywhere to report a bug" })
          ]
        }
      ),
      visiblePageReports.map((report) => /* @__PURE__ */ jsx7("div", { "data-bug-dot": true, style: { pointerEvents: "auto" }, children: /* @__PURE__ */ jsx7(DevNotesDot, { report }) }, report.id)),
      pendingDot && pendingViewport && /* @__PURE__ */ jsx7(
        "div",
        {
          "data-pending-dot": true,
          ref: pendingDotRef,
          className: `w-8 h-8 rounded-full border-[3px] border-white z-[9998] flex items-center justify-center transition-all duration-150 ${isDragging ? "bg-red-600 shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-grabbing" : "bg-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] cursor-grab animate-devnotes-pulse hover:scale-110"}`,
          style: {
            position: "absolute",
            left: `${pendingViewport.x}px`,
            top: `${pendingViewport.y}px`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "auto"
          },
          onMouseDown: handleDragStart,
          onClick: handlePendingDotClick,
          title: "Drag to reposition, click to add details",
          children: /* @__PURE__ */ jsx7(FiMove2, { color: "white", size: 14 })
        }
      ),
      pendingDot && /* @__PURE__ */ jsxs6(Fragment4, { children: [
        showPendingForm && /* @__PURE__ */ jsx7(
          "div",
          {
            style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 9997, pointerEvents: "auto" },
            onClick: handleCancel
          }
        ),
        showPendingForm && /* @__PURE__ */ jsx7("div", { style: { position: "absolute", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: 16 }, children: /* @__PURE__ */ jsx7(
          "div",
          {
            className: "pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl",
            "data-bug-form": true,
            children: /* @__PURE__ */ jsx7(
              DevNotesForm,
              {
                pageUrl: `${window.location.pathname}${window.location.search}`,
                xPosition: pendingDot.x,
                yPosition: pendingDot.y,
                targetSelector: pendingDot.targetSelector,
                targetRelativeX: pendingDot.targetRelativeX,
                targetRelativeY: pendingDot.targetRelativeY,
                onSave: handleSave,
                onCancel: handleCancel
              }
            )
          }
        ) })
      ] }),
      openedReport && !pendingDot && renderOpenedReportModal()
    ] }),
    dotContainer
  );
}

// src/DevNotesTaskList.tsx
import { useState as useState10, useMemo as useMemo5 } from "react";
import {
  FiSearch,
  FiExternalLink as FiExternalLink2,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle as FiAlertTriangle2,
  FiClock,
  FiX as FiX4
} from "react-icons/fi";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var STATUS_COLORS = {
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Needs Review": "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-600"
};
var SEVERITY_COLORS = {
  Critical: "bg-red-500 text-white",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-gray-100 text-gray-600"
};
var STALE_DAYS = 7;
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
function DevNotesTaskList({
  onNavigateToPage,
  onClose,
  title = "Dev Notes Tasks"
}) {
  const {
    bugReports,
    bugReportTypes,
    loading,
    userProfiles,
    unreadCounts,
    deleteBugReport
  } = useDevNotes();
  const [searchQuery, setSearchQuery] = useState10("");
  const [filterStatus, setFilterStatus] = useState10("all");
  const [filterSeverity, setFilterSeverity] = useState10("all");
  const [showClosed, setShowClosed] = useState10(false);
  const [selectedReport, setSelectedReport] = useState10(null);
  const [sortField, setSortField] = useState10("stale");
  const [sortDir, setSortDir] = useState10("desc");
  const getStaleMeta = (report) => {
    const updatedTs = new Date(report.updated_at || report.created_at).getTime();
    if (Number.isNaN(updatedTs)) {
      return { isStale: false, ageDays: 0 };
    }
    const ageDays = Math.max(0, Math.floor((Date.now() - updatedTs) / MS_PER_DAY));
    const isCompleted = report.status === "Resolved" || report.status === "Closed";
    return {
      isStale: !isCompleted && ageDays >= STALE_DAYS,
      ageDays
    };
  };
  const stats = useMemo5(() => ({
    total: bugReports.length,
    open: bugReports.filter((r) => r.status === "Open").length,
    inProgress: bugReports.filter((r) => r.status === "In Progress").length,
    needsReview: bugReports.filter((r) => r.status === "Needs Review").length,
    resolved: bugReports.filter((r) => r.status === "Resolved").length,
    closed: bugReports.filter((r) => r.status === "Closed").length
  }), [bugReports]);
  const filteredReports = useMemo5(() => {
    const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const statusOrder = { Open: 0, "In Progress": 1, "Needs Review": 2, Resolved: 3, Closed: 4 };
    return bugReports.filter((r) => {
      if (!showClosed && r.status === "Closed") return false;
      if (showClosed && r.status !== "Closed") return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.page_url.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortField === "stale") {
        const staleA = getStaleMeta(a);
        const staleB = getStaleMeta(b);
        if (staleA.isStale !== staleB.isStale) {
          cmp = Number(staleA.isStale) - Number(staleB.isStale);
        } else {
          cmp = staleA.ageDays - staleB.ageDays;
          if (cmp === 0) {
            cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
        }
      } else if (sortField === "severity") {
        cmp = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
      } else if (sortField === "status") {
        cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [bugReports, searchQuery, filterStatus, filterSeverity, showClosed, sortField, sortDir]);
  const getProfileName = (id) => {
    if (!id) return null;
    const p = userProfiles[id];
    if (!p) return null;
    if (p.full_name) {
      const first = p.full_name.split(/\s+/)[0];
      return first;
    }
    if (p.email) return p.email.split("@")[0];
    return null;
  };
  const getPageLabel = (pageUrl) => {
    const cleaned = pageUrl.split("?")[0].split("#")[0].replace(/\/+$/, "");
    const parts = cleaned.split("/").filter(Boolean);
    if (parts.length === 0) return "Home";
    return decodeURIComponent(parts[parts.length - 1]).replace(/[-_]/g, " ");
  };
  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };
  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? /* @__PURE__ */ jsx8(FiChevronDown, { size: 12 }) : /* @__PURE__ */ jsx8(FiChevronUp, { size: 12 });
  };
  if (selectedReport) {
    return /* @__PURE__ */ jsx8("div", { className: "flex flex-col h-full", children: /* @__PURE__ */ jsx8(
      DevNotesForm,
      {
        pageUrl: selectedReport.page_url,
        existingReport: selectedReport,
        onSave: () => setSelectedReport(null),
        onCancel: () => setSelectedReport(null),
        onDelete: async () => {
          await deleteBugReport(selectedReport.id);
          setSelectedReport(null);
        }
      }
    ) });
  }
  if (loading && bugReports.length === 0) {
    return /* @__PURE__ */ jsx8("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsx8("div", { className: "w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" }) });
  }
  return /* @__PURE__ */ jsxs7("div", { className: "flex flex-col gap-4", children: [
    /* @__PURE__ */ jsxs7("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsx8("h2", { className: "text-lg font-semibold text-gray-900", children: title }),
      onClose && /* @__PURE__ */ jsx8(
        "button",
        {
          type: "button",
          onClick: onClose,
          className: "p-1 rounded hover:bg-gray-100 text-gray-500",
          children: /* @__PURE__ */ jsx8(FiX4, { size: 18 })
        }
      )
    ] }),
    /* @__PURE__ */ jsx8("div", { className: "grid grid-cols-3 sm:grid-cols-6 gap-2", children: [
      ["Open", stats.open, "text-red-600"],
      ["In Progress", stats.inProgress, "text-blue-600"],
      ["Review", stats.needsReview, "text-purple-600"],
      ["Resolved", stats.resolved, "text-green-600"],
      ["Closed", stats.closed, "text-gray-500"],
      ["Total", stats.total, "text-gray-700"]
    ].map(([label, count, color]) => /* @__PURE__ */ jsxs7("div", { className: "text-center rounded-lg border border-gray-100 py-2", children: [
      /* @__PURE__ */ jsx8("div", { className: `text-xl font-bold ${color}`, children: count }),
      /* @__PURE__ */ jsx8("div", { className: "text-[0.65rem] text-gray-500", children: label })
    ] }, label)) }),
    /* @__PURE__ */ jsxs7("div", { className: "flex flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxs7("div", { className: "relative flex-1 min-w-[180px]", children: [
        /* @__PURE__ */ jsx8(FiSearch, { className: "absolute left-2.5 top-2.5 text-gray-400", size: 14 }),
        /* @__PURE__ */ jsx8(
          "input",
          {
            type: "text",
            placeholder: "Search tasks...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs7(
        "select",
        {
          value: filterStatus,
          onChange: (e) => setFilterStatus(e.target.value),
          className: "px-2 py-2 text-sm border border-gray-200 rounded-md bg-white",
          children: [
            /* @__PURE__ */ jsx8("option", { value: "all", children: "All Statuses" }),
            /* @__PURE__ */ jsx8("option", { value: "Open", children: "Open" }),
            /* @__PURE__ */ jsx8("option", { value: "In Progress", children: "In Progress" }),
            /* @__PURE__ */ jsx8("option", { value: "Needs Review", children: "Needs Review" }),
            /* @__PURE__ */ jsx8("option", { value: "Resolved", children: "Resolved" })
          ]
        }
      ),
      /* @__PURE__ */ jsxs7(
        "select",
        {
          value: filterSeverity,
          onChange: (e) => setFilterSeverity(e.target.value),
          className: "px-2 py-2 text-sm border border-gray-200 rounded-md bg-white",
          children: [
            /* @__PURE__ */ jsx8("option", { value: "all", children: "All Severities" }),
            /* @__PURE__ */ jsx8("option", { value: "Critical", children: "Critical" }),
            /* @__PURE__ */ jsx8("option", { value: "High", children: "High" }),
            /* @__PURE__ */ jsx8("option", { value: "Medium", children: "Medium" }),
            /* @__PURE__ */ jsx8("option", { value: "Low", children: "Low" })
          ]
        }
      ),
      /* @__PURE__ */ jsx8(
        "button",
        {
          type: "button",
          onClick: () => setShowClosed((v) => !v),
          className: `px-3 py-2 text-sm rounded-md border transition ${showClosed ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`,
          children: showClosed ? "Show Active" : "Show Closed"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs7("div", { className: "text-xs text-gray-500", children: [
      filteredReports.length,
      " of ",
      showClosed ? stats.closed : stats.total - stats.closed,
      " ",
      showClosed ? "closed" : "active",
      " tasks"
    ] }),
    filteredReports.length === 0 ? /* @__PURE__ */ jsxs7("div", { className: "flex flex-col items-center py-12 text-gray-400", children: [
      /* @__PURE__ */ jsx8(FiAlertTriangle2, { size: 32, className: "mb-3" }),
      /* @__PURE__ */ jsx8("p", { className: "text-sm", children: bugReports.length === 0 ? "No tasks yet. Use the Dev Notes menu to report issues." : "No tasks match your filters." })
    ] }) : /* @__PURE__ */ jsx8("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxs7("table", { className: "w-full text-sm", children: [
      /* @__PURE__ */ jsx8("thead", { children: /* @__PURE__ */ jsxs7("tr", { className: "bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide", children: [
        /* @__PURE__ */ jsx8("th", { className: "px-3 py-2 font-medium", children: "Title" }),
        /* @__PURE__ */ jsx8(
          "th",
          {
            className: "px-3 py-2 font-medium cursor-pointer select-none",
            onClick: () => handleSort("status"),
            children: /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1", children: [
              "Status ",
              /* @__PURE__ */ jsx8(SortIcon, { field: "status" })
            ] })
          }
        ),
        /* @__PURE__ */ jsx8(
          "th",
          {
            className: "px-3 py-2 font-medium cursor-pointer select-none",
            onClick: () => handleSort("severity"),
            children: /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1", children: [
              "Severity ",
              /* @__PURE__ */ jsx8(SortIcon, { field: "severity" })
            ] })
          }
        ),
        /* @__PURE__ */ jsx8("th", { className: "px-3 py-2 font-medium hidden md:table-cell", children: "Page" }),
        /* @__PURE__ */ jsx8("th", { className: "px-3 py-2 font-medium hidden lg:table-cell", children: "Assigned" }),
        /* @__PURE__ */ jsx8(
          "th",
          {
            className: "px-3 py-2 font-medium cursor-pointer select-none hidden md:table-cell",
            onClick: () => handleSort("stale"),
            children: /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1", children: [
              "Freshness ",
              /* @__PURE__ */ jsx8(SortIcon, { field: "stale" })
            ] })
          }
        ),
        /* @__PURE__ */ jsx8(
          "th",
          {
            className: "px-3 py-2 font-medium cursor-pointer select-none",
            onClick: () => handleSort("created_at"),
            children: /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1", children: [
              "Date ",
              /* @__PURE__ */ jsx8(SortIcon, { field: "created_at" })
            ] })
          }
        )
      ] }) }),
      /* @__PURE__ */ jsx8("tbody", { className: "divide-y divide-gray-100", children: filteredReports.map((report) => {
        const unread = unreadCounts[report.id] || 0;
        const stale = getStaleMeta(report);
        return /* @__PURE__ */ jsxs7(
          "tr",
          {
            className: "hover:bg-gray-50 cursor-pointer transition",
            onClick: () => setSelectedReport(report),
            children: [
              /* @__PURE__ */ jsxs7("td", { className: "px-3 py-2.5 max-w-[280px]", children: [
                /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx8("span", { className: "font-medium text-gray-900 truncate", children: report.title }),
                  unread > 0 && /* @__PURE__ */ jsx8("span", { className: "inline-flex min-w-[18px] items-center justify-center rounded-full bg-purple-100 px-1.5 text-[10px] font-bold text-purple-700", children: unread }),
                  stale.isStale && /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800", children: [
                    /* @__PURE__ */ jsx8(FiClock, { size: 10 }),
                    "Stale ",
                    stale.ageDays,
                    "d"
                  ] })
                ] }),
                report.types.length > 0 && /* @__PURE__ */ jsx8("div", { className: "flex gap-1 mt-0.5", children: report.types.slice(0, 2).map((t) => /* @__PURE__ */ jsx8(
                  "span",
                  {
                    className: "text-[0.6rem] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500",
                    children: t
                  },
                  t
                )) })
              ] }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5", children: /* @__PURE__ */ jsx8(
                "span",
                {
                  className: `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status] || "bg-gray-100 text-gray-600"}`,
                  children: report.status
                }
              ) }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5", children: /* @__PURE__ */ jsx8(
                "span",
                {
                  className: `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[report.severity] || "bg-gray-100 text-gray-600"}`,
                  children: report.severity
                }
              ) }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5 hidden md:table-cell", children: /* @__PURE__ */ jsxs7("div", { className: "flex items-center gap-1 text-xs text-gray-500", children: [
                /* @__PURE__ */ jsx8("span", { className: "truncate max-w-[140px]", children: getPageLabel(report.page_url) }),
                onNavigateToPage && /* @__PURE__ */ jsx8(
                  "button",
                  {
                    type: "button",
                    className: "flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600",
                    onClick: (e) => {
                      e.stopPropagation();
                      onNavigateToPage(report.page_url, report.id);
                    },
                    title: "Go to page",
                    children: /* @__PURE__ */ jsx8(FiExternalLink2, { size: 12 })
                  }
                )
              ] }) }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5 hidden lg:table-cell text-xs text-gray-500", children: getProfileName(report.assigned_to) || "\u2014" }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5 hidden md:table-cell", children: stale.isStale ? /* @__PURE__ */ jsxs7("span", { className: "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800", children: [
                /* @__PURE__ */ jsx8(FiClock, { size: 11 }),
                stale.ageDays,
                "d stale"
              ] }) : /* @__PURE__ */ jsx8("span", { className: "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700", children: "Fresh" }) }),
              /* @__PURE__ */ jsx8("td", { className: "px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap", children: formatDate(report.created_at) })
            ]
          },
          report.id
        );
      }) })
    ] }) })
  ] });
}

// src/DevNotesButton.tsx
import { Fragment as Fragment5, jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
var positionStyles = {
  "bottom-right": { position: "absolute", bottom: 16, right: 16 },
  "bottom-left": { position: "absolute", bottom: 16, left: 16 },
  "top-right": { position: "absolute", top: 16, right: 16 },
  "top-left": { position: "absolute", top: 16, left: 16 }
};
function DevNotesButton({
  position = "bottom-right",
  onViewTasks,
  onSettings,
  icon,
  openReportId,
  onOpenReportClose,
  onNavigateToPage
}) {
  const { dotContainer, role } = useDevNotes();
  const [showTaskPanel, setShowTaskPanel] = useState11(false);
  const [taskPanelTitle, setTaskPanelTitle] = useState11("Dev Notes Tasks");
  if (role === "none") return null;
  const openBuiltInTaskPanel = (title) => {
    setTaskPanelTitle(title);
    setShowTaskPanel(true);
  };
  const handleViewTasks = onViewTasks || (() => openBuiltInTaskPanel("Dev Notes Tasks"));
  const handleSettings = onSettings || (() => openBuiltInTaskPanel("Task Settings"));
  const buttonContent = /* @__PURE__ */ jsxs8(Fragment5, { children: [
    /* @__PURE__ */ jsx9(
      "div",
      {
        style: { ...positionStyles[position] || positionStyles["bottom-right"], zIndex: 9990, pointerEvents: "auto" },
        "data-bug-menu": true,
        children: /* @__PURE__ */ jsx9(
          DevNotesMenu,
          {
            onViewTasks: handleViewTasks,
            onSettings: handleSettings,
            icon,
            position,
            dropdownDirection: position?.includes("bottom") ? "up" : "down"
          }
        )
      }
    ),
    showTaskPanel && /* @__PURE__ */ jsxs8("div", { style: { position: "absolute", inset: 0, zIndex: 9998, display: "flex", justifyContent: "flex-end", pointerEvents: "auto" }, children: [
      /* @__PURE__ */ jsx9(
        "div",
        {
          style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" },
          onClick: () => setShowTaskPanel(false)
        }
      ),
      /* @__PURE__ */ jsx9("div", { className: "relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto p-6 animate-[slideIn_0.2s_ease-out]", children: /* @__PURE__ */ jsx9(
        DevNotesTaskList,
        {
          title: taskPanelTitle,
          onClose: () => setShowTaskPanel(false),
          onNavigateToPage
        }
      ) })
    ] })
  ] });
  return /* @__PURE__ */ jsxs8(Fragment5, { children: [
    dotContainer ? createPortal2(buttonContent, dotContainer) : buttonContent,
    /* @__PURE__ */ jsx9(
      DevNotesOverlay,
      {
        openReportId,
        onOpenReportClose
      }
    )
  ] });
}

// src/client.ts
var DEFAULT_BASE_PATH = "/api/devnotes";
var normalizeBasePath = (basePath) => {
  const trimmed = (basePath || DEFAULT_BASE_PATH).trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};
var buildUrl = (basePath, path, query) => {
  const url = new URL(`${basePath}${path.startsWith("/") ? path : `/${path}`}`, "http://localhost");
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === void 0) return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
};
var defaultCapabilities = {
  ai: false,
  appLink: true
};
async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload;
}
function createDevNotesClient(options) {
  const basePath = normalizeBasePath(options.basePath);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("createDevNotesClient requires a fetch implementation.");
  }
  const request = async (path, init = {}) => {
    const token = await options.getAuthToken();
    const headers = new Headers(init.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetchImpl(buildUrl(basePath, path, init.query), {
      ...init,
      headers
    });
    return await parseResponse(response);
  };
  return {
    fetchBugReports: async () => await request("/reports"),
    createBugReport: async (data) => await request("/reports", {
      method: "POST",
      body: JSON.stringify(data)
    }),
    updateBugReport: async (id, data) => await request(`/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),
    deleteBugReport: async (id) => {
      await request(`/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    fetchBugReportTypes: async () => await request("/report-types"),
    createBugReportType: async (name) => await request("/report-types", {
      method: "POST",
      body: JSON.stringify({ name })
    }),
    deleteBugReportType: async (id) => {
      await request(`/report-types/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    fetchTaskLists: async () => await request("/task-lists"),
    createTaskList: async (name) => await request("/task-lists", {
      method: "POST",
      body: JSON.stringify({ name })
    }),
    fetchMessages: async (bugReportId) => await request(`/reports/${encodeURIComponent(bugReportId)}/messages`),
    createMessage: async (bugReportId, body) => await request(`/reports/${encodeURIComponent(bugReportId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body })
    }),
    updateMessage: async (id, body) => await request(`/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    }),
    deleteMessage: async (id) => {
      await request(`/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    markMessagesAsRead: async (messageIds) => {
      await request("/messages/read", {
        method: "POST",
        body: JSON.stringify({ messageIds })
      });
    },
    fetchUnreadCounts: async () => await request("/unread-counts"),
    fetchCollaborators: async (ids) => await request("/collaborators", {
      query: ids && ids.length ? { ids: ids.join(",") } : void 0
    }),
    fetchProfiles: async (ids) => {
      if (ids.length === 0) return [];
      return await request("/collaborators", {
        query: { ids: ids.join(",") }
      });
    },
    fetchCapabilities: async () => {
      try {
        return await request("/capabilities");
      } catch {
        return defaultCapabilities;
      }
    },
    getAppLinkStatus: async () => await request("/app-link", { method: "GET" }),
    linkApp: async (input) => await request("/app-link", {
      method: "POST",
      body: JSON.stringify(input)
    }),
    unlinkApp: async () => {
      await request("/app-link", { method: "DELETE" });
    }
  };
}
export {
  DevNotesButton,
  DevNotesDiscussion,
  DevNotesDot,
  DevNotesForm,
  DevNotesMenu,
  DevNotesOverlay,
  DevNotesProvider,
  DevNotesTaskList,
  buildAiFixPayload,
  buildCaptureContext,
  calculateBugPositionFromPoint,
  createDevNotesClient,
  deriveRouteLabelFromUrl,
  detectBrowserName,
  formatAiFixPayloadForCopy,
  normalizePageUrl,
  resolveBugReportCoordinates,
  useBugReportPosition,
  useDevNotes
};
//# sourceMappingURL=index.mjs.map