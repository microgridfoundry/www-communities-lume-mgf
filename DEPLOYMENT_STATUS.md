# Deployment Status - Deno Deploy Troubleshooting

**Last Updated**: 2025-11-15 20:30
**Status**: 🔍 Debugging deployment 404 errors

## Current Situation

The Lume multi-site application has been pushed to GitHub and GitHub Actions is configured for automatic deployment to Deno Deploy. However, the deployment is experiencing 404 errors when accessing the site.

## Issues Identified & Fixed

### ✅ Issue 1: React JSX Configuration Error
**Status**: FIXED
- **Problem**: TypeScript check failing due to unused React JSX config in `deno.json`
- **Fix**: Removed `compilerOptions` section from `deno.json`
- **Commit**: Removed unused React JSX configuration

### ✅ Issue 2: Port Configuration
**Status**: FIXED
- **Problem**: Deno Deploy doesn't allow manual port specification
- **Fix**: Split `Deno.serve()` into conditional - no port in production, port 8000 in dev
- **Commit**: Fixed production port configuration

### ✅ Issue 3: File Path in Production
**Status**: FIXED (pending verification)
- **Problem**: Different working directory on Deno Deploy vs local
- **Fix**: Changed from `./_site/${community}` to `_site/${community}` in production
- **Commit**: Fixed file serving path for production

### ✅ Issue 4: Selector Page Access
**Status**: FIXED (pending verification)
- **Problem**: No way to test domain routing before custom domains configured
- **Fix**: Added `/selector` route to production mode showing current domain and mappings
- **Commit**: Added production selector page

## Current Issue

### ⚠️ Issue 5: 404 Errors - Hostname Not Matching DOMAIN_MAP
**Status**: INVESTIGATING

**Error Logs**:
```
[2025-11-15 20:24:07] [GET] / 404
No such file or directory (os error 2): stat '_site/favicon.ico'
[2025-11-15 20:24:08] [GET] /favicon.ico 404
No such file or directory (os error 2): stat '_site/selector'
[2025-11-15 20:24:15] [GET] /selector 404
```

**Analysis**:
- The error shows `_site/favicon.ico` (no community subdirectory)
- This indicates `community` variable is undefined
- Despite adding `www-communities-lume-mgf.deno.dev` to DOMAIN_MAP

**Possible Causes**:
1. Deno Deploy might be using a different hostname format
2. Hostname might include port number or protocol
3. Hostname might be internal/proxy hostname
4. Files might not be included in deployment (less likely - workflow looks correct)

**Current Fix Attempt**:
- Added comprehensive debug logging to show:
  - Actual hostname received
  - Community mapping result
  - Available domains in DOMAIN_MAP
  - Full error messages with expected domains
- **Commit**: "Add debug logging for hostname detection"

## Blocking Issue

### 🚨 DENO_DEPLOY_TOKEN Not Configured
**Status**: REQUIRES USER ACTION

The GitHub Actions workflow needs `DENO_DEPLOY_TOKEN` to deploy to Deno Deploy.

**User Action Required**:
1. Go to https://dash.deno.com/account
2. Click "Access Tokens"
3. Create new token with description: "GitHub Actions Deploy"
4. Copy token (shown only once)
5. Go to https://github.com/microgridfoundry/www-communities-lume-mgf/settings/secrets/actions
6. Click "New repository secret"
7. Name: `DENO_DEPLOY_TOKEN`
8. Value: (paste token from step 4)
9. Click "Add secret"

**Once configured**: Push to `main` branch will trigger deployment, and debug logs will show what's happening.

## Current DOMAIN_MAP

```typescript
const DOMAIN_MAP: Record<string, string> = {
  "waterlilies.energy": "waterlilies",
  "www.waterlilies.energy": "waterlilies",
  "hazelmead.energy": "hazelmead",
  "www.hazelmead.energy": "hazelmead",
  // Default Deno Deploy domain - serve waterlilies for testing
  "www-communities-lume-mgf.deno.dev": "waterlilies",
};
```

