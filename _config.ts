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

// Copy shared images to each site output (CSS will be processed by SCSS plugin)
site.copy("_shared/assets/images", "waterlilies/assets/images");
site.copy("_shared/assets/images", "hazelmead/assets/images");

// Copy site-specific assets (excluding css which will be processed)
site.copy("sites/waterlilies/assets/images", "waterlilies/assets/images");
site.copy("sites/waterlilies/assets/pdf", "waterlilies/assets/pdf");
site.copy("sites/hazelmead/assets/images", "hazelmead/assets/images");
site.copy("sites/hazelmead/assets/pdf", "hazelmead/assets/pdf");

// Load site data manually
const waterliliesDataFile = await Deno.readTextFile("./sites/waterlilies/_data.yaml");
const waterliliesData = parseYaml(waterliliesDataFile) as Record<string, unknown>;

const hazelmeadDataFile = await Deno.readTextFile("./sites/hazelmead/_data.yaml");
const hazelmeadData = parseYaml(hazelmeadDataFile) as Record<string, unknown>;

// Process markdown, HTML, and Vento template files
site.process([".html", ".md", ".vto"], (pages) => {
  // Add environment variable support and inject site data
  for (const page of pages) {
    page.data.env = Deno.env.get("ENV") || "development";

    // Inject site-specific data based on source path
    if (page.src.path.startsWith("/sites/waterlilies/")) {
      Object.assign(page.data, waterliliesData);
      page.data.url = page.data.url.replace("/sites/waterlilies", "/waterlilies");
    } else if (page.src.path.startsWith("/sites/hazelmead/")) {
      Object.assign(page.data, hazelmeadData);
      page.data.url = page.data.url.replace("/sites/hazelmead", "/hazelmead");
    }
  }
});

// Process CSS files to fix URL paths
site.process([".css"], (pages) => {
  for (const page of pages) {
    if (page.data.url.startsWith("/sites/waterlilies/")) {
      page.data.url = page.data.url.replace("/sites/waterlilies", "/waterlilies");
    } else if (page.data.url.startsWith("/sites/hazelmead/")) {
      page.data.url = page.data.url.replace("/sites/hazelmead", "/hazelmead");
    }
  }
});

export default site;
