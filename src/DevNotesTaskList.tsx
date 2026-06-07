import {
  FiSearch,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
  FiAlertTriangle,
  FiClock,
  FiX,
} from 'react-icons/fi';
import DevNotesForm from './DevNotesForm';
import { useTaskListData, type TaskSortField } from './hooks/useTaskListData';

type DevNotesTaskListProps = {
  /** Called when the user wants to navigate to the page where a report was filed */
  onNavigateToPage?: (pageUrl: string, reportId: string) => void;
  /** Called when the close/back button is clicked (if rendered as an overlay) */
  onClose?: () => void;
  /** Title shown at the top */
  title?: string;
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Needs Review': 'bg-purple-100 text-purple-700',
  Resolved: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500 text-white',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-gray-100 text-gray-600',
};

export default function DevNotesTaskList({
  onNavigateToPage,
  onClose,
  title = 'All Tasks',
}: DevNotesTaskListProps) {
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
  } = useTaskListData();

  const SortIcon = ({ field }: { field: TaskSortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />;
  };

  // If a report is selected, show the form
  if (selectedReport) {
    return (
      <div className="flex flex-col h-full">
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
      </div>
    );
  }

  if ((loading && tasks.length === 0) || visibleReportIds === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <FiX size={18} />
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {([
          ['Open', stats.open, 'text-red-600'],
          ['In Progress', stats.inProgress, 'text-blue-600'],
          ['Review', stats.needsReview, 'text-purple-600'],
          ['Resolved', stats.resolved, 'text-green-600'],
          ['Closed', stats.closed, 'text-gray-500'],
          ['Total', stats.total, 'text-gray-700'],
        ] as const).map(([label, count, color]) => (
          <div key={label} className="text-center rounded-lg border border-gray-100 py-2">
            <div className={`text-xl font-bold ${color}`}>{count}</div>
            <div className="text-[0.65rem] text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2 py-2 text-sm border border-gray-200 rounded-md bg-white"
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
          className="px-2 py-2 text-sm border border-gray-200 rounded-md bg-white"
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
          className={`px-3 py-2 text-sm rounded-md border transition ${
            showClosed
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {showClosed ? 'Show Active' : 'Show Closed'}
        </button>
      </div>

      {/* Results count */}
      <div className="text-xs text-gray-500">
        {filteredReports.length} of {showClosed ? stats.closed : stats.total - stats.closed}{' '}
        {showClosed ? 'closed' : 'active'} tasks
      </div>

      {/* Table */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <FiAlertTriangle size={32} className="mb-3" />
          <p className="text-sm">
            {accessibleReports.length === 0
              ? 'No visible tasks yet. You will only see tasks you own, are assigned to, commented on, or were mentioned in.'
              : 'No tasks match your filters.'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 font-medium">Title</th>
                <th
                  className="px-3 py-2 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('status')}
                >
                  <span className="inline-flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('severity')}
                >
                  <span className="inline-flex items-center gap-1">
                    Severity <SortIcon field="severity" />
                  </span>
                </th>
                <th className="px-3 py-2 font-medium hidden md:table-cell">Page</th>
                <th className="px-3 py-2 font-medium hidden lg:table-cell">Assigned</th>
                <th
                  className="px-3 py-2 font-medium cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort('stale')}
                >
                  <span className="inline-flex items-center gap-1">
                    Freshness <SortIcon field="stale" />
                  </span>
                </th>
                <th
                  className="px-3 py-2 font-medium cursor-pointer select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <span className="inline-flex items-center gap-1">
                    Date <SortIcon field="created_at" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.map((report) => {
                const unread = unreadCounts[report.id] || 0;
                const stale = getStaleMeta(report);
                return (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setSelectedReport(report)}
                  >
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {report.title}
                        </span>
                        {unread > 0 && (
                          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-purple-100 px-1.5 text-[10px] font-bold text-purple-700">
                            {unread}
                          </span>
                        )}
                        {stale.isStale && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            <FiClock size={10} />
                            Stale {stale.ageDays}d
                          </span>
                        )}
                      </div>
                      {report.types.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {report.types.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[0.6rem] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[report.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          SEVERITY_COLORS[report.severity] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="truncate max-w-[140px]">
                          {getPageLabel(report.page_url)}
                        </span>
                        {onNavigateToPage && (
                          <button
                            type="button"
                            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToPage(report.page_url, report.id);
                            }}
                            title="Go to page"
                          >
                            <FiExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-gray-500">
                      {getProfileName(report.assigned_to) || '—'}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {stale.isStale ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          <FiClock size={11} />
                          {stale.ageDays}d stale
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Fresh
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
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
}
