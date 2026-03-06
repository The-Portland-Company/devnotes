import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Creates a shared portal container on <html> (document.documentElement) and
 * provides a compensate() function that corrects for any CSS containing-block
 * shift (transform, filter, will-change, etc.) on ancestors.
 *
 * The container uses position:fixed; inset:0 — under normal conditions it
 * covers the viewport exactly.  All children should use position:absolute
 * instead of position:fixed.  If an ancestor creates a new containing block,
 * getBoundingClientRect() on the container will return a non-zero offset,
 * which compensate() subtracts from viewport coordinates.
 */

let sharedContainer: HTMLDivElement | null = null;
let refCount = 0;

function syncBodyStyles(el: HTMLDivElement) {
  const bodyStyles = getComputedStyle(document.body);
  el.style.fontFamily = bodyStyles.fontFamily;
  el.style.color = bodyStyles.color;
  el.style.fontSize = bodyStyles.fontSize;
  el.style.lineHeight = bodyStyles.lineHeight;
}

function getOrCreateContainer(): HTMLDivElement {
  if (sharedContainer) return sharedContainer;

  const el = document.createElement('div');
  el.setAttribute('data-devnotes-layer', '');
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100vw',
    'height:100vh',
    'pointer-events:none',
    'z-index:2147483646',
    'overflow:visible',
  ].join(';');

  // Copy body's inherited text styles so portaled content matches the host app
  syncBodyStyles(el);

  return el;
}

export function useDevNotesContainer() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = getOrCreateContainer();
    if (!sharedContainer) {
      sharedContainer = el;
    }
    refCount++;
    document.documentElement.appendChild(el);
    setContainer(el);

    // Measure initial offset
    const rect = el.getBoundingClientRect();
    offsetRef.current = { x: rect.left, y: rect.top };

    let rafId: number | null = null;

    // Watch <html> and <body> for style/class attribute changes that might
    // introduce transforms or other containing-block-creating properties.
    const recalc = () => {
      const r = el.getBoundingClientRect();
      offsetRef.current = { x: r.left, y: r.top };
      syncBodyStyles(el);
    };

    // When the fixed layer is inside a transformed containing block, its
    // viewport offset can change during scroll as well as style changes.
    const scheduleRecalc = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        recalc();
      });
    };

    const observer = new MutationObserver(scheduleRecalc);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Recalc on viewport and scroll changes.
    window.addEventListener('resize', scheduleRecalc);
    window.addEventListener('scroll', scheduleRecalc, true);
    document.addEventListener('scroll', scheduleRecalc, true);
    window.visualViewport?.addEventListener('resize', scheduleRecalc);
    window.visualViewport?.addEventListener('scroll', scheduleRecalc);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleRecalc);
      window.removeEventListener('scroll', scheduleRecalc, true);
      document.removeEventListener('scroll', scheduleRecalc, true);
      window.visualViewport?.removeEventListener('resize', scheduleRecalc);
      window.visualViewport?.removeEventListener('scroll', scheduleRecalc);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      refCount--;
      if (refCount <= 0) {
        el.parentNode?.removeChild(el);
        sharedContainer = null;
        refCount = 0;
      }
      setContainer(null);
    };
  }, []);

  const compensate = useCallback(
    (viewportX: number, viewportY: number) => {
      return {
        x: viewportX - offsetRef.current.x,
        y: viewportY - offsetRef.current.y,
      };
    },
    []
  );

  return { container, compensate };
}
