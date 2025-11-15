# Lume Multi-Site for Energy Communities

A multi-site static site generator using Lume, serving Water Lilies and Hazelmead Community Energy websites from a single codebase.

## Features

- **Single Codebase**: Shared templates, styles, and components across both communities
- **Site-Specific Data**: Each community has its own configuration, content, and assets
- **Cookie-Based Development**: Local development uses cookies to switch between communities
- **Domain-Based Production**: Production routes by domain (waterlilies.energy, hazelmead.energy)
- **Fast Builds**: ~0.04 seconds, 35+ files generated

## Project Structure

```
www-communities-lume/
├── _config.ts                # Lume configuration
├── _includes/                # Shared templates (Vento)
│   ├── layouts/
│   └── components/
├── _shared/                  # Shared assets
│   └── assets/
│       ├── css/style.scss
│       └── images/
├── sites/                    # Community-specific content
│   ├── waterlilies/
│   │   ├── _data.yaml
│   │   ├── index.md
│   │   ├── support/
│   │   └── assets/
│   └── hazelmead/
│       ├── _data.yaml
│       ├── index.md
│       ├── support/
│       └── assets/
├── server.ts                 # Deno server with routing
├── selector.html             # Community selector page
└── _site/                    # Generated output
    ├── waterlilies/
    └── hazelmead/
```

## Getting Started

### Prerequisites

- Deno 2.0+

### Development

```bash
# Build both sites
deno task build

# Start development server (port 8000)
deno task dev

# Visit http://localhost:8000/selector to choose a community
```

**Development workflow:**
1. Visit `/selector` to pick a community
2. Cookie is set for 24 hours
3. All requests serve that community's static files

**Useful routes:**
- `/selector` - Community selector
- `/debug` - Server configuration and environment info

## Site Configuration

Each community has a `_data.yaml` file containing:
- Site metadata (title, description, Google Analytics)
- ESCO details (name, contact info, app URL)
- SEO metadata (Open Graph, Twitter Cards)
- Logo paths and homepage settings

Data is automatically injected into pages during the build process.

## Deployment (Deno Deploy)

**Production URL**: https://github.com/microgridfoundry/www-communities-lume-mgf

### Initial Setup

1. **Connect GitHub to Deno Deploy**:
   - Link your GitHub repository to Deno Deploy
   - Deno Deploy auto-detects the Lume project
   - Automatic deployments on push to `main`

2. **Configure Deno Deploy Project**:
   - **Framework preset**: No Preset
   - **Build command**: `deno task build`
   - **Runtime**: Dynamic App
   - **Entrypoint**: `server.ts`

3. **Add Custom Domains** (in Deno Deploy dashboard):
   - `www.waterlilies.energy`
   - `www.hazelmead.energy`
   - SSL certificates provisioned automatically

4. **Update DNS Records**:
   ```
   Type: CNAME
   Name: www
   Value: cname.deno.dev
   TTL: Auto
   ```

### How Production Routing Works

The server uses domain-based routing:

1. **Domain mapping**: Check if hostname is in `DOMAIN_MAP`
   - `www.waterlilies.energy` → serves `_site/waterlilies/`
   - `www.hazelmead.energy` → serves `_site/hazelmead/`

2. **Cookie fallback**: For testing on preview URLs
   - If domain not in map, check for community cookie
   - Redirect to `/selector` if no valid community

3. **Static file serving**: Once community determined, serve files from `_site/{community}/`

## Available Commands

```bash
deno task build                  # Build both sites
deno task dev                    # Start development server
deno task check                  # TypeScript type checking
deno task validate:html          # HTML validation
```

## Template Engine (Vento)

Lume uses Vento templates (`.vto` files):

| Syntax | Example |
|--------|---------|
| Conditionals | `{{ if condition }}...{{ /if }}` |
| Includes | `{{ include "component.vto" }}` |
| Safe output | `{{ variable \|> safe }}` |
| Variables | `{{ title }}` |

## URL Structure

Built pages use community prefixes:

| Source | Output URL |
|--------|------------|
| `sites/waterlilies/index.md` | `/waterlilies/` |
| `sites/waterlilies/support.md` | `/waterlilies/support/` |
| `sites/hazelmead/index.md` | `/hazelmead/` |

Production domains map to the root of each community site.

## Performance

- **Build time**: ~0.04 seconds
- **Files generated**: 35 (HTML pages + assets)
- **Dev server**: Hot reload enabled

## Production Environment

**Environment Detection:**
- `DENO_DEPLOY=true` indicates production
- Domain-based routing enabled in production
- Cookie-based routing for development/testing

**Debug page:**
- Access `/debug` on any domain
- Shows environment variables, domain mapping, and deployment info

## License

Same as parent project.
