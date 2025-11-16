# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lume v3 multi-site static generator serving Water Lilies and Hazelmead Community Energy websites from a single codebase. Production deploys to Deno Deploy with domain-based routing.

## Development Commands

```bash
# Build both community sites (~0.04s)
deno task build

# Start development server on port 8000
deno task dev

# TypeScript type checking
deno task check

# HTML validation
deno task validate:html
```

**IMPORTANT: Development workflow requires building:**

This is a **static site generator**. The dev server (`deno task dev`) serves pre-built files from `_site/` - it does NOT auto-build on startup or watch for changes.

**First-time setup / After pulling changes:**
```bash
# REQUIRED: Build static files before starting dev server
deno task build     # Runs sync:shared + lume build
deno task dev       # Start server on port 8000
```

**What `deno task build` does:**
1. **sync:model**: Runs 4-step TypeScript script to merge model + overrides into sites/
   - **Step 1**: Copy model files (_model/ → sites/)
     - 404.vto, support.vto, support/faq.vto, support/energyadvice.vto
     - assets/css/style.scss
   - **Step 2**: Copy model assets (_model/assets/images/ → sites/)
   - **Step 3**: Merge _data.yaml (model + override → sites/)
     - Reads `_model/_data.yaml` (shared data)
     - Reads `_overrides/{community}/_data.yaml` (community-specific data)
     - Merges with override precedence
   - **Step 4**: Copy override files (_overrides/ → sites/, overlaying model)
     - index.vto (homepage)
     - assets/ (images, PDFs)
   - Provides progress reporting and error handling
2. **lume**: Runs Lume static site generator
   - Processes all `.md`, `.vto`, and `.scss` files from generated sites/
   - Injects community data from merged `_data.yaml`
   - Rewrites URLs from `/sites/{community}/` to `/{community}/`
   - Compiles SCSS to CSS
   - Outputs to `_site/{community}/`

**Without building first:**
- Server shows warnings: `⚠️ 404/index.html NOT FOUND`
- Pages return 404 errors
- Changes won't be visible
- New files (like 404 pages) won't exist
- Model files won't be synced

**Development workflow:**
1. Visit http://localhost:8000/selector to choose a community
2. Cookie persists for 24 hours
3. All requests serve that community's files from `_site/{community}/`
4. **Make changes → `deno task build` → refresh browser**

**Useful development routes:**
- `/selector` - Community selection page with cache-busting headers
- `/debug` - Server config, environment, and version information

## Architecture

### Multi-Site Build System

The build produces separate sites under community-prefixed paths:

```
_site/
├── waterlilies/
│   ├── index.html
│   ├── 404/index.html
│   ├── support/
│   └── assets/
└── hazelmead/
    ├── index.html
    ├── 404/index.html
    ├── support/
    └── assets/
```

**Key architectural decisions:**

