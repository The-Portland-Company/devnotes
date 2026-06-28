import { e as DevNotesServerOptions } from '../types-CN69T2nf.mjs';
import { D as DevNotesProxyBackend } from '../router-D7o_LsOL.mjs';
import '../types-jRq0zgJK.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
