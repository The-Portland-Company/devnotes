// src/server/forge.ts
var DEFAULT_BASE_PATH = "/api/devnotes";
var DEVNOTES_META_MARKER = "[DEVNOTES_META:";
var DEVNOTES_DEFAULT_TYPE_NAMES = ["Bug", "Feature Request", "UI Issue", "Performance"];
var DEVNOTES_DEFAULT_TASK_LIST_NAME = "General";
var UpstreamForgeError = class extends Error {
  constructor(path, baseUrl, response) {
    super(`Focus Forge request failed for ${path}`);
    this.name = "UpstreamForgeError";
    this.path = path;
    this.baseUrl = baseUrl;
    this.response = response;
  }
};
function coerceObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64ToBytes(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
function normalizeForgeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}
function normalizeForgeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeForgeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function normalizeNonEmptyString(value) {
  if (value === null || value === void 0) return null;
  const normalized = String(value).trim();
  return normalized || null;
}
function normalizeEmailList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeNonEmptyString(item)).filter((item) => Boolean(item));
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function formatNotificationDateTime(value) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
function tryStringify(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function extractBootstrapUser(payload) {
  const root = coerceObject(payload);
  const data = coerceObject(root.data);
  const bootstrap = coerceObject(data.bootstrap);
  const user = coerceObject(data.user);
  const bootstrapUser = coerceObject(bootstrap.user);
  const resolvedUser = Object.keys(bootstrapUser).length > 0 ? bootstrapUser : user;
  const firstName = normalizeNonEmptyString(resolvedUser.firstName);
  const lastName = normalizeNonEmptyString(resolvedUser.lastName);
  return {
    email: normalizeNonEmptyString(resolvedUser.email),
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || null
  };
}
function formatAttachmentSummary(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  const items = attachments.map((attachment) => {
    const record = coerceObject(attachment);
    const label = normalizeNonEmptyString(record.name) || normalizeNonEmptyString(record.fileName) || normalizeNonEmptyString(record.filename) || normalizeNonEmptyString(record.url) || normalizeNonEmptyString(record.href);
    const url = normalizeNonEmptyString(record.url) || normalizeNonEmptyString(record.href);
    if (!label) return null;
    return {
      html: url ? `<li><a href="${escapeHtml(url)}" style="color:#93c5fd;text-decoration:none;">${escapeHtml(label)}</a></li>` : `<li>${escapeHtml(label)}</li>`,
      text: url ? `- ${label}: ${url}` : `- ${label}`
    };
  }).filter((item) => Boolean(item));
  if (items.length === 0) return null;
  return {
    html: `<div style="margin-top:20px;"><div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:8px;">Attachments</div><ul style="margin:0;padding-left:18px;color:#d4d4d8;">${items.map((item) => item.html).join("")}</ul></div>`,
    text: `Attachments:
${items.map((item) => item.text).join("\n")}`
  };
}
function buildHumanReadableDetails(payload) {
  const reservedKeys = /* @__PURE__ */ new Set([
    "title",
    "description",
    "attachments",
    "created_at",
    "createdAt",
    "due_at",
    "dueAt",
    "due_date",
    "dueDate",
    "due_time",
    "dueTime",
    "creator",
    "created_by"
  ]);
  const entries = Object.entries(payload).filter(([key, value]) => !reservedKeys.has(key) && value !== null && value !== void 0 && value !== "").map(([key, value]) => {
    const label = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    const rendered = tryStringify(value);
    return rendered ? { label, rendered } : null;
  }).filter((item) => Boolean(item));
  if (entries.length === 0) return null;
  return {
    html: `<div style="margin-top:20px;"><div style="font-size:14px;font-weight:600;color:#ffffff;margin-bottom:8px;">Details</div><table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${entries.map(
      (item) => `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#a1a1aa;vertical-align:top;white-space:nowrap;">${escapeHtml(item.label)}</td><td style="padding:6px 0;font-size:13px;color:#e4e4e7;white-space:pre-wrap;word-break:break-word;">${escapeHtml(item.rendered)}</td></tr>`
    ).join("")}</table></div>`,
    text: `Details:
${entries.map((item) => `${item.label}: ${item.rendered}`).join("\n")}`
  };
}
async function sendTaskCreatedEmail(params) {
  const notification = params.notification;
  if (!notification || notification.enabled === false) return;
  const apiKey = normalizeNonEmptyString(notification.apiKey);
  if (!apiKey) return;
  const recipients = Array.from(
    /* @__PURE__ */ new Set([
      ...normalizeEmailList(notification.projectOwnerEmails),
      ...params.projectOwnerEmail ? [params.projectOwnerEmail] : []
    ])
  );
  if (recipients.length === 0) return;
  const fromEmail = normalizeNonEmptyString(notification.fromEmail) || "focusforge@theportlandcompany.com";
  const fromName = normalizeNonEmptyString(notification.fromName) || "Focus Forge";
  const creatorName = normalizeNonEmptyString(params.currentUser.fullName) || normalizeNonEmptyString(params.currentUser.email) || "Someone";
  const createdAt = formatNotificationDateTime(params.report.created_at) || formatNotificationDateTime((/* @__PURE__ */ new Date()).toISOString());
  const dueBy = formatNotificationDateTime(params.payload.due_at) || formatNotificationDateTime(params.payload.dueAt) || (() => {
    const dueDate = normalizeNonEmptyString(params.payload.due_date) || normalizeNonEmptyString(params.payload.dueDate);
    const dueTime = normalizeNonEmptyString(params.payload.due_time) || normalizeNonEmptyString(params.payload.dueTime);
    if (!dueDate && !dueTime) return null;
    return [dueDate, dueTime].filter(Boolean).join(" ");
  })();
  const description = normalizeNonEmptyString(params.report.description);
  const attachments = formatAttachmentSummary(params.payload.attachments);
  const details = buildHumanReadableDetails(params.payload);
  const subject = `${creatorName} has created a Task on ${params.project.name}`;
  const replyTo = normalizeEmailList(notification.replyTo);
  const htmlParts = [
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">`,
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#18181b;padding:32px 16px;"><tr><td align="center">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#27272a;border:1px solid #3f3f46;border-radius:12px;overflow:hidden;">',
    '<tr><td style="padding:24px 28px;border-bottom:1px solid #3f3f46;"><div style="font-size:24px;font-weight:700;color:#ffffff;">Focus Forge</div></td></tr>',
    '<tr><td style="padding:28px;">',
    `<div style="font-size:15px;line-height:24px;color:#e4e4e7;"><strong>Title:</strong> ${escapeHtml(params.report.title)}</div>`,
    createdAt ? `<div style="margin-top:8px;font-size:12px;line-height:18px;color:#a1a1aa;"><strong>Created at</strong> ${escapeHtml(createdAt)}</div>` : "",
    dueBy ? `<div style="margin-top:4px;font-size:12px;line-height:18px;color:#a1a1aa;"><strong>Due by</strong> ${escapeHtml(dueBy)}</div>` : "",
    description ? `<div style="margin-top:20px;font-size:14px;line-height:24px;color:#d4d4d8;white-space:pre-wrap;">${escapeHtml(description)}</div>` : "",
    attachments?.html || "",
    details?.html || "",
    "</td></tr></table></td></tr></table></body></html>"
  ];
  const textParts = [
    `Title: ${params.report.title}`,
    createdAt ? `Created at: ${createdAt}` : null,
    dueBy ? `Due by: ${dueBy}` : null,
    description || null,
    attachments?.text || null,
    details?.text || null
  ].filter((item) => Boolean(item));
  const resendBody = {
    from: `${fromName} <${fromEmail}>`,
    to: recipients,
    subject,
    html: htmlParts.join(""),
    text: textParts.join("\n\n")
  };
  if (replyTo.length > 0) {
    resendBody.reply_to = replyTo.map((email) => ({ email }));
  }
  const response = await params.fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(resendBody)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Task notification email failed (${response.status}): ${text || "Unknown error"}`
    );
  }
}
function mapBugStatusToForge(status) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "in progress") return "in_progress";
  if (normalized === "resolved" || normalized === "closed") return "completed";
  return "open";
}
function encodeDevNotesMeta(meta) {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(meta)));
}
function decodeDevNotesMeta(encoded) {
  try {
    const text = new TextDecoder().decode(base64ToBytes(encoded));
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function splitDevNotesMeta(text) {
  const value = String(text || "");
  const markerIndex = value.lastIndexOf(DEVNOTES_META_MARKER);
  if (markerIndex === -1) {
    return { body: value, token: null, meta: null };
  }
  const endIndex = value.indexOf("]", markerIndex);
  if (endIndex === -1) {
    return { body: value, token: null, meta: null };
  }
  const token = value.slice(markerIndex, endIndex + 1);
  const encoded = value.slice(markerIndex + DEVNOTES_META_MARKER.length, endIndex).trim();
  const meta = decodeDevNotesMeta(encoded);
  if (!meta) {
    return { body: value, token: null, meta: null };
  }
  const body = value.slice(0, markerIndex).replace(/\n+$/, "");
  return { body, token, meta };
}
function toDevNotesMetaToken(meta) {
  return `${DEVNOTES_META_MARKER}${encodeDevNotesMeta(meta)}]`;
}
function appendDevNotesMeta(text, meta) {
  const body = String(text || "").trimEnd();
  const marker = toDevNotesMetaToken(meta);
  return body ? `${body}

