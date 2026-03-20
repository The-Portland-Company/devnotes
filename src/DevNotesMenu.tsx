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
} from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';

type DevNotesMenuProps = {
  /** Called when user clicks "See All Tasks" */
  onViewTasks?: () => void;
  /** Called when user clicks "Settings" */
  onSettings?: () => void;
  /** Custom icon component for the menu trigger */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Position of the parent button — controls dropdown alignment */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Direction the dropdown opens — default 'down' */
  dropdownDirection?: 'up' | 'down';
};

export default function DevNotesMenu({ onViewTasks, onSettings, icon: IconComponent, position = 'bottom-right', dropdownDirection = 'down' }: DevNotesMenuProps) {
  const {
    isEnabled,
    setIsEnabled,
    showBugsAlways,
    setShowBugsAlways,
    hideResolvedClosed,
    setHideResolvedClosed,
    bugReports,
    role,
  } = useDevNotes();
  const [open, setOpen] = useState(false);
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

  const openBugCount = bugReports.filter(
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
      style={{ zIndex: isEnabled ? 9995 : 'auto' }}
    >
      <button
        type="button"
        aria-label={isEnabled ? 'Click to disable bug reporting' : 'Bug reporting menu'}
        onClick={handleIconClick}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:text-emerald-600"
        title="Bug reports"
      >
        <span className="relative">
          {IconComponent ? (
            <IconComponent size={20} color={isEnabled ? '#E53E3E' : undefined} />
          ) : (
            <FiAlertTriangle size={20} color={isEnabled ? '#E53E3E' : undefined} />
          )}
          {openBugCount > 0 && (
            <span className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {openBugCount}
            </span>
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
              {isEnabled ? 'Stop Reporting' : 'Report Bug / Request Feature'}
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
            onClick={() => setShowBugsAlways(!showBugsAlways)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {showBugsAlways ? (
                <FiEye className="text-blue-600" />
              ) : (
                <FiEyeOff />
              )}
              Show Bugs Always
            </span>
            <span
              role="switch"
              aria-checked={showBugsAlways}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
                showBugsAlways ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  showBugsAlways ? 'translate-x-4' : 'translate-x-0.5'
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

          {(onViewTasks || onSettings) && (
            <>
              <div className="my-1 border-t border-gray-200" />

              {onViewTasks && (
                <button
                  type="button"
                  data-menu-item
                  onClick={() => {
                    setOpen(false);
                    onViewTasks();
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-gray-800 transition hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <FiList className="flex-shrink-0" />
                    See All Tasks
                  </span>
                  {openBugCount > 0 && (
                    <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {openBugCount}
                    </span>
                  )}
                </button>
              )}

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
            </>
          )}
        </div>
      )}
    </div>
  );
}
