import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.js';
import { D as DevNotesProxyBackend } from '../router-DLwxrGqb.js';
import '../types-CnCGjCRT.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
