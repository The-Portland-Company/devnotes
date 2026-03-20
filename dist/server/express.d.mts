import { d as DevNotesServerOptions } from '../types-CrmObeqp.mjs';
import { D as DevNotesProxyBackend } from '../router-CAE7Xrmu.mjs';
import '../types-C3m8yDgc.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
