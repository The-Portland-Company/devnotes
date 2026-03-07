import { d as DevNotesServerOptions } from '../types-CrmObeqp.js';

declare function createDenoDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;

export { createDenoDevNotesHandler };
