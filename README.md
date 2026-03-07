# @the-portland-company/devnotes

Forge-backed DevNotes and bug reporting for server-capable React, Next.js, Express, and Deno apps.

This package is Forge-only. It ships the Focus Forge proxy implementation for supported server runtimes and does not include a local database, SQL schema, Supabase adapter, or fallback persistence layer.

## Install

```bash
npm install @the-portland-company/devnotes
```

Peer dependencies:

- `react` `^18 || ^19`
- `react-dom` `^18 || ^19`

## Assumptions

- The browser package never talks to Forge directly
- The host app exposes a server-side proxy at `/api/devnotes`
- The host app authenticates users and passes a bearer token to the proxy
- Forge credentials are stored only on the server side

## Quick start

```bash
npx devnotes-setup
```

Then wire the generated wrapper component to your auth token source and implement the generated proxy backend against Forge.

## Package entrypoints

- `@the-portland-company/devnotes`
- `@the-portland-company/devnotes/next`
- `@the-portland-company/devnotes/express`
- `@the-portland-company/devnotes/deno`
- `@the-portland-company/devnotes/styles.css`

## What this package ships

- React UI components for in-app bug reporting and DevNotes overlays
- A browser client that talks to your host app at `/api/devnotes`
- Forge-native server helpers for Next.js, Express, and Deno
- A `devnotes-setup` CLI that copies starter integration templates into a host app

## Client usage

```tsx
import {
  DevNotesButton,
  DevNotesProvider,
  createDevNotesClient,
} from '@the-portland-company/devnotes';
import '@the-portland-company/devnotes/styles.css';

const client = createDevNotesClient({
  getAuthToken: async () => session.accessToken,
});

export function AppDevNotes({ children }) {
  return (
    <DevNotesProvider adapter={client} user={{ id: session.user.id, email: session.user.email }}>
      {children}
      <DevNotesButton />
    </DevNotesProvider>
  );
}
```

## Server helpers

- `@the-portland-company/devnotes/next`
- `@the-portland-company/devnotes/express`
- `@the-portland-company/devnotes/deno`

These helpers implement the DevNotes-to-Forge proxy path for you. Your app provides the authenticated host user and Forge configuration; the package owns the DevNotes routing, project discovery, and Forge API integration.

## Host app requirements

- Expose a server-side proxy at `/api/devnotes`
- Authenticate the current user in the host app
- Return a bearer token from `getAuthToken()` on the browser side
- Resolve the current user server-side with `getCurrentUser(request)`
- Keep Forge credentials server-side only

## Deno usage

```ts
import { createDenoDevNotesHandler } from '@the-portland-company/devnotes/deno';

const devNotesHandler = createDenoDevNotesHandler({
  basePath: '/api/devnotes',
  forge: {
    baseUrl: Deno.env.get('FOCUS_FORGE_BASE_URL')!,
    pat: Deno.env.get('FOCUS_FORGE_PAT')!,
    projectName: Deno.env.get('FOCUS_FORGE_PROJECT_NAME') || null,
  },
  corsHeaders: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  },
  async getCurrentUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    return { id: 'user-id', email: 'person@example.com', fullName: 'Person Example' };
  },
});

Deno.serve((request) => {
  if (new URL(request.url).pathname.startsWith('/api/devnotes')) {
    return devNotesHandler(request);
  }
  return new Response('Not found', { status: 404 });
});
```

## Next.js usage

```ts
import { createNextDevNotesHandler } from '@the-portland-company/devnotes/next';

const handler = createNextDevNotesHandler({
  forge: {
    baseUrl: process.env.FOCUS_FORGE_BASE_URL!,
    pat: process.env.FOCUS_FORGE_PAT!,
    projectName: process.env.FOCUS_FORGE_PROJECT_NAME || null,
  },
  async getCurrentUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    return { id: 'user-id', email: 'person@example.com' };
  },
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;
export const OPTIONS = handler;
```

## Express usage

```ts
import { createExpressDevNotesHandler } from '@the-portland-company/devnotes/express';

export const devNotesProxy = createExpressDevNotesHandler({
  forge: {
    baseUrl: process.env.FOCUS_FORGE_BASE_URL!,
    pat: process.env.FOCUS_FORGE_PAT!,
    projectName: process.env.FOCUS_FORGE_PROJECT_NAME || null,
  },
  async getCurrentUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    return { id: 'user-id', email: 'person@example.com' };
  },
});
```

## Storage model

- The browser package never talks to a database directly
- The package does not persist to Supabase, Postgres, SQLite, or any local store
- Your host proxy must translate DevNotes operations into real Focus Forge API calls
- App-level Forge credentials must stay on the server side
