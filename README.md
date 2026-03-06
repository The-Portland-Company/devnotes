# @the-portland-company/devnotes

Forge-backed DevNotes and bug reporting for server-capable React and Next.js apps.

## Install

```bash
npm install @the-portland-company/devnotes
```

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

These provide request-routing helpers for a host proxy. They do not implement Forge access for you; your app backend remains responsible for the Forge integration.
