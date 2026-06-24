// User Story (Test Case) recorder.
//
// Attaches document-level capture listeners that translate a user's real
// interactions — clicks, text entry, selections, and route changes — into an
// ordered list of human-readable Steps. Each step also carries the on-page
// position + selector of the element it touched so DevNotes can later draw a
// numbered "step dot" exactly where the interaction happened.
//
// The recorder is intentionally framework-agnostic and side-effect-light: it
// only reads the DOM and patches history (restoring it on stop). The captured
// steps are surfaced via an onStep callback; the caller owns state + persistence.

import { buildElementSelector, normalizePageUrl } from './bugAnchors';

export type StoryStepAction = 'click' | 'input' | 'select' | 'navigate' | 'note';

export type RecordedStep = {
  /** Stable client-side id (not persisted server-side). */
  id: string;
  action: StoryStepAction;
  /** Human-readable instruction, e.g. "Click the \"Save\" button". */
  body: string;
  /** CSS selector of the touched element (null for navigation/notes). */
  selector: string | null;
  /** The value the user entered/selected, when relevant. */
  value: string | null;
  /** Normalized page path the step occurred on. */
  page_url: string;
  /** Page-level coordinates (clientX + scrollX). null for navigation/notes. */
  x: number | null;
  y: number | null;
};

const MAX_LABEL_LENGTH = 60;
const MAX_VALUE_LENGTH = 120;