${marker}` : marker;
}
function normalizeTaskDescriptionAndMeta(input) {
  const rawDescription = String(input.description || "");
  const parsedDescription = splitDevNotesMeta(rawDescription);
  const explicitRawMeta = input.devnotesMeta === null || input.devnotesMeta === void 0 ? input.devnotes_meta === null || input.devnotes_meta === void 0 ? null : String(input.devnotes_meta || "").trim() || null : String(input.devnotesMeta || "").trim() || null;
  const rawToken = explicitRawMeta || parsedDescription.token;
  const parsedMeta = rawToken && rawToken.startsWith(DEVNOTES_META_MARKER) && rawToken.endsWith("]") ? decodeDevNotesMeta(
    rawToken.slice(DEVNOTES_META_MARKER.length, rawToken.length - 1).trim()
  ) : null;
  return {
    description: parsedDescription.body.trimEnd(),
    devnotesMeta: rawToken,
    parsedMeta
  };
}
function parseLegacyDevNotesDescription(description) {
  const legacyMarker = "\n\n---\nSource: Politogy bug report";
  const index = description.indexOf(legacyMarker);
  if (index === -1) {
    return {
      description: description.trim() || null
    };
  }
  const leading = description.slice(0, index).trim() || null;
  const detailLines = description.slice(index + "\n\n---\n".length).split("\n").map((line) => line.trim()).filter(Boolean);
  const values = /* @__PURE__ */ new Map();
  detailLines.forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key) values.set(key, value);
  });
  return {
    description: leading,
    page_url: values.get("page url") || "",
    x_position: normalizeForgeNumber(values.get("coordinates")?.split(",")[0]?.trim(), 0),
    y_position: normalizeForgeNumber(values.get("coordinates")?.split(",")[1]?.trim(), 0),
    severity: values.get("severity") || "Medium",
    status: values.get("status") || "Open",
    types: values.get("types")?.split(",").map((item) => item.trim()).filter(Boolean) || [],
    creator_name: values.get("created by") || ""
  };
}
function buildDevNotesReportMeta(report) {
  return {
    kind: "report",
    version: 1,
    task_list_id: String(report.task_list_id || ""),
    page_url: String(report.page_url || ""),
    x_position: normalizeForgeNumber(report.x_position),
    y_position: normalizeForgeNumber(report.y_position),
    target_selector: report.target_selector === null || report.target_selector === void 0 ? null : String(report.target_selector),
    target_relative_x: report.target_relative_x === null || report.target_relative_x === void 0 ? null : normalizeForgeNumber(report.target_relative_x),
    target_relative_y: report.target_relative_y === null || report.target_relative_y === void 0 ? null : normalizeForgeNumber(report.target_relative_y),
    types: normalizeForgeStringArray(report.types),
    severity: String(report.severity || "Medium"),
    expected_behavior: report.expected_behavior === null || report.expected_behavior === void 0 ? null : String(report.expected_behavior),
    actual_behavior: report.actual_behavior === null || report.actual_behavior === void 0 ? null : String(report.actual_behavior),
    capture_context: report.capture_context && typeof report.capture_context === "object" ? report.capture_context : null,
    status: String(report.status || "Open"),
    created_by: String(report.created_by || ""),
    creator_name: report.creator && typeof report.creator === "object" ? String(report.creator.full_name || "") : "",
    creator_email: report.creator && typeof report.creator === "object" ? String(report.creator.email || "") : "",
    assigned_to: report.assigned_to === null || report.assigned_to === void 0 ? null : String(report.assigned_to),
    resolved_at: report.resolved_at === null || report.resolved_at === void 0 ? null : String(report.resolved_at),
    resolved_by: report.resolved_by === null || report.resolved_by === void 0 ? null : String(report.resolved_by),
    approved: normalizeForgeBoolean(report.approved),
    ai_ready: normalizeForgeBoolean(report.ai_ready),
    ai_description: report.ai_description === null || report.ai_description === void 0 ? null : String(report.ai_description),
    response: report.response === null || report.response === void 0 ? null : String(report.response)
  };
}
function buildDevNotesReportToken(report) {
  return toDevNotesMetaToken(buildDevNotesReportMeta(report));
}
function isDevNotesForgeTask(task) {
  const normalized = normalizeTaskDescriptionAndMeta(task);
  if (normalized.parsedMeta?.kind === "report") return true;
  const description = normalized.description;
  return description.includes("Source: Politogy bug report");
}
function extractProjectsFromPayload(payload) {
  const root = coerceObject(payload);
  const data = coerceObject(root.data);
  const bootstrap = coerceObject(data.bootstrap);
  const projectArrays = [
    Array.isArray(root.projects) ? root.projects : [],
    Array.isArray(data.projects) ? data.projects : [],
    Array.isArray(bootstrap.projects) ? bootstrap.projects : []
  ];
  const seen = /* @__PURE__ */ new Set();
  const projects = [];
  for (const group of projectArrays) {
    for (const projectRaw of group) {
      const project = coerceObject(projectRaw);
      const id = typeof project.id === "string" ? project.id.trim() : "";
      const name = typeof project.name === "string" ? project.name.trim() : "";
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      const organizationId = typeof project.organization_id === "string" && project.organization_id.trim() || typeof project.organizationId === "string" && project.organizationId.trim() || void 0;
      projects.push({ id, name, organizationId });
    }
  }
  return projects;
}
function extractForgeTaskId(payload) {
  const root = coerceObject(payload);
  const data = coerceObject(root.data);
  const task = coerceObject(root.task);
  const dataTask = coerceObject(data.task);
  const candidates = [root.id, task.id, data.id, dataTask.id];
  const invalidSentinelValues = /* @__PURE__ */ new Set(["NOT_FOUND", "not_found", "null", "undefined", ""]);
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      const value = candidate.trim();
      if (invalidSentinelValues.has(value)) continue;
      if (value.toLowerCase().startsWith("error-")) continue;
      return value;
    }
  }
  return null;
}
function generateDevNotesShareSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
}
function normalizeBasePath(basePath) {
  const trimmed = (basePath || DEFAULT_BASE_PATH).trim();
  if (!trimmed) return DEFAULT_BASE_PATH;
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.endsWith("/") && normalized !== "/" ? normalized.slice(0, -1) : normalized;
}
function normalizeBaseUrl(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "");
}
function isTaskResource(resource) {
  return resource === "tasks" || resource === "reports";
}
function isTaskTypeResource(resource) {
  return resource === "task-types" || resource === "report-types";
}
function normalizeUser(user) {
  if (!user?.id) return null;
  return {
    id: String(user.id).trim(),
    email: user.email == null ? null : String(user.email).trim(),
    fullName: user.fullName == null ? null : String(user.fullName).trim(),
    role: user.role == null ? null : String(user.role).trim()
  };
}
function toCreatorRecord(user) {
  return {
    id: user.id,
    email: user.email == null ? null : user.email,
    full_name: user.fullName == null ? null : user.fullName
  };
}
async function resolveCorsHeaders(request, corsHeaders) {
  const headers = new Headers();
  if (!corsHeaders) return headers;
  const resolved = typeof corsHeaders === "function" ? await corsHeaders(request) : corsHeaders;
  new Headers(resolved).forEach((value, key) => headers.set(key, value));
  return headers;
}
async function jsonResponse(request, corsHeaders, body, status = 200) {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}
async function emptyResponse(request, corsHeaders, status = 204) {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  return new Response(null, { status, headers });
}
async function passthroughUpstreamResponse(request, corsHeaders, error) {
  const headers = await resolveCorsHeaders(request, corsHeaders);
  if (error.response.contentType) {
    headers.set("Content-Type", error.response.contentType);
  }
  if (error.response.text) {
    headers.set("X-DevNotes-Upstream-Path", error.path);
    headers.set("X-DevNotes-Upstream-Base-Url", error.baseUrl);
    return new Response(error.response.text, {
      status: error.response.status,
      headers
    });
  }
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      error: "Focus Forge request failed",
      path: error.path,
      baseUrl: error.baseUrl,
      status: error.response.status
    }),
    {
      status: error.response.status,
      headers
    }
  );
}
async function readJsonBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function parseRequestPath(pathname, basePath) {
  if (pathname === basePath) return [];
  if (!pathname.startsWith(`${basePath}/`)) return null;
  return pathname.slice(basePath.length + 1).split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
}
function toProjectDiscovery(discovery) {
  return {
    path: discovery.discoveryPath,
    baseUrl: discovery.resolvedBaseUrl
  };
}
function buildKnownUsers(metadataComments, reports, currentUser) {
  const users = /* @__PURE__ */ new Map();
  users.set(currentUser.id, {
    id: currentUser.id,
    email: currentUser.email ?? null,
    full_name: currentUser.fullName ?? null
  });
  reports.forEach((report) => {
    users.set(report.created_by, report.creator || {
      id: report.created_by,
      email: null,
      full_name: null
    });
    if (report.assigned_to && !users.has(report.assigned_to)) {
      users.set(report.assigned_to, { id: report.assigned_to, email: null, full_name: null });
    }
    if (report.resolved_by && !users.has(report.resolved_by)) {
      users.set(report.resolved_by, { id: report.resolved_by, email: null, full_name: null });
    }
  });
  metadataComments.forEach((comment) => {
    if (comment.meta.kind !== "message") return;
    const authorId = String(comment.meta.authorId || comment.user_id || "").trim();
    if (!authorId) return;
    users.set(authorId, {
      id: authorId,
      email: comment.meta.authorEmail === null || comment.meta.authorEmail === void 0 ? null : String(comment.meta.authorEmail),
      full_name: comment.meta.authorName === null || comment.meta.authorName === void 0 ? null : String(comment.meta.authorName)
    });
  });
  return users;
}
async function maybeResolveUsers(resolveUsers, ids) {
  if (!resolveUsers || ids.length === 0) return [];
  const resolved = await resolveUsers(ids);
  return resolved.filter((user) => Boolean(user?.id)).map((user) => toCreatorRecord({
    id: String(user.id).trim(),
    email: user.email ?? null,
    fullName: user.fullName ?? null
  }));
}
function pickTaskArray(payload) {
  const data = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return data.map((item) => coerceObject(item));
}
function parseDevNotesProjectComment(comment) {
  const id = typeof comment.id === "string" ? comment.id.trim() : "";
  if (!id) return null;
  const parsed = splitDevNotesMeta(String(comment.content || ""));
  const kind = typeof parsed.meta?.kind === "string" ? parsed.meta.kind : "";
  if (!kind) return null;
  return {
    id,
    created_at: String(comment.created_at || (/* @__PURE__ */ new Date()).toISOString()),
    updated_at: String(comment.updated_at || comment.created_at || (/* @__PURE__ */ new Date()).toISOString()),
    user_id: comment.user_id === null || comment.user_id === void 0 ? null : String(comment.user_id),
    author_name: comment.author_name === null || comment.author_name === void 0 ? null : String(comment.author_name),
    author_email: comment.author_email === null || comment.author_email === void 0 ? null : String(comment.author_email),
    body: parsed.body,
    meta: parsed.meta || {}
  };
}
function buildTaskListsFromMetadata(comments) {
  return comments.filter((item) => item.meta.kind === "task_list").sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => ({
    id: item.id,
    name: String(item.meta.name || DEVNOTES_DEFAULT_TASK_LIST_NAME),
    share_slug: String(item.meta.share_slug || generateDevNotesShareSlug()),
    is_default: normalizeForgeBoolean(item.meta.is_default),
    created_by: item.meta.created_by === null || item.meta.created_by === void 0 ? null : String(item.meta.created_by),
    created_at: String(item.meta.created_at || item.created_at),
    updated_at: String(item.meta.updated_at || item.updated_at)
  }));
}
function buildReportTypesFromMetadata(comments) {
  return comments.filter((item) => item.meta.kind === "report_type").sort((a, b) => String(a.meta.name || "").localeCompare(String(b.meta.name || ""))).map((item) => ({
    id: item.id,
    name: String(item.meta.name || ""),
    is_default: normalizeForgeBoolean(item.meta.is_default),
    created_by: item.meta.created_by === null || item.meta.created_by === void 0 ? null : String(item.meta.created_by),
    created_at: String(item.meta.created_at || item.created_at)
  }));
}
function buildDevNotesReportFromForgeTask(task, overrides, defaultTaskListId) {
  if (!isDevNotesForgeTask(task)) return null;
  const taskId = typeof task.id === "string" ? task.id.trim() : "";
  if (!taskId) return null;
  const normalized = normalizeTaskDescriptionAndMeta(task);
  const parsed = normalized.devnotesMeta ? splitDevNotesMeta(normalized.devnotesMeta) : null;
  const base = parsed?.meta?.kind === "report" ? parsed.meta : parseLegacyDevNotesDescription(normalized.description);
  const combined = {
    ...base,
    ...overrides || {}
  };
  const creatorName = String(combined.creator_name || combined.created_by || "").trim();
  const creatorEmail = String(combined.creator_email || "").trim() || null;
  const createdBy = String(combined.created_by || "").trim() || `forge:${taskId}:creator`;
  const taskCompleted = normalizeForgeBoolean(task.completed);
  const status = String(combined.status || (taskCompleted ? "Resolved" : "Open"));
  const description = overrides && Object.prototype.hasOwnProperty.call(overrides, "description") ? overrides.description === null ? null : String(overrides.description || "") : normalized.description.trim() || (base.description ? String(base.description) : null);
  return {
    id: taskId,
    task_list_id: String(combined.task_list_id || defaultTaskListId || ""),
    page_url: String(combined.page_url || ""),
    x_position: normalizeForgeNumber(combined.x_position),
    y_position: normalizeForgeNumber(combined.y_position),
    target_selector: combined.target_selector === null || combined.target_selector === void 0 ? null : String(combined.target_selector),
    target_relative_x: combined.target_relative_x === null || combined.target_relative_x === void 0 ? null : normalizeForgeNumber(combined.target_relative_x),
    target_relative_y: combined.target_relative_y === null || combined.target_relative_y === void 0 ? null : normalizeForgeNumber(combined.target_relative_y),
    types: normalizeForgeStringArray(combined.types),
    severity: String(combined.severity || "Medium"),
    title: String(overrides?.title || task.name || ""),
    description,
    expected_behavior: combined.expected_behavior === null || combined.expected_behavior === void 0 ? null : String(combined.expected_behavior),
    actual_behavior: combined.actual_behavior === null || combined.actual_behavior === void 0 ? null : String(combined.actual_behavior),
    capture_context: combined.capture_context && typeof combined.capture_context === "object" ? combined.capture_context : null,
    response: combined.response === null || combined.response === void 0 ? null : String(combined.response),
    status,
    created_by: createdBy,
    creator: {
      id: createdBy,
      email: creatorEmail,
      full_name: creatorName || null
    },
    assigned_to: overrides && Object.prototype.hasOwnProperty.call(overrides, "assigned_to") ? overrides.assigned_to === null || overrides.assigned_to === void 0 ? null : String(overrides.assigned_to) : task.assigned_to === null || task.assigned_to === void 0 ? null : String(task.assigned_to),
    resolved_at: combined.resolved_at === null || combined.resolved_at === void 0 ? taskCompleted ? String(task.completed_at || task.updated_at || task.created_at || "") : null : String(combined.resolved_at),
    resolved_by: combined.resolved_by === null || combined.resolved_by === void 0 ? null : String(combined.resolved_by),
    approved: normalizeForgeBoolean(combined.approved),
    ai_ready: normalizeForgeBoolean(combined.ai_ready),
    ai_description: combined.ai_description === null || combined.ai_description === void 0 ? null : String(combined.ai_description),
    created_at: String(task.created_at || (/* @__PURE__ */ new Date()).toISOString()),
    updated_at: String(
      overrides?.updated_at || task.updated_at || task.created_at || (/* @__PURE__ */ new Date()).toISOString()
    )
  };
}
async function fetchFocusForge(context, path, init = {}) {
  const url = `${context.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${context.pat}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await context.fetchImpl(url, {
    ...init,
    headers
  });
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    text,
    payload: parseJsonSafe(text),
    contentType: response.headers.get("content-type")
  };
}
async function fetchForgeOrThrow(context, path, init = {}) {
  const response = await fetchFocusForge(context, path, init);
  if (!response.ok) {
    throw new UpstreamForgeError(path, context.baseUrl, response);
  }
  return response;
}
async function discoverForgeProjects(context) {
  const bootstrap = await fetchFocusForge(context, "/api/mobile/bootstrap", { method: "GET" });
  const bootstrapUser = extractBootstrapUser(bootstrap.payload);
  if (!bootstrap.ok) {
    return {
      ok: false,
      preferredProjectName: context.projectName,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: "/api/mobile/bootstrap",
      bootstrapUserEmail: bootstrapUser.email,
      bootstrapUserName: bootstrapUser.name,
      response: bootstrap
    };
  }
  const bootstrapProjects = extractProjectsFromPayload(bootstrap.payload);
  if (bootstrapProjects.length > 0) {
    return {
      ok: true,
      project: null,
      matched: false,
      preferredProjectName: context.projectName,
      projects: bootstrapProjects,
      bootstrapUserEmail: bootstrapUser.email,
      bootstrapUserName: bootstrapUser.name,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: "/api/mobile/bootstrap"
    };
  }
  const projectsResponse = await fetchFocusForge(context, "/api/mobile/projects", { method: "GET" });
  if (!projectsResponse.ok) {
    return {
      ok: false,
      preferredProjectName: context.projectName,
      resolvedBaseUrl: context.baseUrl,
      discoveryPath: "/api/mobile/projects",
      bootstrapUserEmail: bootstrapUser.email,
      bootstrapUserName: bootstrapUser.name,
      response: projectsResponse
    };
  }
  return {
    ok: true,
    project: null,
    matched: false,
    preferredProjectName: context.projectName,
    projects: extractProjectsFromPayload(projectsResponse.payload),
    bootstrapUserEmail: bootstrapUser.email,
    bootstrapUserName: bootstrapUser.name,
    resolvedBaseUrl: context.baseUrl,
    discoveryPath: "/api/mobile/projects"
  };
}
async function resolveForgeProject(context) {
  const discovery = await discoverForgeProjects(context);
  if (!discovery.ok) return discovery;
  if (!context.projectName) {
    return {
      ...discovery,
      preferredProjectName: null,
      matched: false,
      project: null
    };
  }
  const matchedProject = discovery.projects.find(
    (project) => project.name.trim().toLowerCase() === context.projectName.trim().toLowerCase()
  );
  return {
    ...discovery,
    preferredProjectName: context.projectName,
    matched: Boolean(matchedProject),
    project: matchedProject || null
  };
}
async function fetchForgeTasksForProject(context, projectId) {
  const response = await fetchForgeOrThrow(
    context,
    `/api/mobile/tasks?projectId=${encodeURIComponent(projectId)}`,
    { method: "GET" }
  );
  return pickTaskArray(response.payload);
}
async function fetchForgeProjectComments(context, projectId) {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments?projectId=${encodeURIComponent(projectId)}`,
    { method: "GET" }
  );
  return pickTaskArray(response.payload);
}
async function fetchForgeTaskComments(context, taskId) {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET" }
  );
  return pickTaskArray(response.payload);
}
async function fetchForgeCommentById(context, commentId) {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments/${encodeURIComponent(commentId)}`,
    { method: "GET" }
  );
  const payload = coerceObject(response.payload?.data || response.payload);
  return Object.keys(payload).length > 0 ? payload : null;
}
async function createForgeProjectComment(context, projectId, body, meta) {
  const response = await fetchForgeOrThrow(context, "/api/sync/comments", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      content: appendDevNotesMeta(body, meta)
    })
  });
  return coerceObject(response.payload?.data || response.payload);
}
async function updateForgeProjectComment(context, commentId, body, meta) {
  const response = await fetchForgeOrThrow(
    context,
    `/api/sync/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        content: appendDevNotesMeta(body, meta)
      })
    }
  );
  return coerceObject(response.payload?.data || response.payload);
}
async function deleteForgeProjectComment(context, commentId) {
  await fetchForgeOrThrow(context, `/api/sync/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE"
  });
}
async function ensureDevNotesProjectDefaults(context, projectId, user) {
  let parsed = (await fetchForgeProjectComments(context, projectId)).map(parseDevNotesProjectComment).filter((item) => Boolean(item));
  const typeComments = parsed.filter((item) => item.meta.kind === "report_type");
  const taskListComments = parsed.filter((item) => item.meta.kind === "task_list");
  if (typeComments.length === 0) {
    for (const name of DEVNOTES_DEFAULT_TYPE_NAMES) {
      await createForgeProjectComment(context, projectId, "", {
        kind: "report_type",
        name,
        is_default: true,
        created_by: user.id,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  if (taskListComments.length === 0) {
    await createForgeProjectComment(context, projectId, "", {
      kind: "task_list",
      name: DEVNOTES_DEFAULT_TASK_LIST_NAME,
      share_slug: generateDevNotesShareSlug(),
      is_default: true,
      created_by: user.id,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (typeComments.length === 0 || taskListComments.length === 0) {
    parsed = (await fetchForgeProjectComments(context, projectId)).map(parseDevNotesProjectComment).filter((item) => Boolean(item));
  }
  return parsed;
}
function buildCapabilities() {
  return { ai: false, appLink: true };
}
function buildAppLinkStatus(context, discovery) {
  if (!context.pat) {
    return {
      linked: false,
      projectName: context.projectName,
      tokenLast4: null,
      linkedAt: null,
      projectMatched: false,
      availableProjects: [],
      projectDiscovery: null
    };
  }
  if (!discovery.ok) {
    return {
      linked: true,
      projectName: context.projectName,
      tokenLast4: context.pat.slice(-4),
      linkedAt: null,
      projectMatched: false,
      availableProjects: [],
      projectDiscovery: toProjectDiscovery(discovery)
    };
  }
  return {
    linked: true,
    projectName: context.projectName,
    tokenLast4: context.pat.slice(-4),
    linkedAt: null,
    projectMatched: discovery.matched,
    availableProjects: discovery.matched ? [] : discovery.projects,
    projectDiscovery: toProjectDiscovery(discovery)
  };
}
function sortCreators(creators) {
  return creators.sort((left, right) => {
    const a = left.full_name || left.email || left.id;
    const b = right.full_name || right.email || right.id;
    return a.localeCompare(b);
  });
}
function createDevNotesServerHandler(options) {
  const basePath = normalizeBasePath(options.basePath);
  const baseUrl = normalizeBaseUrl(options.forge.baseUrl);
  if (!baseUrl) {
    throw new Error("DevNotes server helpers require forge.baseUrl.");
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("DevNotes server helpers require a fetch implementation.");
  }
  return async function handleDevNotesRequest(request) {
    if (request.method === "OPTIONS") {
      return await emptyResponse(request, options.corsHeaders);
    }
    const url = new URL(request.url);
    const slug = parseRequestPath(url.pathname, basePath);
    if (!slug) {
      return await jsonResponse(request, options.corsHeaders, { error: "Not found" }, 404);
    }
    const user = normalizeUser(await options.getCurrentUser(request));
    if (!user) {
      return await jsonResponse(request, options.corsHeaders, { error: "Unauthorized" }, 401);
    }
    const method = request.method.toUpperCase();
    const body = await readJsonBody(request) || {};
    const [resource, resourceId, nested] = slug;
    const forgeContext = {
      baseUrl,
      pat: String(options.forge.pat || "").trim(),
      projectName: options.forge.projectName?.trim() || null,
      fetchImpl
    };
    if (resource === "capabilities" && method === "GET") {
      return await jsonResponse(request, options.corsHeaders, buildCapabilities());
    }
    if (!forgeContext.pat && resource === "app-link" && method === "GET") {
      return await jsonResponse(
        request,
        options.corsHeaders,
        buildAppLinkStatus(forgeContext, {
          ok: true,
          project: null,
          matched: false,
          preferredProjectName: forgeContext.projectName,
          projects: [],
          bootstrapUserEmail: null,
          bootstrapUserName: null,
          resolvedBaseUrl: forgeContext.baseUrl,
          discoveryPath: null
        })
      );
    }
    if (!forgeContext.pat) {
      return await jsonResponse(
        request,
        options.corsHeaders,
        {
          error: "FOCUS_FORGE_PAT is not configured."
        },
        503
      );
    }
    try {
      const projectResolution = await resolveForgeProject(forgeContext);
      if (resource === "app-link") {
        if (method === "GET") {
          return await jsonResponse(
            request,
            options.corsHeaders,
            buildAppLinkStatus(forgeContext, projectResolution)
          );
        }
        return await jsonResponse(
          request,
          options.corsHeaders,
          {
            error: "App-level Forge credentials are managed through server environment configuration."
          },
          405
        );
      }
      if (!projectResolution.ok) {
        throw new UpstreamForgeError(
          projectResolution.discoveryPath || "/api/mobile/bootstrap",
          projectResolution.resolvedBaseUrl,
          projectResolution.response
        );
      }
      if (!projectResolution.project?.id) {
        return await jsonResponse(
          request,
          options.corsHeaders,
          {
            error: projectResolution.preferredProjectName ? `Could not find Focus Forge project "${projectResolution.preferredProjectName}"` : "FOCUS_FORGE_PROJECT_NAME is not configured",
            available_projects: projectResolution.projects
          },
          projectResolution.preferredProjectName ? 404 : 409
        );
      }
      const project = projectResolution.project;
      const metadataComments = await ensureDevNotesProjectDefaults(forgeContext, project.id, user);
      const taskLists = buildTaskListsFromMetadata(metadataComments);
      const defaultTaskListId = String(
        taskLists.find((item) => item.is_default)?.id || taskLists[0]?.id || ""
      );
      const reportPatchById = /* @__PURE__ */ new Map();
      const deletedReportIds = /* @__PURE__ */ new Set();
      const readMarkers = /* @__PURE__ */ new Set();
      metadataComments.forEach((comment) => {
        const kind = String(comment.meta.kind || "");
        const reportId = String(comment.meta.reportId || "").trim();
        if (kind === "report_patch" && reportId) {
          const previous = reportPatchById.get(reportId);
          if (!previous || String(previous.updated_at || "") <= comment.updated_at) {
            reportPatchById.set(reportId, {
              ...comment.meta.report && typeof comment.meta.report === "object" ? comment.meta.report : {},
              updated_at: comment.updated_at
            });
          }
        }
        if (kind === "report_deleted" && reportId) {
          deletedReportIds.add(reportId);
        }
        if (kind === "message_read") {
          const targetMessageId = String(comment.meta.messageId || "").trim();
          const targetUserId = String(comment.meta.userId || "").trim();
          if (targetMessageId && targetUserId === user.id) {
            readMarkers.add(targetMessageId);
          }
        }
      });
      if (isTaskResource(resource) && method === "GET" && !resourceId) {
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const reports = tasks.map(
          (task) => buildDevNotesReportFromForgeTask(
            task,
            reportPatchById.get(String(task.id || "").trim()) || null,
            defaultTaskListId
          )
        ).filter((item) => Boolean(item)).filter((item) => !deletedReportIds.has(String(item.id)));
        return await jsonResponse(request, options.corsHeaders, reports);
      }
      if (isTaskResource(resource) && method === "POST" && !resourceId) {
        const payload = {
          ...body,
          created_by: user.id,
          creator: {
            id: user.id,
            email: user.email || null,
            full_name: user.fullName || null
          },
          task_list_id: String(body.task_list_id || defaultTaskListId),
          status: String(body.status || "Open")
        };
        const normalizedTaskInput = normalizeTaskDescriptionAndMeta(payload);
        const devnotesMeta = normalizedTaskInput.devnotesMeta || buildDevNotesReportToken(payload);
        const createPath = "/api/mobile/tasks";
        const assignedTo = payload.assigned_to === null || payload.assigned_to === void 0 ? void 0 : String(payload.assigned_to);
        const response = await fetchForgeOrThrow(forgeContext, createPath, {
          method: "POST",
          body: JSON.stringify({
            name: String(payload.title || ""),
            description: normalizedTaskInput.description,
            devnotesMeta,
            devnotes_meta: devnotesMeta,
            projectId: project.id,
            project_id: project.id,
            completed: mapBugStatusToForge(String(payload.status || "Open")) === "completed",
            assignedTo,
            assigned_to: assignedTo
          })
        });
        const taskId = extractForgeTaskId(response.payload);
        if (!taskId) {
          throw new UpstreamForgeError(createPath, forgeContext.baseUrl, {
            ...response,
            status: response.status || 502,
            text: response.text || JSON.stringify({
              error: "Task endpoint succeeded but did not return a task id"
            }),
            contentType: response.contentType || "application/json"
          });
        }
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const createdTask = tasks.find((task) => String(task.id || "") === taskId) || {
          id: taskId,
          name: payload.title,
          description: normalizedTaskInput.description,
          devnotesMeta,
          devnotes_meta: devnotesMeta,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          completed: false
        };
        const reportTask = {
          ...createdTask,
          description: typeof createdTask.description === "string" && createdTask.description.trim() ? createdTask.description : normalizedTaskInput.description,
          devnotesMeta,
          devnotes_meta: devnotesMeta
        };
        const report = buildDevNotesReportFromForgeTask(reportTask, null, defaultTaskListId);
        if (!report) {
          throw new UpstreamForgeError(createPath, forgeContext.baseUrl, {
            ...response,
            status: 502,
            text: response.text || JSON.stringify({
              error: "Task creation succeeded but DevNotes could not normalize the created task"
            }),
            contentType: response.contentType || "application/json"
          });
        }
        const taskCreatedEmail = options.notifications?.taskCreatedEmail;
        if (taskCreatedEmail) {
          await sendTaskCreatedEmail({
            fetchImpl,
            notification: taskCreatedEmail,
            report,
            payload,
            project,
            currentUser: user,
            projectOwnerEmail: projectResolution.bootstrapUserEmail || null
          });
        }
        return await jsonResponse(request, options.corsHeaders, report);
      }
      if (isTaskResource(resource) && resourceId && !nested && method === "PATCH") {
        const reportId = decodeURIComponent(resourceId);
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const existingTask = tasks.find((task) => String(task.id || "") === reportId);
        if (!existingTask) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: "Task not found" },
            404
          );
        }
        const existing = buildDevNotesReportFromForgeTask(
          existingTask,
          reportPatchById.get(reportId) || null,
          defaultTaskListId
        );
        if (!existing) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: "Task not found" },
            404
          );
        }
        const merged = {
          ...existing,
          ...body,
          id: existing.id,
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          resolved_at: body.status === "Resolved" || body.status === "Closed" ? (/* @__PURE__ */ new Date()).toISOString() : existing.resolved_at,
          resolved_by: body.status === "Resolved" || body.status === "Closed" ? body.resolved_by || user.id : existing.resolved_by
        };
        const normalizedMerged = normalizeTaskDescriptionAndMeta(merged);
        merged.description = normalizedMerged.description || null;
        if (normalizedMerged.devnotesMeta) {
          merged.devnotes_meta = normalizedMerged.devnotesMeta;
          merged.devnotesMeta = normalizedMerged.devnotesMeta;
        }
        const existingPatch = metadataComments.find(
          (comment) => comment.meta.kind === "report_patch" && String(comment.meta.reportId || "") === reportId
        );
        if (existingPatch) {
          await updateForgeProjectComment(forgeContext, existingPatch.id, "", {
            kind: "report_patch",
            reportId,
            report: merged
          });
        } else {
          await createForgeProjectComment(forgeContext, project.id, "", {
            kind: "report_patch",
            reportId,
            report: merged
          });
        }
        return await jsonResponse(request, options.corsHeaders, merged);
      }
      if (isTaskResource(resource) && resourceId && !nested && method === "DELETE") {
        const reportId = decodeURIComponent(resourceId);
        const existingDelete = metadataComments.find(
          (comment) => comment.meta.kind === "report_deleted" && String(comment.meta.reportId || "") === reportId
        );
        if (existingDelete) {
          await updateForgeProjectComment(forgeContext, existingDelete.id, "", {
            kind: "report_deleted",
            reportId,
            deletedBy: user.id,
            deletedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        } else {
          await createForgeProjectComment(forgeContext, project.id, "", {
            kind: "report_deleted",
            reportId,
            deletedBy: user.id,
            deletedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }
      if (isTaskResource(resource) && resourceId && nested === "messages" && method === "GET") {
        const reportId = decodeURIComponent(resourceId);
        const projectMessages = metadataComments.filter(
          (comment) => comment.meta.kind === "message" && String(comment.meta.reportId || "") === reportId
        ).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((comment) => ({
          id: comment.id,
          task_id: reportId,
          author_id: String(comment.meta.authorId || comment.user_id || ""),
          body: comment.body,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          author: {
            id: String(comment.meta.authorId || comment.user_id || ""),
            email: comment.meta.authorEmail === null || comment.meta.authorEmail === void 0 ? null : String(comment.meta.authorEmail),
            full_name: comment.meta.authorName === null || comment.meta.authorName === void 0 ? null : String(comment.meta.authorName)
          }
        }));
        const legacyTaskMessages = (await fetchForgeTaskComments(forgeContext, reportId)).filter((comment) => String(comment.project_id || "") === "").map((comment) => ({
          id: String(comment.id || ""),
          task_id: reportId,
          author_id: String(comment.user_id || ""),
          body: String(comment.content || ""),
          created_at: String(comment.created_at || (/* @__PURE__ */ new Date()).toISOString()),
          updated_at: String(comment.updated_at || comment.created_at || (/* @__PURE__ */ new Date()).toISOString()),
          author: {
            id: String(comment.user_id || ""),
            email: comment.author_email === null || comment.author_email === void 0 ? null : String(comment.author_email),
            full_name: comment.author_name === null || comment.author_name === void 0 ? null : String(comment.author_name)
          }
        }));
        const merged = [...legacyTaskMessages, ...projectMessages].sort(
          (a, b) => a.created_at.localeCompare(b.created_at)
        );
        return await jsonResponse(request, options.corsHeaders, merged);
      }
      if (isTaskResource(resource) && resourceId && nested === "messages" && method === "POST") {
        const reportId = decodeURIComponent(resourceId);
        const created = await createForgeProjectComment(
          forgeContext,
          project.id,
          String(body.body || "").trim(),
          {
            kind: "message",
            reportId,
            authorId: user.id,
            authorEmail: user.email || null,
            authorName: user.fullName || user.email || ""
          }
        );
        const parsed = parseDevNotesProjectComment(created);
        if (!parsed) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: "Failed to create message" },
            500
          );
        }
        const message = {
          id: parsed.id,
          task_id: reportId,
          author_id: String(parsed.meta.authorId || user.id),
          body: parsed.body,
          created_at: parsed.created_at,
          updated_at: parsed.updated_at,
          author: {
            id: String(parsed.meta.authorId || user.id),
            email: parsed.meta.authorEmail === null || parsed.meta.authorEmail === void 0 ? null : String(parsed.meta.authorEmail),
            full_name: parsed.meta.authorName === null || parsed.meta.authorName === void 0 ? null : String(parsed.meta.authorName)
          }
        };
        return await jsonResponse(request, options.corsHeaders, message);
      }
      if (isTaskTypeResource(resource) && method === "GET" && !resourceId) {
        return await jsonResponse(
          request,
          options.corsHeaders,
          buildReportTypesFromMetadata(metadataComments)
        );
      }
      if (isTaskTypeResource(resource) && method === "POST" && !resourceId) {
        const created = await createForgeProjectComment(forgeContext, project.id, "", {
          kind: "report_type",
          name: String(body.name || "").trim(),
          is_default: false,
          created_by: user.id,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        const parsed = parseDevNotesProjectComment(created);
        return await jsonResponse(request, options.corsHeaders, {
          id: parsed?.id || String(created.id || ""),
          name: String(body.name || "").trim(),
          is_default: false,
          created_by: user.id,
          created_at: parsed?.created_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (isTaskTypeResource(resource) && resourceId && method === "DELETE") {
        await deleteForgeProjectComment(forgeContext, decodeURIComponent(resourceId));
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }
      if (resource === "task-lists" && method === "GET" && !resourceId) {
        return await jsonResponse(request, options.corsHeaders, taskLists);
      }
      if (resource === "task-lists" && method === "POST" && !resourceId) {
        const created = await createForgeProjectComment(forgeContext, project.id, "", {
          kind: "task_list",
          name: String(body.name || "").trim(),
          share_slug: generateDevNotesShareSlug(),
          is_default: false,
          created_by: user.id,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        const parsed = parseDevNotesProjectComment(created);
        return await jsonResponse(request, options.corsHeaders, {
          id: parsed?.id || String(created.id || ""),
          name: String(body.name || "").trim(),
          share_slug: String(parsed?.meta.share_slug || generateDevNotesShareSlug()),
          is_default: false,
          created_by: user.id,
          created_at: parsed?.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: parsed?.updated_at || (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (resource === "messages" && resourceId === "read" && method === "POST") {
        const messageIds = Array.isArray(body.messageIds) ? body.messageIds.map((value) => String(value || "").trim()).filter((value) => Boolean(value)) : [];
        for (const messageId of Array.from(new Set(messageIds))) {
          if (readMarkers.has(messageId)) continue;
          await createForgeProjectComment(forgeContext, project.id, "", {
            kind: "message_read",
            messageId,
            userId: user.id,
            readAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }
      if (resource === "messages" && resourceId && method === "PATCH") {
        const current = await fetchForgeCommentById(forgeContext, decodeURIComponent(resourceId));
        if (!current) {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: "Message not found" },
            404
          );
        }
        const parsed = parseDevNotesProjectComment(current);
        if (!parsed || parsed.meta.kind !== "message") {
          return await jsonResponse(
            request,
            options.corsHeaders,
            { error: "Message not found" },
            404
          );
        }
        const updated = await updateForgeProjectComment(
          forgeContext,
          decodeURIComponent(resourceId),
          String(body.body || "").trim(),
          parsed.meta
        );
        const updatedParsed = parseDevNotesProjectComment(updated);
        return await jsonResponse(request, options.corsHeaders, {
          id: updatedParsed?.id || decodeURIComponent(resourceId),
          task_id: String(parsed.meta.reportId || ""),
          author_id: String(parsed.meta.authorId || parsed.user_id || ""),
          body: updatedParsed?.body || String(body.body || "").trim(),
          created_at: updatedParsed?.created_at || parsed.created_at,
          updated_at: updatedParsed?.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
          author: {
            id: String(parsed.meta.authorId || parsed.user_id || ""),
            email: parsed.meta.authorEmail === null || parsed.meta.authorEmail === void 0 ? null : String(parsed.meta.authorEmail),
            full_name: parsed.meta.authorName === null || parsed.meta.authorName === void 0 ? null : String(parsed.meta.authorName)
          }
        });
      }
      if (resource === "messages" && resourceId && method === "DELETE") {
        await deleteForgeProjectComment(forgeContext, decodeURIComponent(resourceId));
        return await jsonResponse(request, options.corsHeaders, { success: true });
      }
      if (resource === "unread-counts" && method === "GET") {
        const counts = {};
        metadataComments.filter((comment) => comment.meta.kind === "message").forEach((comment) => {
          const reportId = String(comment.meta.reportId || "").trim();
          const authorId = String(comment.meta.authorId || "").trim();
          if (!reportId || authorId === user.id || readMarkers.has(comment.id)) return;
          counts[reportId] = (counts[reportId] || 0) + 1;
        });
        return await jsonResponse(request, options.corsHeaders, counts);
      }
      if (resource === "collaborators" && method === "GET") {
        const tasks = await fetchForgeTasksForProject(forgeContext, project.id);
        const reports = tasks.map(
          (task) => buildDevNotesReportFromForgeTask(
            task,
            reportPatchById.get(String(task.id || "").trim()) || null,
            defaultTaskListId
          )
        ).filter((item) => Boolean(item));
        const knownUsers = buildKnownUsers(metadataComments, reports, user);
        const ids = (url.searchParams.get("ids") || "").split(",").map((value) => value.trim()).filter(Boolean);
        const resolvedUsers = await maybeResolveUsers(options.resolveUsers, ids);
        resolvedUsers.forEach((resolved) => knownUsers.set(resolved.id, resolved));
        const collaborators = ids.length > 0 ? ids.map((id) => knownUsers.get(id)).filter((value) => Boolean(value)) : Array.from(knownUsers.values());
        return await jsonResponse(
          request,
          options.corsHeaders,
          sortCreators(collaborators)
        );
      }
      return await jsonResponse(request, options.corsHeaders, { error: "Not found" }, 404);
    } catch (error) {
      if (error instanceof UpstreamForgeError) {
        return await passthroughUpstreamResponse(request, options.corsHeaders, error);
      }
      return await jsonResponse(
        request,
        options.corsHeaders,
        { error: error instanceof Error ? error.message : "Unexpected error" },
        500
      );
    }
  };
}

// src/server/deno.ts
function createDenoDevNotesHandler(options) {
  return createDevNotesServerHandler(options);
}
export {
  createDenoDevNotesHandler
};
