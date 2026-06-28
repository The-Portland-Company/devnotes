import { e as DevNotesServerOptions } from '../types-CN69T2nf.js';
import { D as DevNotesProxyBackend } from '../router-PnPu2R3g.js';
import '../types-DJTFHd1E.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
