import { useState, type CSSProperties } from 'react';
import { FiAlertTriangle, FiCopy, FiCheck } from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';
import type { ForgeError } from './types';

/**
 * Builds the ready-to-paste AI debugging prompt embedding the exact Forge error.
 */
export function buildForgeDebugPrompt(err: ForgeError): string {
  return `The Politogy VRM DevNotes panel cannot reach Focus Forge. Debug and fix the backend Forge connection.
Error: ${err.message}
Forge path: ${err.path}  HTTP status: ${err.status ?? 'n/a'}  Code: ${err.code}
Backend: core/react/backend/main.ts (handleDevNotesApiForgeOnly, fetchFocusForge). Forge base: FOCUS_FORGE_BASE_URL. Check FOCUS_FORGE_PAT, Forge reachability/timeout, and pagination of /api/sync/comments and /api/mobile/tasks.`;
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  fontSize: 13,
  lineHeight: 1.4,
  boxSizing: 'border-box',
};

/**
 * Red/warning banner shown at the top of the DevNotes panel and All-Tasks modal
 * whenever the backend reports it cannot reach Focus Forge. Renders nothing when
 * Forge is connected (or status is still unknown).
 */
export default function DevNotesForgeBanner({ style }: { style?: CSSProperties }) {
  const { forgeStatus } = useDevNotes();
  const [copied, setCopied] = useState(false);

  const disconnected = forgeStatus?.connected === false;
  if (!disconnected) return null;

  const err: ForgeError = forgeStatus?.error || {
    path: '',
    status: null,
    code: 'UNKNOWN',
    message: 'Focus Forge is unreachable.',
  };

  const handleCopy = async () => {
    const prompt = buildForgeDebugPrompt(err);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (insecure context) — leave state unchanged.
    }
  };

  return (
    <div role="alert" style={{ ...wrapStyle, ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <FiAlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#dc2626' }} />
        <span style={{ fontWeight: 500 }}>
          {'Forge is disconnected. '}
          <span style={{ fontWeight: 400 }}>{err.message}</span>
        </span>
      </div>
      <div>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 6,
            border: '1px solid #fca5a5',
            background: copied ? '#dcfce7' : '#ffffff',
            color: copied ? '#15803d' : '#991b1b',
            cursor: 'pointer',
          }}
        >
          {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
          {copied ? 'Copied!' : 'Copy debug prompt'}
        </button>
      </div>
    </div>
  );
}
