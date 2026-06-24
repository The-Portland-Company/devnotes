import { useState } from 'react';
import {
  FiVideo,
  FiSquare,
  FiX,
  FiTrash2,
  FiChevronUp,
  FiChevronDown,
  FiSave,
} from 'react-icons/fi';
import { useDevNotes } from './DevNotesProvider';

/**
 * Floating UI for recording a User Story (Test Case):
 *   1. While recording — a HUD showing the live step count + Stop / Cancel.
 *   2. After Stop (steps captured) — a review modal to title the story, edit /
 *      reorder / delete steps, then Save (writes to the Specs API via the host
 *      onCreateUserStory callback).
 *
 * Tagged data-devnotes-recorder so the recorder ignores clicks on its own UI.
 */
export default function DevNotesStoryRecorder() {
  const {
    canRecordUserStory,
    isRecordingStory,
    recordedSteps,
    savingStory,
    storyError,
    stopUserStoryRecording,
    cancelUserStoryRecording,
    updateRecordedStep,
    deleteRecordedStep,
    moveRecordedStep,
    saveUserStory,
  } = useDevNotes();

  const [title, setTitle] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [description, setDescription] = useState('');

  if (!canRecordUserStory) return null;

  const reviewing = !isRecordingStory && recordedSteps.length > 0;

  const handleSave = async () => {
    const ok = await saveUserStory({
      title,
      description_md: description,
      test_url: testUrl,
    });
    if (ok) {
      setTitle('');
      setTestUrl('');
      setDescription('');
    }
  };

  const handleCancel = () => {
    cancelUserStoryRecording();
    setTitle('');
    setTestUrl('');
    setDescription('');
  };

  return (
    <div data-devnotes-recorder>
      {/* Recording HUD */}
      {isRecordingStory && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2147483646,
            pointerEvents: 'auto',
          }}
          className="flex items-center gap-3 rounded-full bg-blue-600 px-5 py-2.5 text-white shadow-xl"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
          <span className="text-sm font-medium">
            Recording test case · {recordedSteps.length}{' '}
            {recordedSteps.length === 1 ? 'step' : 'steps'}
          </span>
          <button
            type="button"
            onClick={stopUserStoryRecording}
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold transition hover:bg-white/30"
          >
            <FiSquare size={12} /> Stop &amp; Review
          </button>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel recording"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-white/20"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Review + save modal */}
      {reviewing && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 2147483646,
            }}
            onClick={handleCancel}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2147483647,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              pointerEvents: 'none',
            }}
          >
            <div
              className="pointer-events-auto flex max-h-[calc(100vh-32px)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <FiVideo className="text-blue-600" />
                  <span className="text-base font-semibold text-slate-900">
                    New User Story (Test Case)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  aria-label="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. User can create a survey"
                  className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Test URL
                </label>
                <input
                  type="text"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="Starting URL for the test (optional)"
                  className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this test case verify? (optional)"
                  rows={2}
                  className="mb-4 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Steps ({recordedSteps.length})
                  </span>
                </div>
                <ol className="space-y-2">
                  {recordedSteps.map((step, i) => (
                    <li
                      key={step.id}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{
                          backgroundColor: `hsl(214, 84%, ${Math.min(42 + i * 7, 74)}%)`,
                        }}
                      >
                        {i + 1}
                      </span>
                      <textarea
                        value={step.body}
                        onChange={(e) => updateRecordedStep(step.id, e.target.value)}
                        rows={1}
                        className="min-h-[28px] flex-1 resize-y rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-800 outline-none focus:border-slate-300 focus:bg-white"
                      />
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          onClick={() => moveRecordedStep(step.id, 'up')}
                          disabled={i === 0}
                          aria-label="Move step up"
                          className="text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                        >
                          <FiChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRecordedStep(step.id, 'down')}
                          disabled={i === recordedSteps.length - 1}
                          aria-label="Move step down"
                          className="text-slate-400 transition hover:text-slate-700 disabled:opacity-30"
                        >
                          <FiChevronDown size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRecordedStep(step.id)}
                        aria-label="Delete step"
                        className="mt-0.5 shrink-0 text-rose-400 transition hover:text-rose-600"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-slate-200 px-5 py-3">
                {storyError && (
                  <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {storyError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={savingStory || !title.trim() || recordedSteps.length === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingStory ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <FiSave size={14} />
                    )}
                    Save to Specs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
