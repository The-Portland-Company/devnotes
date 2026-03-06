import type { BugReport } from '../types';

export type BugAnchorMetadata = {
  targetSelector: string | null;
  targetRelativeX: number | null;
  targetRelativeY: number | null;
};

export type BugPositionPayload = BugAnchorMetadata & {
  x: number;
  y: number;
};

/**
 * Normalize a page URL for bug report storage.
 * Strips hash fragments and trailing slashes. Preserves all query params.
 */
export const normalizePageUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const [pathAndQuery] = trimmed.split('#');
  const [rawPath, queryString] = pathAndQuery.split('?');
  const withoutTrailing = rawPath.replace(/\/+$/, '') || '/';

  if (queryString) {
    const params = new URLSearchParams(queryString);
    const normalizedQuery = params.toString();
    if (normalizedQuery) {
      return `${withoutTrailing}?${normalizedQuery}`;
    }
  }

  return withoutTrailing;
};

const ELEMENT_SELECTOR_MAX_DEPTH = 8;
const PREFERRED_ATTRIBUTES = ['data-bug-anchor', 'data-testid', 'data-id', 'data-role', 'aria-label'];

const cssEscape =
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape
    : (value: string) => value.replace(/([ #.;?+<>~*:()[\]\\])/g, '\\$1');

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

const parseNumberish = (value: unknown): number | null => {
  if (isNumber(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const shouldIgnoreClass = (className: string) => {
  // Only ignore emotion/CSS-modules dynamic hashes (css-*).
  // Keep framework class names like chakra-box, chakra-flex, etc. — they are
  // stable component-level identifiers that improve selector specificity.
  return !className || className.startsWith('css-');
};

const buildSelectorSegment = (element: HTMLElement) => {
  if (element.id) {
    return `#${cssEscape(element.id)}`;
  }

  for (const attr of PREFERRED_ATTRIBUTES) {
    const attrValue = element.getAttribute(attr);
    if (attrValue) {
      return `${element.tagName.toLowerCase()}[${attr}="${cssEscape(attrValue)}"]`;
    }
  }

  const stableClass = Array.from(element.classList).find(
    (className) => !shouldIgnoreClass(className)
  );
  const base = stableClass
    ? `${element.tagName.toLowerCase()}.${cssEscape(stableClass)}`
    : element.tagName.toLowerCase();

  if (!element.parentElement) {
    return base;
  }

  let index = 1;
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (sibling.tagName === element.tagName) {
      index += 1;
    }
    sibling = sibling.previousElementSibling;
  }

  return `${base}:nth-of-type(${index})`;
};

export const buildElementSelector = (element: HTMLElement | null): string | null => {
  if (!element || typeof document === 'undefined') {
    return null;
  }

  const segments: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && depth < ELEMENT_SELECTOR_MAX_DEPTH) {
    const segment = buildSelectorSegment(current);
    segments.unshift(segment);

    if (segment.startsWith('#') || segment.includes('[')) {
      break;
    }

    current = current.parentElement;
    depth += 1;
  }

  if (!segments.length) {
    return null;
  }

  return segments.join(' > ');
};

const disablePointerEvents = (elements: Array<HTMLElement | null | undefined>) => {
  const restored: Array<{ element: HTMLElement; pointerEvents: string }> = [];
  elements.forEach((element) => {
    if (!element) return;
    restored.push({ element, pointerEvents: element.style.pointerEvents });
    element.style.pointerEvents = 'none';
  });
  return () => {
    restored.forEach(({ element, pointerEvents }) => {
      element.style.pointerEvents = pointerEvents;
    });
  };
};

export const calculateBugPositionFromPoint = ({
  clientX,
  clientY,
  elementsToIgnore = [],
}: {
  clientX: number;
  clientY: number;
  elementsToIgnore?: Array<HTMLElement | null | undefined>;
}): BugPositionPayload => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      x: clientX,
      y: clientY,
      targetSelector: null,
      targetRelativeX: null,
      targetRelativeY: null,
    };
  }

  const restorePointerEvents = disablePointerEvents(elementsToIgnore);
  let target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  restorePointerEvents();

  if (target && (target.hasAttribute('data-bug-dot') || target.closest('[data-bug-dot]'))) {
    target = target.closest('[data-bug-dot]') as HTMLElement | null;
  }

  let targetSelector: string | null = null;
  let targetRelativeX: number | null = null;
  let targetRelativeY: number | null = null;

  if (target && target !== document.documentElement && target !== document.body) {
    targetSelector = buildElementSelector(target);
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      targetRelativeX = clamp((clientX - rect.left) / rect.width);
      targetRelativeY = clamp((clientY - rect.top) / rect.height);
    }
  }

  return {
    x: clientX + window.scrollX,
    y: clientY + window.scrollY,
    targetSelector,
    targetRelativeX,
    targetRelativeY,
  };
};

/**
 * Convert stored page coordinates to viewport coordinates for `position: fixed` rendering.
 * Stored coordinates are page-level (clientX + scrollX at creation time).
 */
export const resolveStoredCoordinates = (x: number, y: number) => {
  if (typeof window === 'undefined') {
    return { x, y };
  }

  if (x <= 100 && y <= 100) {
    return {
      x: (x / 100) * window.innerWidth,
      y: (y / 100) * window.innerHeight,
    };
  }

  return {
    x: x - window.scrollX,
    y: y - window.scrollY,
  };
};

export const isElementVisible = (element: HTMLElement): boolean => {
  if (element === document.body || element === document.documentElement) {
    return true;
  }

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  if (element.offsetParent === null && style.position !== 'fixed') {
    return false;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  return true;
};

/**
 * Resolve a bug report's position to viewport coordinates for `position: fixed` rendering.
 *
 * Priority 1: Find the anchored element by CSS selector and calculate viewport-relative
 *             position from its current bounding rect. This makes the dot track the element.
 * Priority 2: Fall back to stored page coordinates converted to viewport coordinates.
 */
export const resolveBugReportCoordinates = (report: BugReport): { x: number; y: number } | null => {
  if (typeof document !== 'undefined') {
    const relativeX = parseNumberish(report.target_relative_x);
    const relativeY = parseNumberish(report.target_relative_y);
    if (
      report.target_selector &&
      relativeX !== null &&
      relativeY !== null
    ) {
      let element: HTMLElement | null = null;
      try {
        element = document.querySelector(report.target_selector) as HTMLElement | null;
      } catch {
        // Invalid CSS selector stored from an older version — skip anchor tracking
      }
      if (element) {
        if (!isElementVisible(element)) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        // Viewport coordinates — no scroll offset. Combined with position:fixed,
        // the dot visually locks to the element and moves with it on scroll.
        const x = rect.left + rect.width * relativeX;
        const y = rect.top + rect.height * relativeY;
        return { x, y };
      }
    }
  }

  return resolveStoredCoordinates(report.x_position, report.y_position);
};
