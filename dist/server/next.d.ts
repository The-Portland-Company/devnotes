import { d as DevNotesServerOptions } from '../types-CrmObeqp.js';
import { D as DevNotesProxyBackend } from '../router-3PUkM5T-.js';
import '../types-DqIxvo5g.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
