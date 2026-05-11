var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-4MRhqe/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var ALLOWED_MODELS = /* @__PURE__ */ new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile"
]);
var GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
var MAX_BODY_BYTES = 64 * 1024;
var MAX_TOKENS_CAP = 2e3;
var KV_TTL_SECONDS = 26 * 60 * 60;
var DEVICE_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id",
  "Access-Control-Max-Age": "86400"
};
function json(status, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}
__name(json, "json");
function errorResp(status, code, message, extra = {}) {
  return json(status, { error: { code, message, ...extra } });
}
__name(errorResp, "errorResp");
function todayUtc() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayUtc, "todayUtc");
function nextResetIso() {
  const d = /* @__PURE__ */ new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}
__name(nextResetIso, "nextResetIso");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v1/chat/completions") {
      return errorResp(404, "not_found", "Endpoint inconnu");
    }
    const deviceId = request.headers.get("X-Device-Id") || "";
    if (!DEVICE_ID_RE.test(deviceId)) {
      return errorResp(400, "invalid_device_id", "Header X-Device-Id manquant ou invalide (8-64 chars alphanum/-)");
    }
    const lenHeader = request.headers.get("Content-Length");
    if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
      return errorResp(413, "body_too_large", `Body > ${MAX_BODY_BYTES} octets`);
    }
    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return errorResp(413, "body_too_large", `Body > ${MAX_BODY_BYTES} octets`);
    }
    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return errorResp(400, "invalid_json", "Body JSON invalide");
    }
    if (!body || typeof body.model !== "string" || !ALLOWED_MODELS.has(body.model)) {
      return errorResp(400, "invalid_model", `Mod\xE8le non autoris\xE9. Whitelist : ${[...ALLOWED_MODELS].join(", ")}`);
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return errorResp(400, "invalid_messages", 'Champ "messages" doit \xEAtre un tableau non vide');
    }
    if (typeof body.max_tokens === "number" && body.max_tokens > MAX_TOKENS_CAP) {
      body.max_tokens = MAX_TOKENS_CAP;
    } else if (typeof body.max_tokens !== "number") {
      body.max_tokens = MAX_TOKENS_CAP;
    }
    const quota = Number(env.DAILY_QUOTA || "100");
    const day = todayUtc();
    const kvKey = `q:${deviceId}:${day}`;
    const currentRaw = await env.QUOTA.get(kvKey);
    const used = currentRaw ? Number(currentRaw) || 0 : 0;
    if (used >= quota) {
      return errorResp(429, "quota_exceeded", "Quota gratuit quotidien atteint", {
        quota,
        used,
        reset: nextResetIso()
      });
    }
    const newUsed = used + 1;
    await env.QUOTA.put(kvKey, String(newUsed), { expirationTtl: KV_TTL_SECONDS });
    const remaining = Math.max(0, quota - newUsed);
    let groqResp;
    try {
      groqResp = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      return errorResp(502, "upstream_unreachable", `Groq indisponible : ${err?.message || err}`);
    }
    const respHeaders = new Headers(groqResp.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS))
      respHeaders.set(k, v);
    respHeaders.set("X-Quota-Limit", String(quota));
    respHeaders.set("X-Quota-Remaining", String(remaining));
    respHeaders.delete("Content-Encoding");
    respHeaders.delete("Content-Length");
    return new Response(groqResp.body, {
      status: groqResp.status,
      headers: respHeaders
    });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-4MRhqe/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-4MRhqe/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
