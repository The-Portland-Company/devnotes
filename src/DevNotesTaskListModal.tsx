import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  FiSearch,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiClock,
  FiMinus,
  FiSquare,
  FiX,
} from 'react-icons/fi';
import DevNotesForm from './DevNotesForm';
import DevNotesForgeBanner from './DevNotesForgeBanner';
import { useTaskListData, type TaskSortField } from './hooks/useTaskListData';

type DevNotesTaskListModalProps = {
  /** Whether the modal is shown */
  open: boolean;
  /** Called when the modal should close (backdrop, Escape, or the ✕ button) */
  onClose: () => void;
  /** Called when the user wants to navigate to the page where a report was filed */
  onNavigateToPage?: (pageUrl: string, reportId: string) => void;
  /** Title shown at the top */
  title?: string;
};

/**
 * Fully self-contained "All Tasks" modal. Every style is inline so the modal
 * renders correctly even when the host application never imports the package's
 * compiled stylesheet (`dist/styles.css`). Icons come from `react-icons`, which
 * ships as bundled SVG components (not an external stylesheet).
 */

const STATUS_STYLES: Record<string, CSSProperties> = {
  Open: { background: '#fee2e2', color: '#b91c1c' },
  'In Progress': { background: '#dbeafe', color: '#1d4ed8' },
  'Needs Review': { background: '#f3e8ff', color: '#7e22ce' },
  Resolved: { background: '#dcfce7', color: '#15803d' },
  Closed: { background: '#f3f4f6', color: '#4b5563' },
};

const SEVERITY_STYLES: Record<string, CSSProperties> = {
  Critical: { background: '#ef4444', color: '#ffffff' },
  High: { background: '#ffedd5', color: '#c2410c' },
  Medium: { background: '#fef9c3', color: '#a16207' },
  Low: { background: '#f3f4f6', color: '#4b5563' },
};

const pill = (extra: CSSProperties): CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  ...extra,
});

const thStyle: CSSProperties = {
  padding: '8px 12px',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
  textAlign: 'left',
};

const tdStyle: CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid #f3f4f6',
  verticalAlign: 'top',
};

