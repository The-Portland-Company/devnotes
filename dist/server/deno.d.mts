import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';

declare function createDenoDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;

export { createDenoDevNotesHandler };
