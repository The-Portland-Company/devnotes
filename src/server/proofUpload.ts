import type { DevNotesUploadHandler, DevNotesAttachment } from '../types';

/**
 * Turnkey proof-upload handler that forwards a captured file to Focus Forge's
 * /api/proof/upload, authenticated with a Forge organization API key. Forge
 * resolves the organization from the key and stores the file in that org's own
 * storage account (falling back to Forge's default bucket). Wire it into
 * DevNotesServerOptions.uploadAttachment:
 *
 *   uploadAttachment: createForgeProofUploadHandler({
 *     forgeBaseUrl: process.env.FOCUS_FORGE_BASE_URL!,
 *     orgApiKey: process.env.FOCUS_FORGE_ORG_API_KEY!, // write scope
 *   })
 */
export interface ForgeProofUploadOptions {
  /** e.g. https://focusforge.theportlandcompany.com */
  forgeBaseUrl: string;
  /** Forge organization API key with write scope. */
  orgApiKey: string;
  /** Defaults to /api/proof/upload. */
  path?: string;
  fetch?: typeof globalThis.fetch;
}

export function createForgeProofUploadHandler(
  options: ForgeProofUploadOptions,
): DevNotesUploadHandler {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('createForgeProofUploadHandler requires a fetch implementation.');
  }
  const base = options.forgeBaseUrl.replace(/\/$/, '');
  const path = options.path || '/api/proof/upload';

  return async ({ request }) => {
    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof Blob)) {
      throw new Error('No file provided.');
    }
    const filename =
      (file as { name?: string }).name ||
      (typeof incoming.get('filename') === 'string'
        ? (incoming.get('filename') as string)
        : 'proof');

    const forwarded = new FormData();
    forwarded.append('file', file, filename);
    const taskId = incoming.get('taskId');
    if (typeof taskId === 'string' && taskId) forwarded.append('taskId', taskId);
    // organizationId is resolved server-side from the org API key.

    const res = await fetchImpl(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.orgApiKey}` },
      body: forwarded,
    });

    const text = await res.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!res.ok) {
      throw new Error(
        payload?.error?.message ||
          payload?.error ||
          `Proof upload failed (${res.status}).`,
      );
    }
    const attachment =
      payload && typeof payload === 'object' && payload.attachment
        ? payload.attachment
        : payload;
    if (!attachment || typeof attachment.url !== 'string') {
      throw new Error('Proof upload returned no attachment.');
    }
    return attachment as DevNotesAttachment;
  };
}
