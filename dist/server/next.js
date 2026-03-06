"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/next.ts
var next_exports = {};
__export(next_exports, {
  createNextDevNotesProxy: () => createNextDevNotesProxy
});
module.exports = __toCommonJS(next_exports);

// src/server/router.ts
var json = (body, status = 200) => ({ status, body });
var getId = (slug, index) => decodeURIComponent(slug[index] || "");
async function routeDevNotesProxy(backend, req) {
  const [resource, resourceId, nested] = req.slug;
  const method = req.method.toUpperCase();
  if (resource === "capabilities" && method === "GET") {
    return json(await backend.getCapabilities(req));
  }
  if (resource === "app-link") {
    if (method === "GET") return json(await backend.getAppLinkStatus(req));
    if (method === "POST") return json(await backend.linkApp(req.body, req));
    if (method === "DELETE") {
      await backend.unlinkApp(req);
      return json({ success: true });
    }
  }
  if (resource === "reports" && method === "GET" && !resourceId) {
    return json(await backend.listReports(req));
  }
  if (resource === "reports" && method === "POST" && !resourceId) {
    return json(await backend.createReport(req.body, req));
  }
  if (resource === "reports" && method === "PATCH" && resourceId && !nested) {
    return json(await backend.updateReport(getId(req.slug, 1), req.body, req));
  }
  if (resource === "reports" && method === "DELETE" && resourceId && !nested) {
    await backend.deleteReport(getId(req.slug, 1), req);
    return json({ success: true });
  }
  if (resource === "reports" && resourceId && nested === "messages") {
    if (method === "GET") return json(await backend.listMessages(getId(req.slug, 1), req));
    if (method === "POST") {
      return json(await backend.createMessage(getId(req.slug, 1), String(req.body?.body || ""), req));
    }
  }
  if (resource === "report-types") {
    if (method === "GET" && !resourceId) return json(await backend.listReportTypes(req));
    if (method === "POST" && !resourceId) {
      return json(await backend.createReportType(String(req.body?.name || ""), req));
    }
    if (method === "DELETE" && resourceId) {
      await backend.deleteReportType(getId(req.slug, 1), req);
      return json({ success: true });
    }
  }
  if (resource === "task-lists") {
    if (method === "GET" && !resourceId) return json(await backend.listTaskLists(req));
    if (method === "POST" && !resourceId) {
      return json(await backend.createTaskList(String(req.body?.name || ""), req));
    }
  }
  if (resource === "messages" && resourceId && method === "PATCH") {
    return json(await backend.updateMessage(getId(req.slug, 1), String(req.body?.body || ""), req));
  }
  if (resource === "messages" && resourceId && method === "DELETE") {
    await backend.deleteMessage(getId(req.slug, 1), req);
    return json({ success: true });
  }
  if (resource === "messages" && resourceId === "read" && method === "POST") {
    await backend.markMessagesRead(Array.isArray(req.body?.messageIds) ? req.body.messageIds : [], req);
    return json({ success: true });
  }
  if (resource === "unread-counts" && method === "GET") {
    return json(await backend.getUnreadCounts(req));
  }
  if (resource === "collaborators" && method === "GET") {
    const ids = req.query.get("ids");
    return json(await backend.listCollaborators(ids ? ids.split(",").filter(Boolean) : null, req));
  }
  if (resource === "ai" && resourceId === "refine-description" && method === "POST") {
    if (!backend.refineDescription) {
      return json({ error: "AI refinement is not configured." }, 404);
    }
    return json(await backend.refineDescription(req.body, req));
  }
  return json({ error: "Not found" }, 404);
}

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createNextDevNotesProxy
});
//# sourceMappingURL=next.js.map