let stepCounter = 0;
const nextStepId = (): string => {
  stepCounter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${stepCounter}`;
};

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const currentPageUrl = (): string => {
  if (typeof window === 'undefined') return '';
  return normalizePageUrl(`${window.location.pathname}${window.location.search}`);
};

/** Best-effort human label for an element ("Save", "Email address", etc.). */
export const describeElement = (element: HTMLElement | null): string => {
  if (!element) return 'element';

  const aria = element.getAttribute('aria-label');
  if (aria && aria.trim()) return truncate(collapseWhitespace(aria), MAX_LABEL_LENGTH);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    const text = labelEl?.textContent && collapseWhitespace(labelEl.textContent);
    if (text) return truncate(text, MAX_LABEL_LENGTH);
  }

  // Associated <label> for form controls.
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    if (element.id) {
      const explicit = document.querySelector(`label[for="${CSS?.escape ? CSS.escape(element.id) : element.id}"]`);
      const text = explicit?.textContent && collapseWhitespace(explicit.textContent);
      if (text) return truncate(text, MAX_LABEL_LENGTH);
    }
    const wrappingLabel = element.closest('label');
    const wrapText = wrappingLabel?.textContent && collapseWhitespace(wrappingLabel.textContent);
    if (wrapText) return truncate(wrapText, MAX_LABEL_LENGTH);
    const placeholder = (element as HTMLInputElement).placeholder;
    if (placeholder && placeholder.trim()) return truncate(collapseWhitespace(placeholder), MAX_LABEL_LENGTH);
    const name = element.getAttribute('name');
    if (name) return truncate(name, MAX_LABEL_LENGTH);
  }

  const text = element.textContent && collapseWhitespace(element.textContent);
  if (text) return truncate(text, MAX_LABEL_LENGTH);

  const title = element.getAttribute('title');
  if (title && title.trim()) return truncate(collapseWhitespace(title), MAX_LABEL_LENGTH);

  const alt = element.getAttribute('alt');
  if (alt && alt.trim()) return truncate(collapseWhitespace(alt), MAX_LABEL_LENGTH);

  return element.tagName.toLowerCase();
};

/** A coarse, human-friendly noun for the control kind ("button", "link", …). */
const describeRole = (element: HTMLElement): string => {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  if (tag === 'a') return 'link';
  if (tag === 'button' || role === 'button') return 'button';
  if (tag === 'select' || role === 'combobox') return 'dropdown';
  if (tag === 'input') {
    const type = (element as HTMLInputElement).type;
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio option';
    if (type === 'submit' || type === 'button') return 'button';
    return 'field';
  }
  if (tag === 'textarea') return 'field';
  if (role === 'tab') return 'tab';
  if (role === 'menuitem') return 'menu item';
  return 'element';
};

const isInteractiveClickTarget = (element: HTMLElement): boolean => {
  if (
    element.closest(
      '[data-bug-form],[data-bug-dot],[data-bug-menu],[data-pending-dot],[data-devnotes-recorder]'
    )
  ) {
    return false;
  }
  return true;
};

const maskValue = (element: HTMLElement, raw: string): string => {
  const type = element instanceof HTMLInputElement ? element.type : '';
  if (type === 'password') return '•'.repeat(Math.min(raw.length, 8));
  return truncate(raw, MAX_VALUE_LENGTH);
};

export type RecorderHandle = {
  stop: () => void;
};

/**
 * Begin recording. Returns a handle whose `stop()` detaches every listener and
 * restores patched history methods. `onStep` is fired for each captured step.
 */
export const startStoryRecording = (onStep: (step: RecordedStep) => void): RecorderHandle => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { stop: () => {} };
  }

  const emit = (partial: Omit<RecordedStep, 'id' | 'page_url'> & { page_url?: string }) => {
    onStep({
      id: nextStepId(),
      page_url: partial.page_url ?? currentPageUrl(),
      ...partial,
    });
  };

  const resolveClickTarget = (raw: HTMLElement): HTMLElement => {
    // Prefer the nearest semantically interactive ancestor so a click on an icon
    // inside a button is attributed to the button.
    const interactive = raw.closest(
      'button,a,[role="button"],[role="tab"],[role="menuitem"],input,select,label,[onclick]'
    ) as HTMLElement | null;
    return interactive || raw;
  };

  const handleClick = (event: MouseEvent) => {
    const raw = event.target as HTMLElement | null;
    if (!raw || !isInteractiveClickTarget(raw)) return;

    const target = resolveClickTarget(raw);
    // Text/textarea clicks are noise — their value is captured on change instead.
    if (target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLInputElement) {
      const type = target.type;
      if (type !== 'checkbox' && type !== 'radio' && type !== 'submit' && type !== 'button') {
        return;
      }
    }

    const label = describeElement(target);
    const role = describeRole(target);
    emit({
      action: 'click',
      body: label && label !== role ? `Click the "${label}" ${role}` : `Click the ${role}`,
      selector: buildElementSelector(target),
      value: null,
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY,
    });
  };

  const handleChange = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target || !isInteractiveClickTarget(target)) return;

    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + rect.height / 2 + window.scrollY;
    const selector = buildElementSelector(target);
    const label = describeElement(target);

    if (target instanceof HTMLSelectElement) {
      const chosen = target.selectedOptions?.[0]?.textContent;
      const value = chosen ? collapseWhitespace(chosen) : target.value;
      emit({
        action: 'select',
        body: `Select "${truncate(value, MAX_VALUE_LENGTH)}" in the "${label}" dropdown`,
        selector,
        value,
        x,
        y,
      });
      return;
    }

    if (target instanceof HTMLInputElement) {
      const type = target.type;
      if (type === 'checkbox' || type === 'radio') {
        // Handled by click; ignore to avoid duplicate steps.
        return;
      }
      const raw = target.value ?? '';
      if (!raw.trim()) return;
      const value = maskValue(target, raw);
      emit({
        action: 'input',
        body: `Enter "${value}" into the "${label}" field`,
        selector,
        value,
        x,
        y,
      });
      return;
    }

    if (target instanceof HTMLTextAreaElement) {
      const raw = target.value ?? '';
      if (!raw.trim()) return;
      const value = truncate(raw, MAX_VALUE_LENGTH);
      emit({
        action: 'input',
        body: `Enter "${value}" into the "${label}" field`,
        selector,
        value,
        x,
        y,
      });
    }
  };

  let lastPath = currentPageUrl();
  const handleNavigation = () => {
    const next = currentPageUrl();
    if (next === lastPath) return;
    lastPath = next;
    emit({
      action: 'navigate',
      body: `Navigate to ${next || '/'}`,
      selector: null,
      value: next,
      x: null,
      y: null,
      page_url: next,
    });
  };

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  const patchedPushState: History['pushState'] = (...args) => {
    originalPushState.apply(window.history, args);
    handleNavigation();
  };
  const patchedReplaceState: History['replaceState'] = (...args) => {
    originalReplaceState.apply(window.history, args);
    handleNavigation();
  };
  window.history.pushState = patchedPushState;
  window.history.replaceState = patchedReplaceState;

  document.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleChange, true);
  window.addEventListener('popstate', handleNavigation);
  window.addEventListener('hashchange', handleNavigation);

  return {
    stop: () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('change', handleChange, true);
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      // Only restore if no one else re-patched on top of us.
      if (window.history.pushState === patchedPushState) {
        window.history.pushState = originalPushState;
      }
      if (window.history.replaceState === patchedReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
    },
  };
};
