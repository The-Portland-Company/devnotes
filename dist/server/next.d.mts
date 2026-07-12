import { e as DevNotesServerOptions } from '../types-Dhm6E817.mjs';
import { D as DevNotesProxyBackend } from '../router-BAfe4NPS.mjs';
import '../types-a20Y5hH1.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
