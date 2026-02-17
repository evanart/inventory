const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const PARSE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["store", "remove"] },
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
  },
  required: ["action", "items"],
};

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const headers = { ...corsHeaders(allowed), "Content-Type": "application/json" };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(allowed) });
    }

    const origin = request.headers.get("Origin") || "";
    if (allowed !== "*" && !origin.includes(new URL(allowed).hostname)) {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);

    // --- KV data endpoints ---
    if (url.pathname === "/data") {
      if (request.method === "GET") {
        try {
          const data = await env.INVENTORY_KV.get("inventory", "json");
          if (data === null) {
            return new Response(JSON.stringify(null), { status: 200, headers });
          }
          return new Response(JSON.stringify(data), { headers });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
        }
      }
      if (request.method === "PUT") {
        try {
          const body = await request.json();
          await env.INVENTORY_KV.put("inventory", JSON.stringify(body));
          return new Response(JSON.stringify({ ok: true }), { headers });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
        }
      }
      return new Response("Method not allowed", { status: 405, headers });
    }

    // --- Existing AI proxy (POST /) ---
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    try {
      const { system, message, mode } = await request.json();
      if (!system || !message) {
        return new Response(
          JSON.stringify({ error: "Missing 'system' or 'message' field" }),
          { status: 400, headers }
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
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers }
      );
    }
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
