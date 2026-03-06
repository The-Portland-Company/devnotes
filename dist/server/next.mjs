import {
  routeDevNotesProxy
} from "../chunk-MQPMQI2T.mjs";

// src/server/next.ts
async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function createNextDevNotesProxy(backend) {
  return async function handler(request, context = {}) {
    const url = new URL(request.url);
    const proxyRequest = {
      method: request.method,
      slug: context.params?.slug || [],
      request,
      authToken: request.headers.get("authorization"),
      query: url.searchParams,
      body: await readBody(request)
    };
    const result = await routeDevNotesProxy(backend, proxyRequest);
    return new Response(JSON.stringify(result.body ?? null), {
      status: result.status ?? 200,
      headers: { "Content-Type": "application/json" }
    });
  };
}
export {
  createNextDevNotesProxy
};
//# sourceMappingURL=next.mjs.map