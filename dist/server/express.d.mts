import { e as DevNotesServerOptions } from '../types-2MAsdo6u.mjs';
import { D as DevNotesProxyBackend } from '../router-DlSnDz1P.mjs';
import '../types-C_532OPI.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
