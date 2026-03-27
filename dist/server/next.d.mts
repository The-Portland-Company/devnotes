import { d as DevNotesServerOptions } from '../types-DPJ2ViSN.mjs';
import { D as DevNotesProxyBackend } from '../router-DomT21vO.mjs';
import '../types-BgdvY4mJ.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
