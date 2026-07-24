import { e as DevNotesServerOptions } from '../types-2MAsdo6u.mjs';
import { D as DevNotesProxyBackend } from '../router-Cvf2dent.mjs';
import '../types-B97BgA1D.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
