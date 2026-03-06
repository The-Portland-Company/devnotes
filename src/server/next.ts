import type { DevNotesProxyBackend, DevNotesProxyRequest } from './router';
import { routeDevNotesProxy } from './router';

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

export function createNextDevNotesProxy(backend: DevNotesProxyBackend) {
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
