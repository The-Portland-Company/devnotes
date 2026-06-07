import type { Task } from './core-types';

export type NarrativeTab = 'description' | 'issue-details';

export function getInitialTaskStatus(
  existingStatus?: Task['status'] | null
): Task['status'] {
  return existingStatus || 'Open';
}

export function shouldRequireExplicitStatusSelection(hasExistingReport: boolean): boolean {
  return hasExistingReport;
}

export function getInitialNarrativeTab(): NarrativeTab {
  return 'description';
}
