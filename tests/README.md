# Testing & Validation

This directory contains test scripts for validating the Lume build output.

## Available Tests

### 1. HTML Validation (`validate-html.ts`)
Validates built HTML files for common issues:
- **Duplicate IDs** - Ensures ID attributes are unique across each page
- **Nested anchor tags** - Catches invalid `<a>` inside `<a>` (common template error)
- **Missing alt attributes** - Flags images without accessibility alt text
- **Empty href attributes** - Detects placeholder or empty links
- **Parse errors** - Catches malformed HTML

**Usage:**
```bash
deno task validate:html
```

### 2. TypeScript Type Checking
Validates TypeScript code for type errors in `_config.ts` and `server.ts`.

**Usage:**
```bash
deno task check
```

**Note:** Test files (`tests/*.ts`) are excluded from type checking to avoid test-specific issues blocking builds.

### 3. Build Validation (Recommended)
Combined build + type check + HTML validation:

```bash
deno task build:validate
```

This runs:
1. `deno task build` - Lume static site build
2. `deno task check` - TypeScript type checking
3. `deno task validate:html` - HTML validation

### 4. HTML Structure Comparison (`html-diff.ts`)
Compares the DOM structure of Lume-generated pages against live production sites.

Checks:
- Sections (by class name)
- Heading count
- Image count
- Internal link count

**Usage:**
```bash
deno run -A tests/html-diff.ts
```

## Visual Regression Testing

Visual regression tests ensure the Lume-generated sites match the **live production sites**.

## Prerequisites

1. **Internet connection** - Tests fetch baseline screenshots from:
   - https://www.waterlilies.energy
   - https://www.hazelmead.energy

2. **Start the Lume development server** (port 8000):

   ```bash
   cd www-communities-lume
   deno task dev
   ```

## Usage

### 1. Capture Baseline Screenshots

First, capture screenshots from the **live production sites** to use as baseline:

```bash
deno task test:visual:update
```

This will:
- Launch Puppeteer in headless mode
- Fetch each page from https://www.waterlilies.energy and https://www.hazelmead.energy
- Capture screenshots at multiple viewport sizes
- Save screenshots to `tests/screenshots/baseline/`

### 2. Run Visual Comparison Tests

After making changes to the Lume site, compare against the baseline:

```bash
deno task test:visual
```

This will:
- Capture screenshots of the Lume site
- Compare them pixel-by-pixel with baseline (Jekyll) screenshots
- Generate diff images for any failures
- Report similarity percentage for each test

### 3. Review Results

Test results are saved to:
- `tests/screenshots/baseline/` - Production site screenshots (reference)
- `tests/screenshots/current/` - Latest Lume screenshots
- `tests/screenshots/diff/` - Visual diff images (red highlights show differences)
- Console output shows similarity percentage for each test

**Note**: Baseline screenshots should be committed to git to track the expected appearance over time.

## Test Configuration

### Viewports Tested

- **Desktop**: 1920x1080
- **Laptop**: 1440x900
- **Tablet**: 768x1024
- **Mobile**: 375x667

### Pages Tested

For both Water Lilies and Hazelmead:
- Homepage (`/`)
- Support page (`/support/`)
- FAQ page (`/support/faq/`)
- Energy Advice page (`/support/energyadvice/`)

### Success Criteria

- **Minimum similarity**: 98%
- **Pixel difference threshold**: 0.1 (10%)

Tests will pass if the Lume-generated page is at least 98% similar to the Jekyll original.

## Adjusting Configuration

Edit `tests/visual-regression.ts` to modify:
- `MIN_SIMILARITY` - Required similarity percentage
- `THRESHOLD` - Pixel difference sensitivity (0-1)
- `TEST_CASES` - Pages to test
- `VIEWPORTS` - Screen sizes to test

## Troubleshooting

### "Baseline not found" error

Run `deno task test:visual:update` first to capture baseline screenshots.

### "Connection refused" errors

Ensure:
- You have an active internet connection (for fetching live sites during baseline update)
- Lume dev server is running on port 8000 (for comparison tests)

### High pixel differences

Common causes:
- Font rendering differences
- Image loading timing
- CSS animation states
- Anti-aliasing differences between environments

Adjust `THRESHOLD` if minor rendering differences are acceptable.

## CI/CD Integration

To run tests in CI:

1. Build Lume site
2. Serve Lume site on port 8000
3. Run `deno task test:visual` (fetches baseline from live sites automatically)
4. Archive diff images as artifacts if tests fail

Example GitHub Actions workflow snippet:

```yaml
- name: Build Lume site
  run: deno task build

- name: Start dev server
  run: deno task dev &

- name: Wait for server
  run: sleep 3

- name: Run visual regression tests
  run: deno task test:visual

- name: Upload diff images
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: visual-diffs
    path: tests/screenshots/diff/
```

**Note**: Baseline screenshots should be committed to the repository. CI will compare against these committed baselines, not fetch fresh ones from live sites.
