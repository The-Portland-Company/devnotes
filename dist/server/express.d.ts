import { e as DevNotesServerOptions } from '../types-3j8ptHn_.js';
import { D as DevNotesProxyBackend } from '../router-B09bvNSz.js';
import '../types-BjrSgd2V.js';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
