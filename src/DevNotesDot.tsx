import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  FiAlertCircle,
  FiLoader,
  FiEye,
  FiCheckCircle,
  FiArchive,
  FiMove,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import DevNotesForm from './DevNotesForm';
import {
  calculateBugPositionFromPoint,
  resolveBugReportCoordinates,
  normalizePageUrl,
} from './utils/bugAnchors';
import { useBugReportPosition } from './hooks/useBugReportPosition';
import type { BugReport } from './types';

type DevNotesDotProps = {
  report: BugReport;
};

const statusConfig: Record<string, { color: string; bgClass: string; bgHoverClass: string; icon: typeof FiAlertCircle }> = {
  Open: { color: 'red', bgClass: 'bg-red-500', bgHoverClass: 'bg-red-600', icon: FiAlertCircle },
  'In Progress': { color: 'blue', bgClass: 'bg-blue-500', bgHoverClass: 'bg-blue-600', icon: FiLoader },
  'Needs Review': { color: 'purple', bgClass: 'bg-purple-500', bgHoverClass: 'bg-purple-600', icon: FiEye },
  Resolved: { color: 'green', bgClass: 'bg-green-500', bgHoverClass: 'bg-green-600', icon: FiCheckCircle },
  Closed: { color: 'gray', bgClass: 'bg-gray-500', bgHoverClass: 'bg-gray-600', icon: FiArchive },
};

const severityBadgeColors: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low: 'bg-green-100 text-green-800',
};

const MIN_DRAG_DISTANCE = 5;
const DEFAULT_DOT_Z_INDEX = 9998;

