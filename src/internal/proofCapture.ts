/**
 * Proof capture — screenshots and screen recordings for DevNotes notes.
 *
 * Uses the browser's Screen Capture API (getDisplayMedia). A screenshot grabs a
 * single frame through a <video>+<canvas> pipeline (fully typed, no ImageCapture
 * dependency); a recording streams into a MediaRecorder and resolves to a webm
 * (or mp4) Blob. Everything is browser-only and degrades: callers check
 * isProofCaptureSupported() first and the capture UI hides when unsupported.
 */

export type ProofCaptureKind = 'screenshot' | 'recording';

export interface ProofCaptureResult {
  blob: Blob;
  filename: string;
  kind: ProofCaptureKind;
}

export function isProofCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function'
  );
}

export function isRecordingSupported(): boolean {
  return isProofCaptureSupported() && typeof MediaRecorder !== 'undefined';
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}

async function grabFrame(stream: MediaStream): Promise<HTMLCanvasElement> {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  (video as HTMLVideoElement).playsInline = true;
  await video.play();
  // Let the first frame paint so videoWidth/Height are populated.
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(video, 0, 0, width, height);
  video.pause();
  video.srcObject = null;
  return canvas;
}

/** Capture a single-frame screenshot of a screen/window/tab the user picks. */
export async function captureScreenshot(): Promise<ProofCaptureResult> {
  if (!isProofCaptureSupported()) {
    throw new Error('Screen capture is not supported in this browser.');
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });
  try {
    const canvas = await grabFrame(stream);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (!blob) throw new Error('Failed to encode screenshot.');
    return { blob, filename: `proof-${timestamp()}.png`, kind: 'screenshot' };
  } finally {
    stopStream(stream);
  }
}

function pickRecordingMime(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return undefined;
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

export interface ProofRecorder {
  readonly stream: MediaStream;
  /** Stop and resolve to the recorded file. */
  stop(): Promise<ProofCaptureResult>;
  /** Abort without producing a file. */
  cancel(): void;
}

/**
 * Start a screen recording. The user picks a screen/window/tab; recording ends
 * either via stop() or when the user ends the share from the browser chrome.
 */
export async function startRecording(opts?: {
  audio?: boolean;
}): Promise<ProofRecorder> {
  if (!isRecordingSupported()) {
    throw new Error('Screen recording is not supported in this browser.');
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: opts?.audio ?? false,
  });
  const mime = pickRecordingMime();
  const recorder = new MediaRecorder(
    stream,
    mime ? { mimeType: mime } : undefined,
  );
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });
  recorder.start();

  // User ending the share from browser chrome should finalize the recording.
  stream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (recorder.state !== 'inactive') recorder.stop();
  });

  return {
    stream,
    stop: () =>
      new Promise<ProofCaptureResult>((resolve, reject) => {
        recorder.addEventListener(
          'stop',
          () => {
            stopStream(stream);
            const type = recorder.mimeType || mime || 'video/webm';
            const blob = new Blob(chunks, { type });
            const ext = type.includes('mp4') ? 'mp4' : 'webm';
            resolve({
              blob,
              filename: `proof-${timestamp()}.${ext}`,
              kind: 'recording',
            });
          },
          { once: true },
        );
        recorder.addEventListener('error', () =>
          reject(new Error('Recording failed.')),
        );
        if (recorder.state !== 'inactive') recorder.stop();
      }),
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      stopStream(stream);
    },
  };
}
