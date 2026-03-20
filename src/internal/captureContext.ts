import type { TaskCaptureContext } from '../types';
import { normalizePageUrl } from './bugAnchors';

export function deriveRouteLabelFromUrl(rawUrl: string): string {
  const fallback = 'Current Page';

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    const parsed = new URL(rawUrl || '/', origin);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Home';

    const last = decodeURIComponent(parts[parts.length - 1]).replace(/[-_]+/g, ' ').trim();
    if (!last) return fallback;

    return last
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return fallback;
  }
}

export function detectBrowserName(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  return 'Unknown';
}

export function buildCaptureContext(pageUrl: string): TaskCaptureContext | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;

  const normalizedUrl = normalizePageUrl(pageUrl || window.location.pathname);
  let path = window.location.pathname;
  try {
    path = new URL(normalizedUrl, window.location.origin).pathname;
  } catch {
    path = normalizedUrl;
  }

  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || null
      : null;

  return {
    captured_at: new Date().toISOString(),
    route_label: deriveRouteLabelFromUrl(normalizedUrl),
    path,
    browser: {
      name: detectBrowserName(navigator.userAgent || ''),
      user_agent: navigator.userAgent || 'unknown',
      platform: navigator.platform || null,
      language: navigator.language || null,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio || 1,
    },
    timezone,
  };
}