const resolveAttachedElementZIndex = (selector: string | null | undefined): number | null => {
  if (!selector || typeof document === 'undefined' || typeof window === 'undefined') return null;
  const targetElement = document.querySelector(selector) as HTMLElement | null;
  if (!targetElement) return null;

  let currentElement: HTMLElement | null = targetElement;
  while (
    currentElement &&
    currentElement !== document.body &&
    currentElement !== document.documentElement
  ) {
    const computed = window.getComputedStyle(currentElement).zIndex;
    if (computed !== 'auto') {
      const parsed = Number.parseInt(computed, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    currentElement = currentElement.parentElement;
  }

  return 0;
};

export default function DevNotesDot({ report }: DevNotesDotProps) {
  const { deleteBugReport, bugReportTypes, updateBugReport, compensate } = useDevNotes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ clientX: number; clientY: number } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    dotX: number;
    dotY: number;
    hasMoved: boolean;
  } | null>(null);
  const didDragRef = useRef(false);
  const dotRef = useRef<HTMLDivElement | null>(null);

  const handleDelete = async () => {
    const success = await deleteBugReport(report.id);
    if (success) {
      setIsFormOpen(false);
    }
  };

  const getTypeNames = useCallback(() => {
    return report.types
      .map((typeId) => {
        const type = bugReportTypes.find((t) => t.id === typeId);
        return type?.name || 'Unknown';
      })
      .join(', ');
  }, [report.types, bugReportTypes]);

  const persistPosition = useCallback(
    async (clientX: number, clientY: number) => {
      const payload = calculateBugPositionFromPoint({
        clientX,
        clientY,
        elementsToIgnore: [dotRef.current],
      });

      await updateBugReport(report.id, {
        x_position: payload.x,
        y_position: payload.y,
        target_selector: payload.targetSelector,
        target_relative_x: payload.targetRelativeX,
        target_relative_y: payload.targetRelativeY,
        page_url: normalizePageUrl(`${window.location.pathname}${window.location.search}`),
      });
    },
    [report.id, updateBugReport]
  );

  const anchoredPosition = useBugReportPosition(report);
  const resolvedPosition = anchoredPosition ?? resolveBugReportCoordinates(report);

  const handleDragStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
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
        hasMoved: false,
      };

      setIsDragging(true);
      setDragPosition(currentPosition);
    },
    [dragPosition, resolvedPosition]
  );

  const handleDragMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;

      if (
        !dragStartRef.current.hasMoved &&
        Math.sqrt(deltaX * deltaX + deltaY * deltaY) > MIN_DRAG_DISTANCE
      ) {
        dragStartRef.current.hasMoved = true;
      }

      setDragPosition({
        x: dragStartRef.current.dotX + deltaX,
        y: dragStartRef.current.dotY + deltaY,
      });
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const hasMoved = dragStartRef.current.hasMoved;
      didDragRef.current = hasMoved;

      setIsDragging(false);
      dragStartRef.current = null;

      if (hasMoved && event) {
        // Keep dragPosition so dot stays at new location; show confirm/cancel
        setPendingMove({ clientX: event.clientX, clientY: event.clientY });
      } else {
        setDragPosition(null);
      }
    },
    [isDragging]
  );

  const confirmMove = useCallback(async () => {
    if (!pendingMove) return;
    await persistPosition(pendingMove.clientX, pendingMove.clientY);
    setPendingMove(null);
    setDragPosition(null);
  }, [pendingMove, persistPosition]);

  const cancelMove = useCallback(() => {
    setPendingMove(null);
    setDragPosition(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (!resolvedPosition && !dragPosition) {
    return null;
  }

  const displayPosition = dragPosition || resolvedPosition!;
  const attachedElementZIndex = resolveAttachedElementZIndex(report.target_selector);
  const dotZIndex =
    attachedElementZIndex !== null ? attachedElementZIndex + 1 : DEFAULT_DOT_Z_INDEX;

  const config = statusConfig[report.status] || statusConfig.Open;
  const StatusIcon = config.icon;

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsFormOpen(true);
    }
  };

  const creatorName =
    report.creator?.full_name || report.creator?.email || report.created_by || 'Unknown';
  const descriptionPreview = report.description?.trim() || 'No description provided.';
  const createdLabel = new Date(report.created_at).toLocaleString();
  const needsApproval = !report.approved && !report.ai_ready;

  const compensated = compensate(displayPosition.x, displayPosition.y);

  return (
    <>
      {/* Dot with hover tooltip */}
      <div
        className="group"
        style={{
          position: 'absolute',
          left: `${compensated.x}px`,
          top: `${compensated.y}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: isDragging ? dotZIndex + 1 : dotZIndex,
        }}
        onMouseEnter={() => !isFormOpen && !isDragging && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          ref={dotRef}
          className={`${isDragging ? `${config.bgHoverClass} w-8 h-8` : `${config.bgClass} w-6 h-6`} rounded-full border-[3px] border-white flex items-center justify-center transition-all duration-150 ${
            isDragging
              ? 'shadow-[0_4px_16px_rgba(0,0,0,0.4)] cursor-grabbing'
              : 'shadow-[0_2px_8px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-[1.2] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]'
          }`}
          onMouseDown={handleDragStart}
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
              return;
            }
            if (pendingMove) return;
            setIsFormOpen(true);
          }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
        >
          {isDragging ? (
            <FiMove color="white" size={14} />
          ) : (
            <StatusIcon color="white" size={12} />
          )}
          {needsApproval && (
            <span className="absolute -top-2 -right-2 text-base font-bold text-orange-500 pointer-events-none leading-none">
              *
            </span>
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && !pendingMove && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[280px] bg-gray-800 text-white rounded-lg p-3 shadow-xl z-[2147483647] pointer-events-none">
            <div className="font-bold text-sm mb-1">{report.title}</div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded ${severityBadgeColors[report.severity] || 'bg-gray-100 text-gray-800'}`}>
                {report.severity}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                config.color === 'red' ? 'bg-red-100 text-red-800' :
                config.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                config.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                config.color === 'green' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <StatusIcon size={10} />
                {report.status}
              </span>
              {report.approved && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-800">Approved</span>
              )}
              {report.ai_ready && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">AI Ready</span>
              )}
            </div>
            <div className="text-xs text-gray-300">{getTypeNames()}</div>
            <div className="text-xs text-gray-200 mt-2">{descriptionPreview}</div>
            <div className="text-xs text-gray-300 mt-2">
              Created by {creatorName} on {createdLabel}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Click to view/edit &middot; Hold Shift + drag to reposition
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
          </div>
        )}

        {/* Confirm/cancel move buttons */}
        {pendingMove && !isDragging && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-1.5" style={{ pointerEvents: 'auto' }}>
            <button
              className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                confirmMove();
              }}
              title="Confirm new position"
            >
              <FiCheck color="white" size={14} />
            </button>
            <button
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                cancelMove();
              }}
              title="Cancel move"
            >
              <FiX color="white" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Form modal */}
      {isFormOpen && (
        <>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998, pointerEvents: 'auto' }}
            onClick={() => setIsFormOpen(false)}
          />
          <div style={{ position: 'absolute', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: 16 }}>
            <div className="pointer-events-auto max-h-[calc(100vh-32px)] overflow-y-auto rounded-lg shadow-xl">
              <DevNotesForm
                pageUrl={report.page_url}
                xPosition={report.x_position}
                yPosition={report.y_position}
                targetSelector={report.target_selector ?? null}
                targetRelativeX={report.target_relative_x ?? null}
                targetRelativeY={report.target_relative_y ?? null}
                existingReport={report}
                onSave={() => setIsFormOpen(false)}
                onCancel={() => setIsFormOpen(false)}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
