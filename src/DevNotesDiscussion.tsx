import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiAtSign, FiEdit2, FiMessageSquare, FiSend, FiTrash2 } from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import type { BugReport, BugReportMessage, BugReportCreator } from './types';

type DevNotesDiscussionProps = {
  report: BugReport;
};

const messageCache = new Map<string, BugReportMessage[]>();
const MESSAGE_CACHE_MAX = 50;

const getCachedMessages = (reportId: string): BugReportMessage[] | undefined => {
  const cached = messageCache.get(reportId);
  if (!cached) return undefined;

  // Refresh insertion order for LRU behavior.
  messageCache.delete(reportId);
  messageCache.set(reportId, cached);
  return cached;
};

const setCachedMessages = (reportId: string, messages: BugReportMessage[]) => {
  if (messageCache.has(reportId)) {
    messageCache.delete(reportId);
  }
  messageCache.set(reportId, messages);

  while (messageCache.size > MESSAGE_CACHE_MAX) {
    const oldestKey = messageCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    messageCache.delete(oldestKey);
  }
};

const detectActiveMention = (value: string, cursor: number) => {
  const slice = value.slice(0, cursor);
  const atIndex = slice.lastIndexOf('@');
  if (atIndex === -1) return null;
  if (atIndex > 0 && /\S/.test(slice.charAt(atIndex - 1))) {
    return null;
  }
  const query = slice.slice(atIndex + 1);
  if (query.includes(' ') || query.includes('\n') || query.includes('\t')) {
    return null;
  }
  return { start: atIndex, end: cursor, query };
};

