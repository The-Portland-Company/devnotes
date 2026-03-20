import { d as DevNotesServerOptions } from '../types-CrmObeqp.mjs';
import { D as DevNotesProxyBackend } from '../router-CAE7Xrmu.mjs';
import '../types-C3m8yDgc.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
