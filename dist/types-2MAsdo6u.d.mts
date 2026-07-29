type DevNotesCapabilities = {
    ai: boolean;
    appLink: boolean;
};
/** Structured Forge connection error surfaced by every `/api/devnotes/*` response. */
type ForgeError = {
    path: string;
    status: number | null;
    code: string;
    message: string;
};
/** Top-level connectivity status the backend attaches to every response. */
type ForgeStatus = {
    connected: boolean;
    error: null | ForgeError;
};
type DevNotesAppLinkStatus = {
    linked: boolean;
    projectName: string | null;
    tokenLast4: string | null;
    linkedAt: string | null;
    projectMatched?: boolean;
    availableProjects?: DevNotesProjectSummary[];
    projectDiscovery?: DevNotesProjectDiscovery | null;
};
type DevNotesLinkAppInput = {
    pat: string;
    projectName?: string;
};
type DevNotesProjectSummary = {
    id: string;
    name: string;
    organizationId?: string;
};
type DevNotesProjectDiscovery = {
    path: string | null;
    baseUrl: string;
    projectId?: string | null;
    organizationId?: string | null;
};
type DevNotesServerUser = {
    id: string;
    email?: string | null;
    fullName?: string | null;
    role?: string | null;
};
type DevNotesResolvedUser = {
    id: string;
    email?: string | null;
    fullName?: string | null;
};
type DevNotesForgeOptions = {
    baseUrl: string;
    pat: string;
    /**
     * The Forge project to file into. Either a fixed name, or a resolver called
     * per request — so one shared backend (e.g. the Contacts API that every
     * feature app proxies through) can route each app to its OWN project by
     * reading a request header (e.g. `x-politogy-app`). Returning null/undefined
     * falls back to project discovery.
     */
    projectName?: string | null | ((request: Request) => string | null | undefined);
    /**
     * Upstream Forge request timeout in ms (default 25000). A guardrail, not a
     * fix: Cloudflare gives an origin 100s before it returns 524, and a single
     * DevNotes call can make several Forge round-trips. Failing one slow
     * round-trip fast keeps the lane inside that budget and surfaces a real 504
     * instead of a dead connection.
     */
    timeoutMs?: number;
};
type DevNotesCorsHeaders = HeadersInit | ((request: Request) => HeadersInit | Promise<HeadersInit>);
type DevNotesTaskCreatedEmailOptions = {
    enabled?: boolean;
    apiKey: string;
    fromEmail?: string | null;
    fromName?: string | null;
    projectOwnerEmails?: string[] | null;
    replyTo?: string[] | null;
};
type DevNotesServerNotifications = {
    taskCreatedEmail?: DevNotesTaskCreatedEmailOptions | null;
};
type DevNotesServerOptions = {
    basePath?: string;
    getCurrentUser: (request: Request) => Promise<DevNotesServerUser | null> | DevNotesServerUser | null;
    forge: DevNotesForgeOptions;
    resolveUsers?: (ids: string[]) => Promise<DevNotesResolvedUser[]> | DevNotesResolvedUser[];
    fetch?: typeof globalThis.fetch;
    corsHeaders?: DevNotesCorsHeaders;
    notifications?: DevNotesServerNotifications;
};
type DevNotesClientOptions = {
    basePath?: string;
    getAuthToken: () => Promise<string> | string;
    fetch?: typeof globalThis.fetch;
};

export type { DevNotesCapabilities as D, ForgeStatus as F, DevNotesAppLinkStatus as a, ForgeError as b, DevNotesClientOptions as c, DevNotesLinkAppInput as d, DevNotesServerOptions as e };
