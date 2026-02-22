const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB limit for /data
const MAX_AI_INPUT_LENGTH = 10000; // max chars for system + message fields
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_AI = 30; // max AI requests per window
const RATE_LIMIT_MAX_DATA = 60; // max data requests per window

const rateLimitMap = new Map();

function checkRateLimit(key, max) {
  const now = Date.now();
  let bucket = rateLimitMap.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW) {
    bucket = { start: now, count: 0 };
    rateLimitMap.set(key, bucket);
  }
  bucket.count++;
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(k);
    }
  }
  return bucket.count <= max;
}

const PARSE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["store", "remove", "search"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          path: { type: "array", items: { type: "string" } },
          category: {
            type: "string",
            enum: [
              "tools", "cleaning", "electronics", "holiday", "clothing",
              "kitchen", "bathroom", "office", "sports", "crafts",
              "baby", "storage", "misc",
            ],
          },
        },
        required: ["name", "quantity", "path", "category"],
      },
    },
    createLocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["floor", "room"] },
          parentPath: { type: "array", items: { type: "string" } },
        },
        required: ["name", "type", "parentPath"],
      },
    },
    searchResult: { type: "string" },
  },
  required: ["action"],
};

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const headers = { ...corsHeaders(allowed), "Content-Type": "application/json" };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(allowed) });
    }

    const origin = request.headers.get("Origin") || "";
    if (allowed !== "*") {
      const allowedOrigin = new URL(allowed).origin;
      if (origin !== allowedOrigin) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    if (!validateAuth(request, env)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const url = new URL(request.url);
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    // --- KV data endpoints ---
    if (url.pathname === "/data") {
      if (!checkRateLimit("data:" + clientIP, RATE_LIMIT_MAX_DATA)) {
        return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
      }
      if (request.method === "GET") {
        try {
          const data = await env.INVENTORY_KV.get("inventory", "json");
          if (data === null) {
            return new Response(JSON.stringify(null), { status: 200, headers });
          }
          return new Response(JSON.stringify(data), { headers });
        } catch (err) {
          console.error("KV read error:", err);
          return new Response(JSON.stringify({ error: "Failed to read data" }), { status: 500, headers });
        }
      }
      if (request.method === "PUT" || (request.method === "POST" && url.searchParams.has("key"))) {
        const contentType = request.headers.get("Content-Type") || "";
        const isBeacon = request.method === "POST" && url.searchParams.has("key");
        if (!isBeacon && !contentType.includes("application/json")) {
          return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415, headers });
        }
        const rawBody = await request.text();
        if (rawBody.length > MAX_BODY_SIZE) {
          return new Response(JSON.stringify({ error: "Request body too large" }), { status: 413, headers });
        }
        try {
          const body = JSON.parse(rawBody);
          await env.INVENTORY_KV.put("inventory", JSON.stringify(body));
          return new Response(JSON.stringify({ ok: true }), { headers });
        } catch (err) {
          console.error("KV write error:", err);
          return new Response(JSON.stringify({ error: "Failed to save data" }), { status: 500, headers });
        }
      }
      return new Response("Method not allowed", { status: 405, headers });
    }

    // --- Existing AI proxy (POST /) ---
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (!checkRateLimit("ai:" + clientIP, RATE_LIMIT_MAX_AI)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    }
    const aiContentType = request.headers.get("Content-Type") || "";
    if (!aiContentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), { status: 415, headers });
    }
    try {
      const { system, message, mode } = await request.json();
      if (!system || !message) {
        return new Response(
          JSON.stringify({ error: "Missing 'system' or 'message' field" }),
          { status: 400, headers }
        );
      }
      if (typeof system !== "string" || typeof message !== "string") {
        return new Response(
          JSON.stringify({ error: "Fields 'system' and 'message' must be strings" }),
          { status: 400, headers }
        );
      }
      if (system.length + message.length > MAX_AI_INPUT_LENGTH) {
        return new Response(
          JSON.stringify({ error: "Input too long" }),
          { status: 413, headers }
        );
      }
      const messages = [
        { role: "system", content: system },
        { role: "user", content: message },
      ];
      let result;
      if (mode === "parse") {
        try {
          result = await env.AI.run(MODEL, {
            messages,
            response_format: { type: "json_schema", json_schema: PARSE_SCHEMA },
          });
        } catch {
          // JSON mode failed — retry without it and let the frontend parse the response
          result = await env.AI.run(MODEL, { messages });
        }
      } else {
        result = await env.AI.run(MODEL, { messages });
      }
      const text = result.response || (typeof result === "string" ? result : JSON.stringify(result));
      return new Response(JSON.stringify({ text }), { headers });
    } catch (err) {
      console.error("AI proxy error:", err);
      return new Response(
        JSON.stringify({ error: "AI request failed" }),
        { status: 500, headers }
      );
    }
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function validateAuth(request, env) {
  const expectedKey = env.API_KEY;
  if (!expectedKey) return false;
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7) === expectedKey;
  }
  // Fallback: accept key as query param (needed for navigator.sendBeacon which can't set headers)
  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  if (queryKey) {
    return queryKey === expectedKey;
  }
  return false;
}
