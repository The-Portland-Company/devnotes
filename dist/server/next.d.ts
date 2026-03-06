import { D as DevNotesProxyBackend } from '../router-Bt8qbFfY.js';
import '../types-xqGNcAbZ.js';

declare function createNextDevNotesProxy(backend: DevNotesProxyBackend): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesProxy };
