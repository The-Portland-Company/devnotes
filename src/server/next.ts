import type { DevNotesServerOptions } from '../types';
import type { DevNotesProxyBackend, DevNotesProxyRequest } from './router';
import { createDevNotesServerHandler } from './forge';
import { isDevNotesProxyBackend, routeDevNotesProxy } from './router';

async function readBody(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function createLegacyNextProxy(backend: DevNotesProxyBackend) {
  return async function handler(
    request: Request,
    context: { params?: { slug?: string[] } } = {}
  ): Promise<Response> {
    const url = new URL(request.url);
    const proxyRequest: DevNotesProxyRequest = {
      method: request.method,
      slug: context.params?.slug || [],
      request,
      authToken: request.headers.get('authorization'),
      query: url.searchParams,
      body: await readBody(request),
    };

    const result = await routeDevNotesProxy(backend, proxyRequest);
    return new Response(JSON.stringify(result.body ?? null), {
      status: result.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

export function createNextDevNotesHandler(options: DevNotesServerOptions) {
  return createDevNotesServerHandler(options);
}

export function createNextDevNotesProxy(
  backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions
) {
  if (isDevNotesProxyBackend(backendOrOptions)) {
    return createLegacyNextProxy(backendOrOptions);
  }
  return createNextDevNotesHandler(backendOrOptions);
}
