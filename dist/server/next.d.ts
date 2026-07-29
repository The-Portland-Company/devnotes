import { e as DevNotesServerOptions } from '../types-2MAsdo6u.js';
import { D as DevNotesProxyBackend } from '../router-CMJSFsbT.js';
import '../types-BDgU98Uq.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