const controlStyle: CSSProperties = {
  padding: '8px 8px',
  fontSize: 14,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#ffffff',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function DevNotesTaskListModal({
  open,
  onClose,
  onNavigateToPage,
  title = 'All Tasks',
}: DevNotesTaskListModalProps) {
  const {
    loading,
    unreadCounts,
    deleteTask,
    updateTask,
    user,
    visibleReportIds,
    stats,
    accessibleReports,
    filteredReports,
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
    selectedReport,
    setSelectedReport,
    getStaleMeta,
    getProfileName,
    getPageLabel,
    formatDate,
    tasks,
    appLinkStatus,
  } = useTaskListData();

  // Deep link to the configured project's board in Focus Forge, mirroring the
  // per-task "Open in Forge" link in DevNotesForm.
  const forgeProjectUrl = (() => {
    const discovery = appLinkStatus?.projectDiscovery;
    const baseUrl = discovery?.baseUrl?.trim();
    const projectId = discovery?.projectId;
    if (!baseUrl || !projectId) return null;
    return `${baseUrl.replace(/\/+$/, '')}/projects/${encodeURIComponent(projectId)}`;
  })();

  // Window-style behavior: the modal panel has a title bar that can be dragged
  // to reposition it, a minimize button that collapses it to just the bar, and
  // a close (exit) button. `pos === null` means "centered" (default).
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [minimized, setMinimized] = useState(false);

  const clampPos = useCallback((p: { x: number; y: number }) => {
    if (typeof window === 'undefined') return p;
    const w = panelRef.current?.offsetWidth ?? 0;
    const h = panelRef.current?.offsetHeight ?? 0;
    return {
      x: Math.min(Math.max(p.x, 8), Math.max(8, window.innerWidth - w - 8)),
      y: Math.min(Math.max(p.y, 8), Math.max(8, window.innerHeight - h - 8)),
    };
  }, []);

  const onBarPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    const rect = panelRef.current?.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect?.left ?? 0,
      originY: rect?.top ?? 0,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer may already be gone */
    }
    e.preventDefault();
  }, []);

  const onBarPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const st = dragStateRef.current;
      if (!st || e.pointerId !== st.pointerId) return;
      setPos(
        clampPos({
          x: st.originX + (e.clientX - st.startX),
          y: st.originY + (e.clientY - st.startY),
        })
      );
    },
    [clampPos]
  );

  const onBarPointerEnd = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(st.pointerId);
    } catch {
      /* ignore */
    }
    dragStateRef.current = null;
  }, []);

  // Reset window state each time the modal is opened.
  useEffect(() => {
    if (open) {
      setMinimized(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReport) {
          setSelectedReport(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, selectedReport, setSelectedReport]);

  if (!open) return null;

  const SortIcon = ({ field }: { field: TaskSortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />;
  };

  const sortableHeader = (label: string, field: TaskSortField, extra?: CSSProperties) => (
    <th
      style={{ ...thStyle, cursor: 'pointer', userSelect: 'none', ...extra }}
      onClick={() => handleSort(field)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  const renderBody = () => {
    if (selectedReport) {
      return (
        <DevNotesForm
          pageUrl={selectedReport.page_url}
          xPosition={selectedReport.x_position}
          yPosition={selectedReport.y_position}
          targetSelector={selectedReport.target_selector ?? null}
          targetRelativeX={selectedReport.target_relative_x ?? null}
          targetRelativeY={selectedReport.target_relative_y ?? null}
          existingReport={selectedReport}
          onSave={() => setSelectedReport(null)}
          onCancel={() => setSelectedReport(null)}
          onArchive={async () => {
            await updateTask(selectedReport.id, {
              status: 'Closed',
              resolved_by: selectedReport.resolved_by || user.id,
            });
            setSelectedReport(null);
          }}
          onDelete={async () => {
            await deleteTask(selectedReport.id);
            setSelectedReport(null);
          }}
        />
      );
    }

    if ((loading && tasks.length === 0) || visibleReportIds === null) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid #d1d5db',
              borderTopColor: '#4b5563',
              borderRadius: '50%',
              animation: 'devnotes-spin 0.8s linear infinite',
            }}
          />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header (title + window controls live in the drag bar above) */}
        {forgeProjectUrl && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {forgeProjectUrl && (
              <a
                href={forgeProjectUrl}
                target="_blank"
                rel="noreferrer"
                title="Open project in Forge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 9999,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <FiExternalLink size={12} style={{ color: '#94a3b8' }} />
                View in Forge
              </a>
            )}
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 8,
          }}
        >
          {([
            ['Open', stats.open, '#dc2626'],
            ['In Progress', stats.inProgress, '#2563eb'],
            ['Review', stats.needsReview, '#9333ea'],
            ['Resolved', stats.resolved, '#16a34a'],
            ['Closed', stats.closed, '#6b7280'],
            ['Total', stats.total, '#374151'],
          ] as const).map(([label, count, color]) => (
            <div
              key={label}
              style={{
                textAlign: 'center',
                borderRadius: 8,
                border: '1px solid #f3f4f6',
                padding: '8px 0',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: 10.5, color: '#6b7280' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search and filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <FiSearch
              size={14}
              style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...controlStyle, width: '100%', paddingLeft: 32, paddingRight: 12 }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={controlStyle}
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={controlStyle}
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            style={{
              padding: '8px 12px',
              fontSize: 14,
              borderRadius: 6,
              cursor: 'pointer',
              border: showClosed ? '1px solid #1f2937' : '1px solid #e5e7eb',
              background: showClosed ? '#1f2937' : '#ffffff',
              color: showClosed ? '#ffffff' : '#4b5563',
            }}
          >
            {showClosed ? 'Show Active' : 'Show Closed'}
          </button>
        </div>

        {/* Results count */}
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {filteredReports.length} of {showClosed ? stats.closed : stats.total - stats.closed}{' '}
          {showClosed ? 'closed' : 'active'} tasks
        </div>

        {/* Table */}
        {filteredReports.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 0',
              color: '#9ca3af',
            }}
          >
            <FiAlertTriangle size={32} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 420 }}>
              {accessibleReports.length === 0
                ? 'No visible tasks yet. You will only see tasks you own, are assigned to, commented on, or were mentioned in.'
                : 'No tasks match your filters.'}
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={thStyle}>Title</th>
                  {sortableHeader('Status', 'status')}
                  {sortableHeader('Severity', 'severity')}
                  <th style={thStyle}>Page</th>
                  <th style={thStyle}>Assigned</th>
                  {sortableHeader('Freshness', 'stale')}
                  {sortableHeader('Date', 'created_at')}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const unread = unreadCounts[report.id] || 0;
                  const stale = getStaleMeta(report);
                  return (
                    <tr
                      key={report.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedReport(report)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = '';
                      }}
                    >
                      <td style={{ ...tdStyle, maxWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontWeight: 500,
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {report.title}
                          </span>
                          {unread > 0 && (
                            <span
                              style={pill({
                                background: '#f3e8ff',
                                color: '#7e22ce',
                                fontSize: 10,
                                fontWeight: 700,
                                minWidth: 18,
                                textAlign: 'center',
                                padding: '0 6px',
                              })}
                            >
                              {unread}
                            </span>
                          )}
                          {stale.isStale && (
                            <span
                              style={{
                                ...pill({ background: '#fef3c7', color: '#92400e', fontSize: 10, fontWeight: 600 }),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <FiClock size={10} />
                              Stale {stale.ageDays}d
                            </span>
                          )}
                        </div>
                        {report.types.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                            {report.types.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: 9.6,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: '#f3f4f6',
                                  color: '#6b7280',
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={pill(STATUS_STYLES[report.status] || { background: '#f3f4f6', color: '#4b5563' })}>
                          {report.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={pill(SEVERITY_STYLES[report.severity] || { background: '#f3f4f6', color: '#4b5563' })}>
                          {report.severity}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 140,
                            }}
                          >
                            {getPageLabel(report.page_url)}
                          </span>
                          {onNavigateToPage && (
                            <button
                              type="button"
                              title="Go to page"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToPage(report.page_url, report.id);
                              }}
                              style={{
                                flexShrink: 0,
                                padding: 2,
                                borderRadius: 4,
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                display: 'inline-flex',
                              }}
                            >
                              <FiExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>
                        {getProfileName(report.assigned_to) || '—'}
                      </td>
                      <td style={tdStyle}>
                        {stale.isStale ? (
                          <span
                            style={{
                              ...pill({ background: '#fef3c7', color: '#92400e' }),
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <FiClock size={11} />
                            {stale.ageDays}d stale
                          </span>
                        ) : (
                          <span style={pill({ background: '#ecfdf5', color: '#047857' })}>Fresh</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {formatDate(report.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const windowButtonStyle: CSSProperties = {
    padding: 6,
    borderRadius: 6,
    border: 'none',
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  };

  const titleBar = (
    <div
      onPointerDown={onBarPointerDown}
      onPointerMove={onBarPointerMove}
      onPointerUp={onBarPointerEnd}
      onPointerCancel={onBarPointerEnd}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 12px 10px 16px',
        borderBottom: minimized ? 'none' : '1px solid #f3f4f6',
        cursor: 'move',
        userSelect: 'none',
        touchAction: 'none',
        background: '#f9fafb',
        borderRadius: minimized ? 12 : '12px 12px 0 0',
      }}
    >
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? 'Restore' : 'Minimize'}
          title={minimized ? 'Restore' : 'Minimize'}
          style={windowButtonStyle}
        >
          {minimized ? <FiSquare size={14} /> : <FiMinus size={16} />}
        </button>
        <button type="button" onClick={onClose} aria-label="Close" title="Close" style={windowButtonStyle}>
          <FiX size={18} />
        </button>
      </div>
    </div>
  );

  // Minimized: just the floating title bar (no backdrop, page stays interactive).
  if (minimized) {
    return (
      <div
        role="dialog"
        style={{
          position: 'fixed',
          ...(pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }),
          zIndex: 9998,
          width: 280,
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        {titleBar}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        padding: 16,
      }}
    >
      <style>{'@keyframes devnotes-spin{to{transform:rotate(360deg)}}'}</style>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
        onClick={() => (selectedReport ? setSelectedReport(null) : onClose())}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        style={{
          ...(pos
            ? { position: 'fixed', left: pos.x, top: pos.y, width: 'min(1024px, calc(100vw - 32px))' }
            : { position: 'relative', width: '100%', maxWidth: 1024 }),
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 12,
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {titleBar}
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <DevNotesForgeBanner style={{ marginBottom: 16 }} />
          {renderBody()}
        </div>
      </div>
    </div>
  );
}
