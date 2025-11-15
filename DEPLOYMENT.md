# Production Deployment Checklist

This document provides step-by-step instructions for deploying the Lume multi-site application to Deno Deploy.

## Prerequisites

- [ ] GitHub repository created at `https://github.com/microgridfoundry/www-communities-lume-mgf`
- [ ] Deno Deploy account set up
- [ ] DNS access to configure `waterlilies.energy` and `hazelmead.energy`

## Step 1: Repository Setup

### 1.1 Push Code to GitHub

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial commit - Lume multi-site for energy communities"

# Add remote and push
git remote add origin https://github.com/microgridfoundry/www-communities-lume-mgf.git
git branch -M main
git push -u origin main
```

### 1.2 Verify GitHub Actions Workflow

- [ ] Check that `.github/workflows/deploy-deno.yml` is present
- [ ] Verify workflow file has correct project name: `www-communities-lume-mgf`

## Step 2: Deno Deploy Setup

### 2.1 Create Deno Deploy Project

1. Go to https://dash.deno.com/projects
2. Click "New Project"
3. Enter project name: `www-communities-lume-mgf`
4. Select "GitHub" as deployment method
5. Connect to repository: `microgridfoundry/www-communities-lume-mgf`
6. Select branch: `main`
7. Set entrypoint: `server.ts`

### 2.2 Get Deployment Token

1. Go to https://dash.deno.com/account
2. Click "Access Tokens"
3. Create new token with description: "GitHub Actions Deploy"
4. Copy token (will only be shown once)

### 2.3 Configure GitHub Secret

1. Go to repository settings: https://github.com/microgridfoundry/www-communities-lume-mgf/settings/secrets/actions
2. Click "New repository secret"
3. Name: `DENO_DEPLOY_TOKEN`
4. Value: (paste token from step 2.2)
5. Click "Add secret"

- [ ] GitHub secret `DENO_DEPLOY_TOKEN` configured

## Step 3: Initial Deployment

### 3.1 Trigger Deployment

Option A: Push to main branch
```bash
git push origin main
```

Option B: Manual workflow dispatch
1. Go to https://github.com/microgridfoundry/www-communities-lume-mgf/actions
2. Select "Deploy to Deno Deploy" workflow
3. Click "Run workflow"

### 3.2 Verify Deployment

1. Go to https://dash.deno.com/projects/www-communities-lume-mgf
2. Check "Deployments" tab for successful build
3. Click on deployment to view logs
4. Visit the default Deno Deploy URL (e.g., `https://www-communities-lume-mgf.deno.dev/debug`)

- [ ] Deployment successful
- [ ] Debug page accessible at `/debug`
- [ ] Both communities' static files built correctly

## Step 4: Custom Domain Configuration

### 4.1 Add Custom Domains in Deno Deploy

1. Go to https://dash.deno.com/projects/www-communities-lume-mgf/settings
2. Scroll to "Domains" section
3. Click "Add Domain"
4. Enter: `www.waterlilies.energy`
5. Click "Add"
6. Repeat for: `www.hazelmead.energy`

- [ ] `www.waterlilies.energy` added to Deno Deploy
- [ ] `www.hazelmead.energy` added to Deno Deploy

### 4.2 Update DNS Records

For **waterlilies.energy**:
```
Type: CNAME
Name: www
Value: cname.deno.dev
TTL: 3600 (or auto)
```

For **hazelmead.energy**:
```
Type: CNAME
Name: www
Value: cname.deno.dev
TTL: 3600 (or auto)
```

Optional: Add root domain redirect (A/ALIAS records or CNAME flattening)

- [ ] DNS records updated for waterlilies.energy
- [ ] DNS records updated for hazelmead.energy

### 4.3 Verify Domain Configuration

Wait for DNS propagation (5-30 minutes), then:

```bash
# Check DNS resolution
dig www.waterlilies.energy
dig www.hazelmead.energy

# Test domains (may take time for SSL provisioning)
curl -I https://www.waterlilies.energy
curl -I https://www.hazelmead.energy
```

- [ ] `www.waterlilies.energy` resolves to Deno Deploy
- [ ] `www.hazelmead.energy` resolves to Deno Deploy
- [ ] SSL certificates provisioned automatically
- [ ] Both sites load correctly

