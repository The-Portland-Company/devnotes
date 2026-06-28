import { useState, useEffect, useRef } from 'react';
import {
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiList,
  FiSettings,
  FiToggleLeft,
  FiToggleRight,
  FiVideo,
  FiSquare,
  FiMapPin,
} from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import DevNotesTaskListModal from './DevNotesTaskListModal';
import DevNotesForgeBanner from './DevNotesForgeBanner';

type DevNotesMenuProps = {
  /**
   * Called when the user clicks "View All Tasks". Optional — when omitted, the
   * menu opens its own built-in, self-contained All Tasks modal so the host app
   * doesn't have to render or wire one up.
   */
  onViewTasks?: () => void;
  /** Called when user clicks "Settings" */
  onSettings?: () => void;
  /** Custom icon component for the menu trigger */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Position of the parent button — controls dropdown alignment */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Direction the dropdown opens — default 'down' */
  dropdownDirection?: 'up' | 'down';
  /** Forwarded to the built-in modal: navigate to the page a report was filed on */
  onNavigateToPage?: (pageUrl: string, reportId: string) => void;
};

export default function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position = 'bottom-right', dropdownDirection = 'down', onNavigateToPage }: DevNotesMenuProps) {
  const {
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
    startUserStoryRecording,
    stopUserStoryRecording,
    tasks,
    role,
    forgeStatus,
  } = useDevNotes();
  const forgeDisconnected = forgeStatus?.connected === false;
  const [open, setOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const openBugCount = tasks.filter(
    (r) => r.status === 'Open' || r.status === 'In Progress' || r.status === 'Needs Review'
  ).length;

  if (role === 'none') return null;

  const handleIconClick = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      e.stopPropagation();
      setIsEnabled(false);
      return;
    }

    setOpen((prev) => !prev);
  };

  return (
    <div
      ref={menuRef}
      data-bug-menu
      className="relative"
      style={{ zIndex: open ? 9995 : 'auto' }}
    >
      <button
        type="button"
        aria-label={isEnabled ? 'Click to disable task creation' : 'Task menu'}
        onClick={handleIconClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:text-emerald-600"
        title="Tasks"
      >
        <span className="relative">
          {IconComponent ? (
            <IconComponent size={20} color={isEnabled ? '#E53E3E' : undefined} />
          ) : (
            <FiAlertTriangle size={20} color={isEnabled ? '#E53E3E' : undefined} />
          )}
          {forgeDisconnected ? (
            <span
              title="Forge is disconnected"
              className="absolute -right-2 -top-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
              style={{ boxShadow: '0 0 0 2px #ffffff' }}
            >
              !
            </span>
          ) : (
            openBugCount > 0 && (
              <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {openBugCount}
              </span>
            )
          )}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            ...(position?.includes('left') ? { left: 0 } : { right: 0 }),
            ...(dropdownDirection === 'up' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }),
            width: 320,
            zIndex: 50,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            backgroundColor: '#ffffff',
            paddingTop: 8,
            paddingBottom: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
          }}
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-500">DEV NOTES</p>
          </div>

          {forgeDisconnected && (
            <div style={{ padding: '0 12px 8px' }}>
              <DevNotesForgeBanner />
            </div>
          )}

          <div className="my-1 border-t border-gray-200" />

          <button
            type="button"
            data-menu-item
            onClick={() => {
              setIsEnabled(!isEnabled);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {isEnabled ? (
                <FiToggleRight className="text-green-600" />
              ) : (
                <FiToggleLeft />
              )}
              {isEnabled ? 'Stop Creating Tasks' : 'Create Task'}
            </span>
            <span
              role="switch"
              aria-checked={isEnabled}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                isEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowTasksAlways(!showTasksAlways)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {showTasksAlways ? (
                <FiEye className="text-blue-600" />
              ) : (
                <FiEyeOff />
              )}
              Show Tasks Always
            </span>
            <span
              role="switch"
              aria-checked={showTasksAlways}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                showTasksAlways ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showTasksAlways ? 'translate-x-4' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setHideResolvedClosed(!hideResolvedClosed)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <FiFilter
                className={hideResolvedClosed ? 'text-green-600' : 'text-gray-500'}
              />
              Hide Resolved/Closed
            </span>
            <span
              role="switch"
              aria-checked={hideResolvedClosed}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                hideResolvedClosed ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  hideResolvedClosed ? 'translate-x-4' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowStepDots(!showStepDots)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <FiMapPin className={showStepDots ? 'text-blue-600' : 'text-gray-500'} />
              Show Step Dots
            </span>
            <span
              role="switch"
              aria-checked={showStepDots}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                showStepDots ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showStepDots ? 'translate-x-4' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </span>
          </button>

          {canRecordUserStory && (
            <>
              <div className="my-1 border-t border-gray-200" />
              <button
                type="button"
                data-menu-item
                onClick={() => {
                  setOpen(false);
                  if (isRecordingStory) {
                    stopUserStoryRecording();
                  } else {
                    startUserStoryRecording();
                  }
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  {isRecordingStory ? (
                    <FiSquare className="text-red-600" />
                  ) : (
                    <FiVideo className="text-blue-600" />
                  )}
                  {isRecordingStory
                    ? 'Stop Recording Test Case'
                    : 'Record User Story (Test Case)'}
                </span>
              </button>
            </>
          )}

          <div className="my-1 border-t border-gray-200" />

          {/* Always-on, inline-styled trigger for the built-in self-contained task modal */}
          <button
            type="button"
            data-menu-item
            onClick={() => {
              setOpen(false);
              if (onViewTasks) {
                onViewTasks();
              } else {
                setShowTaskModal(true);
              }
            }}
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '8px 12px',
              fontSize: 14,
              color: '#1f2937',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <FiList style={{ flexShrink: 0 }} />
              View All Tasks
            </span>
            {openBugCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  minWidth: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9999,
                  background: '#fee2e2',
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#b91c1c',
                }}
              >
                {openBugCount}
              </span>
            )}
          </button>

          {onSettings && (
            <button
              type="button"
              data-menu-item
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <FiSettings className="flex-shrink-0" />
                Settings
              </span>
            </button>
          )}
        </div>
      )}

      {/* Built-in self-contained modal, used when the host app doesn't supply onViewTasks */}
      {!onViewTasks && (
        <DevNotesTaskListModal
          open={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          onNavigateToPage={onNavigateToPage}
        />
      )}
    </div>
  );
}
