import type { BugCaptureContext, BugReport } from '../types';

export type AiFixPayload = {
  source: string;
  copied_at: string;
  report: {
    id: string | null;
    title: string | null;
    status: BugReport['status'];
    severity: BugReport['severity'];
    task_list_id: string | null;
    types: string[];
    type_names: string[];
    approved: boolean;
    ai_ready: boolean;
  };
  narrative: {
    description: string | null;
    expected_behavior: string | null;
    actual_behavior: string | null;
    ai_description: string | null;
    response: string | null;
  };
  context: {
    page_url: string;
    route_label: string;
    x_position: number;
    y_position: number;
    target_selector: string | null;
    target_relative_x: number | null;
    target_relative_y: number | null;
    capture_context: BugCaptureContext | null;
  };
  workflow: {
    assigned_to: string | null;
    resolved_by: string | null;
    created_by: string;
    created_at: string | null;
    updated_at: string | null;
  };
};

export type BuildAiFixPayloadParams = {
  source?: string;
  copiedAt?: string;
  report: {
    id?: string | null;
    title?: string | null;
    status: BugReport['status'];
    severity: BugReport['severity'];
    taskListId?: string | null;
    types: string[];
    typeNames: string[];
    approved: boolean;
    aiReady: boolean;
  };
  narrative: {
    description?: string | null;
    expectedBehavior?: string | null;
    actualBehavior?: string | null;
    aiDescription?: string | null;
    response?: string | null;
  };
  context: {
    pageUrl: string;
    routeLabel: string;
    xPosition: number;
    yPosition: number;
    targetSelector?: string | null;
    targetRelativeX?: number | null;
    targetRelativeY?: number | null;
    captureContext?: BugCaptureContext | null;
  };
  workflow: {
    assignedTo?: string | null;
    resolvedBy?: string | null;
    createdBy: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
};

export function buildAiFixPayload(params: BuildAiFixPayloadParams): AiFixPayload {
  return {
    source: params.source || '@the-portland-company/devnotes',
    copied_at: params.copiedAt || new Date().toISOString(),
    report: {
      id: params.report.id ?? null,
      title: params.report.title ?? null,
      status: params.report.status,
      severity: params.report.severity,
      task_list_id: params.report.taskListId ?? null,
      types: params.report.types,
      type_names: params.report.typeNames,
      approved: params.report.approved,
      ai_ready: params.report.aiReady,
    },
    narrative: {
      description: params.narrative.description ?? null,
      expected_behavior: params.narrative.expectedBehavior ?? null,
      actual_behavior: params.narrative.actualBehavior ?? null,
      ai_description: params.narrative.aiDescription ?? null,
      response: params.narrative.response ?? null,
    },
    context: {
      page_url: params.context.pageUrl,
      route_label: params.context.routeLabel,
      x_position: params.context.xPosition,
      y_position: params.context.yPosition,
      target_selector: params.context.targetSelector ?? null,
      target_relative_x: params.context.targetRelativeX ?? null,
      target_relative_y: params.context.targetRelativeY ?? null,
      capture_context: params.context.captureContext ?? null,
    },
    workflow: {
      assigned_to: params.workflow.assignedTo ?? null,
      resolved_by: params.workflow.resolvedBy ?? null,
      created_by: params.workflow.createdBy,
      created_at: params.workflow.createdAt ?? null,
      updated_at: params.workflow.updatedAt ?? null,
    },
  };
}

const normalizeText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildNarrativeFallback = (payload: AiFixPayload) => {
  const description = normalizeText(payload.narrative.description);
  const expectedBehavior = normalizeText(payload.narrative.expected_behavior);
  const actualBehavior = normalizeText(payload.narrative.actual_behavior);

  const sections: string[] = [];
  if (description) sections.push(`Description: ${description}`);
  if (expectedBehavior) sections.push(`Expected behavior: ${expectedBehavior}`);
  if (actualBehavior) sections.push(`Actual behavior: ${actualBehavior}`);

  return {
    description,
    expected_behavior: expectedBehavior,
    actual_behavior: actualBehavior,
    derived_scope: sections.length > 0 ? sections.join('\n') : null,
  };
};

export function formatAiFixPayloadForCopy(payload: AiFixPayload): string {
  const refinedSpec = normalizeText(payload.narrative.ai_description);
  const narrative = buildNarrativeFallback(payload);
  const aiReadyWithRefinement = Boolean(payload.report.ai_ready && refinedSpec);

  const copyPayload = {
    agent_brief: {
      objective: 'Implement and verify the fix for this issue in the current codebase.',
      scope_directive: aiReadyWithRefinement
        ? 'AI_READY: Use ai_refinement.primary_spec as the source of truth. Use narrative as supporting context only.'
        : 'NO_AI_REFINEMENT: Derive scope from narrative.description, narrative.expected_behavior, and narrative.actual_behavior.',
      implementation_notes: [
        'Follow existing project patterns and UI conventions.',
        'If required detail is missing, inspect the referenced page/component before coding.',
        'Prefer a direct fix over broad refactors.',
      ],
    },
    issue: {
      report_id: payload.report.id,
      title: payload.report.title,
      severity: payload.report.severity,
      status: payload.report.status,
      type_names: payload.report.type_names,
      location: {
        page_url: payload.context.page_url,
        route_label: payload.context.route_label,
        target_selector: payload.context.target_selector,
      },
    },
    ai_refinement: {
      ai_ready: payload.report.ai_ready,
      primary_spec: aiReadyWithRefinement ? refinedSpec : null,
    },
    narrative,
    diagnostic_context: payload.context.capture_context
      ? {
          browser: payload.context.capture_context.browser.name,
          viewport: payload.context.capture_context.viewport,
          timezone: payload.context.capture_context.timezone,
        }
      : null,
  };

  return [
    'AI_FIX_PAYLOAD',
    'Use this payload to scope and implement the fix.',
    '```json',
    JSON.stringify(copyPayload, null, 2),
    '```',
  ].join('\n');
}
