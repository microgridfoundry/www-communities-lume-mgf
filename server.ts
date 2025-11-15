import { serveDir } from "jsr:@std/http/file-server";
import { getCookies } from "jsr:@std/http/cookie";

const PORT = 8000;
const COMMUNITIES = ["waterlilies", "hazelmead"];
const IS_PRODUCTION = Deno.env.get("DENO_DEPLOY") === "true";

// Map production domains to community names
const DOMAIN_MAP: Record<string, string> = {
  "waterlilies.energy": "waterlilies",
  "www.waterlilies.energy": "waterlilies",
  "hazelmead.energy": "hazelmead",
  "www.hazelmead.energy": "hazelmead",
};

// Debug page HTML generator
function generateDebugPage(): string {
  const deployEnv = {
    "DENO_DEPLOY": Deno.env.get("DENO_DEPLOY") || "not set",
    "DENO_DEPLOYMENT_ID": Deno.env.get("DENO_DEPLOYMENT_ID") || "not set",
    "DENO_REGION": Deno.env.get("DENO_REGION") || "not set",
  };

  const deployEnvRows = Object.entries(deployEnv)
    .map(([key, value]) => `<tr><td><code>${key}</code></td><td>${value}</td></tr>`)
    .join("\n");

  const communityRows = COMMUNITIES
    .map((c) => `<tr><td>${c}</td><td>✅ Available</td></tr>`)
    .join("\n");

  const domainRows = Object.entries(DOMAIN_MAP)
    .map(([domain, community]) => `<tr><td>${domain}</td><td>${community}</td></tr>`)
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debug Info - Energy Communities</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #000A30 0%, #17CCB0 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    h1 {
      color: #000A30;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    h2 {
      color: #000A30;
      font-size: 20px;
      margin-bottom: 15px;
      border-bottom: 2px solid #17CCB0;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #000A30;
    }
    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "Monaco", "Courier New", monospace;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    .badge-production {
      background: #17CCB0;
      color: white;
    }
    .badge-development {
      background: #FFD43E;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Debug Information</h1>
    <p class="subtitle">
      Runtime configuration and deployment status
      <span class="badge ${IS_PRODUCTION ? "badge-production" : "badge-development"}">
        ${IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT"}
      </span>
    </p>

    <div class="section">
      <h2>Deno Deploy Environment</h2>
      <table>
        <thead>
          <tr><th>Variable</th><th>Value</th></tr>
        </thead>
        <tbody>
          ${deployEnvRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Available Communities</h2>
      <table>
        <thead>
          <tr><th>Community</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${communityRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Domain Routing Configuration</h2>
      <table>
        <thead>
          <tr><th>Domain</th><th>Maps To</th></tr>
        </thead>
        <tbody>
          ${domainRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Quick Links</h2>
      <ul>
        ${IS_PRODUCTION ? "" : '<li><a href="/selector">Community Selector</a></li>'}
        <li><a href="/">Home</a></li>
      </ul>
    </div>
  </div>
</body>
</html>
  `;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Debug page route (accessible in both dev and production)
  if (url.pathname === "/debug" || url.pathname === "/debug/") {
    return new Response(generateDebugPage(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Selector page route (accessible in both dev and production)
  if (url.pathname === "/select-community" || url.pathname === "/select-community/" ||
      url.pathname === "/selector" || url.pathname === "/selector/") {
    const selectorHTML = await Deno.readTextFile("./selector.html");
    return new Response(selectorHTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  let community: string | undefined;

  // In production, determine community from hostname
  if (IS_PRODUCTION) {

    const hostname = url.hostname;
    community = DOMAIN_MAP[hostname];

    if (!community) {
      const errorMsg = `Unknown domain: ${hostname}\n\nExpected domains:\n${Object.keys(DOMAIN_MAP).map(d => `  - ${d}`).join("\n")}`;
      console.error(errorMsg);
      return new Response(errorMsg, {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    }
  } else {
    // Development mode: use cookie-based selection
    const cookies = getCookies(req.headers);
    community = cookies.community;

    // Check if community is valid
    if (community && !COMMUNITIES.includes(community)) {
      community = undefined;
    }

    // If no community cookie is set, redirect to selection page
    if (!community) {
      return Response.redirect(new URL("/selector", url.origin), 302);
    }
  }

  // Serve files from the selected community's built site
  // Use absolute path for Deno Deploy compatibility
  const siteDir = IS_PRODUCTION
    ? `_site/${community}`  // Deno Deploy: relative to project root
    : `./_site/${community}`; // Local dev: relative to current directory

  try {
    return await serveDir(req, {
      fsRoot: siteDir,
      quiet: true,
      showDirListing: false,
      showIndex: true,
    });
  } catch (error) {
    // If file not found, try serving index.html (for SPA routing)
    if (error instanceof Deno.errors.NotFound || (error as Error).message?.includes("Not Found")) {
      try {
        const indexReq = new Request(new URL("/index.html", url.origin), req);
        return await serveDir(indexReq, {
          fsRoot: siteDir,
          quiet: true,
        });
      } catch {
        return new Response("404 Not Found", { status: 404 });
      }
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Log startup info
if (IS_PRODUCTION) {
  console.log(`🚀 Production server starting on Deno Deploy`);
  console.log(`🌐 Domain-based routing enabled:`);
  for (const [domain, community] of Object.entries(DOMAIN_MAP)) {
    console.log(`   - ${domain} → ${community}`);
  }
  // Deno Deploy: just call Deno.serve with handler
  Deno.serve(handler);
} else {
  console.log(`🚀 Development server starting at http://localhost:${PORT}/`);
  console.log(`📍 Visit http://localhost:${PORT}/select-community to choose a community`);
  console.log(`\n💡 Communities available:`);
  console.log(`   - Water Lilies (waterlilies)`);
  console.log(`   - Hazelmead (hazelmead)`);
  // Local development with specific port
  Deno.serve({ port: PORT }, handler);
}
