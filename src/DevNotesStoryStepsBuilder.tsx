import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiVideo, FiSquare, FiInfo } from 'react-icons/fi';

/**
 * A single step in the guided User Story (Test Case) builder. Shape is a superset
 * of the package's `UserStoryStepInput` (adds a stable client `id` for list keys);
 * positional fields are populated when a step is captured via the interaction
 * recorder and left null for manually-typed steps.
 */
export type StoryBuilderStep = {
  id: string;
  body: string;
  page_url?: string | null;
  x_position?: number | null;
  y_position?: number | null;
  target_selector?: string | null;
};

type DevNotesStoryStepsBuilderProps = {
  steps: StoryBuilderStep[];
  onChange: (next: StoryBuilderStep[]) => void;
  /** Whether the interaction recorder is available (config.onCreateUserStory present). */
  canRecord: boolean;
  /** Whether the recorder is currently capturing. */
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  isSuperscriptLabels: boolean;
  fieldSurfaceClass: string;
  controlInputClass: string;
  floatingLabelClass: (isSuperscript: boolean) => string;
  showError?: boolean;
};

let stepCounter = 0;
const makeStepId = () => `manual-${Date.now().toString(36)}-${(stepCounter += 1)}`;

export default function DevNotesStoryStepsBuilder({
  steps,
  onChange,
  canRecord,
  isRecording,
  onStartRecording,
  onStopRecording,
  isSuperscriptLabels,
  fieldSurfaceClass,
  controlInputClass,
  floatingLabelClass,
  showError,
}: DevNotesStoryStepsBuilderProps) {
  const updateStep = (id: string, body: string) =>
    onChange(steps.map((s) => (s.id === id ? { ...s, body } : s)));

  const removeStep = (id: string) => onChange(steps.filter((s) => s.id !== id));

  const moveStep = (id: string, direction: 'up' | 'down') => {
    const index = steps.findIndex((s) => s.id === id);
    if (index === -1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addStep = () =>
    onChange([
      ...steps,
      { id: makeStepId(), body: '', page_url: null, x_position: null, y_position: null, target_selector: null },
    ]);

  return (
    <div className="space-y-4">
      {/* Instructional guide / banner */}
      <div
        className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900"
        role="note"
      >
        <FiInfo size={16} className="mt-0.5 shrink-0 text-violet-500" aria-hidden="true" />
        <div>
          <p className="font-semibold">User Story (Test Case)</p>
          <p className="mt-0.5 text-violet-800">
            Walk through the test case one step at a time. Add each step a user performs;
            reorder or remove as needed. Steps run in order from top to bottom.
          </p>
        </div>
      </div>

      {/* Steps list */}
      <div className={isSuperscriptLabels ? 'relative' : ''}>
        <label className={floatingLabelClass(isSuperscriptLabels)}>Steps</label>
        <ol className="space-y-2" aria-label="User story steps">
          {steps.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
              No steps yet. Add the first step a user takes.
            </li>
          )}
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`flex items-start gap-2 rounded-xl border bg-white p-2.5 shadow-sm shadow-slate-900/5 ${
                showError && !step.body.trim() ? 'border-rose-300' : 'border-slate-200'
              }`}
            >
              <span
                className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <input
                type="text"
                className={`${fieldSurfaceClass} ${controlInputClass} flex-1`}
                placeholder={`Step ${index + 1} — e.g. Click the "Save" button`}
                value={step.body}
                aria-label={`Step ${index + 1} instruction`}
                onChange={(e) => updateStep(step.id, e.target.value)}
              />
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={() => moveStep(step.id, 'up')}
                  disabled={index === 0}
                  aria-label={`Move step ${index + 1} up`}
                >
                  <FiArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={() => moveStep(step.id, 'down')}
                  disabled={index === steps.length - 1}
                  aria-label={`Move step ${index + 1} down`}
                >
                  <FiArrowDown size={14} />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => removeStep(step.id)}
                  aria-label={`Remove step ${index + 1}`}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ol>

        {/* Controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={addStep}
          >
            <FiPlus size={14} /> Add step
          </button>
          {canRecord && (
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isRecording
                  ? 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
              }`}
              onClick={isRecording ? onStopRecording : onStartRecording}
              aria-pressed={isRecording}
            >
              {isRecording ? <FiSquare size={14} /> : <FiVideo size={14} />}
              {isRecording ? 'Stop recording' : 'Record steps by interacting with the app'}
            </button>
          )}
        </div>
        {isRecording && (
          <p className="mt-2 text-xs font-medium text-violet-700">
            Recording… interact with the app and your actions will be appended as steps below.
          </p>
        )}
        {showError && steps.filter((s) => s.body.trim()).length === 0 && (
          <p className="mt-3 text-xs font-medium text-rose-600">
            Add at least one step before saving.
          </p>
        )}
      </div>
    </div>
  );
}
