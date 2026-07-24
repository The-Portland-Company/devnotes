import { e as DevNotesServerOptions } from '../types-3j8ptHn_.mjs';
import { D as DevNotesProxyBackend } from '../router-BYK9fhj-.mjs';
import '../types-DA8JgPGJ.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