## Step 5: Production Verification

### 5.1 Test Domain Routing

Visit each domain and verify:

**Water Lilies** (https://www.waterlilies.energy):
- [ ] Homepage loads correctly
- [ ] Displays "Water Lilies Community Energy" branding
- [ ] Support pages accessible
- [ ] All assets (images, CSS) load correctly
- [ ] Links work correctly
- [ ] No console errors

**Hazelmead** (https://www.hazelmead.energy):
- [ ] Homepage loads correctly
- [ ] Displays "Hazelmead Community Energy" branding
- [ ] Support pages accessible
- [ ] All assets (images, CSS) load correctly
- [ ] Links work correctly
- [ ] No console errors

### 5.2 Test Debug Page

Visit debug pages on both domains:
- [ ] https://www.waterlilies.energy/debug shows correct routing
- [ ] https://www.hazelmead.energy/debug shows correct routing
- [ ] `DENO_DEPLOY` environment variable shows "true"
- [ ] Domain mapping displays correctly

### 5.3 Performance & SEO Check

- [ ] Run Lighthouse on both sites (target: >90 for all metrics)
- [ ] Verify Open Graph tags (share on social media)
- [ ] Check Google Analytics integration
- [ ] Test on multiple devices/browsers
- [ ] Verify mobile responsiveness

## Step 6: Monitoring & Maintenance

### 6.1 Set Up Monitoring

1. Check Deno Deploy dashboard for deployment logs
2. Set up error notifications (if available)
3. Monitor analytics for traffic patterns

- [ ] Deployment logs accessible
- [ ] Error notifications configured (if available)

### 6.2 Document Production URLs

Production URLs:
- Water Lilies: https://www.waterlilies.energy
- Hazelmead: https://www.hazelmead.energy
- Debug pages: `/debug` on each domain

GitHub Repository: https://github.com/microgridfoundry/www-communities-lume-mgf
Deno Deploy Dashboard: https://dash.deno.com/projects/www-communities-lume-mgf

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs: https://github.com/microgridfoundry/www-communities-lume-mgf/actions
2. Verify build succeeds locally: `deno task build:validate`
3. Check Deno Deploy logs in dashboard
4. Ensure `DENO_DEPLOY_TOKEN` is correctly configured

### Domain Not Working

1. Verify DNS records with `dig` or online DNS checker
2. Wait for DNS propagation (can take up to 48 hours)
3. Check domain configuration in Deno Deploy dashboard
4. Verify SSL certificate provisioning status

### Wrong Site Loads

1. Check `/debug` page to see which domain was detected
2. Verify domain mapping in `server.ts` matches custom domains
3. Clear browser cache and cookies
4. Test with different browser or incognito mode

### Assets Not Loading

1. Verify build generated files: `ls -R _site/`
2. Check browser console for 404 errors
3. Verify asset paths in templates use relative URLs
4. Check Deno Deploy logs for file serving errors

## Rollback Procedure

If deployment fails or issues arise:

1. Go to https://dash.deno.com/projects/www-communities-lume-mgf/deployments
2. Find last known good deployment
3. Click "Promote to Production"
4. Alternatively, revert git commit and push:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Future Deployments

After initial setup, deployments are automatic:

1. Make changes to code
2. Commit and push to `main` branch
3. GitHub Actions automatically builds and deploys
4. Verify deployment in Deno Deploy dashboard
5. Test on production domains

- [ ] Automatic deployments working correctly
- [ ] Team aware of deployment process

## Post-Deployment Tasks

- [ ] Update documentation with production URLs
- [ ] Notify stakeholders of successful deployment
- [ ] Update any external links to point to new domains
- [ ] Archive old Jekyll sites (if applicable)
- [ ] Schedule post-deployment review meeting

## Notes

- Keep `DENO_DEPLOY_TOKEN` secure and rotate periodically
- Monitor Deno Deploy dashboard for usage and performance
- Consider setting up staging environment on separate branch
- Document any custom configuration or environment-specific settings

---

**Deployment Date**: ___________________
**Deployed By**: ___________________
**Verified By**: ___________________
**Sign-off**: ___________________
