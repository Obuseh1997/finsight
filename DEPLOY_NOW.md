# 🚀 Deploy FinSight to Vercel - 3 Steps

Your codebase is production-ready! Follow these 3 steps to deploy:

## Step 1: Push to GitHub (2 minutes)

```bash
# In your terminal, run these commands:
cd /Users/emekeobuseh/pdf-test

# Initialize git and commit
git init
git add .
git commit -m "feat: Initial production release - FinSight v1.0"

# Create GitHub repo and push (using GitHub CLI)
gh repo create finsight --public --source=. --remote=origin --push
```

**Done!** Your code is now on GitHub.

## Step 2: Deploy to Vercel (1 minute)

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your **`finsight`** repository
5. Set **Root Directory** to: `pdf-insights-app`
6. Click **"Deploy"**

**That's it!** Vercel builds and deploys automatically.

## Step 3: Test Your Live Site (1 minute)

Visit your new URL (e.g., `https://finsight.vercel.app`)

Test:
- ✅ Upload a PDF statement
- ✅ Review transactions
- ✅ View insights
- ✅ Download CSV

## 🎉 You're Live!

**From now on, deployment is automatic:**

```bash
# Make changes
git add .
git commit -m "feat: Add new feature"
git push origin main

# Vercel auto-deploys in 1-2 minutes!
```

---

**Git = Source of Truth**  
**Every push to main = Auto-deploy to production**

---

For detailed instructions, see [DEPLOYMENT_STEPS.md](./DEPLOYMENT_STEPS.md)
