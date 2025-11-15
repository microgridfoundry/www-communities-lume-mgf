# Lume Multi-Site CMS Implementation Plan

## Overview
Consolidate waterlilies.energy and hazelmead.energy into a single git-based CMS using Lume (Deno static site generator) with domain-based routing. One codebase, DRY templates, per-site content data.

## Repository Structure
```
/
├── _config.ts              # Lume configuration
├── server.ts               # Deno Deploy domain router
├── deno.json               # Tasks and dependencies
├── _includes/
│   └── layout.njk          # Shared HTML template
├── _data/
│   └── common.yml          # Shared constants (phone, etc.)
├── sites/
│   ├── water-lilies/
│   │   ├── _data.yml       # Site-specific variables
│   │   ├── index.md        # Home page content
│   │   └── support.md      # Support page content
│   └── hazelmead/
│       ├── _data.yml
│       ├── index.md
│       └── support.md
├── assets/
│   ├── images/
│   │   ├── water-lilies/
│   │   └── hazelmead/
│   └── pdf/
└── _site/                  # Build output (gitignored)
    ├── water-lilies/
    └── hazelmead/
```

## Implementation Steps

### 1. Initialize Lume Project
```bash
deno run -Ar https://deno.land/x/lume/init.ts
```

### 2. Configure `deno.json`
```json
{
  "tasks": {
    "lume": "deno run -A https://deno.land/x/lume/cli.ts",
    "build": "deno task lume",
    "serve": "deno task lume -s",
    "deploy": "deno task build && deployctl deploy --prod --project=community-energy-sites"
  },
  "imports": {
    "lume/": "https://deno.land/x/lume@v2.1.0/"
  }
}
```

### 3. Configure `_config.ts` (Lume)
```typescript
import lume from "lume/mod.ts";
import nunjucks from "lume/plugins/nunjucks.ts";

const site = lume({
  src: "./sites",
  dest: "./_site",
});

site.use(nunjucks());

// Build each site to separate directories
site.copy("assets");

// Process both sites
site.loadData([".yml", ".yaml"]);

export default site;
```

### 4. Create Shared Layout (`_includes/layout.njk`)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }} | {{ siteName }}</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <header>
    <h1>{{ siteName }}</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/support/">Help & Support</a>
      <a href="{{ appUrl }}">Customer Log In</a>
    </nav>
  </header>
  
  <main>
    {{ content | safe }}
  </main>
  
  <footer>
    <a href="https://cepro.energy">
      <img src="/assets/images/CEPRO_Inline-tag-white.png" alt="CEPRO logo">
    </a>
    <ul>
      <li>Email: <a href="mailto:{{ email }}">{{ email }}</a></li>
      <li>Phone: <a href="tel:{{ phone }}">{{ phone }}</a></li>
    </ul>
  </footer>
</body>
</html>
```

### 5. Create Site Data Files

**`sites/water-lilies/_data.yml`:**
```yaml
siteName: Water Lilies Community Energy
location: Kingsweston, Bristol
partner: Bright Green Futures
email: hello@waterlilies.energy
phone: +44 330 828 3096
appUrl: https://app.waterlilies.energy
heroImage: /assets/images/water-lilies/battery-landing.webp
address: Unit 21A, Easton Business Centre, Bristol, BS5 0HE
vulnerabilityPolicyPdf: /assets/pdf/wlce-vulnerability-policy.pdf
coproCaseStudyUrl: https://cepro.energy
```

**`sites/hazelmead/_data.yml`:**
```yaml
siteName: Hazelmead Community Energy
location: Bridport
partner: Bridport Cohousing
email: hello@hazelmead.energy
phone: +44 330 828 3096
appUrl: https://app.hazelmead.energy
heroImage: /assets/images/hazelmead/ev-chargers.png
address: Unit 21A, Easton Business Centre, Bristol, BS5 0HE
vulnerabilityPolicyPdf: /assets/pdf/hmce-vulnerability-policy.pdf
coproCaseStudyUrl: https://cepro.energy/for-impact-investors/case-study-hazelmead/
```

### 6. Create Content Pages

**`sites/water-lilies/index.md`:**
```markdown
---
layout: layout.njk
title: Home
---

