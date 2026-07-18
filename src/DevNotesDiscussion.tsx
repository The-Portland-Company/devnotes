import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiAtSign, FiEdit2, FiMessageSquare, FiSend, FiStar, FiTrash2 } from 'react-icons/fi';
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

// --- contentEditable mention composer helpers ---
// The compose box is a contentEditable so mentions can render as real inline
// pill badges (identical styling to posted comments) rather than a highlight
// overlay behind a textarea, which never reads as a true badge.
const MENTION_ATTR = 'data-dn-mention';
const MENTION_FAVORITES_KEY = 'devnotes:mention-favorites';

// Flatten the editor DOM back to the plain-text value we submit. Mention chips
// serialize to "@Full Name"; <br> and block <div> boundaries become newlines.
const getEditorText = (root: HTMLElement): string => {
  let out = '';
  const nl = () => {
    if (out.length && !out.endsWith('\n')) out += '\n';
  };
  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.nodeValue || '').replace(/ /g, ' ');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.getAttribute(MENTION_ATTR) != null) {
      out += '@' + (el.getAttribute('data-label') || '');
      return;
    }
    if (el.tagName === 'BR') {
      out += '\n';
      return;
    }
    if (el.tagName === 'DIV') nl();
    Array.from(el.childNodes).forEach(walk);
  };
  Array.from(root.childNodes).forEach(walk);
  return out;
};

