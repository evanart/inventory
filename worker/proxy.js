export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env.ALLOWED_ORIGIN) });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    if (allowed !== "*" && !origin.includes(new URL(allowed).hostname)) {
      return new Response("Forbidden", { status: 403 });
    }
    try {
      const { system, message } = await request.json();
      if (!system || !message) {
        return new Response(
          JSON.stringify({ error: "Missing 'system' or 'message' field" }),
          { status: 400, headers: { ...corsHeaders(allowed), "Content-Type": "application/json" } }
        );
      }
      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system,
          messages: [{ role: "user", content: message }],
        }),
      });
      if (!anthropicRes.ok) {
        const errBody = await anthropicRes.text();
        return new Response(
          JSON.stringify({ error: "Anthropic API error: " + anthropicRes.status, details: errBody }),
          { status: anthropicRes.status, headers: { ...corsHeaders(allowed), "Content-Type": "application/json" } }
        );
      }
      const data = await anthropicRes.json();
      const text = data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      return new Response(
        JSON.stringify({ text }),
        { headers: { ...corsHeaders(allowed), "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders(allowed), "Content-Type": "application/json" } }
      );
    }
  },
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
