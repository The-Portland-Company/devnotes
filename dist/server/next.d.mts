import { e as DevNotesServerOptions } from '../types-CN69T2nf.mjs';
import { D as DevNotesProxyBackend } from '../router-D7o_LsOL.mjs';
import '../types-jRq0zgJK.mjs';

declare function createNextDevNotesHandler(options: DevNotesServerOptions): (request: Request) => Promise<Response>;
declare function createNextDevNotesProxy(backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions): (request: Request, context?: {
    params?: {
        slug?: string[];
    };
}) => Promise<Response>;

export { createNextDevNotesHandler, createNextDevNotesProxy };
