import { e as DevNotesServerOptions } from '../types-3j8ptHn_.js';
import { D as DevNotesProxyBackend } from '../router-B09bvNSz.js';
import '../types-BjrSgd2V.js';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
