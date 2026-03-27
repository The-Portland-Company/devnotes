import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.js';
import { D as DevNotesProxyBackend } from '../router-B7hQbqZU.js';
import '../types-DwvhmJrB.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
