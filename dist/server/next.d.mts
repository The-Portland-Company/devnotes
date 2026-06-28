import { e as DevNotesServerOptions } from '../types-CN69T2nf.mjs';
import { D as DevNotesProxyBackend } from '../router-r_u4W8zF.mjs';
import '../types-BjxWLsto.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
