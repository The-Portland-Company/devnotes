import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';
import { D as DevNotesProxyBackend } from '../router-DWglY10Z.mjs';
import '../types-D2LJ7W05.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
