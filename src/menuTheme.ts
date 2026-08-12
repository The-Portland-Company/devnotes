export type MenuScheme = 'light' | 'dark';

export type MenuSchemeRoot = {
  classList: { contains: (token: string) => boolean };
  getAttribute: (name: string) => string | null;
};

export const menuPalette = {
  light: {
    panelBg: '#ffffff',
    panelBorder: '#e5e7eb',
    text: '#1f2937',
    muted: '#6b7280',
    hover: '#f3f4f6',
    divider: '#e5e7eb',
    switchOff: '#d1d5db',
    trigger: '#374151',
    shadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    badgeBg: '#fee2e2',
    badgeText: '#b91c1c',
  },
  dark: {
    panelBg: '#161616',
    panelBorder: '#333333',
    text: '#e5e5e5',
    muted: '#a3a3a3',
    hover: '#1f1f1f',
    divider: '#333333',
    switchOff: '#404040',
    trigger: '#e5e5e5',
    shadow: '0 16px 32px -8px rgba(0,0,0,0.55)',
    badgeBg: '#3f1d1d',
    badgeText: '#fca5a5',
  },
} as const;

/**
 * Host theme source: `html.dark` (Politogy), then data-theme / data-color-mode,
 * then prefers-color-scheme. Explicit `.light` wins over the media query.
 */
export function resolveMenuScheme(root?: MenuSchemeRoot | null, prefersDark = false): MenuScheme {
  if (root) {
    if (root.classList.contains('dark')) return 'dark';
    if (root.classList.contains('light')) return 'light';
    const named = root.getAttribute('data-theme') || root.getAttribute('data-color-mode');
    if (named === 'dark' || named === 'light') return named;
  }
  return prefersDark ? 'dark' : 'light';
}

export function readDocumentMenuScheme(): MenuScheme {
  if (typeof document === 'undefined') return 'light';
  const prefersDark =
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  return resolveMenuScheme(document.documentElement, prefersDark);
}
