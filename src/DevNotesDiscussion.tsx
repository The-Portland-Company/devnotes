import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
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
    if (authorId === 'legacy') {
      return { label: 'Legacy', className: 'bg-gray-100 text-gray-800' };
    }
    return { label: 'Team', className: 'bg-blue-100 text-blue-800' };
  };

  const derivedMessages = useMemo(() => {
    if (!report?.response) {
      return messages;
    }

    const hasPersistedLegacy = messages.some((message) => message.id === 'legacy-response');
    if (hasPersistedLegacy) {
      return messages;
    }

    const legacyMessage: BugReportMessage = {
      id: 'legacy-response',
      bug_report_id: report.id,
      author_id: 'legacy',
      body: report.response,
      created_at: report.updated_at,
      updated_at: report.updated_at,
      author: {
        id: 'legacy',
        email: null,
        full_name: 'Legacy Response',
      },
    };

    return [legacyMessage, ...messages];
  }, [messages, report?.id, report?.response, report?.updated_at]);

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
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 min-h-[250px]">
        <p className="text-sm text-gray-600">Save this task first to start a conversation.</p>
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
    <div className="flex flex-col gap-4 bg-gray-50 rounded-lg border border-gray-100 p-4 h-full">
      <div>
        <p className="text-sm font-semibold">Comments</p>
      </div>

      <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto pr-2">
        {loadingMessages ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : derivedMessages.length === 0 ? (
          <div className="flex items-center bg-white rounded-md border border-dashed border-gray-200 p-4">
            <p className="text-sm text-gray-500">No notes yet. Start the conversation below.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {derivedMessages.map((message) => {
              const badge = directionBadge(message.author_id);
              const authorLabel =
                message.author?.full_name ||
                message.author?.email ||
                (message.author_id === report.created_by ? 'Reporter' : 'Team');
              const canManage =
                user?.id && message.author_id === user.id && message.id !== 'legacy-response';
              const wasUpdated =
                message.updated_at &&
                new Date(message.updated_at).toISOString() !==
                  new Date(message.created_at).toISOString();

              return (
                <div
                  key={message.id}
                  className="bg-white rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {getInitials(authorLabel)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{authorLabel}</span>
                          <span className={`text-[0.65rem] px-1.5 py-0.5 rounded ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(message.created_at)}
                          {wasUpdated && (
                            <span className="text-gray-400">
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
                          className="p-1 rounded hover:bg-gray-100 text-gray-500"
                          onClick={() => startEditing(message)}
                          aria-label="Edit note"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingId === message.id}
                          aria-label="Delete note"
                        >
                          {deletingId === message.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <FiTrash2 size={14} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  {editingMessageId === message.id ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 text-xs rounded hover:bg-gray-100"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          onClick={handleUpdateMessage}
                          disabled={!editDraft.trim() || editLoading}
                        >
                          {editLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.body}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
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
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          {mentionRange && (
            <div className="absolute bottom-3 left-3 bg-white border border-gray-200 rounded-md shadow-lg min-w-[220px] max-h-[200px] overflow-y-auto z-[2]">
              {mentionOptions.length === 0 ? (
                <div className="px-3 py-2">
                  <p className="text-sm text-gray-500">
                    No collaborators match "{mentionQuery}"
                  </p>
                </div>
              ) : (
                mentionOptions.map((collaborator, index) => (
                  <div
                    key={collaborator.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                      mentionHighlight === index ? 'bg-gray-100' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(collaborator);
                      setMentionHighlight(index);
                    }}
                  >
                    <p className="text-sm font-semibold">
                      {collaborator.full_name || collaborator.email || 'Unknown'}
                    </p>
                    {collaborator.email && collaborator.full_name && (
                      <p className="text-xs text-gray-500">{collaborator.email}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Notes are visible to everyone with access to Dev Notes. Use{' '}
            <span className="font-bold">@</span> to mention a teammate.
          </p>
          <button
            type="button"
            className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