1. **Three-directory architecture**:
   - **_model/** (git-tracked): Shared templates identical or nearly-identical across communities
   - **_overrides/** (git-tracked): Community-specific content (homepage, assets, data)
   - **sites/** (gitignored): Generated directory = _model/ + _overrides/, then processed by Lume

   **⚠️ CRITICAL**: Never edit files in `sites/` - they are regenerated on every build. Edit `_model/` (shared) or `_overrides/{community}/` (community-specific) instead.

2. **Data merging**: `_data.yaml` files are merged during sync:
   - `_model/_data.yaml` provides shared data (phone number, common fields)
   - `_overrides/{community}/_data.yaml` provides community-specific data (name, email, URLs)
   - Override values take precedence over model values
   - Merged result written to `sites/{community}/_data.yaml`

3. **Asset overlaying**: Assets are layered in order:
   - First: `_model/assets/` (shared images, CSS)
   - Then: `_overrides/{community}/assets/` (community-specific images, PDFs)
   - Result: `sites/{community}/assets/` contains both, with overrides winning on conflicts

4. **Data injection (_config.ts)**: YAML data from merged `sites/{community}/_data.yaml` is injected into pages during build based on source path matching. The `esco` object is automatically available in all templates.

5. **URL rewriting (_config.ts)**: Source paths like `/sites/waterlilies/` are rewritten to `/waterlilies/` in the output. This happens for both HTML/MD and CSS files.

### Server Routing (server.ts)

**Production routing logic:**
1. Check if `hostname` matches `DOMAIN_MAP` → serve that community
2. If not in map, check for `community` cookie
3. If no valid community, redirect to `/selector`
4. Once determined, serve static files from `_site/{community}/`

**Environment detection:**
- `DENO_DEPLOY=true` enables production mode
- Development uses cookie-based routing for both communities
- Selector has cache-busting headers to prevent browser caching issues

### Template System (Vento)

**Component architecture:**
- `_includes/layouts/` - Page layouts (default.vto, support.vto)
- `_includes/components/` - Reusable UI components (header.vto, footer.vto, support-nav.vto)

**Template composition pattern:**
```vto
---
layout: layouts/default.vto
---
<section>{{ content }}</section>
```

**Vento syntax gotchas:**
- Template tags must be directly adjacent to HTML attributes: `<a{{ if }}` not `<a {{ if }}`
- Use `{{ variable |> safe }}` for unescaped HTML
- Conditionals: `{{ if esco.name == 'Hazelmead' }}...{{ /if }}`

### Data Access in Templates

Every page automatically has access to:
- `esco` - Community data (name, email, phone, app_url, description)
- `title` - Page title from frontmatter
- `seo` - SEO metadata (Open Graph, Twitter Cards)
- `google_analytics_id` - GA4 measurement ID

**Dynamic header example (_includes/components/header.vto:8):**
```vto
{{ if esco }}{{ esco.name }} Community Energy{{ else }}Net zero energy communities{{ /if }}
```

### Model Pattern for DRY Content

The `_model/` directory contains files that are identical or nearly identical across communities. These files are synced to `sites/{community}/` before each build.

**Two patterns supported:**

**Pattern A: Identical Content (Full DRY)**
- Files in `_model/` that use only template variables
- Example: `404.vto`, `support/faq.md`
- No conditionals needed - just `{{ esco.name }}`, `{{ esco.email }}`, etc.

**Pattern B: Conditional Content (DRY with Variations)**
- Files in `_model/` with conditional blocks for community-specific differences
- Example: `support/energyadvice.md` (different councils per region)
- Uses `{{ if esco.name == "Water Lilies" }}...{{ else }}...{{ /if }}`

**Current model files:**
```
_model/
├── 404.vto                      # Error page (Pattern A)
├── support.vto                  # Vulnerability policy (Pattern B - PDF conditional)
├── support/
│   ├── faq.vto                 # FAQ (Pattern A)
│   └── energyadvice.vto        # Energy advice (Pattern B - regional conditionals)
└── assets/
    └── css/
        └── style.scss          # Consolidated styles (Pattern A)
```

**Note:** Model files with Vento conditionals must use `.vto` extension, not `.md`, so the template syntax is processed before markdown rendering.

**Warning headers:**
All model files include warning comments:
```vto
<!--
⚠️ MODEL FILE - This is synced to sites/{community}/
Do not edit the synced copies directly - changes will be overwritten.
Edit _model/{path} instead, then run: deno task sync:model
-->
```

**Adding new model files:**
1. Create file in `_model/` with template variables and conditionals
2. Add file path to `MODEL_FILES` array in `scripts/sync-model.ts`
3. Run `deno task build` to test (sites/ is fully gitignored)
4. Commit model source and updated sync script

**Forking a model file:**
If a community needs a unique version:
1. Remove file from `MODEL_FILES` in `scripts/sync-model.ts`
2. Copy model to both `_overrides/{community}/` locations
3. Edit each community version independently in _overrides/
4. Commit both versions in _overrides/
5. Run `deno task build` - override files overlay model during Step 4

## Content Management

### Adding New Pages

**Shared page (identical or nearly-identical across communities):**
1. Create in `_model/newpage.vto` with template variables/conditionals
2. Add to `MODEL_FILES` array in `scripts/sync-model.ts`
3. Run `deno task build` to test
4. Build automatically creates `/newpage/` route for both communities

**Community-specific page:**
1. Create in `_overrides/{community}/newpage.md` or `.vto`
2. Add frontmatter with layout and currentPage (if support section)
3. Run `deno task build` to test
4. Build automatically creates `/newpage/` route for that community only

**Support pages use special layout:**
```yaml
---
title: "Page Title"
layout: layouts/support.vto
currentPage: pagename  # For nav active states
---
```

The support layout (`_includes/layouts/support.vto`) automatically:
- Wraps content in proper semantic structure
- Includes support navigation with active state highlighting
- Applies `.support-section` CSS class for styling

### Support Navigation

The support nav component (`_includes/components/support-nav.vto`) expects `currentPage` variable to highlight active tab. Values: `support`, `faq`, `energyadvice`.

## Styling Architecture

**Single consolidated SCSS file:**

- **Model**: `_model/assets/css/style.scss` (488 lines)
  - Consolidated styles for all components
  - Global resets, typography, layout
  - Shared components (header, footer, buttons)
  - Support section styles
  - Synced to both communities during build

**Important CSS patterns:**
- `.support-section` scopes all support page styles
- `.support-nav` provides tabbed navigation with active states
- Responsive breakpoints at 1560px, 1199px, 991px, 680px, 425px

**Adding community-specific styles:**
If a community needs custom CSS:
1. Create `_overrides/{community}/assets/css/custom.scss`
2. Add to page frontmatter: `extra_css: ["/assets/css/custom.css"]`
3. Run `deno task build` - override assets overlay model

## Deployment (Deno Deploy)

**Initial setup:**
1. Link GitHub repo to Deno Deploy project
2. Configure: No Preset, Build: `deno task build`, Entrypoint: `server.ts`
3. Add custom domains: `www.waterlilies.energy`, `www.hazelmead.energy`
4. Update DNS: CNAME `www` → `cname.deno.dev`

**Auto-deployment:**
- Push to `main` triggers automatic deploy
- Build runs on Deno Deploy infrastructure
- Static files served from `_site/` via `server.ts`

**Domain mapping (server.ts:8-13):**
```typescript
const DOMAIN_MAP: Record<string, string> = {
  "waterlilies.energy": "waterlilies",
  "www.waterlilies.energy": "waterlilies",
  "hazelmead.energy": "hazelmead",
  "www.hazelmead.energy": "hazelmead",
};
```

## Common Patterns

### Adding a New Community

1. Create `_overrides/newcommunity/_data.yaml` with all required fields:
   - name, email, app_url, sign_in_label, description, domain, seo (og:*, twitter:*)
2. Create `_overrides/newcommunity/index.vto` (homepage)
3. Copy assets to `_overrides/newcommunity/assets/` (images, PDFs)
4. Add to `COMMUNITIES` array in:
   - `server.ts` (line ~6)
   - `scripts/sync-model.ts` (line ~5)
5. Add domain mappings to `DOMAIN_MAP` in `server.ts`
6. Run `deno task build` - sync will generate sites/newcommunity/
7. Verify at `/selector`

### Modifying Shared Components

Changes to `_includes/components/` or `_includes/layouts/` affect both communities. Always test both sites after changes:

```bash
deno task build
# Test at /selector switching between communities
```

### Working with Support Pages

Support pages follow a specific pattern for consistency:

1. Use `layout: layouts/support.vto` (handles nav automatically)
2. Set `currentPage` for nav highlighting
3. Content is clean HTML/Markdown without wrapper divs
4. Use semantic HTML: `<h2>` for page title, `<h3>` for sections

## Known Constraints

- Vento template tags cannot be nested inside HTML tags (causes "Unclosed tag" errors)
- URL paths are rewritten during build; source paths don't match output paths
- Shared assets are copied to both communities (duplicated in output)
- Support nav expects exactly 3 tabs: Vulnerability Policy, FAQ, Energy Advice
- Selector page cache-busting headers prevent browser caching but require one hard refresh after deployment
