import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FiX,
  FiTrash2,
  FiSave,
  FiExternalLink,
  FiLink2,
  FiCopy,
  FiAlertCircle,
  FiLoader,
  FiEye,
  FiCheckCircle,
  FiArchive,
  FiZap,
} from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import DevNotesDiscussion from './DevNotesDiscussion';
import AiDescriptionChat from './AiDescriptionChat';
import { normalizePageUrl } from './utils/bugAnchors';
import {
  buildCaptureContext,
  deriveRouteLabelFromUrl,
} from './internal/captureContext';
import { buildAiFixPayload, formatAiFixPayloadForCopy } from './internal/aiPayload';
import type { BugReport, BugReportType } from './types';

type DevNotesFormProps = {
  pageUrl: string;
  xPosition?: number;
  yPosition?: number;
  targetSelector?: string | null;
  targetRelativeX?: number | null;
  targetRelativeY?: number | null;
  existingReport?: BugReport | null;
  onSave: (report: BugReport) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
};

type SearchableOption = {
  id: string;
  label: string;
};

type SearchableSingleSelectProps = {
  label: string;
  options: SearchableOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  isSuperscript?: boolean;
  wrapperClassName?: string;
  minInputWidthClassName?: string;
};

const COMPACT_BEHAVIOR_HEIGHT = 56;
const EXPANDED_BEHAVIOR_MIN_HEIGHT = 92;

function SearchableSingleSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  isSuperscript = false,
  wrapperClassName = '',
  minInputWidthClassName = 'min-w-[120px]',
}: SearchableSingleSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div className={`${isSuperscript ? 'relative' : ''} ${wrapperClassName}`.trim()}>
      <label
        className={
          isSuperscript
            ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
            : 'block text-sm mb-1 text-gray-700'
        }
      >
        {label}
      </label>
      <div className="relative">
        <div className="border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center">
          <div className="flex flex-wrap items-center gap-1">
            {selectedOption && (
              <span className="inline-flex items-center gap-1 rounded-sm bg-transparent px-1 py-0.5 text-xs font-medium text-gray-700">
                {selectedOption.label}
                <button
                  type="button"
                  className="ml-0.5 text-gray-400 hover:text-gray-700"
                  onClick={() => {
                    onChange(null);
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
                >
                  &times;
                </button>
              </span>
            )}
            <input
              type="text"
              className={`flex-1 ${minInputWidthClassName} border-none outline-none text-sm bg-transparent`}
              placeholder={selectedOption ? 'Type to search...' : placeholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].id);
                  }
                }
              }}
            />
          </div>
        </div>
        {showDropdown && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[220px] overflow-y-auto z-20">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    option.id === value ? 'bg-blue-50' : ''
                  }`}
                  onMouseDown={() => handleSelect(option.id)}
                >
                  <span className="text-sm">{option.label}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2">
                <span className="text-sm text-gray-500">No matches</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DevNotesForm({
  pageUrl,
  xPosition = 0,
  yPosition = 0,
  targetSelector = null,
  targetRelativeX = null,
  targetRelativeY = null,
  existingReport,
  onSave,
  onCancel,
  onDelete,
  onArchive,
}: DevNotesFormProps) {
  const {
    taskTypes,
    createTask,
    updateTask,
    addTaskType,
    deleteTaskType,
    taskLists,
    createTaskList,
    loading,
    userProfiles,
    collaborators,
    user,
    aiProvider,
    error: bugReportingError,
    role,
    appLinkStatus,
  } = useDevNotes();

  const isAdmin = role === 'admin' || role === 'contributor';

  const getFirstName = (value?: string | null) => {
    if (!value) return '\u2014';
    const trimmed = value.trim();
    if (!trimmed) return '\u2014';
    if (trimmed.includes('@')) {
      const localPart = trimmed.split('@')[0];
      return localPart || '\u2014';
    }
    const firstToken = trimmed.split(/\s+/)[0];
    return firstToken || '\u2014';
  };

  const availableCollaborators = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    collaborators.forEach((c) => {
      if (c.id) {
        map.set(c.id, {
          id: c.id,
          label: getFirstName(c.full_name || c.email),
        });
      }
    });
    Object.entries(userProfiles).forEach(([id, profile]) => {
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: getFirstName(profile.full_name || profile.email),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [collaborators, userProfiles]);

  const [selectedTypes, setSelectedTypes] = useState<string[]>(existingReport?.types || []);

  useEffect(() => {
    if (existingReport || selectedTypes.length > 0) return;
    const bugType = taskTypes.find((t) => t.name.toLowerCase() === 'bug');
    if (bugType) {
      setSelectedTypes([bugType.id]);
    }
  }, [taskTypes, existingReport, selectedTypes.length]);

  const [severity, setSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>(
    existingReport?.severity || 'Medium'
  );
  const [title, setTitle] = useState(existingReport?.title || '');
  const [description, setDescription] = useState(existingReport?.description || '');
  const [expectedBehavior, setExpectedBehavior] = useState(
    existingReport?.expected_behavior || ''
  );
  const [actualBehavior, setActualBehavior] = useState(existingReport?.actual_behavior || '');
  const [status, setStatus] = useState<BugReport['status'] | null>(existingReport?.status || null);
  const [assignedTo, setAssignedTo] = useState<string | null>(existingReport?.assigned_to || null);
  const [resolvedBy, setResolvedBy] = useState<string | null>(existingReport?.resolved_by || null);
  const [aiReady, setAiReady] = useState(existingReport?.ai_ready || false);
  const [aiDescription, setAiDescription] = useState<string | null>(
    existingReport?.ai_description || null
  );
  const [reportPageUrl, setReportPageUrl] = useState(existingReport?.page_url || pageUrl);
  const defaultTaskListId = useMemo(() => {
    const defaultList = taskLists.find((list) => list.is_default);
    return defaultList?.id || taskLists[0]?.id || '';
  }, [taskLists]);
  const [taskListId, setTaskListId] = useState(existingReport?.task_list_id || defaultTaskListId);
  const [newTypeName, setNewTypeName] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [pendingTypeName, setPendingTypeName] = useState<string | null>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const [showCopied, setShowCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const linkCopyTimeoutRef = useRef<number | null>(null);
  const [showAiPayloadCopied, setShowAiPayloadCopied] = useState(false);
  const aiPayloadCopyTimeoutRef = useRef<number | null>(null);
  const [taskListSearchTerm, setTaskListSearchTerm] = useState('');
  const [showTaskListDropdown, setShowTaskListDropdown] = useState(false);
  const [pendingTaskListName, setPendingTaskListName] = useState<string | null>(null);
  const taskListInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const expectedBehaviorRef = useRef<HTMLTextAreaElement | null>(null);
  const actualBehaviorRef = useRef<HTMLTextAreaElement | null>(null);
  const [descriptionHeight, setDescriptionHeight] = useState('120px');
  const [expectedBehaviorHeight, setExpectedBehaviorHeight] = useState(
    `${expectedBehavior.trim() ? EXPANDED_BEHAVIOR_MIN_HEIGHT : COMPACT_BEHAVIOR_HEIGHT}px`
  );
  const [actualBehaviorHeight, setActualBehaviorHeight] = useState(
    `${actualBehavior.trim() ? EXPANDED_BEHAVIOR_MIN_HEIGHT : COMPACT_BEHAVIOR_HEIGHT}px`
  );
  const [showAiChat, setShowAiChat] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<'delete' | 'archive' | null>(null);
  const capturedContext = useMemo(
    () => existingReport?.capture_context || buildCaptureContext(reportPageUrl),
    [existingReport?.capture_context, reportPageUrl]
  );

  const isSuperscriptLabels = Boolean(existingReport);

  const severityOptions: SearchableOption[] = [
    { id: 'Critical', label: 'Critical' },
    { id: 'High', label: 'High' },
    { id: 'Medium', label: 'Medium' },
    { id: 'Low', label: 'Low' },
  ];

  const statusIcons: Record<string, { icon: typeof FiAlertCircle; colorClass: string }> = {
    Open: { icon: FiAlertCircle, colorClass: 'bg-red-100 text-red-800' },
    'In Progress': { icon: FiLoader, colorClass: 'bg-blue-100 text-blue-800' },
    'Needs Review': { icon: FiEye, colorClass: 'bg-purple-100 text-purple-800' },
    Resolved: { icon: FiCheckCircle, colorClass: 'bg-green-100 text-green-800' },
    Closed: { icon: FiArchive, colorClass: 'bg-gray-100 text-gray-800' },
  };

  const statusOptions: SearchableOption[] = [
    { id: 'Open', label: 'Open' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Needs Review', label: 'Needs Review' },
    { id: 'Resolved', label: 'Resolved' },
    { id: 'Closed', label: 'Closed' },
  ];

  const collaboratorOptions = useMemo<SearchableOption[]>(
    () =>
      availableCollaborators.map((c) => ({
        id: c.id,
        label: c.label,
      })),
    [availableCollaborators]
  );

  const formatCreatedDate = (value: string) => {
    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return value;

    const monthMap = [
      'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
      'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
    ];
    const month = monthMap[createdAt.getMonth()];
    const day = createdAt.getDate();
    const year = createdAt.getFullYear();
    const hours24 = createdAt.getHours();
    const minutes = String(createdAt.getMinutes()).padStart(2, '0');
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    const suffix =
      day % 10 === 1 && day % 100 !== 11
        ? 'st'
        : day % 10 === 2 && day % 100 !== 12
          ? 'nd'
          : day % 10 === 3 && day % 100 !== 13
            ? 'rd'
            : 'th';

    return `${month} ${day}${suffix}, ${year} at ${hours12}:${minutes}${meridiem}.`;
  };

  const resizeDescriptionField = () => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = 'auto';
    const nextHeight = Math.max(element.scrollHeight, 120);
    setDescriptionHeight(`${nextHeight}px`);
  };

  const resizeBehaviorField = (
    element: HTMLTextAreaElement | null,
    value: string,
    setHeight: (value: string) => void
  ) => {
    if (!element) return;
    if (!value.trim()) {
      const compact = `${COMPACT_BEHAVIOR_HEIGHT}px`;
      element.style.height = compact;
      setHeight(compact);
      return;
    }
    element.style.height = 'auto';
    const nextHeight = Math.max(element.scrollHeight, EXPANDED_BEHAVIOR_MIN_HEIGHT);
    setHeight(`${nextHeight}px`);
  };

  const composePageUrlWithTab = (value: string) => {
    return normalizePageUrl(value || '');
  };

  const forgeTaskUrl = useMemo(() => {
    if (!existingReport?.id) return null;

    const baseUrl = appLinkStatus?.projectDiscovery?.baseUrl?.trim();
    if (!baseUrl) return null;

    return `${baseUrl.replace(/\/+$/, '')}/tasks/${encodeURIComponent(existingReport.id)}`;
  }, [appLinkStatus?.projectDiscovery?.baseUrl, existingReport?.id]);

  useEffect(() => {
    setReportPageUrl(existingReport?.page_url || pageUrl);
  }, [existingReport?.page_url, pageUrl]);

  useEffect(() => {
    if (!existingReport?.task_list_id && defaultTaskListId && !taskListId) {
      setTaskListId(defaultTaskListId);
    }
  }, [defaultTaskListId, existingReport?.task_list_id, taskListId]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      if (linkCopyTimeoutRef.current) window.clearTimeout(linkCopyTimeoutRef.current);
      if (aiPayloadCopyTimeoutRef.current) window.clearTimeout(aiPayloadCopyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if ((status === 'Closed' || status === 'Resolved') && !resolvedBy && user?.id) {
      setResolvedBy(user.id);
    }
  }, [status, resolvedBy, user?.id]);

  useEffect(() => {
    resizeDescriptionField();
  }, [description]);

  useEffect(() => {
    resizeBehaviorField(expectedBehaviorRef.current, expectedBehavior, setExpectedBehaviorHeight);
  }, [expectedBehavior]);

  useEffect(() => {
    resizeBehaviorField(actualBehaviorRef.current, actualBehavior, setActualBehaviorHeight);
  }, [actualBehavior]);

  const availableTypes = taskTypes.filter((type) => !selectedTypes.includes(type.id));

  const handleTypeSelect = (typeId: string) => {
    setSelectedTypes((prev) => [...prev, typeId]);
    setShowTypeDropdown(false);
    setNewTypeName('');
  };

  const handleTypeRemove = (typeId: string) => {
    setSelectedTypes((prev) => prev.filter((id) => id !== typeId));
  };

  const createTypeFromValue = async (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    const existingType = taskTypes.find(
      (type) => type.name.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (existingType) {
      if (!selectedTypes.includes(existingType.id)) {
        setSelectedTypes((prev) => [...prev, existingType.id]);
      }
      setNewTypeName('');
      setShowTypeDropdown(false);
      setPendingTypeName(null);
      return;
    }

    const newType = await addTaskType(trimmedValue);
    if (newType) {
      setSelectedTypes((prev) => [...prev, newType.id]);
      setNewTypeName('');
      setShowTypeDropdown(false);
      setPendingTypeName(null);
    }
  };

  const handleTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (pendingTypeName && e.shiftKey) {
        createTypeFromValue(pendingTypeName);
        return;
      }

      const trimmedValue = newTypeName.trim();
      if (!trimmedValue) return;

      const existingType = taskTypes.find(
        (type) => type.name.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (existingType) {
        handleTypeSelect(existingType.id);
        return;
      }

      setPendingTypeName(trimmedValue);
    }
  };

  const handleDeleteType = async (typeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const typeToDelete = taskTypes.find((t) => t.id === typeId);
    if (typeToDelete?.is_default) return;

    const success = await deleteTaskType(typeId);
    if (success) {
      setSelectedTypes((prev) => prev.filter((id) => id !== typeId));
    }
  };

  const handleCopyTaskId = async () => {
    if (!existingReport?.id) return;
    try {
      await navigator.clipboard.writeText(existingReport.id);
      setShowCopied(true);
      if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setShowCopied(false), 1200);
    } catch (err) {
      console.error('[DevNotesForm] Failed to copy task id', err);
    }
  };

  const handleCopyLink = async () => {
    if (!existingReport?.id) return;
    try {
      const link = `${window.location.origin}/tasks/${existingReport.id}`;
      await navigator.clipboard.writeText(link);
      setShowLinkCopied(true);
      if (linkCopyTimeoutRef.current) window.clearTimeout(linkCopyTimeoutRef.current);
      linkCopyTimeoutRef.current = window.setTimeout(() => setShowLinkCopied(false), 1200);
    } catch (err) {
      console.error('[DevNotesForm] Failed to copy link', err);
    }
  };

  const handleCopyAiPayload = async () => {
    const typeNames = selectedTypes.map((typeId) => {
      const type = taskTypes.find((item) => item.id === typeId);
      return type?.name || typeId;
    });

    const normalizedPageUrl = normalizePageUrl(composePageUrlWithTab(reportPageUrl));
    const payload = buildAiFixPayload({
      source: '@the-portland-company/devnotes',
      report: {
        id: existingReport?.id || null,
        title: title.trim() || null,
        status: statusValue,
        severity,
        taskListId: taskListId || null,
        types: selectedTypes,
        typeNames,
        approved: existingReport?.approved || false,
        aiReady: aiReady,
      },
      narrative: {
        description: description.trim() || null,
        expectedBehavior: expectedBehavior.trim() || null,
        actualBehavior: actualBehavior.trim() || null,
        aiDescription: aiDescription || null,
        response: existingReport?.response || null,
      },
      context: {
        pageUrl: normalizedPageUrl,
        routeLabel:
          capturedContext?.route_label || deriveRouteLabelFromUrl(normalizedPageUrl),
        xPosition: existingReport?.x_position ?? xPosition,
        yPosition: existingReport?.y_position ?? yPosition,
        targetSelector: existingReport?.target_selector ?? targetSelector ?? null,
        targetRelativeX:
          existingReport?.target_relative_x ?? targetRelativeX ?? null,
        targetRelativeY:
          existingReport?.target_relative_y ?? targetRelativeY ?? null,
        captureContext: capturedContext,
      },
      workflow: {
        assignedTo: assignedTo || null,
        resolvedBy: resolvedBy || null,
        createdBy: existingReport?.created_by || user.id,
        createdAt: existingReport?.created_at || null,
        updatedAt: existingReport?.updated_at || null,
      },
    });
    const copyText = formatAiFixPayloadForCopy(payload);

    try {
      await navigator.clipboard.writeText(copyText);
      setShowAiPayloadCopied(true);
      if (aiPayloadCopyTimeoutRef.current) {
        window.clearTimeout(aiPayloadCopyTimeoutRef.current);
      }
      aiPayloadCopyTimeoutRef.current = window.setTimeout(
        () => setShowAiPayloadCopied(false),
        1400
      );
    } catch (err) {
      console.error('[DevNotesForm] Failed to copy AI payload', err);
    }
  };

  const trimmedDescription = description.trim();
  const trimmedExpectedBehavior = expectedBehavior.trim();
  const trimmedActualBehavior = actualBehavior.trim();
  const statusValue = status || 'Open';
  const statusRequired = !status;
  const hasDescription = trimmedDescription.length > 0;
  const hasBehavior =
    trimmedExpectedBehavior.length > 0 || trimmedActualBehavior.length > 0;
  const hasNarrative = hasDescription || hasBehavior;
  const requiresAiBeforeCreate = Boolean(aiProvider && !existingReport && !aiDescription);
  const submitDisabled = loading || !hasNarrative || statusRequired;
  const submitTitle = requiresAiBeforeCreate
    ? 'Save will start AI clarification before creating the task'
    : statusRequired
      ? 'Select a status before saving'
    : !hasNarrative
      ? 'Add a description, expected behavior, or actual behavior'
      : existingReport
        ? 'Update'
        : 'Save';
  const aiSeedDescription = hasDescription
    ? trimmedDescription
    : hasBehavior
      ? [trimmedExpectedBehavior, trimmedActualBehavior].filter(Boolean).join('\n')
      : title.trim();
  const canReviewDescriptionWithAi = Boolean(aiProvider && trimmedDescription);

  const saveReport = async (overrides?: {
    description?: string | null;
    aiDescription?: string | null;
    aiReady?: boolean;
  }) => {
    const reportData = {
      task_list_id: taskListId,
      page_url: normalizePageUrl(composePageUrlWithTab(reportPageUrl)),
      x_position: xPosition,
      y_position: yPosition,
      target_selector: targetSelector,
      target_relative_x: targetRelativeX,
      target_relative_y: targetRelativeY,
      types: selectedTypes,
      severity,
      title: title.trim(),
      description: overrides?.description ?? trimmedDescription ?? null,
      expected_behavior: trimmedExpectedBehavior || null,
      actual_behavior: trimmedActualBehavior || null,
      response: null,
      status: statusValue,
      assigned_to: assignedTo,
      resolved_by: resolvedBy,
      approved: existingReport?.approved || false,
      ai_ready: overrides?.aiReady ?? aiReady,
      ai_description: overrides?.aiDescription ?? aiDescription,
    };

    let result: BugReport | null = null;

    if (existingReport) {
      result = await updateTask(existingReport.id, {
        ...reportData,
        capture_context: existingReport.capture_context || capturedContext,
        assigned_to: assignedTo,
        resolved_by: resolvedBy,
      });
    } else {
      result = await createTask({
        ...reportData,
        capture_context: capturedContext,
      });
    }

    if (result) {
      onSave(result);
    }
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!title.trim() || !taskListId || selectedTypes.length === 0 || !hasNarrative) return;
    if (!status) return;

    if (requiresAiBeforeCreate) {
      setShowAiChat(true);
      return;
    }

    await saveReport();
  };

  const getTypeName = (typeId: string) => {
    const type = taskTypes.find((t) => t.id === typeId);
    return type?.name || 'Unknown';
  };

  const getTaskListName = (listId: string) => {
    const list = taskLists.find((l) => l.id === listId);
    return list?.name || '';
  };

  const handleTaskListSelect = (listId: string) => {
    setTaskListId(listId);
    setTaskListSearchTerm('');
    setShowTaskListDropdown(false);
    setPendingTaskListName(null);
  };

  const createTaskListFromValue = async (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    const existingList = taskLists.find(
      (list) => list.name.toLowerCase() === trimmedValue.toLowerCase()
    );

    if (existingList) {
      setTaskListId(existingList.id);
      setTaskListSearchTerm('');
      setShowTaskListDropdown(false);
      setPendingTaskListName(null);
      return;
    }

    const created = await createTaskList(trimmedValue);
    if (created) {
      setTaskListId(created.id);
      setTaskListSearchTerm('');
      setShowTaskListDropdown(false);
      setPendingTaskListName(null);
    }
  };

  const handleTaskListKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (pendingTaskListName && e.shiftKey) {
        createTaskListFromValue(pendingTaskListName);
        return;
      }

      const trimmedValue = taskListSearchTerm.trim();
      if (!trimmedValue) return;

      const existingList = taskLists.find(
        (list) => list.name.toLowerCase() === trimmedValue.toLowerCase()
      );
      if (existingList) {
        handleTaskListSelect(existingList.id);
        return;
      }

      setPendingTaskListName(trimmedValue);
    }
  };

  const StatusIcon = statusIcons[statusValue]?.icon || FiAlertCircle;
  const statusColorClass = statusIcons[statusValue]?.colorClass || 'bg-red-100 text-red-800';

  const renderStatusSaveActions = (position: 'header' | 'footer') => (
    <div className="flex items-end gap-2">
      <SearchableSingleSelect
        label="Status"
        options={statusOptions}
        value={status}
        onChange={(value) => setStatus((value as BugReport['status'] | null) ?? null)}
        placeholder="Type to search..."
        isSuperscript
        wrapperClassName={position === 'header' ? 'w-[240px]' : 'w-[260px]'}
        minInputWidthClassName="min-w-[84px]"
      />
      <button
        type="button"
        className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 self-center"
        onClick={handleSubmit}
        disabled={submitDisabled}
        aria-label={existingReport ? 'Update' : 'Save'}
        title={submitTitle}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <FiSave size={16} />
        )}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl p-4 md:p-6 min-w-[320px] w-full max-w-[960px] mx-auto relative shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">
              {existingReport ? 'Edit Task' : 'Create Task'}
            </span>
            {existingReport && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColorClass}`}>
                <StatusIcon size={12} />
                {status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            onClick={onCancel}
            aria-label="Cancel"
            title="Cancel"
          >
            <FiX size={16} />
          </button>
          {renderStatusSaveActions('header')}
        </div>
      </div>

      {/* Meta info for existing reports */}
      {existingReport && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs relative">
          <span className="text-gray-500">
            Created by{' '}
            <span className="font-medium text-gray-700">
              {getFirstName(
                existingReport.creator?.full_name || existingReport.creator?.email || 'Unknown'
              )}
            </span>
            {' on '}
            <span className="text-gray-600">{formatCreatedDate(existingReport.created_at)}</span>
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-500">Task ID</span>
          <button
            type="button"
            className="font-mono text-gray-800 hover:underline"
            onClick={handleCopyTaskId}
          >
            {existingReport.id}
          </button>
          {forgeTaskUrl && (
            <>
              <span className="text-gray-400">|</span>
              <a
                href={forgeTaskUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                title="Open task in Forge"
              >
                <FiExternalLink size={12} />
                Open in Forge
              </a>
            </>
          )}
          <span className="text-gray-400">|</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            onClick={handleCopyLink}
            title="Copy shareable link"
          >
            <FiLink2 size={12} />
            Copy Link
          </button>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-purple-700 hover:underline"
            onClick={handleCopyAiPayload}
            title="Copy AI fix payload"
          >
            <FiCopy size={12} />
            Copy AI Payload
          </button>
          {(showCopied || showLinkCopied) && (
            <span className="absolute left-0 top-full mt-1 text-xs text-black animate-devnotes-fade-up pointer-events-none">
              {showLinkCopied ? 'Link copied!' : 'Copied!'}
            </span>
          )}
          {showAiPayloadCopied && (
            <span className="absolute left-0 top-full mt-1 text-xs text-black animate-devnotes-fade-up pointer-events-none">
              AI payload copied!
            </span>
          )}
        </div>
      )}

      {/* Form fields */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className={isSuperscriptLabels ? 'relative my-3' : 'my-3'}>
            <label
              className={
                isSuperscriptLabels
                  ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                  : 'block text-sm mb-1 text-gray-700'
              }
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none hover:border-gray-400"
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className={isSuperscriptLabels ? 'relative' : ''}>
            <div
              className={
                isSuperscriptLabels
                  ? 'absolute -top-[9px] left-[10px] right-[10px] z-[2] flex items-center justify-between'
                  : 'mb-1 flex items-center justify-between'
              }
            >
              <label
                className={
                  isSuperscriptLabels
                    ? 'bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none text-gray-700'
                    : 'block text-sm text-gray-700'
                }
              >
                Description
              </label>
              {aiProvider && (
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                    canReviewDescriptionWithAi
                      ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                  onClick={() => {
                    if (!canReviewDescriptionWithAi) return;
                    setShowAiChat(true);
                  }}
                  disabled={!canReviewDescriptionWithAi}
                  title={
                    canReviewDescriptionWithAi
                      ? 'Review the description with AI'
                      : 'Add a description to review it with AI'
                  }
                >
                  <FiZap size={12} />
                  Review with AI
                </button>
              )}
            </div>
            <textarea
              ref={descriptionRef}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400"
              placeholder="Detailed description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onInput={resizeDescriptionField}
              rows={5}
              style={{ minHeight: '120px', height: descriptionHeight }}
            />
          </div>

          <div className="flex items-center gap-2 py-1">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-gray-500">
              OR
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Expected vs Actual behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label
                className={
                  isSuperscriptLabels
                    ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                    : 'block text-sm mb-1 text-gray-700'
                }
              >
                Expected Behavior
              </label>
              <textarea
                ref={expectedBehaviorRef}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400"
                placeholder="What should have happened?"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                onInput={(e) =>
                  resizeBehaviorField(
                    e.currentTarget,
                    e.currentTarget.value,
                    setExpectedBehaviorHeight
                  )
                }
                rows={2}
                style={{
                  minHeight: `${COMPACT_BEHAVIOR_HEIGHT}px`,
                  height: expectedBehaviorHeight,
                }}
              />
            </div>
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label
                className={
                  isSuperscriptLabels
                    ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                    : 'block text-sm mb-1 text-gray-700'
                }
              >
                Actual Behavior
              </label>
              <textarea
                ref={actualBehaviorRef}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-[height] duration-200 hover:border-gray-400"
                placeholder="What actually happened?"
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                onInput={(e) =>
                  resizeBehaviorField(
                    e.currentTarget,
                    e.currentTarget.value,
                    setActualBehaviorHeight
                  )
                }
                rows={2}
                style={{
                  minHeight: `${COMPACT_BEHAVIOR_HEIGHT}px`,
                  height: actualBehaviorHeight,
                }}
              />
            </div>
          </div>
          {submitAttempted && !hasNarrative && (
            <p className="text-xs text-red-600">
              Add a description, expected behavior, or actual behavior.
            </p>
          )}

          {/* AI Description Chat */}
          {showAiChat && aiProvider && (
            <AiDescriptionChat
              initialDescription={aiSeedDescription}
              context={{
                title,
                page_url: reportPageUrl,
                route_label:
                  capturedContext?.route_label || deriveRouteLabelFromUrl(reportPageUrl),
                severity,
                types: selectedTypes,
                target_selector: targetSelector ?? undefined,
                expected_behavior: expectedBehavior || undefined,
                actual_behavior: actualBehavior || undefined,
                capture_context: capturedContext || undefined,
              }}
              aiProvider={aiProvider}
              onAccept={async (refined) => {
                setDescription(refined);
                setAiDescription(refined);
                setAiReady(true);
                setShowAiChat(false);
                if (!existingReport) {
                  await saveReport({
                    description: refined,
                    aiDescription: refined,
                    aiReady: true,
                  });
                }
              }}
              onCancel={() => setShowAiChat(false)}
            />
          )}

          {/* AI description display */}
          {aiDescription && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-green-700">AI-Reviewed Description</span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-700"
                  onClick={() => {
                    setAiDescription(null);
                    setAiReady(false);
                  }}
                >
                  Remove
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap text-gray-800">{aiDescription}</p>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-purple-700 hover:text-purple-800"
                  onClick={handleCopyAiPayload}
                >
                  <FiCopy size={12} />
                  Copy AI Fix Payload
                </button>
              </div>
              {showAiPayloadCopied && (
                <p className="mt-1 text-xs text-purple-700 text-right">AI payload copied!</p>
              )}
            </div>
          )}

          {/* Grid of fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Type Multi-Select */}
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label
                className={
                  isSuperscriptLabels
                    ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                    : 'block text-sm mb-1 text-gray-700'
                }
              >
                Type(s)
              </label>
              <div className="relative">
                <div className="border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center">
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedTypes.map((typeId) => (
                      <span
                        key={typeId}
                        className="inline-flex items-center gap-1 rounded-sm bg-transparent px-1 py-0.5 text-xs font-medium text-gray-700"
                      >
                        {getTypeName(typeId)}
                        <button
                          type="button"
                          className="ml-0.5 text-gray-400 hover:text-gray-700"
                          onClick={() => handleTypeRemove(typeId)}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <input
                      ref={typeInputRef}
                      type="text"
                      className="flex-1 min-w-[120px] border-none outline-none text-sm bg-transparent"
                      placeholder="Type to search or add..."
                      value={newTypeName}
                      onChange={(e) => {
                        setPendingTypeName(null);
                        setNewTypeName(e.target.value);
                        setShowTypeDropdown(true);
                      }}
                      onFocus={() => setShowTypeDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTypeDropdown(false), 200)}
                      onKeyDown={handleTypeKeyDown}
                    />
                  </div>
                </div>

                {showTypeDropdown && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[200px] overflow-y-auto z-20">
                    {availableTypes
                      .filter((type) =>
                        type.name.toLowerCase().includes(newTypeName.toLowerCase())
                      )
                      .map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100"
                          onMouseDown={() => handleTypeSelect(type.id)}
                        >
                          <span className="text-sm">{type.name}</span>
                          {!type.is_default && (
                            <button
                              type="button"
                              className="p-1 text-red-500 hover:text-red-700"
                              aria-label="Delete type"
                              onMouseDown={(e) => handleDeleteType(type.id, e)}
                            >
                              <FiTrash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    {newTypeName.trim() &&
                      !taskTypes.some(
                        (t) => t.name.toLowerCase() === newTypeName.trim().toLowerCase()
                      ) && (
                        <div
                          className="px-3 py-2 cursor-pointer bg-blue-50 hover:bg-blue-100"
                          onMouseDown={() => setPendingTypeName(newTypeName.trim())}
                        >
                          <span className="text-sm text-blue-600">
                            + Queue "{newTypeName.trim()}" for approval
                          </span>
                        </div>
                      )}
                    {availableTypes.length === 0 && !newTypeName.trim() && (
                      <div className="px-3 py-2">
                        <span className="text-sm text-gray-500">No more types available</span>
                      </div>
                    )}
                  </div>
                )}

                {pendingTypeName && (
                  <div className="absolute top-[calc(100%+8px)] left-0 bg-white border border-yellow-300 rounded-md shadow-md p-2 z-30">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-700">
                        Add "{pendingTypeName}"? Press Shift+Enter or approve.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                          onClick={() => setPendingTypeName(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500"
                          onClick={() => createTypeFromValue(pendingTypeName)}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Severity */}
            <SearchableSingleSelect
              label="Severity"
              options={severityOptions}
              value={severity}
              onChange={(value) => {
                if (!value) return;
                setSeverity(value as typeof severity);
              }}
              placeholder="Search severity..."
              isSuperscript={isSuperscriptLabels}
            />

            {/* Assignment & Workflow (admin only) */}
            {isAdmin && (
              <div className={isSuperscriptLabels ? 'relative' : ''}>
                <label
                  className={
                    isSuperscriptLabels
                      ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                      : 'block text-sm mb-1 text-gray-700'
                  }
                >
                  Assignment & Workflow
                </label>
                <div className="flex flex-col gap-2">
                  <SearchableSingleSelect
                    label="Assignee"
                    options={[{ id: '', label: 'Unassigned' }, ...collaboratorOptions]}
                    value={assignedTo ?? ''}
                    onChange={(value) => setAssignedTo(value || null)}
                    placeholder="Search assignee..."
                    isSuperscript={isSuperscriptLabels}
                  />
                </div>
              </div>
            )}

            {/* Task List */}
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label
                className={
                  isSuperscriptLabels
                    ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                    : 'block text-sm mb-1 text-gray-700'
                }
              >
                Task List
              </label>
              <div className="relative">
                <div className="border border-gray-200 rounded-md px-2 py-1 min-h-[40px] bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 flex items-center">
                  <div className="flex flex-wrap items-center gap-1">
                    {taskListId && (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                        {getTaskListName(taskListId)}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-blue-600"
                          onClick={() => setTaskListId('')}
                        >
                          &times;
                        </button>
                      </span>
                    )}
                    <input
                      ref={taskListInputRef}
                      type="text"
                      className="flex-1 min-w-[120px] border-none outline-none text-sm bg-transparent"
                      placeholder="Type to search or add..."
                      value={taskListSearchTerm}
                      onChange={(e) => {
                        setPendingTaskListName(null);
                        setTaskListSearchTerm(e.target.value);
                        setShowTaskListDropdown(true);
                      }}
                      onFocus={() => setShowTaskListDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTaskListDropdown(false), 200)}
                      onKeyDown={handleTaskListKeyDown}
                    />
                  </div>
                </div>

                {showTaskListDropdown && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white rounded-md shadow-lg border border-gray-200 max-h-[200px] overflow-y-auto z-20">
                    {taskLists
                      .filter((list) =>
                        list.name.toLowerCase().includes(taskListSearchTerm.toLowerCase())
                      )
                      .map((list) => (
                        <div
                          key={list.id}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                            list.id === taskListId ? 'bg-blue-50' : ''
                          }`}
                          onMouseDown={() => handleTaskListSelect(list.id)}
                        >
                          <span
                            className={`text-sm ${list.id === taskListId ? 'font-medium' : ''}`}
                          >
                            {list.name}
                          </span>
                          {list.is_default && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    {taskListSearchTerm.trim() &&
                      !taskLists.some(
                        (list) =>
                          list.name.toLowerCase() === taskListSearchTerm.trim().toLowerCase()
                      ) && (
                        <div
                          className="px-3 py-2 cursor-pointer bg-blue-50 hover:bg-blue-100"
                          onMouseDown={() => setPendingTaskListName(taskListSearchTerm.trim())}
                        >
                          <span className="text-sm text-blue-600">
                            + Queue "{taskListSearchTerm.trim()}" for approval
                          </span>
                        </div>
                      )}
                    {taskLists.length === 0 && !taskListSearchTerm.trim() && (
                      <div className="px-3 py-2">
                        <span className="text-sm text-gray-500">No task lists available</span>
                      </div>
                    )}
                  </div>
                )}

                {pendingTaskListName && (
                  <div className="absolute top-[calc(100%+8px)] left-0 bg-white border border-yellow-300 rounded-md shadow-md p-2 z-30">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-700">
                        Add "{pendingTaskListName}"? Press Shift+Enter or approve.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                          onClick={() => setPendingTaskListName(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs rounded bg-yellow-400 hover:bg-yellow-500"
                          onClick={() => createTaskListFromValue(pendingTaskListName)}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resolved By (admin only) */}
            {existingReport && isAdmin && (statusValue === 'Closed' || statusValue === 'Resolved') && (
              <SearchableSingleSelect
                label="Resolved By"
                options={[{ id: '', label: 'Not Set' }, ...collaboratorOptions]}
                value={resolvedBy ?? ''}
                onChange={(value) => setResolvedBy(value || null)}
                placeholder="Search resolver..."
                isSuperscript={isSuperscriptLabels}
              />
            )}

            {/* Page URL */}
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label
                className={
                  isSuperscriptLabels
                    ? 'absolute -top-[9px] left-[10px] bg-white px-1.5 text-xs leading-4 rounded-md pointer-events-none z-[2] text-gray-700'
                    : 'block text-sm mb-1 text-gray-700'
                }
              >
                Page URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full rounded-md border border-gray-200 px-3 py-1.5 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none hover:border-gray-400 ${
                    !existingReport ? 'bg-gray-50 cursor-not-allowed' : ''
                  }`}
                  value={reportPageUrl}
                  onChange={(e) => setReportPageUrl(e.target.value)}
                  readOnly={!existingReport}
                />
                <a
                  href={composePageUrlWithTab(reportPageUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  title="Open in new tab"
                >
                  <FiExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>

          {/* Discussion */}
          {existingReport && <DevNotesDiscussion report={existingReport} />}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-2">
          <div className="relative flex items-center gap-4 flex-wrap">
            {isAdmin && (
              <>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  aiReady ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                }`}>
                  {aiReady ? 'AI Ready' : 'AI Not Ready'}
                </span>
              </>
            )}
            {existingReport && (onDelete || onArchive) ? (
              <>
                {onArchive && (
                  <button
                    type="button"
                    className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setPendingDestructiveAction('archive')}
                    disabled={loading}
                    aria-label="Archive"
                    title="Archive"
                  >
                    <FiArchive size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => setPendingDestructiveAction('delete')}
                    disabled={loading}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
                {pendingDestructiveAction && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 min-w-[240px] rounded-md border border-gray-200 bg-white p-3 shadow-lg">
                    <p className="text-sm text-gray-800">
                      {pendingDestructiveAction === 'delete'
                        ? 'Delete this dev note permanently?'
                        : 'Archive this dev note by setting its status to Closed?'}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        onClick={() => setPendingDestructiveAction(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`rounded px-2 py-1 text-xs text-white ${
                          pendingDestructiveAction === 'delete'
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-gray-700 hover:bg-gray-800'
                        }`}
                        onClick={async () => {
                          const action = pendingDestructiveAction;
                          setPendingDestructiveAction(null);
                          if (action === 'delete') {
                            await onDelete?.();
                            return;
                          }
                          await onArchive?.();
                        }}
                      >
                        {pendingDestructiveAction === 'delete' ? 'Delete' : 'Archive'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              onClick={onCancel}
              aria-label="Cancel"
              title="Cancel"
            >
              <FiX size={16} />
            </button>
            {renderStatusSaveActions('footer')}
          </div>
        </div>
      </div>
    </div>
  );
}
