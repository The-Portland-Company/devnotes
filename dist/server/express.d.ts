import { d as DevNotesServerOptions } from '../types-CrmObeqp.js';
import { D as DevNotesProxyBackend } from '../router-3PUkM5T-.js';
import '../types-DqIxvo5g.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
