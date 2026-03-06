import {
  routeDevNotesProxy
} from "../chunk-MQPMQI2T.mjs";

// src/server/express.ts
function createExpressDevNotesProxy(backend) {
  return async function devNotesProxy(req, res) {
    const slug = Array.isArray(req.params?.[0]) ? req.params[0] : String(req.params?.[0] || "").split("/").filter(Boolean);
    const request = new Request(`http://localhost${req.originalUrl || req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? void 0 : JSON.stringify(req.body || {})
    });
    const proxyRequest = {
      method: req.method,
      slug,
      request,
      authToken: req.headers?.authorization || null,
      query: new URL(request.url).searchParams,
      body: req.body || null
    };
    const result = await routeDevNotesProxy(backend, proxyRequest);
    res.status(result.status ?? 200).json(result.body ?? null);
  };
}
export {
  createExpressDevNotesProxy
};
//# sourceMappingURL=express.mjs.map