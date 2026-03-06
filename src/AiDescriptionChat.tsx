import { useState, useEffect, useRef, useCallback } from 'react';
import { FiCheck, FiEdit2, FiX, FiZap } from 'react-icons/fi';
import type { AiProvider, AiConversationMessage, BugCaptureContext } from './types';

type AiDescriptionChatProps = {
  initialDescription: string;
  context: {
    title?: string;
    page_url?: string;
    route_label?: string;
    severity?: string;
    types?: string[];
    target_selector?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    capture_context?: BugCaptureContext;
  };
  aiProvider: AiProvider;
  onAccept: (aiDescription: string) => void;
  onCancel: () => void;
};

export default function AiDescriptionChat({
  initialDescription,
  context,
  aiProvider,
  onAccept,
  onCancel,
}: AiDescriptionChatProps) {
  const [conversationHistory, setConversationHistory] = useState<AiConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizedDescription, setFinalizedDescription] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory, finalizedDescription, scrollToBottom]);

  const callAiAssist = useCallback(
    async (history: AiConversationMessage[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await aiProvider.refineDescription({
          description: initialDescription,
          conversationHistory: history,
          context,
        });

        if (result.type === 'error') {
          throw new Error(result.message);
        }

        if (result.type === 'finalized') {
          setFinalizedDescription(result.description);
          setConversationHistory((prev) => [
            ...prev,
            { role: 'assistant', content: result.description },
          ]);
        } else if (result.type === 'question') {
          setConversationHistory((prev) => [
            ...prev,
            { role: 'assistant', content: result.message },
          ]);
        }
      } catch (err: any) {
        console.error('[AiDescriptionChat] Error calling AI assist:', err);
        const message = err?.message || 'Failed to get AI response. Please try again.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [initialDescription, context, aiProvider]
  );

  const [hasStarted, setHasStarted] = useState(false);

  // On mount, send the initial description (only if non-empty)
  useEffect(() => {
    if (initialDescription.trim() && !hasStarted) {
      setHasStarted(true);
      callAiAssist([]);
    }
  }, [initialDescription, hasStarted]);

  const handleSendReply = async () => {
    const trimmed = userInput.trim();
    if (!trimmed || isLoading) return;

    const newUserMessage: AiConversationMessage = { role: 'user', content: trimmed };
    const updatedHistory = [...conversationHistory, newUserMessage];
    setConversationHistory(updatedHistory);
    setUserInput('');

    await callAiAssist(updatedHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleForceFinalize = async () => {
    const forceMessage: AiConversationMessage = {
      role: 'user',
      content: 'Please finalize the description now with whatever information you have.',
    };
    const updatedHistory = [...conversationHistory, forceMessage];
    setConversationHistory(updatedHistory);

    await callAiAssist(updatedHistory);
  };

  const handleAccept = () => {
    if (isEditing && editDraft.trim()) {
      onAccept(editDraft.trim());
    } else if (finalizedDescription) {
      onAccept(finalizedDescription);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditDraft(finalizedDescription || '');
  };

  const handleRetry = async () => {
    setError(null);
    await callAiAssist(conversationHistory);
  };

  // Count exchanges (assistant messages)
  const assistantMessageCount = conversationHistory.filter((m) => m.role === 'assistant').length;
  const showFinalizeButton = !finalizedDescription && assistantMessageCount >= 3;

  return (
    <div className="flex flex-col gap-3 rounded-xl border-2 border-purple-200 bg-gradient-to-b from-purple-50/50 to-white p-4 min-h-[200px] shadow-[0_0_0_3px_rgba(167,139,250,0.1)]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FiZap size={16} className="text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">
            AI Description Refinement
          </span>
          <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
            GPT-4
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-200 text-gray-600"
          onClick={onCancel}
        >
          <FiX size={12} />
          Close
        </button>
      </div>

      {/* Waiting for description */}
      {!hasStarted && !initialDescription.trim() && (
        <div className="flex-1 flex items-center justify-center min-h-[120px]">
          <div className="text-center">
            <FiZap size={28} className="mx-auto mb-2 text-purple-300" />
            <p className="text-sm text-gray-500">
              Add a title above and AI will help build a full description
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {hasStarted && (
      <div
        ref={scrollRef}
        className="flex-1 min-h-[200px] max-h-[350px] overflow-y-auto pr-1"
      >
        <div className="flex flex-col gap-3">
          {/* Initial description shown as first user message */}
          <div className="flex justify-end">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-w-[85%]">
              <p className="text-xs text-purple-600 font-medium mb-1">Your Description</p>
              <p className="text-sm whitespace-pre-wrap">{initialDescription}</p>
            </div>
          </div>

          {/* Conversation messages */}
          {conversationHistory.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const isFinalMessage = finalizedDescription && idx === conversationHistory.length - 1;

            if (isFinalMessage) return null;

            return (
              <div
                key={idx}
                className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant && (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2 mt-1">
                    AI
                  </div>
                )}
                <div
                  className={`border rounded-lg p-3 max-w-[85%] ${
                    isAssistant
                      ? 'bg-white border-gray-200'
                      : 'bg-purple-50 border-purple-200'
                  }`}
                >
                  {isAssistant && (
                    <p className="text-xs text-purple-600 font-medium mb-1">AI Assistant</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mr-2 mt-1">
                AI
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error handling */}
          {error && !isLoading && (() => {
            const isConfigError = /edge function|fetch|network/i.test(error);
            return isConfigError ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-2">AI refinement is not available. Your description will be saved as-is.</p>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                  onClick={onCancel}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-100"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            );
          })()}

          {/* Finalized description */}
          {finalizedDescription && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green-700">AI-Refined Description</span>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                    Ready
                  </span>
                </div>
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs rounded hover:bg-gray-100"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      onClick={handleAccept}
                      disabled={!editDraft.trim()}
                    >
                      <FiCheck size={14} />
                      Accept Edited
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap text-gray-800">
                    {finalizedDescription}
                  </p>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
                      onClick={handleEdit}
                    >
                      <FiEdit2 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                      onClick={handleAccept}
                    >
                      <FiCheck size={14} />
                      Accept
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Input area (hidden when finalized or not started) */}
      {hasStarted && !finalizedDescription && !isLoading && (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            placeholder="Answer the AI's questions..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Ctrl/Cmd + Enter to send</span>
            <div className="flex items-center gap-2">
              {showFinalizeButton && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded border border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={handleForceFinalize}
                >
                  Finalize Now
                </button>
              )}
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                onClick={handleSendReply}
                disabled={!userInput.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
