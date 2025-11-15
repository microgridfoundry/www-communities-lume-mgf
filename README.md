# Lume Multi-Site CMS - Proof of Concept

This is a proof-of-concept implementation of a multi-site static site generator using Lume, consolidating two Jekyll sites (Water Lilies and Hazelmead Community Energy) into a single DRY codebase.

## Features

- **Single Codebase**: Shared templates, styles, and components across both communities
- **Site-Specific Data**: Each community has its own configuration, content, and assets
- **Cookie-Based Development**: Local development uses cookies to switch between communities
- **Visual Regression Testing**: Puppeteer-based pixel-perfect comparison with live production sites
- **Fast Builds**: 35 files generated in ~0.04 seconds

## Project Structure

```
www-communities-lume/
├── _config.ts                # Lume configuration
├── _includes/                # Shared templates and components
│   ├── layouts/
│   │   └── default.vto       # Main layout template
│   └── components/
│       ├── header.vto
│       ├── footer.vto
│       ├── hero.vto
│       ├── about.vto
│       ├── investor.vto
│       ├── benefits.vto
│       └── support-nav.vto
├── _shared/                  # Shared assets
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.scss    # Complete SCSS from Jekyll
│   │   └── images/           # Shared images
├── sites/                    # Community-specific content
│   ├── waterlilies/
│   │   ├── _data.yaml        # Water Lilies configuration
│   │   ├── index.md          # Homepage
│   │   ├── support.md        # Support page
│   │   ├── support/
│   │   │   ├── faq.md
│   │   │   └── energyadvice.md
│   │   └── assets/           # WL-specific assets
│   └── hazelmead/
│       ├── _data.yaml        # Hazelmead configuration
│       ├── index.md
│       ├── support.md
│       ├── support/
│       │   ├── faq.md
│       │   └── energyadvice.md
│       └── assets/           # HM-specific assets
├── server.ts                 # Development server with cookie-based routing
├── tests/
│   ├── visual-regression.ts  # Puppeteer visual tests
│   ├── README.md             # Testing documentation
│   └── screenshots/
│       ├── baseline/         # Jekyll screenshots (reference)
│       ├── current/          # Lume screenshots (latest)
│       └── diff/             # Visual diff images
└── _site/                    # Generated output
    ├── waterlilies/          # Water Lilies static site
    └── hazelmead/            # Hazelmead static site
```

## Getting Started

### Prerequisites

- Deno 2.0+
- For visual regression tests: Chrome/Chromium (installed automatically by Puppeteer)

### Installation

```bash
# Clone or navigate to the directory
cd www-communities-lume

# No npm install needed - Deno handles dependencies automatically
```

### Development

```bash
# Build the sites
deno task build

# Start development server (port 8000)
deno task dev

# Visit http://localhost:8000/select-community to choose a community
# Or access directly:
# - Water Lilies: http://localhost:8000/ (after setting cookie)
# - Hazelmead: http://localhost:8000/ (after setting cookie)
```

The dev server uses cookies to route requests:
1. Visit `/select-community` to pick a community
2. Cookie is set for 24 hours
3. All requests are routed to the correct community's static files

### Building

```bash
# Build both sites to _site/ directory
deno task build

# Output structure:
# _site/waterlilies/   - Water Lilies site
# _site/hazelmead/     - Hazelmead site
```

## Key Technical Details

### Data Management

The original Jekyll `_config.yml` data was split into site-specific `_data.yaml` files:

- `sites/waterlilies/_data.yaml` - Water Lilies configuration
- `sites/hazelmead/_data.yaml` - Hazelmead configuration

These files contain:
- Site metadata (title, Google Analytics ID)
- ESCO data (name, contact info, app URL)
- SEO metadata (Open Graph, Twitter Cards)
- Logo paths
- Homepage settings

### Data Cascade Solution

**Challenge**: Lume's automatic `_data` file loading wasn't working with the multi-site structure.

