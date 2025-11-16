# Lume Multi-Site for Energy Communities

Multi-site static generator using Lume v3 serving Water Lilies and Hazelmead Community Energy websites from a single codebase. Production deployment on Deno Deploy with domain-based routing.

## Quick Start

```bash
# Build both sites (~0.04s)
deno task build

# Start development server (port 8000)
deno task dev

# Visit http://localhost:8000/selector to choose a community
```

## Features

- **Single Codebase**: Shared templates, styles, and components
- **Site-Specific Data**: Each community has its own YAML configuration and assets
- **Cookie-Based Development**: Switch between communities via selector page
- **Domain-Based Production**: Production routes by domain (waterlilies.energy, hazelmead.energy)
- **Fast Builds**: ~0.04 seconds to build 35+ files

## Project Structure

```
www-communities-lume/
├── _config.ts                # Lume configuration
├── _includes/                # Shared Vento templates
│   ├── layouts/
│   │   ├── default.vto       # Main layout
│   │   └── support.vto       # Support pages layout
│   └── components/
│       ├── header.vto        # Site header
│       ├── footer.vto        # Site footer
│       └── support-nav.vto   # Support section nav
├── _shared/                  # Shared assets
│   └── assets/
│       ├── css/style.scss    # Base SCSS styles
│       └── images/           # Shared images
├── sites/                    # Community-specific content
│   ├── waterlilies/
│   │   ├── _data.yaml        # Site config & data
│   │   ├── index.md          # Homepage
│   │   ├── support/          # Support pages
│   │   │   ├── faq.md
│   │   │   └── energyadvice.md
│   │   └── assets/           # Site-specific assets
│   │       ├── css/style.scss
│   │       ├── images/
│   │       └── pdf/
│   └── hazelmead/
│       └── (same structure)
├── server.ts                 # Deno server with routing
├── selector.html             # Community selector page
└── _site/                    # Generated output (gitignored)
    ├── waterlilies/
    └── hazelmead/
```

## Available Commands

```bash
deno task build                  # Build both sites
deno task dev                    # Start development server (port 8000)
deno task check                  # TypeScript type checking
deno task validate:html          # HTML validation
deno task build:validate         # Build + type check + HTML validation
```

## Development Workflow

1. **Select Community**: Visit http://localhost:8000/selector
2. **Cookie Persists**: Community selection saved for 24 hours
3. **Make Changes**: Edit content in `sites/{community}/`
4. **Hot Reload**: Changes automatically rebuild and refresh

**Useful development routes:**
- `/selector` - Community selection (with cache-busting headers)
- `/debug` - Server config, environment, and version info
- `/support/` - Help & Support page
- `/support/faq/` - Frequently asked questions
- `/support/energyadvice/` - Energy bill support resources

## Site Configuration

Each community's `_data.yaml` contains:
- **esco**: Community details (name, email, phone, app_url)
- **seo**: Meta tags for social sharing (Open Graph, Twitter Cards)
- **google_analytics_id**: GA4 measurement ID
- **logo**: Logo image paths

The `esco` object is automatically available in all templates.

## Template System

Lume uses **Vento** templates with specific parsing requirements:

```vto
<!-- Template tags must be directly adjacent to attributes (no space) -->
<a href="/support/"{{ if currentPage == "support" }} class="active"{{ /if }}>

<!-- Conditionals -->
{{ if esco }}{{ esco.name }} Community Energy{{ /if }}

<!-- Includes -->
{{ include "components/header.vto" }}

<!-- Safe HTML output -->
{{ content |> safe }}
```

**Important**: Template tags cannot be nested inside HTML blocks in Markdown files. Use layouts to handle template logic.

## Styling Architecture

Three-tier SCSS inheritance:

1. **Base styles** (`_shared/assets/css/style.scss`): Global resets, typography, shared components
2. **Community overrides** (`sites/{community}/assets/css/style.scss`): Site-specific styles
3. **Asset cascading**: Shared assets copied first, then community-specific overlays

Current setup: Both communities use identical styles but can be customized independently.

## Production Deployment

**Live sites:**
- https://www.waterlilies.energy
- https://www.hazelmead.energy

**Deployment process:**
1. Push to `main` branch
2. GitHub Actions builds static files
3. Automatic deployment to Deno Deploy
4. Domain-based routing serves correct community

**Domain routing** (server.ts:8-14):
```typescript
const DOMAIN_MAP: Record<string, string> = {
  "waterlilies.energy": "waterlilies",
  "www.waterlilies.energy": "waterlilies",
  "hazelmead.energy": "hazelmead",
  "www.hazelmead.energy": "hazelmead",
};
```

**Environment detection:**
- `DENO_DEPLOY=true` enables production mode
- Production: Domain-based routing
- Development: Cookie-based routing

## Adding New Content

### New Regular Page

1. Create `sites/{community}/newpage.md`
2. Add frontmatter with layout:
   ```yaml
   ---
   title: "Page Title"
   layout: layouts/default.vto
   ---
   ```
3. Build automatically creates `/newpage/` route

### New Support Page

1. Create in `sites/{community}/support/newpage.md`
2. Use support layout with currentPage:
   ```yaml
   ---
   title: "Page Title"
   layout: layouts/support.vto
   currentPage: pagename
   ---
   ```
3. Layout automatically includes support navigation

## Testing

```bash
# Run all validations
deno task build:validate

# Individual tests
deno task check                  # TypeScript
deno task validate:html          # HTML validation
```

See `tests/README.md` for visual regression testing documentation.

## Documentation

- **CLAUDE.md**: Comprehensive guide for Claude Code (architecture, patterns, deployment)
- **tests/README.md**: Testing and validation documentation
- **README.md**: This file (quick start and overview)

## Known Constraints

- Vento template tags cannot be nested inside HTML tags (causes "Unclosed tag" errors)
- URL paths rewritten during build (source paths ≠ output paths)
- Shared assets duplicated in both community outputs
- Support nav expects exactly 3 tabs: Vulnerability Policy, FAQ, Energy Advice
- Selector page requires hard refresh after first deployment (cache-busting headers prevent future issues)

## Performance

- **Build time**: ~0.04 seconds
- **Files generated**: 35+ (HTML pages + assets)
- **Dev server**: Hot reload enabled
- **Production**: Edge delivery via Deno Deploy

## Adding a New Community

See CLAUDE.md section "Adding New Community" for step-by-step instructions.

## License

Same as parent project.
