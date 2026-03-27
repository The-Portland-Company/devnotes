import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';
import { D as DevNotesProxyBackend } from '../router-DomT21vO.mjs';
import '../types-BgdvY4mJ.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
