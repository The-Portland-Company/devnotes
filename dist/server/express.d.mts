import { e as DevNotesServerOptions } from '../types-Dhm6E817.mjs';
import { D as DevNotesProxyBackend } from '../router-BAfe4NPS.mjs';
import '../types-a20Y5hH1.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
