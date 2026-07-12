import { e as DevNotesServerOptions } from '../types-Dhm6E817.js';
import { D as DevNotesProxyBackend } from '../router-CT5zEGot.js';
import '../types-DslxnIbx.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
