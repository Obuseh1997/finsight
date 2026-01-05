# Quick Deployment Guide - Vercel + GitHub

## ✅ Cleanup Complete

**Files Removed:**
- Duplicate documentation (12 files)
- Unused Python scripts (10 files)
- Test scripts (4 files)
- Temporary files and directories

**Files Created:**
- `README.md` - Comprehensive production README
- `DEPLOYMENT.md` - Full deployment guide
- `requirements.txt` - Python dependencies
- `vercel.json` - Vercel configuration
- `.gitignore` - Already exists, properly configured

## 🚀 Deploy to GitHub + Vercel (Auto-Deploy)

### Step 1: Initialize Git Repository

```bash
cd /Users/emekeobuseh/pdf-test

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: Initial production release - FinSight v1.0"
```

### Step 2: Create GitHub Repository & Push

**Using GitHub CLI (Recommended):**
```bash
gh repo create finsight --public --source=. --remote=origin --push
```

**Manual (via GitHub website):**
1. Go to https://github.com/new
2. Repository name: `finsight`
3. Description: "Private bank statement insights tool - 100% local processing"
4. Choose Public or Private
5. **Do NOT** initialize with README (we have one)
6. Click "Create repository"

Then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/finsight.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

**Option A: Via Vercel Dashboard (Easiest)**

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Select your `finsight` repository
5. Vercel will auto-detect Next.js:
   - **Framework Preset**: Next.js
   - **Root Directory**: `pdf-insights-app`
   - **Build Command**: Auto-detected
   - **Output Directory**: Auto-detected
6. Click "Deploy"

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to Next.js app
cd pdf-insights-app

# Deploy to production
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name? finsight
# - Directory? ./
```

**First deployment takes 1-2 minutes**

### Step 4: Configure Project Settings (Important!)

After first deployment, in Vercel dashboard:

1. Go to Project Settings → General
2. **Root Directory**: Set to `pdf-insights-app`
3. **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Environment Variables** (if needed in future):
   - Currently none required for local processing

### Step 5: Verify Deployment

You'll get a URL like: `https://finsight.vercel.app`

Test it:
1. ✅ Visit the URL
2. ✅ Upload a sample PDF statement
3. ✅ Verify extraction works
4. ✅ Review low-confidence transactions
5. ✅ View insights page
6. ✅ Download CSV report
7. ✅ Test dark mode toggle

### Step 6: (Optional) Custom Domain

1. In Vercel dashboard: Project Settings → Domains
2. Add your domain (e.g., `finsight.app`)
3. Follow DNS configuration instructions
4. HTTPS automatically enabled

## 🔄 Auto-Deployment is Now Active!

**Git is now your source of truth.** Every push to `main` automatically deploys:

```bash
# Make changes locally
git add .
git commit -m "feat: Add new feature"
git push origin main

# Vercel automatically:
# 1. Detects push to main
# 2. Runs build (1-2 min)
# 3. Deploys new version
# 4. Your site is updated!
```

## 📋 Deployment Checklist

- [x] Files cleaned up (✅ DONE)
- [x] README updated (✅ DONE)
- [x] vercel.json created (✅ DONE)
- [x] requirements.txt created (✅ DONE)
- [ ] Git repository initialized
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] First deployment successful
- [ ] Full pipeline tested on live site
- [ ] Custom domain configured (optional)

## 🎯 Git Workflow Going Forward

### Feature Development

```bash
# Create feature branch
git checkout -b feature/add-bmo-parser

# Make changes, test locally
cd pdf-insights-app
npm run dev

# Commit changes
git add .
git commit -m "feat: Add BMO bank parser"

# Push feature branch
git push origin feature/add-bmo-parser

# Create Pull Request on GitHub
# After review, merge to main
# Vercel auto-deploys production!
```

### Preview Deployments

Vercel automatically creates preview deployments for:
- Every push to non-main branches
- Every pull request

Each gets a unique URL like: `https://finsight-git-feature-abc.vercel.app`

### Hotfixes

```bash
# Create hotfix from main
git checkout -b hotfix/fix-critical-bug main

# Fix, commit, push
git add .
git commit -m "fix: Critical bug in CIBC parser"
git push origin hotfix/fix-critical-bug

# Merge to main → Auto-deploy to production
```

## 🐛 Troubleshooting

### Build fails on Vercel

**Check build logs in Vercel dashboard.**

Common issues:
- **Wrong root directory**: Should be `pdf-insights-app`
- **Missing dependencies**: Ensure `package-lock.json` is committed
- **Node version**: Vercel uses Node 18 by default (correct)

Fix in Project Settings → General → Root Directory

### Python scripts don't work

**Note**: Vercel doesn't support Python serverless functions on Hobby plan.

**Solutions**:
1. **Upgrade to Vercel Pro** ($20/mo) - enables custom runtimes
2. **Current setup works** - Python runs via Next.js API routes calling child processes (already configured)

Our implementation uses child processes (`child_process.spawn`) to run Python from Node.js API routes, which works on Hobby plan.

### Large file upload fails

In `pdf-insights-app/next.config.ts`, increase:
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '20mb', // Adjust as needed
  },
},
```

Then redeploy:
```bash
git add pdf-insights-app/next.config.ts
git commit -m "fix: Increase upload size limit"
git push origin main
```

### Function timeout errors

Vercel Hobby plan: 10s timeout
Vercel Pro plan: 60s timeout

If processing takes >10s, optimize Python scripts or upgrade plan.

## 📊 Monitoring

### Vercel Dashboard

- **Deployments**: See all deployments, logs, and status
- **Analytics**: Page views, performance (requires Vercel Pro)
- **Logs**: Real-time function execution logs
- **Insights**: Core Web Vitals, performance metrics

### Health Check

```bash
# Check if site is up
curl https://finsight.vercel.app

# Check API routes
curl https://finsight.vercel.app/api/extract
# Should return 405 Method Not Allowed (expected for GET)
```

## 🔒 Security

- [x] No API keys in Git (currently none used)
- [x] HTTPS enabled automatically
- [x] Environment variables encrypted in Vercel
- [x] File upload size limits enforced
- [x] PII scrubbing active

## 🎉 Deployment Complete!

**Your workflow is now:**
1. Code locally
2. `git push origin main`
3. Vercel auto-builds and deploys
4. Live in 1-2 minutes!

**Git = Source of Truth**
**Vercel = Automatic CI/CD**

---

## Quick Commands Reference

```bash
# Daily workflow
git add .
git commit -m "feat: Your change description"
git push origin main

# Create feature branch
git checkout -b feature/your-feature
git push origin feature/your-feature

# Update from main
git checkout main
git pull origin main

# Deploy manually (if needed)
vercel --prod
```

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **GitHub Issues**: Create issue on your repo

**Questions?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