![{{ siteName }}]({{ heroImage }})

## Community Energy Reinvented

{{ partner }}, Clean Energy Prospector, and Bristol Energy Co-operative have partnered to design a microgrid at the Water Lilies housing development in {{ location }} that is redefining the way housing estates provide an energy service to its residents.

[Customer Sign In]({{ appUrl }})

## The Benefits

The {{ siteName }} company has been created to provide you with:

* ✔ Cheaper bills
* ✔ Lower carbon footprint
* ✔ Simple pricing and flat rate tariff
* ✔ Integrated EV charging
* ✔ Smart Heat
```

**Shared `support.md` template** (use same structure for both sites):
```markdown
---
layout: layout.njk
title: Help & Support
---

## Help & Support

We're here to help every resident at {{ siteName }}, especially if you're facing difficulties or have special needs.

### We can help if you're struggling

Life can be unpredictable. If you're having trouble understanding your bills, making payments, or you have medical equipment that needs electricity, we want to know so we can help.

Your energy bills at {{ siteName }} are already much lower than average homes thanks to our efficient buildings and renewable energy.

### Get in touch

**Phone:** {{ phone }}  
**Email:** [{{ email }}](mailto:{{ email }})  
**Address:** {{ address }}

[Download Vulnerability Policy (PDF)]({{ vulnerabilityPolicyPdf }})
```

### 7. Create Domain Router (`server.ts`)
```typescript
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const hostname = url.hostname;
  
  // Map domains to site directories
  const siteMap: Record<string, string> = {
    "waterlilies.energy": "./_site/water-lilies",
    "www.waterlilies.energy": "./_site/water-lilies",
    "hazelmead.energy": "./_site/hazelmead",
    "www.hazelmead.energy": "./_site/hazelmead",
  };
  
  const siteDir = siteMap[hostname] || "./_site/water-lilies";
  
  return serveDir(req, {
    fsRoot: siteDir,
    quiet: true,
  });
});
```

### 8. Setup GitHub Actions CI/CD (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Deno Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Build sites
        run: deno task build
      
      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: community-energy-sites
          entrypoint: server.ts
          root: .
```

## Content Editing Workflow

1. **Edit content**: Modify markdown files in `sites/water-lilies/` or `sites/hazelmead/`
2. **Edit data**: Update `_data.yml` files to change site-specific variables
3. **Commit to git**: `git add . && git commit -m "Update content"`
4. **Push**: `git push origin main`
5. **Auto-deploy**: GitHub Actions builds and deploys automatically

## Local Development

```bash
# Start development server
deno task serve

# Visit in browser
# Manually test different sites by editing URLs
```

## Domain Configuration

Configure DNS for both domains to point to your Deno Deploy project:
- `waterlilies.energy` → CNAME to Deno Deploy
- `www.waterlilies.energy` → CNAME to Deno Deploy
- `hazelmead.energy` → CNAME to Deno Deploy
- `www.hazelmead.energy` → CNAME to Deno Deploy

## Benefits Achieved

✅ **DRY**: One template serves both sites  
✅ **Git-based**: All changes tracked in version control  
✅ **Simple editing**: Non-technical team can edit markdown  
✅ **Single deployment**: One CI/CD pipeline for both sites  
✅ **Type-safe**: TypeScript for server logic  
✅ **Fast**: Static site generation + edge serving  
✅ **Scalable**: Easy to add more community energy sites

## Future Enhancements

- Add Decap CMS admin UI for non-technical editing
- Integrate with Simtricity platform APIs for dynamic content
- Add customer testimonials section
- Implement site search
- Add energy usage calculator widget
