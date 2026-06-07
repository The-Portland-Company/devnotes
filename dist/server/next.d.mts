import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';
import { D as DevNotesProxyBackend } from '../router-CAUVBUBp.mjs';
import '../types-JtQftxX1.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
