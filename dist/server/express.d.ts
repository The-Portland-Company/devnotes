import { e as DevNotesServerOptions } from '../types-CN69T2nf.js';
import { D as DevNotesProxyBackend } from '../router-PnPu2R3g.js';
import '../types-DJTFHd1E.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
