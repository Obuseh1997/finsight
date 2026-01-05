# Deployment Guide - FinSight

This guide covers deploying FinSight to Netlify with Git as the source of truth.

## 📋 Pre-Deployment Checklist

- [ ] All unused files removed
- [ ] README.md updated
- [ ] `.gitignore` configured
- [ ] Environment variables documented
- [ ] Build commands tested locally
- [ ] Python dependencies listed in `requirements.txt`

## 🚀 Deployment to Netlify (Recommended)

Netlify supports both Next.js and Python serverless functions, making it perfect for FinSight.

### Step 1: Prepare Repository

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - FinSight production ready"

# Create GitHub repository (via GitHub CLI or web interface)
gh repo create finsight --public --source=. --remote=origin --push

# Or manually add remote and push
git remote add origin https://github.com/yourusername/finsight.git
git branch -M main
git push -u origin main
```

### Step 2: Create `requirements.txt`

Create this file in the root directory:

```txt
pdfplumber==0.10.3
python-dateutil==2.8.2
```

### Step 3: Configure Next.js for Netlify

Update `pdf-insights-app/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // For Netlify deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb', // Allow larger PDF uploads
    },
  },
};

export default nextConfig;
```

### Step 4: Create `netlify.toml`

Create this file in the root directory:

```toml
[build]
  command = "cd pdf-insights-app && npm install && npm run build"
  publish = "pdf-insights-app/.next"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
  PYTHON_VERSION = "3.9"

# Python runtime for serverless functions
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["sharp"]

# Large file upload support
[dev]
  framework = "#custom"
  command = "cd pdf-insights-app && npm run dev"
  targetPort = 3000
  publish = "pdf-insights-app/.next"
```

### Step 5: Deploy to Netlify

#### Option A: Via Netlify UI (Easiest)

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your `finsight` repository
5. Configure build settings:
   - **Build command**: `cd pdf-insights-app && npm install && npm run build`
   - **Publish directory**: `pdf-insights-app/.next`
   - **Node version**: 18
6. Click "Deploy site"

#### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize Netlify site
netlify init

# Deploy
netlify deploy --prod
```

### Step 6: Configure Environment Variables (if needed)

In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add any required variables (currently none needed for local processing)

### Step 7: Enable Continuous Deployment

Already enabled automatically! Every push to `main` branch will trigger a new deployment.

## 🔧 Alternative Deployment Options

### Vercel

Similar to Netlify, supports Next.js + serverless functions.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd pdf-insights-app
vercel --prod
```

**Note**: Python functions require Vercel Pro plan.

### Self-Hosted (Docker)

Create `Dockerfile` in root:

```dockerfile
FROM node:18-alpine AS base

# Install Python
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy Python scripts
COPY *.py ./
COPY parsers ./parsers
COPY scrubbers ./scrubbers
COPY utils ./utils
COPY seed_merchant_dictionary.json ./

# Copy Next.js app
COPY pdf-insights-app ./pdf-insights-app

# Install Node dependencies and build
WORKDIR /app/pdf-insights-app
RUN npm install
RUN npm run build

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t finsight .
docker run -p 3000:3000 finsight
```

## 🔄 Git Workflow (Source of Truth)

### Branching Strategy

```bash
main          # Production-ready code
├── develop   # Development branch
├── feature/* # Feature branches
└── hotfix/*  # Urgent fixes
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-bank-parser

# Make changes, test locally
npm run dev  # Test in browser

# Commit changes
git add .
git commit -m "feat: Add BMO bank parser"

# Push to GitHub
git push origin feature/new-bank-parser

# Create Pull Request on GitHub
# After review and approval, merge to main

# Netlify auto-deploys main branch
```

### Hotfix Workflow

```bash
# Create hotfix branch from main
git checkout -b hotfix/fix-cibc-parser main

# Fix issue
git add .
git commit -m "fix: CIBC parser date format"

# Push and create PR
git push origin hotfix/fix-cibc-parser

# Merge to main → Auto-deploy
```

## 📊 Monitoring Deployment

### Netlify Dashboard

- **Deploy logs**: Real-time build output
- **Function logs**: Python serverless function execution
- **Analytics**: Page views, bandwidth (Pro plan)

### Health Checks

Test deployed site:

```bash
# Check homepage
curl https://your-site.netlify.app

# Check API routes (should return 405 Method Not Allowed for GET)
curl https://your-site.netlify.app/api/extract

# Upload test PDF via browser
# Open https://your-site.netlify.app
# Upload a statement and verify full pipeline works
```

## 🐛 Troubleshooting

### Build Fails

**Error**: `Command failed with exit code 1`

**Solution**: Check Netlify build logs for specific error. Common issues:
- Node version mismatch (set to 18 in `netlify.toml`)
- Missing dependencies (ensure `package-lock.json` committed)
- Python version mismatch (set to 3.9 in `netlify.toml`)

### Python Functions Timeout

**Error**: `Function invocation timed out`

**Solution**:
- Netlify free tier has 10s function timeout
- Upgrade to Pro for 26s timeout
- Or optimize Python scripts for faster processing

### Large File Upload Fails

**Error**: `413 Payload Too Large`

**Solution**: Increase body size limit in `next.config.ts`:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '20mb', // Adjust as needed
  },
},
```

### Environment Variables Not Working

**Solution**: Ensure variables are set in Netlify dashboard under Site settings → Environment variables, then redeploy.

## 🔒 Security Checklist

- [ ] No API keys committed to Git
- [ ] Environment variables use Netlify's encrypted storage
- [ ] HTTPS enabled (automatic on Netlify)
- [ ] CORS configured correctly
- [ ] File upload size limits enforced
- [ ] PII scrubbing active in all code paths

## 📱 Custom Domain Setup

1. Buy domain (e.g., `finsight.app`)
2. In Netlify dashboard: Site settings → Domain management
3. Add custom domain
4. Update DNS records (Netlify provides instructions)
5. Enable HTTPS (automatic via Let's Encrypt)

## ✅ Post-Deployment Verification

```bash
# Test full workflow
1. Visit https://your-site.netlify.app
2. Upload a sample PDF statement
3. Verify extraction works
4. Review low-confidence transactions
5. Correct a merchant
6. View insights page
7. Download CSV report
8. Test dark mode toggle
```

---

## 🎉 Deployment Complete!

Your FinSight instance is now live. Users can:
- Upload statements privately
- Get instant insights
- Export CSV reports
- All processing happens locally (Python runs serverless, data never stored)

### Next Steps

- Set up monitoring (Sentry, LogRocket, etc.)
- Add analytics (privacy-respecting, like Plausible)
- Create user feedback form
- Plan feature roadmap
- Document API for contributors

---

**Questions?** Open an issue on GitHub or check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details.
