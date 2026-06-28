import { e as DevNotesServerOptions } from '../types-CN69T2nf.mjs';
import { D as DevNotesProxyBackend } from '../router-r_u4W8zF.mjs';
import '../types-BjxWLsto.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
