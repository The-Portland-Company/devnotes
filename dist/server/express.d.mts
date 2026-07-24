import { e as DevNotesServerOptions } from '../types-3j8ptHn_.mjs';
import { D as DevNotesProxyBackend } from '../router-BYK9fhj-.mjs';
import '../types-DA8JgPGJ.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
