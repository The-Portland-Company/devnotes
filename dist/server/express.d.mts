import { d as DevNotesServerOptions } from '../types-CrmObeqp.mjs';
import { D as DevNotesProxyBackend } from '../router-DPFI-Ag4.mjs';
import '../types-CBHExs2F.mjs';

declare function createExpressDevNotesHandler(options: DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;
declare function createExpressDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (req: any, res: any, next?: (error?: unknown) => void) => Promise<void>;

export { createExpressDevNotesHandler, createExpressDevNotesProxy };
