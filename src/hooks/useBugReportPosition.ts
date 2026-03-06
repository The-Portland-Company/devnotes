import { useState, useEffect, useCallback } from 'react';
import type { BugReport } from '../types';
import { resolveBugReportCoordinates } from '../utils/bugAnchors';

type PositionSubscriber = () => void;

const subscribers = new Set<PositionSubscriber>();
let cleanupGlobalListeners: (() => void) | null = null;
let rafId: number | null = null;

const schedulePositionUpdate = () => {
  if (typeof window === 'undefined') return;
  if (rafId !== null) return;

  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    subscribers.forEach((subscriber) => {
      try {
        subscriber();
      } catch {
        // Prevent one subscriber's error from breaking all others
      }
    });
  });
};

const ensureGlobalListeners = () => {
  if (cleanupGlobalListeners || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const handleUpdate = () => {
    schedulePositionUpdate();
  };

  const observer = new MutationObserver(handleUpdate);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('resize', handleUpdate);
  window.addEventListener('scroll', handleUpdate, true);
  document.addEventListener('scroll', handleUpdate, true);

  cleanupGlobalListeners = () => {
    window.removeEventListener('resize', handleUpdate);
    window.removeEventListener('scroll', handleUpdate, true);
    document.removeEventListener('scroll', handleUpdate, true);
    observer.disconnect();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    cleanupGlobalListeners = null;
  };
};

const subscribeToPositionUpdates = (subscriber: PositionSubscriber) => {
  subscribers.add(subscriber);
  ensureGlobalListeners();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && cleanupGlobalListeners) {
      cleanupGlobalListeners();
    }
  };
};

export const useBugReportPosition = (report: BugReport | null) => {
  const calculate = useCallback(() => {
    if (!report) return null;
    return resolveBugReportCoordinates(report);
  }, [report]);

  const [position, setPosition] = useState(() => calculate());

  useEffect(() => {
    setPosition(calculate());
  }, [calculate]);

  useEffect(() => {
    if (!report) return undefined;
    return subscribeToPositionUpdates(() => {
      setPosition(calculate());
    });
  }, [report, calculate]);

  return position;
};
