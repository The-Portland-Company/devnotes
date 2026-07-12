import { e as DevNotesServerOptions } from '../types-Dhm6E817.js';
import { D as DevNotesProxyBackend } from '../router-CT5zEGot.js';
import '../types-DslxnIbx.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
