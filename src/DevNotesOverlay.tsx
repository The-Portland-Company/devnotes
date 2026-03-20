import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiCrosshair, FiMove } from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import DevNotesForm from './DevNotesForm';
import DevNotesDot from './DevNotesDot';
import { calculateBugPositionFromPoint } from './utils/bugAnchors';
import type { BugReport } from './types';

type DevNotesOverlayProps = {
  /** Optional: ID of a report to open immediately */
  openReportId?: string | null;
  /** Called when the opened report is closed */
  onOpenReportClose?: () => void;
};

export default function DevNotesOverlay({
  openReportId,
  onOpenReportClose,
}: DevNotesOverlayProps = {}) {
  const {
    isEnabled,
    setIsEnabled,
    showTasksAlways,
    hideResolvedClosed,
    tasks,
    currentPageTasks,
    deleteTask,
    updateTask,
    dotContainer,
    compensate,
    role,
    user,
  } = useDevNotes();

  const [pendingDot, setPendingDot] = useState<{
    x: number;
    y: number;
    targetSelector: string | null;
    targetRelativeX: number | null;
    targetRelativeY: number | null;
  } | null>(null);
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [openedReport, setOpenedReport] = useState<BugReport | null>(null);
  const pendingDotRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; dotX: number; dotY: number } | null>(null);
  const didDragRef = useRef(false);
  const justEnabledRef = useRef(false);

  // Set justEnabled guard when isEnabled transitions to true
  useEffect(() => {
    if (isEnabled) {
      justEnabledRef.current = true;
      const timer = setTimeout(() => {
        justEnabledRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
    justEnabledRef.current = false;
    return undefined;
  }, [isEnabled]);

  // Handle openReportId prop
  useEffect(() => {
    if (openReportId) {
      const report = tasks.find((r) => r.id === openReportId);
      if (report) {
        setOpenedReport(report);
      }
    }
  }, [openReportId, tasks]);

  // ESC key: progressively dismiss form -> dot -> task management mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPendingForm) {
          setShowPendingForm(false);
        } else if (pendingDot) {
          setPendingDot(null);
        } else if (isEnabled) {
          setIsEnabled(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, setIsEnabled, pendingDot, showPendingForm]);

  // Set crosshair cursor on body when task management is enabled and form not open
  useEffect(() => {
    if (isEnabled && !showPendingForm) {
      document.body.style.cursor = 'crosshair';
      return () => {
        document.body.style.cursor = '';
      };
    }
    return undefined;
  }, [isEnabled, showPendingForm]);

  const handleCloseOpenedReport = useCallback(() => {
    setOpenedReport(null);
    onOpenReportClose?.();
  }, [onOpenReportClose]);

  const handleDeleteOpenedReport = useCallback(async () => {
    if (openedReport) {
      await deleteTask(openedReport.id);
      setOpenedReport(null);
      onOpenReportClose?.();
    }
  }, [openedReport, deleteTask, onOpenReportClose]);

  const handleArchiveOpenedReport = useCallback(async () => {
    if (!openedReport) return;

    const archived = await updateTask(openedReport.id, {
      status: 'Closed',
      resolved_by: openedReport.resolved_by || user.id,
    });

    if (archived) {
      setOpenedReport(null);
      onOpenReportClose?.();
    }
  }, [openedReport, updateTask, onOpenReportClose, user.id]);

  // Document-level click handler for placing/repositioning bug dots
  useEffect(() => {
    if (!isEnabled || showPendingForm) return undefined;

    const handleDocumentClick = (e: MouseEvent) => {
      if (justEnabledRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('[data-bug-form]') ||
        target.closest('[data-bug-dot]') ||
        target.closest('[data-bug-menu]') ||
        target.closest('[data-pending-dot]')
      ) {
        return;
      }

      const position = calculateBugPositionFromPoint({
        clientX: e.clientX,
        clientY: e.clientY,
      });

      setPendingDot(position);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [isEnabled, showPendingForm]);

  const handleSave = useCallback((_report: BugReport) => {
    setPendingDot(null);
    setShowPendingForm(false);
  }, []);

  const handleCancel = useCallback(() => {
    setPendingDot(null);
    setShowPendingForm(false);
  }, []);

  const handlePendingDotClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setIsDragging(false);
    setShowPendingForm(true);
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pendingDot) return;

      didDragRef.current = false;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        dotX: pendingDot.x,
        dotY: pendingDot.y,
      };
    },
    [pendingDot]
  );

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !pendingDot) return;

      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        didDragRef.current = true;
      }

      setPendingDot((prev) =>
        prev
          ? {
              ...prev,
              x: dragStartRef.current!.dotX + deltaX,
              y: dragStartRef.current!.dotY + deltaY,
            }
          : prev
      );
    },
    [isDragging, pendingDot]
  );

  const handleDragEnd = useCallback((event?: MouseEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;

    if (event && didDragRef.current) {
      const position = calculateBugPositionFromPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        elementsToIgnore: [pendingDotRef.current],
      });
      setPendingDot(position);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
    return undefined;
  }, [isDragging, handleDragMove, handleDragEnd]);

  const visiblePageReports = useMemo(
    () =>
      currentPageTasks.filter((report) => {
        if (hideResolvedClosed) {
          return report.status !== 'Closed' && report.status !== 'Resolved';
        }
        return true;
      }),
    [currentPageTasks, hideResolvedClosed]
  );

  // Render the modal for an opened report
  const renderOpenedReportModal = () => {
    if (!openedReport) return null;
    return (
      <>
        <div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9997, pointerEvents: 'auto' }}
          onClick={handleCloseOpenedReport}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: 16 }}>
          <div
            className="pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl"
            data-bug-form
          >
            <DevNotesForm
              pageUrl={openedReport.page_url}
              xPosition={openedReport.x_position}
              yPosition={openedReport.y_position}
              targetSelector={openedReport.target_selector ?? null}
              targetRelativeX={openedReport.target_relative_x ?? null}
              targetRelativeY={openedReport.target_relative_y ?? null}
              existingReport={openedReport}
              onSave={handleCloseOpenedReport}
              onCancel={handleCloseOpenedReport}
              onDelete={handleDeleteOpenedReport}
              onArchive={handleArchiveOpenedReport}
            />
          </div>
        </div>
      </>
    );
  };

  if (role === 'none') return null;

  if (!isEnabled) {
    if (!showTasksAlways && !openedReport) {
      return null;
    }

    return (
      <>
        {showTasksAlways && dotContainer &&
          createPortal(
            <>
              {visiblePageReports.map((report) => (
                <div key={report.id} data-bug-dot style={{ pointerEvents: 'auto' }}>
                  <DevNotesDot report={report} />
                </div>
              ))}
              {renderOpenedReportModal()}
            </>,
            dotContainer
          )}
        {!dotContainer && renderOpenedReportModal()}
      </>
    );
  }

  if (!dotContainer) return null;

  const pendingViewport = pendingDot
    ? compensate(
        pendingDot.x - (typeof window !== 'undefined' ? window.scrollX : 0),
        pendingDot.y - (typeof window !== 'undefined' ? window.scrollY : 0)
      )
    : null;

  return createPortal(
    <>
      {/* Visual indicator that task management is enabled */}
      <div
        style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9991, pointerEvents: 'auto' }}
        className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
      >
        {pendingDot && !showPendingForm ? <FiMove /> : <FiCrosshair />}
        <span className="text-sm font-medium">
          {pendingDot && !showPendingForm
            ? 'Click pin to add details, or click elsewhere to reposition'
            : 'Click anywhere to create a task'}
        </span>
      </div>

      {/* Existing task dots */}
      {visiblePageReports.map((report) => (
        <div key={report.id} data-bug-dot style={{ pointerEvents: 'auto' }}>
          <DevNotesDot report={report} />
        </div>
      ))}

      {/* Pending dot marker - draggable */}
      {pendingDot && pendingViewport && (
        <div
          data-pending-dot
          ref={pendingDotRef}
          className={`w-8 h-8 rounded-full border-[3px] border-white z-[9998] flex items-center justify-center transition-all duration-150 ${
            isDragging
              ? 'bg-red-600 shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-grabbing'
              : 'bg-red-500 shadow-[0_2px_8px_rgba(0,0,0,0.3)] cursor-grab animate-devnotes-pulse hover:scale-110'
          }`}
          style={{
            position: 'absolute',
            left: `${pendingViewport.x}px`,
            top: `${pendingViewport.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto',
          }}
          onMouseDown={handleDragStart}
          onClick={handlePendingDotClick}
          title="Drag to reposition, click to add details"
        >
          <FiMove color="white" size={14} />
        </div>
      )}

      {/* Pending dot modals */}
      {pendingDot && (
        <>
          {showPendingForm && (
            <div
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9997, pointerEvents: 'auto' }}
              onClick={handleCancel}
            />
          )}

          {/* Form modal */}
          {showPendingForm && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: 16 }}>
              <div
                className="pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl"
                data-bug-form
              >
                <DevNotesForm
                  pageUrl={`${window.location.pathname}${window.location.search}`}
                  xPosition={pendingDot.x}
                  yPosition={pendingDot.y}
                  targetSelector={pendingDot.targetSelector}
                  targetRelativeX={pendingDot.targetRelativeX}
                  targetRelativeY={pendingDot.targetRelativeY}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Opened report from external */}
      {openedReport && !pendingDot && renderOpenedReportModal()}
    </>,
    dotContainer
  );
}