export default function DevNotesDiscussion({ report }: DevNotesDiscussionProps) {
  const { user, adapter, markMessagesAsRead, userProfiles, collaborators, onNotify } = useDevNotes();
  const [messages, setMessages] = useState<BugReportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionHighlight, setMentionHighlight] = useState(0);

  const updateMentionTracking = useCallback((value: string, cursor: number) => {
    const mention = detectActiveMention(value, cursor);
    if (mention) {
      setMentionRange({ start: mention.start, end: mention.end });
      setMentionQuery(mention.query.toLowerCase());
      setMentionHighlight(0);
    } else {
      setMentionRange(null);
      setMentionQuery('');
      setMentionHighlight(0);
    }
  }, []);

  const mentionCandidates = useMemo(() => {
    const map = new Map<string, BugReportCreator>();
    collaborators.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });
    Object.entries(userProfiles).forEach(([id, profile]) => {
      if (!map.has(id)) {
        map.set(id, {
          id,
          full_name: profile.full_name || null,
          email: profile.email || null,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const aLabel = (a.full_name || a.email || '').toLowerCase();
      const bLabel = (b.full_name || b.email || '').toLowerCase();
      return aLabel.localeCompare(bLabel);
    });
  }, [collaborators, userProfiles]);

  const mentionOptions = useMemo(() => {
    if (!mentionRange) return [];
    const query = mentionQuery.trim();
    if (!query) return mentionCandidates;
    return mentionCandidates.filter((c) => {
      const label = (c.full_name || c.email || '').toLowerCase();
      return label.includes(query);
    });
  }, [mentionCandidates, mentionQuery, mentionRange]);

  const messageCountLabel = messages.length === 1 ? '1 note' : `${messages.length} notes`;
  const hasNoMentionResults = Boolean(mentionRange && mentionOptions.length === 0);

  useEffect(() => {
    if (!mentionRange) {
      setMentionHighlight(0);
      return;
    }
    setMentionHighlight((prev) => {
      if (mentionOptions.length === 0) return 0;
      return Math.min(prev, mentionOptions.length - 1);
    });
  }, [mentionOptions, mentionRange]);

  const insertMention = (collaborator: BugReportCreator) => {
    if (!mentionRange) return;
    const label = collaborator.full_name || collaborator.email || 'User';
    const before = newMessage.slice(0, mentionRange.start);
    const after = newMessage.slice(mentionRange.end);
    const insertion = `@${label} `;
    const nextValue = `${before}${insertion}${after}`;
    setNewMessage(nextValue);
    setMentionRange(null);
    setMentionQuery('');
    setMentionHighlight(0);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPosition = before.length + insertion.length;
        textarea.focus();
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  };

  const loadMessages = useCallback(
    async (reportId: string, { silent } = { silent: false }) => {
      if (!reportId) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const data = await adapter.fetchMessages(reportId);
        setMessages(data);
        setCachedMessages(reportId, data);
      } catch (err: any) {
        console.error('[DevNotes] Failed to load messages', err);
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [adapter]
  );

  useEffect(() => {
    if (!report?.id) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const cached = getCachedMessages(report.id);
    if (cached) {
      setMessages(cached);
      setLoadingMessages(false);
      loadMessages(report.id, { silent: true });
    } else {
      loadMessages(report.id);
    }
  }, [report?.id, loadMessages]);

  useEffect(() => {
    if (!report?.id || !messages.length) return;
    const unreadMessageIds = messages
      .filter((message) => message.author_id !== user?.id)
      .map((message) => message.id);
    if (unreadMessageIds.length) {
      markMessagesAsRead(report.id, unreadMessageIds);
    }
  }, [messages, report?.id, user?.id, markMessagesAsRead]);

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value);
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const directionBadge = (authorId: string) => {
    if (authorId === report.created_by) {
      return { label: 'Reporter', className: 'bg-purple-100 text-purple-800' };
    }
    return { label: 'Team', className: 'bg-blue-100 text-blue-800' };
  };

  const startEditing = (message: BugReportMessage) => {
    setEditingMessageId(message.id);
    setEditDraft(message.body);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditDraft('');
  };

  const handleMentionCursorUpdate = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    updateMentionTracking(textarea.value, cursor);
  }, [updateMentionTracking]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    const cursor = e.target.selectionStart ?? value.length;
    updateMentionTracking(value, cursor);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
      return;
    }

    if (mentionRange && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight((prev) => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight((prev) => (prev - 1 < 0 ? mentionOptions.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionOptions[mentionHighlight]);
        return;
      }
    }

    if (mentionRange && e.key === 'Escape') {
      e.preventDefault();
      setMentionRange(null);
      setMentionQuery('');
      setMentionHighlight(0);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !report?.id || !user?.id) return;

    setSending(true);
    try {
      const data = await adapter.createMessage(report.id, newMessage.trim());
      setMessages((prev) => {
        const next = [...prev, data];
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      setNewMessage('');
      setMentionRange(null);
      setMentionQuery('');

      // Fire notification callback
      if (onNotify) {
        try {
          const commenterName = data.author?.full_name || 'Someone';
          const reportTitle = report.title || 'Untitled';
          const snippet = data.body.length > 200 ? data.body.slice(0, 200) + '...' : data.body;

          const recipientEmails = new Set<string>();

          if (report.creator?.email && report.created_by !== user.id) {
            recipientEmails.add(report.creator.email);
          }

          const priorMessages = getCachedMessages(report.id) || [];
          for (const msg of priorMessages) {
            if (msg.author_id !== user.id && msg.author?.email) {
              recipientEmails.add(msg.author.email);
            }
          }

          for (const email of recipientEmails) {
            onNotify({
              type: 'new_comment',
              recipientEmail: email,
              subject: `New comment on Dev Note: ${reportTitle}`,
              textBody: `Hi,\n\n${commenterName} commented on the dev note "${reportTitle}":\n\n"${snippet}"\n\nThank you,\nDev Notes`,
              htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333;">New Comment on Dev Note</h2>
  <p><strong>${commenterName}</strong> commented on <strong>"${reportTitle}"</strong>:</p>
  <blockquote style="border-left: 3px solid #ccc; padding-left: 12px; color: #555; margin: 16px 0;">${snippet}</blockquote>
  <p>Thank you,<br>Dev Notes</p>
</div>`,
            });
          }
        } catch (notifyErr) {
          console.error('[DevNotes] Error building comment notifications:', notifyErr);
        }
      }
    } catch (err: any) {
      console.error('[DevNotes] Failed to add message', err);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessageId || !editDraft.trim() || !user?.id) return;

    setEditLoading(true);
    try {
      const data = await adapter.updateMessage(editingMessageId, editDraft.trim());
      setMessages((prev) => {
        const next = prev.map((msg) => (msg.id === data.id ? data : msg));
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      cancelEditing();
    } catch (err: any) {
      console.error('[DevNotes] Failed to update message', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return;
    const confirmed = window.confirm('Delete this note? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(messageId);
    try {
      await adapter.deleteMessage(messageId);
      setMessages((prev) => {
        const next = prev.filter((msg) => msg.id !== messageId);
        if (report?.id) {
          setCachedMessages(report.id, next);
        }
        return next;
      });
      if (editingMessageId === messageId) {
        cancelEditing();
      }
    } catch (err: any) {
      console.error('[DevNotes] Failed to delete message', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!report?.id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-white/80 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
            <FiMessageSquare size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Conversation locked</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Save this task first to open the note thread.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Avatar initials helper
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Discussion</p>
          <p className="text-xs text-slate-500">{messageCountLabel}</p>
        </div>
        <p className="text-xs text-slate-500">Mentions notify teammates in real time.</p>
      </div>

      <div className="flex-1 min-h-[240px] max-h-[360px] overflow-y-auto pr-1">
        {loadingMessages ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <FiMessageSquare size={16} />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-slate-900">No notes yet</p>
              <p className="text-sm text-slate-600">Add context, ask for help, or mention a teammate.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              const badge = directionBadge(message.author_id);
              const authorLabel =
                message.author?.full_name ||
                message.author?.email ||
                (message.author_id === report.created_by ? 'Reporter' : 'Team');
              const canManage =
                user?.id && message.author_id === user.id;
              const wasUpdated =
                message.updated_at &&
                new Date(message.updated_at).toISOString() !==
                  new Date(message.created_at).toISOString();

              return (
                <div
                  key={message.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {getInitials(authorLabel)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{authorLabel}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatTimestamp(message.created_at)}
                          {wasUpdated && (
                            <span className="text-slate-400">
                              {' '}&middot; Updated {formatTimestamp(message.updated_at)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => startEditing(message)}
                          aria-label="Edit note"
                          title="Edit note"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingId === message.id}
                          aria-label="Delete note"
                          title="Delete note"
                        >
                          {deletingId === message.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                          ) : (
                            <FiTrash2 size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingMessageId === message.id ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                          onClick={handleUpdateMessage}
                          disabled={!editDraft.trim() || editLoading}
                        >
                          {editLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Add a reply or request more info..."
            value={newMessage}
            onChange={handleMessageChange}
            onKeyDown={handleTextareaKeyDown}
            onKeyUp={handleMentionCursorUpdate}
            onClick={handleMentionCursorUpdate}
            rows={4}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900/20"
          />
          {mentionRange && (
            <div className="absolute bottom-3 left-3 z-[2] min-w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
                <FiAtSign size={12} />
                <span>Mentions</span>
                <span className="ml-auto">Type to filter, Enter to select</span>
              </div>
              {hasNoMentionResults ? (
                <div className="px-3 py-3">
                  <p className="text-sm text-slate-500">No collaborators match "{mentionQuery}"</p>
                </div>
              ) : (
                mentionOptions.map((collaborator, index) => (
                  <div
                    key={collaborator.id}
                    className={`cursor-pointer px-3 py-2 transition hover:bg-slate-50 ${
                      mentionHighlight === index ? 'bg-slate-100' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(collaborator);
                      setMentionHighlight(index);
                    }}
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {collaborator.full_name || collaborator.email || 'Unknown'}
                    </p>
                    {collaborator.email && collaborator.full_name && (
                      <p className="text-xs text-slate-500">{collaborator.email}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-500">
            Notes are visible to everyone with access to Dev Notes. Use{' '}
            <span className="font-bold">@</span> to mention a teammate.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            title="Send note"
          >
            <FiSend size={14} />
            <span>{sending ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