**Solution**: Manual data loading in `_config.ts`:
```typescript
// Load site data manually
const waterliliesData = parseYaml(await Deno.readTextFile("./sites/waterlilies/_data.yaml"));
const hazelmeadData = parseYaml(await Deno.readTextFile("./sites/hazelmead/_data.yaml"));

// Inject data into pages based on source path
site.process([".html", ".md"], (pages) => {
  for (const page of pages) {
    if (page.src.path.startsWith("/sites/waterlilies/")) {
      Object.assign(page.data, waterliliesData);
      page.data.url = page.data.url.replace("/sites/waterlilies", "/waterlilies");
    } else if (page.src.path.startsWith("/sites/hazelmead/")) {
      Object.assign(page.data, hazelmeadData);
      page.data.url = page.data.url.replace("/sites/hazelmead", "/hazelmead");
    }
  }
});
```

### Template Engine

**Vento** (Lume's default template engine) is used instead of Nunjucks:

| Nunjucks | Vento |
|----------|-------|
| `{% if %}...{% endif %}` | `{{ if }}...{{ /if }}` |
| `{% include "file.njk" %}` | `{{ include "file.vto" }}` |
| `{{ var \| safe }}` | `{{ var \|> safe }}` |

### URL Structure

Pages are output with community prefixes:

| Source | Output URL |
|--------|------------|
| `sites/waterlilies/index.md` | `/waterlilies/` |
| `sites/waterlilies/support.md` | `/waterlilies/support/` |
| `sites/hazelmead/index.md` | `/hazelmead/` |
| `sites/hazelmead/support.md` | `/hazelmead/support/` |

## Visual Regression Testing

See [tests/README.md](tests/README.md) for detailed documentation.

**Quick Start**:

```bash
# 1. Start Lume server
deno task dev

# 2. Capture baseline screenshots from live production sites
deno task test:visual:update

# 3. Compare Lume output against baseline
deno task test:visual
```

Tests capture screenshots at multiple viewports (desktop, laptop, tablet, mobile) and compare pixel-by-pixel with 98% minimum similarity threshold.

Baseline screenshots are fetched from:
- https://www.waterlilies.energy
- https://www.hazelmead.energy

## Differences from Jekyll Sites

### Intentional Changes

1. **Support Pages**: Extended to Water Lilies (was Hazelmead-only in Jekyll)
2. **URL Structure**: Added community prefixes (`/waterlilies/`, `/hazelmead/`)
3. **Development Workflow**: Cookie-based community selection

### Preserved Features

- All original styling (SCSS)
- All images and assets
- SEO metadata
- Google Analytics integration
- Contact information
- Community-specific branding

## Performance

- **Build time**: ~0.04 seconds
- **Files generated**: 35 (8 HTML pages + assets)
- **Dev server**: Instant hot reload

## Deployment

### Option 1: Static Hosting (Recommended)

Deploy `_site/waterlilies/` and `_site/hazelmead/` as separate sites:

```bash
# Build for production
ENV=production deno task build

# Deploy to static hosting
# - _site/waterlilies/ → www.waterlilies.energy
# - _site/hazelmead/ → www.hazelmead.energy
```

Compatible with:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static hosting

### Option 2: Single Server with Path-Based Routing

Use a reverse proxy (nginx, Caddy) to route by path:

```nginx
location /waterlilies/ {
    alias /var/www/_site/waterlilies/;
}

location /hazelmead/ {
    alias /var/www/_site/hazelmead/;
}
```

## Tasks

Available Deno tasks:

```bash
deno task build                  # Build both sites
deno task dev                    # Start development server
deno task serve                  # Lume built-in server
deno task test:visual            # Run visual regression tests
deno task test:visual:update     # Update baseline screenshots
```

## Next Steps

1. **Run Visual Regression Tests**: Capture baselines and compare (`deno task test:visual:update` then `deno task test:visual`)
2. **Review Differences**: Check generated diff images for any styling discrepancies
3. **Iterate on Styling**: Adjust CSS/templates until >98% similarity achieved
4. **Production Deploy**: Deploy to static hosting with proper domain routing
5. **Content Migration**: Verify all content has been correctly migrated

## Notes

- Jekyll sites remain untouched in their original directories
- This is a proof of concept - not yet production-ready
- Visual regression testing compares against live production sites (https://www.waterlilies.energy and https://www.hazelmead.energy)
- Cookie-based routing is for development only - production uses separate domains

## License

Same as parent project.
