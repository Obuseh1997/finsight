# Quick Deployment Guide

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
- `netlify.toml` - Netlify configuration
- `.gitignore` - Already exists, properly configured

## 🚀 Next Steps: Deploy to GitHub + Netlify

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

### Step 2: Create GitHub Repository

**Option A: Using GitHub CLI (if installed)**
```bash
gh repo create finsight --public --source=. --remote=origin --push
```

**Option B: Manual (via GitHub website)**
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

### Step 3: Deploy to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Authorize GitHub if needed
5. Select your `finsight` repository
6. Netlify will auto-detect settings from `netlify.toml`:
   - Base directory: `pdf-insights-app`
   - Build command: `npm install && npm run build`
   - Publish directory: `.next`
7. Click "Deploy site"

**First deployment takes 2-3 minutes**

### Step 4: Verify Deployment

Once deployed, you'll get a URL like: `https://finsight-abc123.netlify.app`

Test it:
1. Visit the URL
2. Upload a sample PDF statement
3. Verify the full pipeline works
4. Test CSV download
5. Check dark mode

### Step 5: (Optional) Custom Domain

1. In Netlify dashboard: Site settings → Domain management
2. Add custom domain
3. Follow Netlify's DNS instructions
4. HTTPS automatically enabled via Let's Encrypt

## 🔄 Continuous Deployment is Now Active!

From now on:
```bash
# Make changes locally
git add .
git commit -m "feat: Add new feature"
git push origin main

# Netlify automatically:
# 1. Detects push to main
# 2. Runs build
# 3. Deploys new version
# 4. ~2 minutes later, site is updated
```

## 📋 Deployment Checklist

- [ ] Files cleaned up (✅ DONE)
- [ ] README updated (✅ DONE)
- [ ] netlify.toml created (✅ DONE)
- [ ] requirements.txt created (✅ DONE)
- [ ] Git repository initialized
- [ ] Code pushed to GitHub
- [ ] Netlify site created
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
# Netlify auto-deploys!
```

### Hotfixes

```bash
# Create hotfix from main
git checkout -b hotfix/fix-critical-bug main

# Fix, commit, push
git add .
git commit -m "fix: Critical bug in CIBC parser"
git push origin hotfix/fix-critical-bug

# Merge to main → Auto-deploy
```

## 🐛 Troubleshooting

### Build fails on Netlify

Check build logs in Netlify dashboard. Common issues:
- Node version mismatch (should be 18)
- Missing dependencies (ensure package-lock.json is committed)
- Python errors (check requirements.txt)

### Python functions timeout

- Netlify free tier: 10s function timeout
- Upgrade to Netlify Pro for 26s timeout
- Or optimize Python scripts

### Large file upload fails

In `pdf-insights-app/next.config.ts`, increase:
```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '20mb', // Increase if needed
  },
},
```

## 📞 Support

- **Netlify Docs**: https://docs.netlify.com
- **Next.js Docs**: https://nextjs.org/docs
- **Project Issues**: Create GitHub issue on your repo

---

## 🎉 You're Ready to Deploy!

Run the commands above and your FinSight app will be live in minutes.

**Git = Source of Truth**
**Netlify = Auto-deployment on every push to main**

Questions? Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.
