import type { DevNotesServerOptions } from '../types';
import { createDevNotesServerHandler } from './forge';

export function createDenoDevNotesHandler(options: DevNotesServerOptions) {
  return createDevNotesServerHandler(options);
}