## Testing Checklist (Once Deployed)

After `DENO_DEPLOY_TOKEN` is configured and deployment succeeds:

1. **Check Debug Logs** in Deno Deploy dashboard:
   - Look for `[Production request: /]` log lines
   - Verify hostname being received
   - Verify community mapping result

2. **Test Debug Page**: https://www-communities-lume-mgf.deno.dev/debug
   - Should show deployment info
   - Should show DENO_DEPLOY=true
   - Should show all DOMAIN_MAP entries

3. **Test Selector Page**: https://www-communities-lume-mgf.deno.dev/selector
   - Should show current hostname
   - Should show which community it maps to
   - Should list all available domains

4. **Test Homepage**: https://www-communities-lume-mgf.deno.dev/
   - Should serve Water Lilies homepage (mapped to waterlilies)
   - Should load without 404 errors

## Files Modified

1. `deno.json` - Removed React JSX config
2. `server.ts` - Fixed production port, file paths, added selector page, debug logging
3. `.github/workflows/deploy-deno.yml` - Deployment workflow (no changes needed)

## Next Steps

### Immediate (Requires User):
1. Configure `DENO_DEPLOY_TOKEN` in GitHub secrets
2. Trigger deployment (automatic on push to main, or manual workflow dispatch)

### After Deployment:
1. Check Deno Deploy logs for debug output
2. Identify actual hostname being received
3. If hostname doesn't match DOMAIN_MAP:
   - Add actual hostname to DOMAIN_MAP
   - Commit and push (triggers new deployment)
4. Verify all test URLs work
5. Once working, add custom domains in Deno Deploy dashboard

## Useful Links

- **GitHub Repository**: https://github.com/microgridfoundry/www-communities-lume-mgf
- **GitHub Actions**: https://github.com/microgridfoundry/www-communities-lume-mgf/actions
- **Deno Deploy Dashboard**: https://dash.deno.com/projects/www-communities-lume-mgf
- **Deno Deploy Account (for token)**: https://dash.deno.com/account
- **GitHub Secrets**: https://github.com/microgridfoundry/www-communities-lume-mgf/settings/secrets/actions

## Environment Variables

### Production (Deno Deploy):
- `DENO_DEPLOY`: Automatically set to `"true"` by Deno Deploy
- `DENO_DEPLOYMENT_ID`: Deployment ID
- `DENO_REGION`: Deployment region

### Development (Local):
- `DENO_DEPLOY`: Not set (or can set to `"true"` for testing production mode locally)
- `PORT`: 8000

## Expected Behavior

### Development Mode (DENO_DEPLOY=false or not set):
1. User visits http://localhost:8000/
2. No community cookie → redirected to `/select-community`
3. User selects community → cookie set
4. User visits any page → served from `_site/{community}/`

### Production Mode (DENO_DEPLOY=true):
1. Request received with hostname (e.g., `www-communities-lume-mgf.deno.dev`)
2. Hostname looked up in DOMAIN_MAP
3. Community determined (e.g., `waterlilies`)
4. Files served from `_site/waterlilies/`
5. No cookies, no selection page (except `/selector` for testing)

## Debug Output Format

When the fixed version deploys, logs should show:
```
[2025-11-15 20:30:00] Production request: /
  Hostname: www-communities-lume-mgf.deno.dev
  Community: waterlilies
  Available domains: ["waterlilies.energy", "www.waterlilies.energy", ...]
```

If hostname doesn't match:
```
[2025-11-15 20:30:00] Production request: /
  Hostname: some-unexpected-hostname.deno.dev
  Community: NOT FOUND
  Available domains: ["waterlilies.energy", "www.waterlilies.energy", ...]

Unknown domain: some-unexpected-hostname.deno.dev

Expected domains:
  - waterlilies.energy
  - www.waterlilies.energy
  - hazelmead.energy
  - www.hazelmead.energy
  - www-communities-lume-mgf.deno.dev
```

This will allow us to identify the exact hostname and fix the DOMAIN_MAP accordingly.
