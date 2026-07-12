import { useState, useMemo, useEffect } from 'react';
import { useDevNotes } from '../DevNotesProvider';
import type { BugReport } from '../types';

const STALE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TaskSortField = 'stale' | 'created_at' | 'severity' | 'status';

/**
 * Shared, presentation-agnostic data layer for the task list views.
 *
 * Owns the visibility computation (which reports the current user may see),
 * search/filter/sort state, derived stats, and the small formatting helpers.
 * Consumed by both the Tailwind-based `DevNotesTaskList` and the fully
 * self-contained (inline-styled) `DevNotesTaskListModal` so the two never drift.
 */
export function useTaskListData() {
  const {
    tasks,
    loading,
    userProfiles,
    unreadCounts,
    deleteTask,
    updateTask,
    user,
    appLinkStatus,
  } = useDevNotes();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showClosed, setShowClosed] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [sortField, setSortField] = useState<TaskSortField>('stale');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [visibleReportIds, setVisibleReportIds] = useState<Set<string> | null>(null);

  // The backend already returns only the reports this user may see — for
  // privileged roles that's everything; otherwise it's the reports they created,
  // are assigned to, or are involved in via messages (@mentions / authored
  // comments), computed server-side. We therefore trust `tasks` directly.
  //
  // This replaces a former per-task `fetchMessages` fan-out that issued one
  // request per task purely to recompute visibility client-side. With large
  // projects that N+1 saturated the backend and produced 504s (which also broke
  // saving). Visibility is now a single, free derivation from already-loaded data.
  useEffect(() => {
    setVisibleReportIds(new Set(tasks.map((report) => report.id)));
  }, [tasks]);

  const getStaleMeta = (report: BugReport) => {
    const updatedTs = new Date(report.updated_at || report.created_at).getTime();
    if (Number.isNaN(updatedTs)) {
      return { isStale: false, ageDays: 0 };
    }
    const ageDays = Math.max(0, Math.floor((Date.now() - updatedTs) / MS_PER_DAY));
    const isCompleted = report.status === 'Resolved' || report.status === 'Closed';
    return {
      isStale: !isCompleted && ageDays >= STALE_DAYS,
      ageDays,
    };
  };

  const stats = useMemo(() => ({
    total: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id)) : []).length,
    open: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id) && r.status === 'Open') : []).length,
    inProgress: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id) && r.status === 'In Progress') : []).length,
    needsReview: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id) && r.status === 'Needs Review') : []).length,
    resolved: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id) && r.status === 'Resolved') : []).length,
    closed: (visibleReportIds ? tasks.filter((r) => visibleReportIds.has(r.id) && r.status === 'Closed') : []).length,
  }), [tasks, visibleReportIds]);

  const accessibleReports = useMemo(
    () => (visibleReportIds ? tasks.filter((report) => visibleReportIds.has(report.id)) : []),
    [tasks, visibleReportIds]
  );

  const filteredReports = useMemo(() => {
    const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    const statusOrder: Record<string, number> = { Open: 0, 'In Progress': 1, 'Needs Review': 2, Resolved: 3, Closed: 4 };

    return accessibleReports
      .filter((r) => {
        if (!showClosed && r.status === 'Closed') return false;
        if (showClosed && r.status !== 'Closed') return false;
        if (filterStatus !== 'all' && r.status !== filterStatus) return false;
        if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.title.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q) ||
            r.page_url.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'stale') {
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
        } else if (sortField === 'severity') {
          cmp = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
        } else if (sortField === 'status') {
          cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        } else {
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
  }, [accessibleReports, searchQuery, filterStatus, filterSeverity, showClosed, sortField, sortDir]);

  const getProfileName = (id: string | null) => {
    if (!id) return null;
    const p = userProfiles[id];
    if (!p) return null;
    if (p.full_name) {
      const first = p.full_name.split(/\s+/)[0];
      return first;
    }
    if (p.email) return p.email.split('@')[0];
    return null;
  };

  const getPageLabel = (pageUrl: string) => {
    const cleaned = pageUrl.split('?')[0].split('#')[0].replace(/\/+$/, '');
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length === 0) return 'Home';
    return decodeURIComponent(parts[parts.length - 1]).replace(/[-_]/g, ' ');
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const handleSort = (field: TaskSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return {
    // raw context passthroughs needed by row actions / detail form
    tasks,
    loading,
    unreadCounts,
    updateTask,
    deleteTask,
    user,
    appLinkStatus,
    // visibility / derived data
    visibleReportIds,
    stats,
    accessibleReports,
    filteredReports,
    // filter + sort state
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterSeverity,
    setFilterSeverity,
    showClosed,
    setShowClosed,
    sortField,
    sortDir,
    handleSort,
    // selection
    selectedReport,
    setSelectedReport,
    // helpers
    getStaleMeta,
    getProfileName,
    getPageLabel,
    formatDate,
  };
}
