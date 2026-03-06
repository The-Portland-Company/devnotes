import { D as DevNotesProxyBackend } from '../router-CPtxoMg5.mjs';
import '../types-xqGNcAbZ.mjs';

declare function createNextDevNotesProxy(backend: DevNotesProxyBackend): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesProxy };
