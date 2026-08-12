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
import {
  menuDividerStyle,
  menuKnobStyle,
  menuPanelStyle,
  menuRowLabelStyle,
  menuRowStyle,
  menuSwitchStyle,
} from './menuLayout';

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
  /** Open the dropdown on first paint (tests / storybook). */
  defaultOpen?: boolean;
};

export default function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position = 'bottom-right', dropdownDirection = 'down', onNavigateToPage, defaultOpen = false }: DevNotesMenuProps) {
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
  const hoverOn = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = '#f9fafb';
  };
  const hoverOff = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = 'transparent';
  };
  const [open, setOpen] = useState(defaultOpen);
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
      style={{ position: 'relative', zIndex: open ? 9995 : 'auto' }}
    >
      <button
        type="button"
        aria-label={isEnabled ? 'Click to disable task creation' : 'Task menu'}
        onClick={handleIconClick}
        style={{
          display: 'inline-flex',
          height: 32,
          width: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: '#374151',
          cursor: 'pointer',
        }}
        title="Tasks"
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          {IconComponent ? (
            <IconComponent size={20} color={isEnabled ? '#E53E3E' : undefined} />
          ) : (
            <FiAlertTriangle size={20} color={isEnabled ? '#E53E3E' : undefined} />
          )}
          {forgeDisconnected ? (
            <span
              title="Forge is disconnected"
              style={{
                position: 'absolute',
                right: -8,
                top: -4,
                display: 'inline-flex',
                height: 16,
                minWidth: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9999,
                background: '#dc2626',
                padding: '0 4px',
                fontSize: 10,
                fontWeight: 700,
                color: '#ffffff',
                boxShadow: '0 0 0 2px #ffffff',
              }}
            >
              !
            </span>
          ) : (
            openBugCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  right: -8,
                  top: -4,
                  display: 'inline-flex',
                  minWidth: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 9999,
                  background: '#dc2626',
                  padding: '0 4px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#ffffff',
                }}
              >
                {openBugCount}
              </span>
            )
          )}
        </span>
      </button>

      {open && (
        <div
          data-devnotes-menu-panel
          style={{
            ...menuPanelStyle,
            ...(position?.includes('left') ? { left: 0 } : { right: 0 }),
            ...(dropdownDirection === 'up' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }),
          }}
        >
          <div style={{ padding: '8px 12px' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#6b7280' }}>DEV NOTES</p>
          </div>

          {forgeDisconnected && (
            <div style={{ padding: '0 12px 8px' }}>
              <DevNotesForgeBanner />
            </div>
          )}

          <div style={menuDividerStyle} />

          <button
            type="button"
            data-menu-item
            onClick={() => {
              setIsEnabled(!isEnabled);
              setOpen(false);
            }}
            style={menuRowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span style={menuRowLabelStyle}>
              {isEnabled ? (
                <FiToggleRight color="#16a34a" style={{ flexShrink: 0 }} />
              ) : (
                <FiToggleLeft style={{ flexShrink: 0 }} />
              )}
              {isEnabled ? 'Stop Creating Tasks' : 'Create Task'}
            </span>
            <span role="switch" aria-checked={isEnabled} style={menuSwitchStyle(isEnabled)}>
              <span style={menuKnobStyle(isEnabled)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowTasksAlways(!showTasksAlways)}
            style={menuRowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span style={menuRowLabelStyle}>
              {showTasksAlways ? (
                <FiEye color="#2563eb" style={{ flexShrink: 0 }} />
              ) : (
                <FiEyeOff style={{ flexShrink: 0 }} />
              )}
              Show Tasks Always
            </span>
            <span role="switch" aria-checked={showTasksAlways} style={menuSwitchStyle(showTasksAlways)}>
              <span style={menuKnobStyle(showTasksAlways)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setHideResolvedClosed(!hideResolvedClosed)}
            style={menuRowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span style={menuRowLabelStyle}>
              <FiFilter
                color={hideResolvedClosed ? '#16a34a' : '#6b7280'}
                style={{ flexShrink: 0 }}
              />
              Hide Resolved/Closed
            </span>
            <span role="switch" aria-checked={hideResolvedClosed} style={menuSwitchStyle(hideResolvedClosed)}>
              <span style={menuKnobStyle(hideResolvedClosed)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowStepDots(!showStepDots)}
            style={menuRowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span style={menuRowLabelStyle}>
              <FiMapPin
                color={showStepDots ? '#2563eb' : '#6b7280'}
                style={{ flexShrink: 0 }}
              />
              Show Step Dots
            </span>
            <span role="switch" aria-checked={showStepDots} style={menuSwitchStyle(showStepDots, '#3b82f6')}>
              <span style={menuKnobStyle(showStepDots)} />
            </span>
          </button>

          {canRecordUserStory && (
            <>
              <div style={menuDividerStyle} />
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
                style={{ ...menuRowStyle, justifyContent: 'flex-start' }}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span style={menuRowLabelStyle}>
                  {isRecordingStory ? (
                    <FiSquare color="#dc2626" style={{ flexShrink: 0 }} />
                  ) : (
                    <FiVideo color="#2563eb" style={{ flexShrink: 0 }} />
                  )}
                  {isRecordingStory
                    ? 'Stop Recording Test Case'
                    : 'Record User Story (Test Case)'}
                </span>
              </button>
            </>
          )}

          <div style={menuDividerStyle} />

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
            style={menuRowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span style={menuRowLabelStyle}>
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
              style={{ ...menuRowStyle, justifyContent: 'flex-start' }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <span style={menuRowLabelStyle}>
                <FiSettings style={{ flexShrink: 0 }} />
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