// Detect an in-progress "@query" immediately before a collapsed caret.
const detectMentionAtCaret = (
  root: HTMLElement
): { node: Text; atIndex: number; offset: number; query: string } | null => {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const text = node.nodeValue || '';
  const offset = sel.anchorOffset;
  const before = text.slice(0, offset);
  const atIndex = before.lastIndexOf('@');
  if (atIndex === -1) return null;
  // The "@" must start a word: preceded by whitespace/nbsp or the node start.
  if (atIndex > 0 && /\S/.test(before.charAt(atIndex - 1).replace(/ /g, ' '))) return null;
  const query = before.slice(atIndex + 1);
  if (/[\s ]/.test(query)) return null;
  return { node: node as Text, atIndex, offset, query };
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
  const editorRef = useRef<HTMLDivElement>(null);
  // DOM location of the active "@query" so insertMention knows where to splice.
  const mentionInfoRef = useRef<{ node: Text; atIndex: number; offset: number } | null>(null);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [mentionCaret, setMentionCaret] = useState<{ top: number; left: number; height: number } | null>(null);
  // Tracks the last query so cursor/keyup events that don't change the query
  // (e.g. arrow navigation) don't stomp the highlighted index back to 0.
  const lastMentionQueryRef = useRef<string | null>(null);
  // DOM nodes for each mention option, so arrow-key navigation can scroll the
  // highlighted row into view instead of it being clipped at the list edge.
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Favorited collaborators (persisted) surface first in the mention list.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage.getItem(MENTION_FAVORITES_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  const toggleFavorite = useCallback((id: string) => {
    if (!id) return;
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(MENTION_FAVORITES_KEY, JSON.stringify(Array.from(next)));
      } catch {
        /* ignore persistence failures */
      }
      return next;
    });
  }, []);
  // "CC/BCC myself" — when on, the sender is added as a recipient of the
  // comment notification so they can confirm it was actually delivered.
  const [copySelf, setCopySelf] = useState(false);

  const closeMention = useCallback(() => {
    mentionInfoRef.current = null;
    setMentionRange(null);
    setMentionQuery('');
    setMentionHighlight(0);
    setMentionCaret(null);
    lastMentionQueryRef.current = null;
  }, []);

  const updateMentionTracking = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const mention = detectMentionAtCaret(editor);
    if (mention) {
      mentionInfoRef.current = { node: mention.node, atIndex: mention.atIndex, offset: mention.offset };
      const nextQuery = mention.query.toLowerCase();
      // mentionRange is kept only as an "open" flag for the popup now.
      setMentionRange({ start: mention.atIndex, end: mention.offset });
      setMentionQuery(nextQuery);
      if (lastMentionQueryRef.current !== nextQuery) {
        setMentionHighlight(0);
        lastMentionQueryRef.current = nextQuery;
      }
      // Anchor the popup to the caret using the live selection rect.
      const sel = editor.ownerDocument.getSelection();
      if (sel && sel.rangeCount > 0) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const host = editor.getBoundingClientRect();
        setMentionCaret({
          top: rect.top - host.top,
          left: Math.max(rect.left - host.left, 0),
          height: rect.height || 20,
        });
      }
    } else {
      closeMention();
    }
  }, [closeMention]);

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
    const base = !query
      ? mentionCandidates
      : mentionCandidates.filter((c) => {
          const label = (c.full_name || c.email || '').toLowerCase();
          return label.includes(query);
        });
    // Favorites first (stable within each group, preserving alpha order).
    return [...base].sort((a, b) => {
      const af = favoriteIds.has(a.id || '') ? 0 : 1;
      const bf = favoriteIds.has(b.id || '') ? 0 : 1;
      return af - bf;
    });
  }, [mentionCandidates, mentionQuery, mentionRange, favoriteIds]);

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

  // Keep the highlighted mention row scrolled into view during arrow-key nav so
  // the selection is never clipped at the top or bottom of the scroll area.
  useEffect(() => {
    if (!mentionRange) return;
    const el = optionRefs.current[mentionHighlight];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [mentionHighlight, mentionRange, mentionOptions]);

  const buildMentionChip = (collaborator: BugReportCreator, doc: Document): HTMLElement => {
    const label = collaborator.full_name || collaborator.email || 'User';
    const chip = doc.createElement('span');
    chip.setAttribute(MENTION_ATTR, collaborator.id || '');
    chip.setAttribute('data-label', label);
    chip.setAttribute('contenteditable', 'false');
    chip.className =
      'mx-0.5 inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 align-baseline text-xs font-medium text-blue-700';
    const at = doc.createElement('span');
    at.className = 'text-blue-400';
    at.textContent = '@';
    chip.appendChild(at);
    const name = doc.createElement('span');
    name.textContent = label;
    chip.appendChild(name);
    if (collaborator.email && collaborator.full_name) {
      const email = doc.createElement('span');
      email.className = 'text-blue-400';
      email.textContent = collaborator.email;
      chip.appendChild(email);
    }
    return chip;
  };

  const insertMention = (collaborator: BugReportCreator) => {
    const editor = editorRef.current;
    const info = mentionInfoRef.current;
    if (!editor || !info) return;
    const doc = editor.ownerDocument;
    const { node, atIndex, offset } = info;
    const text = node.nodeValue || '';
    // Drop the "@query" the user typed; keep text on either side.
    node.nodeValue = text.slice(0, atIndex);
    const afterNode = doc.createTextNode(text.slice(offset));
    const chip = buildMentionChip(collaborator, doc);
    const spacer = doc.createTextNode(' '); // keeps a boundary + caret home
    const parent = node.parentNode;
    if (!parent) return;
    const anchor = node.nextSibling;
    parent.insertBefore(chip, anchor);
    parent.insertBefore(spacer, anchor);
    parent.insertBefore(afterNode, anchor);
    // Place the caret right after the trailing space.
    const sel = doc.getSelection();
    if (sel) {
      const range = doc.createRange();
      range.setStart(spacer, spacer.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    editor.focus();
    setNewMessage(getEditorText(editor));
    closeMention();
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

  // Sync plain-text value + mention tracking whenever the editor content or
  // caret changes.
  const handleEditorInput = () => {
    const editor = editorRef.current;
    if (!editor) return;
    setNewMessage(getEditorText(editor));
    updateMentionTracking();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
      closeMention();
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
      if (editorRef.current) editorRef.current.innerHTML = '';
      closeMention();

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

          // CC/BCC self: deliver a copy to the sender so they can confirm the
          // comment notification actually went out to the mentioned recipients.
          const selfEmail = user.email || data.author?.email || null;
          if (copySelf && selfEmail) {
            recipientEmails.add(selfEmail);
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

  // Render a message body, turning "@Full Name" tokens that match a known
  // collaborator into a styled badge showing their full name and email.
  const mentionLabels = useMemo(
    () =>
      mentionCandidates
        .map((c) => ({ collaborator: c, label: (c.full_name || c.email || '').trim() }))
        .filter((x) => x.label)
        .sort((a, b) => b.label.length - a.label.length),
    [mentionCandidates]
  );

  const renderMessageBody = (body: string) => {
    if (!mentionLabels.length || !body.includes('@')) return body;
    const nodes: React.ReactNode[] = [];
    let buffer = '';
    let i = 0;
    while (i < body.length) {
      if (body[i] === '@') {
        const rest = body.slice(i + 1);
        const match = mentionLabels.find((x) => rest.startsWith(x.label));
        if (match) {
          if (buffer) {
            nodes.push(buffer);
            buffer = '';
          }
          const { full_name, email } = match.collaborator;
          nodes.push(
            <span
              key={i}
              title={email || undefined}
              className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 align-baseline text-xs font-medium text-blue-700"
            >
              <FiAtSign size={10} className="shrink-0 text-blue-400" />
              <span>{full_name || email}</span>
              {full_name && email && <span className="text-blue-400">{email}</span>}
            </span>
          );
          i += 1 + match.label.length;
          continue;
        }
      }
      buffer += body[i];
      i++;
    }
    if (buffer) nodes.push(buffer);
    return nodes;
  };

  // Avatar initials helper
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 min-h-0 max-h-[360px] overflow-y-auto pr-1">
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
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{renderMessageBody(message.body)}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative rounded-xl border border-slate-300 bg-slate-50 transition focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900/20">
          {!newMessage && (
            <div className="pointer-events-none absolute left-3 top-3 text-sm text-slate-400">
              Add a reply or request more info...
            </div>
          )}
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Add a reply or request more info"
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            onKeyUp={updateMentionTracking}
            onClick={updateMentionTracking}
            className="min-h-[6.5rem] max-h-[240px] w-full overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-sans text-sm leading-5 text-slate-900 outline-none"
          />
          {mentionRange && (() => {
            const caret = mentionCaret ?? { top: 0, left: 0, height: 20 };
            const editor = editorRef.current;
            const fieldHeight = editor?.clientHeight ?? 0;
            // Flip above the caret when there isn't room below inside the field.
            const showAbove = fieldHeight > 0 && caret.top + caret.height + 200 > fieldHeight;
            const posStyle: React.CSSProperties = showAbove
              ? { left: caret.left, bottom: Math.max(fieldHeight - caret.top + 4, 0) }
              : { left: caret.left, top: caret.top + caret.height + 4 };
            return (
            <div
              className="absolute z-[2] max-h-[220px] min-w-[260px] max-w-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
              style={posStyle}
            >
              <div className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2 text-xs font-medium text-slate-500">
                <FiAtSign size={12} />
                <span>Mentions</span>
                <span className="ml-auto">Type to filter, Enter to select</span>
              </div>
              {hasNoMentionResults ? (
                <div className="px-3 py-3">
                  <p className="text-sm text-slate-500">No collaborators match "{mentionQuery}"</p>
                </div>
              ) : (
                mentionOptions.map((collaborator, index) => {
                  const isFav = favoriteIds.has(collaborator.id || '');
                  return (
                  <div
                    key={collaborator.id}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 transition hover:bg-slate-50 ${
                      mentionHighlight === index ? 'bg-slate-100' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(collaborator);
                      setMentionHighlight(index);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {collaborator.full_name || collaborator.email || 'Unknown'}
                      </p>
                      {collaborator.email && collaborator.full_name && (
                        <p className="truncate text-xs text-slate-500">{collaborator.email}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`shrink-0 rounded-md p-1 transition hover:bg-slate-200 ${
                        isFav ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                      }`}
                      aria-label={isFav ? 'Unfavorite teammate' : 'Favorite teammate'}
                      title={isFav ? 'Unfavorite (stops surfacing first)' : 'Favorite (surfaces first next time)'}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(collaborator.id || '');
                      }}
                    >
                      <FiStar size={14} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  );
                })
              )}
            </div>
            );
          })()}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <FiAtSign size={12} className="shrink-0 text-slate-400" />
            <span>
              Notes are visible to everyone with access to Dev Notes. Use{' '}
              <span className="font-semibold">@</span> to mention a teammate.
            </span>
          </span>
          <div className="flex items-center gap-3">
            <label
              className="inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-slate-600"
              title="Send yourself a copy of the notification so you can confirm it was delivered"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                checked={copySelf}
                onChange={(e) => setCopySelf(e.target.checked)}
              />
              <span>CC/BCC me</span>
            </label>
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
    </div>
  );
}
