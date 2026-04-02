import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FiX,
  FiTrash2,
  FiSave,
  FiSearch,
  FiExternalLink,
  FiLink2,
  FiCopy,
  FiAlertCircle,
  FiLoader,
  FiEye,
  FiCheckCircle,
  FiArchive,
  FiZap,
  FiCheck,
  FiClock,
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
const FIELD_SURFACE_CLASS =
  'rounded-2xl border border-slate-200 bg-white/95 shadow-sm shadow-slate-900/5 transition-colors focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200';
const CONTROL_INPUT_CLASS =
  'w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none';
const CONTROL_TEXTAREA_CLASS =
  'w-full resize-none border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-[height] duration-200';
const SECTION_CARD_CLASS =
  'rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm shadow-slate-900/5';
const ACTION_ICON_BUTTON_CLASS =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50';

const floatingLabelClass = (isSuperscript: boolean) =>
  isSuperscript
    ? 'absolute -top-2.5 left-3 z-[2] rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 pointer-events-none'
    : 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';

const sectionLabelClass =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';

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
            ? floatingLabelClass(true)
            : floatingLabelClass(false)
        }
      >
        {label}
      </label>
      <div className="relative">
        <div className={FIELD_SURFACE_CLASS}>
          <div className="flex items-center gap-2 px-3 py-2">
            <FiSearch size={14} className="shrink-0 text-slate-400" />
            <div className="h-4 w-px bg-slate-200" />
          </div>
          <div className="flex min-h-[40px] flex-wrap items-center gap-1 px-3 pb-2 pt-0">
            {selectedOption && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                {selectedOption.label}
                <button
                  type="button"
                  className="ml-0.5 text-slate-400 transition hover:text-slate-700"
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
              className={`flex-1 ${minInputWidthClassName} border-none outline-none text-sm bg-transparent text-slate-900 placeholder:text-slate-400`}
              placeholder={selectedOption ? 'Type to refine' : placeholder}
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
            <span className="shrink-0 text-[11px] text-slate-400">Type to search</span>
          </div>
        </div>
        {showDropdown && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[240px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition hover:bg-slate-50 ${
                    option.id === value ? 'bg-slate-50' : ''
                  }`}
                  onMouseDown={() => handleSelect(option.id)}
                >
                  <span className="text-sm text-slate-700">{option.label}</span>
                  {option.id === value && <FiCheck size={14} className="text-slate-500" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-2.5">
                <span className="text-sm text-slate-500">No matches</span>
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
    <div className="relative mx-auto w-full min-w-[320px] max-w-[1040px] rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-slate-50/90 to-slate-100 p-4 shadow-[0_24px_90px_rgba(15,23,42,0.14)] md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-slate-900 md:text-lg">
              {existingReport ? 'Edit Task' : 'Create Task'}
            </span>
            {existingReport && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusColorClass}`}
              >
                <StatusIcon size={12} />
                {status}
              </span>
            )}
          </div>
          <p className="max-w-2xl text-sm text-slate-500">
            {existingReport
              ? 'Review the report with clearer field grouping, comments, and workflow controls.'
              : 'Capture the issue with a clear title, narrative, and workflow context.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          {renderStatusSaveActions('header')}
          <button
            type="button"
            className={ACTION_ICON_BUTTON_CLASS}
            onClick={onCancel}
            aria-label="Cancel"
            title="Cancel"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>

      {existingReport && (
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              <FiClock size={12} className="text-slate-400" />
              Created by{' '}
              <span className="font-medium text-slate-700">
                {getFirstName(
                  existingReport.creator?.full_name || existingReport.creator?.email || 'Unknown'
                )}
              </span>
              <span className="text-slate-400">on</span>
              <span className="text-slate-700">{formatCreatedDate(existingReport.created_at)}</span>
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={handleCopyTaskId}
              title="Copy task ID"
            >
              <FiCopy size={11} className="text-slate-400" />
              {existingReport.id}
            </button>
            {forgeTaskUrl && (
              <a
                href={forgeTaskUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                title="Open task in Forge"
              >
                <FiExternalLink size={12} className="text-slate-400" />
                Open in Forge
              </a>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={handleCopyLink}
              title="Copy shareable link"
            >
              <FiLink2 size={12} className="text-slate-400" />
              Copy Link
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={handleCopyAiPayload}
              title="Copy AI fix payload"
            >
              <FiCopy size={12} className="text-slate-400" />
              Copy AI Payload
            </button>
          </div>
          <div className="relative mt-2 min-h-4">
            {(showCopied || showLinkCopied) && (
              <span className="absolute left-0 top-0 text-xs font-medium text-slate-500 animate-devnotes-fade-up pointer-events-none">
                {showLinkCopied ? 'Link copied!' : 'Copied!'}
              </span>
            )}
            {showAiPayloadCopied && (
              <span className="absolute left-0 top-0 text-xs font-medium text-slate-500 animate-devnotes-fade-up pointer-events-none">
                AI payload copied!
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <section className={SECTION_CARD_CLASS}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={sectionLabelClass}>Core details</span>
            {aiProvider && (
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  canReviewDescriptionWithAi
                    ? 'border border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100'
                    : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
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

          <div className="space-y-4">
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className={`${FIELD_SURFACE_CLASS} ${CONTROL_INPUT_CLASS}`}
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>Description</label>
              <textarea
                ref={descriptionRef}
                className={`${FIELD_SURFACE_CLASS} ${CONTROL_TEXTAREA_CLASS}`}
                placeholder="Detailed description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onInput={resizeDescriptionField}
                rows={5}
                style={{ minHeight: '120px', height: descriptionHeight }}
              />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm shadow-slate-900/5">
            Choose narrative path
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <section className={SECTION_CARD_CLASS}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={sectionLabelClass}>Issue details</span>
            <span className="text-xs text-slate-500">Use one or both fields below</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>Expected Behavior</label>
              <textarea
                ref={expectedBehaviorRef}
                className={`${FIELD_SURFACE_CLASS} ${CONTROL_TEXTAREA_CLASS}`}
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
              <label className={floatingLabelClass(isSuperscriptLabels)}>Actual Behavior</label>
              <textarea
                ref={actualBehaviorRef}
                className={`${FIELD_SURFACE_CLASS} ${CONTROL_TEXTAREA_CLASS}`}
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
            <p className="mt-3 text-xs font-medium text-rose-600">
              Add a description, expected behavior, or actual behavior.
            </p>
          )}
        </section>

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

        {aiDescription && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm shadow-emerald-900/5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                AI-Reviewed Description
              </span>
              <button
                type="button"
                className="text-xs font-medium text-rose-600 transition hover:text-rose-700"
                onClick={() => {
                  setAiDescription(null);
                  setAiReady(false);
                }}
              >
                Remove
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {aiDescription}
            </p>
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:border-violet-300 hover:bg-violet-50"
                onClick={handleCopyAiPayload}
              >
                <FiCopy size={12} />
                Copy AI Fix Payload
              </button>
            </div>
            {showAiPayloadCopied && (
              <p className="mt-2 text-right text-xs font-medium text-violet-700">
                AI payload copied!
              </p>
            )}
          </section>
        )}

        <section className={SECTION_CARD_CLASS}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={sectionLabelClass}>Workflow</span>
            <span className="text-xs text-slate-500">Search or add where allowed</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>Type(s)</label>
              <div className="relative">
                <div className={FIELD_SURFACE_CLASS}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <FiSearch size={14} className="shrink-0 text-slate-400" />
                    <div className="h-4 w-px bg-slate-200" />
                  </div>
                  <div className="flex min-h-[40px] flex-wrap items-center gap-1 px-3 pb-2 pt-0">
                    {selectedTypes.map((typeId) => (
                      <span
                        key={typeId}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {getTypeName(typeId)}
                        <button
                          type="button"
                          className="ml-0.5 text-slate-400 transition hover:text-slate-700"
                          onClick={() => handleTypeRemove(typeId)}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    <input
                      ref={typeInputRef}
                      type="text"
                      className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
                    <span className="shrink-0 text-[11px] text-slate-400">Enter to select</span>
                  </div>
                </div>

                {showTypeDropdown && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    {availableTypes
                      .filter((type) =>
                        type.name.toLowerCase().includes(newTypeName.toLowerCase())
                      )
                      .map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition hover:bg-slate-50"
                          onMouseDown={() => handleTypeSelect(type.id)}
                        >
                          <span className="text-sm text-slate-700">{type.name}</span>
                          {!type.is_default && (
                            <button
                              type="button"
                              className="rounded-full p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
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
                          className="cursor-pointer border-t border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-violet-700 transition hover:bg-violet-50"
                          onMouseDown={() => setPendingTypeName(newTypeName.trim())}
                        >
                          + Queue "{newTypeName.trim()}" for approval
                        </div>
                      )}
                    {availableTypes.length === 0 && !newTypeName.trim() && (
                      <div className="px-3 py-2.5 text-sm text-slate-500">
                        No more types available
                      </div>
                    )}
                  </div>
                )}

                {pendingTypeName && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-amber-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-medium text-slate-700">
                        Add "{pendingTypeName}"? Press Shift+Enter or approve.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          onClick={() => setPendingTypeName(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-amber-300 bg-amber-400 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-amber-500"
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

            {isAdmin && (
              <div className={isSuperscriptLabels ? 'relative' : ''}>
                <label className={floatingLabelClass(isSuperscriptLabels)}>
                  Assignment & Workflow
                </label>
                <div className="space-y-3">
                  <SearchableSingleSelect
                    label="Assignee"
                    options={[{ id: '', label: 'Unassigned' }, ...collaboratorOptions]}
                    value={assignedTo ?? ''}
                    onChange={(value) => setAssignedTo(value || null)}
                    placeholder="Search assignee..."
                    isSuperscript={isSuperscriptLabels}
                  />
                  {existingReport && (statusValue === 'Closed' || statusValue === 'Resolved') && (
                    <SearchableSingleSelect
                      label="Resolved By"
                      options={[{ id: '', label: 'Not Set' }, ...collaboratorOptions]}
                      value={resolvedBy ?? ''}
                      onChange={(value) => setResolvedBy(value || null)}
                      placeholder="Search resolver..."
                      isSuperscript={isSuperscriptLabels}
                    />
                  )}
                </div>
              </div>
            )}

            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>Task List</label>
              <div className="relative">
                <div className={FIELD_SURFACE_CLASS}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <FiSearch size={14} className="shrink-0 text-slate-400" />
                    <div className="h-4 w-px bg-slate-200" />
                  </div>
                  <div className="flex min-h-[40px] flex-wrap items-center gap-1 px-3 pb-2 pt-0">
                    {taskListId && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {getTaskListName(taskListId)}
                        <button
                          type="button"
                          className="ml-0.5 text-slate-400 transition hover:text-slate-700"
                          onClick={() => setTaskListId('')}
                        >
                          &times;
                        </button>
                      </span>
                    )}
                    <input
                      ref={taskListInputRef}
                      type="text"
                      className="flex-1 min-w-[140px] border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
                    <span className="shrink-0 text-[11px] text-slate-400">Enter to select</span>
                  </div>
                </div>

                {showTaskListDropdown && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[220px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                    {taskLists
                      .filter((list) =>
                        list.name.toLowerCase().includes(taskListSearchTerm.toLowerCase())
                      )
                      .map((list) => (
                        <div
                          key={list.id}
                          className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition hover:bg-slate-50 ${
                            list.id === taskListId ? 'bg-slate-50' : ''
                          }`}
                          onMouseDown={() => handleTaskListSelect(list.id)}
                        >
                          <span
                            className={`text-sm text-slate-700 ${
                              list.id === taskListId ? 'font-medium' : ''
                            }`}
                          >
                            {list.name}
                          </span>
                          {list.is_default && (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
                          className="cursor-pointer border-t border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-violet-700 transition hover:bg-violet-50"
                          onMouseDown={() => setPendingTaskListName(taskListSearchTerm.trim())}
                        >
                          + Queue "{taskListSearchTerm.trim()}" for approval
                        </div>
                      )}
                    {taskLists.length === 0 && !taskListSearchTerm.trim() && (
                      <div className="px-3 py-2.5 text-sm text-slate-500">
                        No task lists available
                      </div>
                    )}
                  </div>
                )}

                {pendingTaskListName && (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-amber-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-medium text-slate-700">
                        Add "{pendingTaskListName}"? Press Shift+Enter or approve.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          onClick={() => setPendingTaskListName(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-amber-300 bg-amber-400 px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-amber-500"
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

            <div className={isSuperscriptLabels ? 'relative' : ''}>
              <label className={floatingLabelClass(isSuperscriptLabels)}>Page URL</label>
              <div className={FIELD_SURFACE_CLASS}>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    className={`w-full border-0 bg-transparent py-2 pl-3 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 ${
                      !existingReport ? 'cursor-not-allowed text-slate-500' : ''
                    }`}
                    value={reportPageUrl}
                    onChange={(e) => setReportPageUrl(e.target.value)}
                    readOnly={!existingReport}
                  />
                  <a
                    href={composePageUrlWithTab(reportPageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    title="Open in new tab"
                  >
                    <FiExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {existingReport && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={sectionLabelClass}>Discussion</span>
              <span className="text-xs text-slate-500">Visible to collaborators with access</span>
            </div>
            <DevNotesDiscussion report={existingReport} />
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex flex-wrap items-center gap-3">
            {isAdmin && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  aiReady ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {aiReady ? 'AI Ready' : 'AI Not Ready'}
              </span>
            )}
            {existingReport && (onDelete || onArchive) ? (
              <>
                {onArchive && (
                  <button
                    type="button"
                    className={ACTION_ICON_BUTTON_CLASS}
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
                    className={`${ACTION_ICON_BUTTON_CLASS} text-rose-500 hover:text-rose-700`}
                    onClick={() => setPendingDestructiveAction('delete')}
                    disabled={loading}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
                {pendingDestructiveAction && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-30 min-w-[260px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                    <p className="text-sm text-slate-800">
                      {pendingDestructiveAction === 'delete'
                        ? 'Delete this dev note permanently?'
                        : 'Archive this dev note by setting its status to Closed?'}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        onClick={() => setPendingDestructiveAction(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1.5 text-xs font-medium text-white transition ${
                          pendingDestructiveAction === 'delete'
                            ? 'bg-rose-500 hover:bg-rose-600'
                            : 'bg-slate-700 hover:bg-slate-800'
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
              className={ACTION_ICON_BUTTON_CLASS}
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
