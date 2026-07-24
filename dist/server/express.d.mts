import { e as DevNotesServerOptions } from '../types-2MAsdo6u.mjs';
import { D as DevNotesProxyBackend } from '../router-Cvf2dent.mjs';
import '../types-B97BgA1D.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
