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
  menuDividerStyleFor,
  menuHeadingStyleFor,
  menuKnobStyle,
  menuPanelStyleFor,
  menuRowLabelStyle,
  menuRowStyleFor,
  menuSwitchStyleFor,
} from './menuLayout';
import { menuPalette, readDocumentMenuScheme, type MenuScheme } from './menuTheme';

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
  /** Horizontal hang of the panel relative to the trigger. Default start (left). */
  dropdownAlign?: 'start' | 'end';
  /** Forwarded to the built-in modal: navigate to the page a report was filed on */
  onNavigateToPage?: (pageUrl: string, reportId: string) => void;
  /** Open the dropdown on first paint (tests / storybook). */
  defaultOpen?: boolean;
};

export default function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position = 'bottom-right', dropdownDirection = 'down', dropdownAlign = 'start', onNavigateToPage, defaultOpen = false }: DevNotesMenuProps) {
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
  const [scheme, setScheme] = useState<MenuScheme>('light');
  const palette = menuPalette[scheme];
  const rowStyle = menuRowStyleFor(scheme);
  const hoverOn = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = palette.hover;
  };
  const hoverOff = (e: React.MouseEvent) => {
    (e.currentTarget as HTMLElement).style.background = 'transparent';
  };
  const [open, setOpen] = useState(defaultOpen);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setScheme(readDocumentMenuScheme());
    sync();
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-mode'] });
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
    mq?.addEventListener?.('change', sync);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.('change', sync);
    };
  }, []);

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
      data-dn-scheme={scheme}
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
          color: palette.trigger,
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
          data-dn-align={dropdownAlign}
          style={{
            ...menuPanelStyleFor(scheme),
            ...(dropdownAlign === 'end' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
            ...(dropdownDirection === 'up' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }),
          }}
        >
          <div style={{ padding: '8px 16px' }}>
            <p data-devnotes-menu-heading style={menuHeadingStyleFor(scheme)}>
              DEV NOTES
            </p>
          </div>

          {forgeDisconnected && (
            <div style={{ padding: '0 16px 8px' }}>
              <DevNotesForgeBanner />
            </div>
          )}

          <div style={menuDividerStyleFor(scheme)} />

          <button
            type="button"
            data-menu-item
            onClick={() => {
              setIsEnabled(!isEnabled);
              setOpen(false);
            }}
            style={rowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span data-menu-label style={menuRowLabelStyle}>
              {isEnabled ? (
                <FiToggleRight color="#16a34a" style={{ flexShrink: 0 }} />
              ) : (
                <FiToggleLeft style={{ flexShrink: 0 }} />
              )}
              {isEnabled ? 'Stop Creating Tasks' : 'Create Task'}
            </span>
            <span role="switch" aria-checked={isEnabled} data-menu-switch style={menuSwitchStyleFor(scheme, isEnabled)}>
              <span data-menu-knob style={menuKnobStyle(isEnabled)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowTasksAlways(!showTasksAlways)}
            style={rowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span data-menu-label style={menuRowLabelStyle}>
              {showTasksAlways ? (
                <FiEye color="#2563eb" style={{ flexShrink: 0 }} />
              ) : (
                <FiEyeOff style={{ flexShrink: 0 }} />
              )}
              Show Tasks Always
            </span>
            <span role="switch" aria-checked={showTasksAlways} data-menu-switch style={menuSwitchStyleFor(scheme, showTasksAlways)}>
              <span data-menu-knob style={menuKnobStyle(showTasksAlways)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setHideResolvedClosed(!hideResolvedClosed)}
            style={rowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span data-menu-label style={menuRowLabelStyle}>
              <FiFilter
                color={hideResolvedClosed ? '#16a34a' : palette.muted}
                style={{ flexShrink: 0 }}
              />
              Hide Resolved/Closed
            </span>
            <span role="switch" aria-checked={hideResolvedClosed} data-menu-switch style={menuSwitchStyleFor(scheme, hideResolvedClosed)}>
              <span data-menu-knob style={menuKnobStyle(hideResolvedClosed)} />
            </span>
          </button>

          <button
            type="button"
            data-menu-item
            onClick={() => setShowStepDots(!showStepDots)}
            style={rowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span data-menu-label style={menuRowLabelStyle}>
              <FiMapPin
                color={showStepDots ? '#2563eb' : palette.muted}
                style={{ flexShrink: 0 }}
              />
              Show Step Dots
            </span>
            <span role="switch" aria-checked={showStepDots} data-menu-switch style={menuSwitchStyleFor(scheme, showStepDots, '#3b82f6')}>
              <span data-menu-knob style={menuKnobStyle(showStepDots)} />
            </span>
          </button>

          {canRecordUserStory && (
            <>
              <div style={menuDividerStyleFor(scheme)} />
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
                style={{ ...rowStyle, justifyContent: 'flex-start' }}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span data-menu-label style={menuRowLabelStyle}>
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

          <div style={menuDividerStyleFor(scheme)} />

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
            style={rowStyle}
            onMouseEnter={hoverOn}
            onMouseLeave={hoverOff}
          >
            <span data-menu-label style={menuRowLabelStyle}>
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
                  background: palette.badgeBg,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: palette.badgeText,
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
              style={{ ...rowStyle, justifyContent: 'flex-start' }}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <span data-menu-label style={menuRowLabelStyle}>
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
