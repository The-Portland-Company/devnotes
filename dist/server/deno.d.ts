import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.js';

declare function createDenoDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;

export { createDenoDevNotesHandler };
