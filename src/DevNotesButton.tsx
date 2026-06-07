import { useState } from 'react';
import { createPortal } from 'react-dom';
import DevNotesMenu from './DevNotesMenu';
import DevNotesOverlay from './DevNotesOverlay';
import DevNotesTaskListModal from './DevNotesTaskListModal';
import { useDevNotes } from './DevNotesProvider';

type DevNotesButtonProps = {
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Called when user clicks "Settings" in the menu */
  onSettings?: () => void;
  /** Custom icon component for the menu trigger */
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Optional: ID of a report to open immediately */
  openReportId?: string | null;
  /** Called when the opened report modal is closed */
  onOpenReportClose?: () => void;
  /** Called when user wants to navigate to a report's page (used by built-in task list) */
  onNavigateToPage?: (pageUrl: string, reportId: string) => void;
};

const positionStyles: Record<string, React.CSSProperties> = {
  'bottom-right': { position: 'absolute', bottom: 16, right: 16 },
  'bottom-left': { position: 'absolute', bottom: 16, left: 16 },
  'top-right': { position: 'absolute', top: 16, right: 16 },
  'top-left': { position: 'absolute', top: 16, left: 16 },
};

export default function DevNotesButton({
  position = 'bottom-right',
  onSettings,
  icon,
  openReportId,
  onOpenReportClose,
  onNavigateToPage,
}: DevNotesButtonProps) {
  const { dotContainer, role } = useDevNotes();
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [taskPanelTitle, setTaskPanelTitle] = useState('All Tasks');

  if (role === 'none') return null;

  const openBuiltInTaskPanel = (title: string) => {
    setTaskPanelTitle(title);
    setShowTaskPanel(true);
  };

  const handleViewTasks = () => openBuiltInTaskPanel('All Tasks');
  const handleSettings = onSettings || (() => openBuiltInTaskPanel('Task Settings'));

  const buttonContent = (
    <>
      <div
        style={{ ...(positionStyles[position] || positionStyles['bottom-right']), zIndex: 9990, pointerEvents: 'auto' }}
        data-bug-menu
      >
        <DevNotesMenu
          onViewTasks={handleViewTasks}
          onSettings={handleSettings}
          icon={icon}
          position={position}
          dropdownDirection={position?.includes('bottom') ? 'up' : 'down'}
        />
      </div>

      {/* Built-in, self-contained task modal (no external stylesheet dependency) */}
      <DevNotesTaskListModal
        open={showTaskPanel}
        title={taskPanelTitle}
        onClose={() => setShowTaskPanel(false)}
        onNavigateToPage={onNavigateToPage}
      />
    </>
  );

  return (
    <>
      {dotContainer ? createPortal(buttonContent, dotContainer) : buttonContent}
      <DevNotesOverlay
        openReportId={openReportId}
        onOpenReportClose={onOpenReportClose}
      />
    </>
  );
}
