import { e as DevNotesServerOptions } from '../types-2MAsdo6u.mjs';
import { D as DevNotesProxyBackend } from '../router-DlSnDz1P.mjs';
import '../types-C_532OPI.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
