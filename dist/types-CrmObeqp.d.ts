type DevNotesCapabilities = {
    ai: boolean;
    appLink: boolean;
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
    projectName?: string | null;
};
type DevNotesCorsHeaders = HeadersInit | ((request: Request) => HeadersInit | Promise<HeadersInit>);
type DevNotesServerOptions = {
    basePath?: string;
    getCurrentUser: (request: Request) => Promise<DevNotesServerUser | null> | DevNotesServerUser | null;
    forge: DevNotesForgeOptions;
    resolveUsers?: (ids: string[]) => Promise<DevNotesResolvedUser[]> | DevNotesResolvedUser[];
    fetch?: typeof globalThis.fetch;
    corsHeaders?: DevNotesCorsHeaders;
};
type DevNotesClientOptions = {
    basePath?: string;
    getAuthToken: () => Promise<string> | string;
    fetch?: typeof globalThis.fetch;
};

export type { DevNotesCapabilities as D, DevNotesAppLinkStatus as a, DevNotesClientOptions as b, DevNotesLinkAppInput as c, DevNotesServerOptions as d };
