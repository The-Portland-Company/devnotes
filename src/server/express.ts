import type { DevNotesServerOptions } from '../types';
import type { DevNotesProxyBackend, DevNotesProxyRequest } from './router';
import { createDevNotesServerHandler } from './forge';
import { isDevNotesProxyBackend, routeDevNotesProxy } from './router';

function createLegacyExpressProxy(backend: DevNotesProxyBackend) {
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

export function createExpressDevNotesHandler(options: DevNotesServerOptions) {
  const handler = createDevNotesServerHandler(options);

  return async function devNotesHandler(req: any, res: any, next?: (error?: unknown) => void) {
    try {
      const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
        method: req.method,
        headers: req.headers,
        body:
          req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
      });

      const response = await handler(request);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      const body = await response.text();
      res.send(body);
    } catch (error) {
      if (typeof next === 'function') {
        next(error);
        return;
      }
      throw error;
    }
  };
}

export function createExpressDevNotesProxy(
  backendOrOptions: DevNotesProxyBackend | DevNotesServerOptions
) {
  if (isDevNotesProxyBackend(backendOrOptions)) {
    return createLegacyExpressProxy(backendOrOptions);
  }
  return createExpressDevNotesHandler(backendOrOptions);
}
