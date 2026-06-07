import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';
import { D as DevNotesProxyBackend } from '../router-CAUVBUBp.mjs';
import '../types-JtQftxX1.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
