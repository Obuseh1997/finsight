# Railway Deployment Guide

This guide explains how to deploy the Python API backend to Railway.

## Architecture Overview

The application is split into two services:

1. **Frontend (Netlify)** - Next.js app that serves the UI
2. **Backend (Railway)** - Python Flask API that handles PDF processing

```
User → Next.js (Netlify) → Python API (Railway) → PDF Processing → Response
```

## Files Created for Railway

- **`api_server.py`** - Flask API server with endpoints for extract, merge, insights, learn-merchant
- **`requirements-api.txt`** - Python dependencies for the API server
- **`Procfile`** - Tells Railway how to start the server
- **`railway.json`** - Railway-specific configuration

## Deployment Steps

### 1. Create Railway Account

1. Go to https://railway.app/
2. Sign up with your GitHub account
3. Verify your email

### 2. Create New Project from GitHub

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub
4. Select your `Obuseh1997/finsight` repository
5. Railway will detect it's a Python project

### 3. Configure Environment

Railway auto-detects Python and will:
- Install dependencies from `requirements-api.txt`
- Use the `Procfile` to start the server
- Set the `PORT` environment variable automatically

**No additional configuration needed!**

### 4. Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. Railway will show deployment logs
4. Once deployed, you'll get a URL like: `https://finsight-production.up.railway.app`

### 5. Get Your API URL

1. In Railway dashboard, click on your deployment
2. Go to "Settings" tab
3. Scroll to "Domains"
4. Copy the generated domain (e.g., `https://finsight-production.up.railway.app`)

### 6. Configure Netlify with Railway URL

1. Go to Netlify dashboard
2. Select your `finsight` project
3. Go to "Site settings" → "Environment variables"
4. Click "Add a variable"
5. Add:
   - **Key**: `PYTHON_API_URL`
   - **Value**: `https://finsight-production.up.railway.app` (your Railway URL)
6. Click "Save"
7. Trigger a new deploy: Deployments → Trigger deploy → Clear cache and deploy

## Auto-Deployment

Railway is now connected to your GitHub repository:

- **Every push to `main`** triggers automatic deployment to Railway
- Netlify also auto-deploys on push
- Both services stay in sync automatically

## Testing the API

### Health Check

```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "finsight-api",
  "version": "1.0.0"
}
```

### Test PDF Extraction (requires base64-encoded PDF)

```bash
curl -X POST https://your-railway-url.up.railway.app/api/extract \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{
      "name": "test.pdf",
      "data": "BASE64_ENCODED_PDF_HERE"
    }]
  }'
```

## Railway Free Tier Limits

- **500 hours/month** execution time
- **100 GB** outbound bandwidth
- **Cold starts**: Service sleeps after 10 minutes of inactivity
  - First request after sleep: ~10-20 seconds
  - Subsequent requests: Normal speed (2-5 seconds for PDF processing)

**For personal use, this is more than enough!**

## Monitoring

### View Logs

1. Railway dashboard → Your project
2. Click "Deployments" tab
3. Click on latest deployment
4. View real-time logs

### Check Metrics

1. Railway dashboard → Your project
2. Click "Metrics" tab
3. See CPU, memory, and network usage

## Troubleshooting

### Build Fails

**Check build logs in Railway dashboard**

Common issues:
- Missing dependencies in `requirements-api.txt`
- Python syntax errors in `api_server.py`
- Python version mismatch (Railway uses Python 3.11 by default)

### API Returns 500 Errors

**Check application logs in Railway**

Common issues:
- Python scripts not found (check file paths in `api_server.py`)
- Missing seed data files (`seed_merchant_dictionary.json`)
- Python runtime errors

### Cold Start Taking Too Long

**This is normal behavior on free tier**

Solutions:
- Upgrade to Railway Pro ($5/month) for no cold starts
- Keep service warm with periodic pings (cron job)
- Accept 10-20 second delay on first request

### CORS Errors

**If you see CORS errors in browser console**

Check `api_server.py` line 18-24:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "https://*.netlify.app"],
        ...
    }
})
```

Make sure your Netlify domain is allowed.

## Environment Variables (Optional)

You can add environment variables in Railway dashboard:

1. Go to your project
2. Click "Variables" tab
3. Add variables:
   - `FLASK_ENV=production`
   - `LOG_LEVEL=INFO`
   - etc.

## Cost Optimization

**To stay within free tier:**

1. **Monitor usage**: Check Railway dashboard weekly
2. **Optimize cold starts**: Accept them for personal use
3. **Efficient processing**: Python scripts are already optimized
4. **Bandwidth**: PDFs and JSON are small, won't hit limits

**When to upgrade ($5/month):**
- Using app daily (cold starts annoying)
- Sharing with friends/family
- Need faster response times

## Updating the API

**To deploy changes:**

```bash
# Make changes to api_server.py or Python scripts
git add .
git commit -m "fix: Update Python API"
git push origin main

# Railway auto-deploys (2-3 minutes)
# Netlify auto-deploys (2-3 minutes)
```

## Local Development

**Run Python API locally:**

```bash
# Install dependencies
pip3 install -r requirements-api.txt

# Start API server
python3 api_server.py
# Server runs on http://localhost:8000
```

**Run Next.js frontend locally:**

```bash
cd pdf-insights-app
npm run dev
# Frontend runs on http://localhost:3000
# Calls Railway API in production
# Calls localhost:8000 in development
```

## Summary

**Deployment Flow:**
1. Push code to GitHub
2. Railway builds and deploys Python API (~2 minutes)
3. Netlify builds and deploys Next.js app (~2 minutes)
4. User uploads PDF → Netlify → Railway → Processes → Returns data

**URLs:**
- **Frontend**: https://finsight-[id].netlify.app
- **Backend API**: https://finsight-production.up.railway.app
- **Health check**: https://finsight-production.up.railway.app/health

**You're done! 🎉**
