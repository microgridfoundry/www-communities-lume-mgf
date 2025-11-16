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

**Development workflow:**
1. Visit http://localhost:8000/selector to choose a community
2. Cookie persists for 24 hours
3. All requests serve that community's files from `_site/{community}/`

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
│   ├── support/
│   └── assets/
└── hazelmead/
    ├── index.html
    ├── support/
    └── assets/
```

**Key architectural decisions:**

1. **Data injection (_config.ts:44-58)**: YAML data from `sites/{community}/_data.yaml` is injected into pages during build based on source path matching. The `esco` object is automatically available in all templates.

2. **URL rewriting (_config.ts:52-56)**: Source paths like `/sites/waterlilies/` are rewritten to `/waterlilies/` in the output. This happens for both HTML/MD and CSS files.

3. **Asset cascading**: Shared assets from `_shared/` are copied to both communities, then site-specific assets overlay. CSS is compiled from SCSS at three levels:
   - `_shared/assets/css/style.scss` (base styles)
   - `sites/waterlilies/assets/css/style.scss` (inherits base)
   - `sites/hazelmead/assets/css/style.scss` (inherits base)

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

## Content Management

### Adding New Pages

1. Create in `sites/{community}/newpage.md` or `.vto`
2. Add frontmatter with layout and currentPage (if support section)
3. Build automatically creates `/newpage/` route

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

**Three-tier SCSS inheritance:**

1. **Base styles** (`_shared/assets/css/style.scss`):
   - Global resets, typography, layout
   - Shared components (header, footer, buttons)
   - Support section base styles

2. **Community overrides** (`sites/{community}/assets/css/style.scss`):
   - Import base with `@import "path/to/_shared/assets/css/style.scss"`
   - Override variables or add community-specific styles
   - Currently identical for both communities

**Important CSS patterns:**
- `.support-section` scopes all support page styles
- `.support-nav` provides tabbed navigation with active states
- Responsive breakpoints at 1560px, 1199px, 991px, 680px, 425px

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

1. Create `sites/newcommunity/_data.yaml` with all required fields
2. Add to `COMMUNITIES` array in `server.ts`
3. Add domain mappings to `DOMAIN_MAP`
4. Create `sites/newcommunity/assets/css/style.scss` importing base
5. Copy assets to `sites/newcommunity/assets/`
6. Build and verify at `/selector`

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
