import lume from "https://deno.land/x/lume@v3.0.11/mod.ts";
import { parse as parseYaml } from "jsr:@std/yaml@^1.0.5";
import sass from "https://deno.land/x/lume@v3.0.11/plugins/sass.ts";

const site = lume({
  src: ".",
  dest: "./_site",
  includes: "./_includes",
});

// Enable SCSS compilation
site.use(sass());

// In Lume v3, explicitly add SCSS and VTO files for processing
site.add([".scss", ".vto"]);

// Ignore files we don't want to process
site.ignore("README.md");
site.ignore("server.ts");
site.ignore("deno.json");
site.ignore("_config.ts");
site.ignore("lume-multi-site-implementation-plan.md");
site.ignore("tests");
site.ignore("node_modules");

// Define communities
const COMMUNITIES = ["waterlilies", "hazelmead"];

// Load site data for each community
const communityData: Record<string, Record<string, unknown>> = {};
for (const community of COMMUNITIES) {
  const dataFile = await Deno.readTextFile(`./sites/${community}/_data.yaml`);
  communityData[community] = parseYaml(dataFile) as Record<string, unknown>;
}

// Copy shared assets to each community
for (const community of COMMUNITIES) {
  site.copy("_model/assets/images", `${community}/assets/images`);
}

// Copy site-specific assets for each community
for (const community of COMMUNITIES) {
  site.copy(`sites/${community}/assets/images`, `${community}/assets/images`);
  site.copy(`sites/${community}/assets/pdf`, `${community}/assets/pdf`);
}

// Note: Model files are synced to sites/{community}/ before build via sync:model task
// This DRY approach maintains single source files in _model/ for content that's identical
// or nearly identical between communities (with conditionals for small differences).
// Files synced: 404.vto, support.md, support/faq.md, support/energyadvice.md, assets/css/style.scss
// (_model/ directory is automatically ignored by Lume)

// Process markdown, HTML, and Vento template files for community-specific data injection
site.process([".html", ".md", ".vto"], (pages) => {
  for (const page of pages) {
    page.data.env = Deno.env.get("ENV") || "development";

    // Check if page is from a specific community site and inject data
    for (const community of COMMUNITIES) {
      if (page.src.path.startsWith(`/sites/${community}/`)) {
        Object.assign(page.data, communityData[community]);
        page.data.url = page.data.url.replace(`/sites/${community}`, `/${community}`);
        break;
      }
    }
  }
});

// Process CSS files to fix URL paths
site.process([".css"], (pages) => {
  for (const page of pages) {
    for (const community of COMMUNITIES) {
      if (page.data.url.startsWith(`/sites/${community}/`)) {
        page.data.url = page.data.url.replace(`/sites/${community}`, `/${community}`);
        break;
      }
    }
  }
});

export default site;
