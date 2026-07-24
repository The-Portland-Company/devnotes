import { e as DevNotesServerOptions } from '../types-2MAsdo6u.js';
import { D as DevNotesProxyBackend } from '../router-CMJSFsbT.js';
import '../types-BDgU98Uq.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
