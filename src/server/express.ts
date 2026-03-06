import type { DevNotesProxyBackend, DevNotesProxyRequest } from './router';
import { routeDevNotesProxy } from './router';

export function createExpressDevNotesProxy(backend: DevNotesProxyBackend) {
  return async function devNotesProxy(req: any, res: any) {
    const slug = Array.isArray(req.params?.[0])
      ? req.params[0]
      : String(req.params?.[0] || '')
          .split('/')
          .filter(Boolean);

    const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
      method: req.method,
      headers: req.headers,
      body:
        req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
    });

    const proxyRequest: DevNotesProxyRequest = {
      method: req.method,
      slug,
      request,
      authToken: req.headers?.authorization || null,
      query: new URL(request.url).searchParams,
      body: req.body || null,
    };

    const result = await routeDevNotesProxy(backend, proxyRequest);
    res.status(result.status ?? 200).json(result.body ?? null);
  };
}
