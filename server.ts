import { serveDir } from "jsr:@std/http/file-server";
import { getCookies } from "jsr:@std/http/cookie";

const PORT = 8000;
const COMMUNITIES = ["waterlilies", "hazelmead"];

// Community selection page HTML
const SELECTION_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Select Community</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #000A30 0%, #17CCB0 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 50px;
      max-width: 600px;
      width: 100%;
    }
    h1 {
      color: #000A30;
      font-size: 32px;
      margin-bottom: 10px;
      text-align: center;
    }
    p {
      color: #666;
      font-size: 16px;
      margin-bottom: 40px;
      text-align: center;
    }
    .buttons {
      display: flex;
      gap: 20px;
      flex-direction: column;
    }
    button {
      background: #FFD43E;
      color: #000;
      border: none;
      padding: 20px 30px;
      font-size: 20px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
    }
    button:hover {
      background: #17CCB0;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(23, 204, 176, 0.3);
    }
    button:active {
      transform: translateY(0);
    }
    .note {
      margin-top: 30px;
      padding: 15px;
      background: #F7F0F0;
      border-radius: 10px;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
    @media (min-width: 600px) {
      .buttons {
        flex-direction: row;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 Energy Communities</h1>
    <p>Select which community you'd like to visit:</p>
    <div class="buttons">
      <button onclick="selectCommunity('waterlilies')">Water Lilies</button>
      <button onclick="selectCommunity('hazelmead')">Hazelmead</button>
    </div>
    <div class="note">
      💡 This selection page is for local development only. In production, the site is automatically routed based on your domain.
    </div>
  </div>
  <script>
    function selectCommunity(community) {
      // Set cookie with community selection
      document.cookie = \`community=\${community}; path=/; max-age=86400\`;
      // Redirect to home
      window.location.href = '/';
    }
  </script>
</body>
</html>
`;

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const cookies = getCookies(req.headers);
  let community: string | undefined = cookies.community;

  // Check if community is valid
  if (community && !COMMUNITIES.includes(community)) {
    community = undefined;
  }

  // If accessing select-community or selector page, serve it
  if (url.pathname === "/select-community" || url.pathname === "/select-community/" ||
      url.pathname === "/selector" || url.pathname === "/selector/") {
    return new Response(SELECTION_PAGE_HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // If no community cookie is set, redirect to selection page
  if (!community) {
    return Response.redirect(new URL("/select-community", url.origin), 302);
  }

  // Serve files from the selected community's built site
  const siteDir = `./_site/${community}`;

  // Rewrite the request URL to point to the community subdirectory
  const newUrl = new URL(req.url);
  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;

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

console.log(`🚀 Development server running at http://localhost:${PORT}/`);
console.log(`📍 Visit http://localhost:${PORT}/select-community to choose a community`);
console.log(`\n💡 Communities available:`);
console.log(`   - Water Lilies (waterlilies)`);
console.log(`   - Hazelmead (hazelmead)`);

Deno.serve({ port: PORT }, handler);
