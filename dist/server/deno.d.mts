import { d as DevNotesServerOptions } from '../types-CrmObeqp.mjs';

declare function createDenoDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;

export { createDenoDevNotesHandler };
