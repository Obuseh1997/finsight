# Deployment Validation Guide

This guide explains how to validate your changes before deploying to prevent broken deployments.

## Why Validation Matters

Every deployment goes through these steps:
1. **Build** - Compile TypeScript, bundle Next.js app
2. **Test** - Run type checks
3. **Deploy** - Upload to Netlify/Vercel

If any step fails in production, your site goes down. **Validate locally first** to catch issues before pushing.

## Automated Validation (Recommended)

### Pre-Push Hook

A Git hook automatically validates before every `git push`:

```bash
git push origin main
# Automatically runs:
# 1. Node.js version check
# 2. Python dependency check
# 3. Next.js build
# 4. TypeScript type check
# 5. Critical file verification
```

If validation fails, the push is blocked until you fix the issues.

**Location**: `.git/hooks/pre-push`

### Manual Validation

Run validation anytime without pushing:

```bash
./validate_deployment.sh
```

This runs all checks and shows detailed output.

## What Gets Validated

### 1. Node.js Version Check
- **Local version**: Your machine's Node.js
- **Netlify version**: From `netlify.toml`
- **Why**: Next.js 16 requires Node.js >= 20.9.0

**Common Issue**:
```
⚠️  Warning: Local Node.js is older than Netlify requirement (20.9.0)
```

**Fix**: Update Node.js or match `netlify.toml` to your local version

### 2. Python Dependencies
- **Checks**: pdfplumber, python-dateutil
- **Why**: Required for PDF extraction in production

**Common Issue**:
```
⚠️  pdfplumber not installed (required for production)
```

**Fix**:
```bash
pip3 install pdfplumber python-dateutil
```

### 3. Next.js Production Build
- **What**: Runs `npm run build` in `pdf-insights-app`
- **Why**: Catches TypeScript errors, build failures

**Common Issues**:
- Type errors in `.tsx` files
- Missing dependencies
- Build configuration errors

**Fix**: Check error output, fix the specific file mentioned

### 4. TypeScript Type Check
- **What**: Runs `npx tsc --noEmit`
- **Why**: Catches type errors without building

**Common Issue**:
```
error TS2339: Property 'original_description' does not exist on type 'Transaction'
```

**Fix**: Update type definitions in `lib/types.ts` or fix the code

### 5. Critical Files Check
Verifies these files exist:
- `netlify.toml` - Deployment configuration
- `requirements.txt` - Python dependencies
- `pdf-insights-app/package.json` - Node dependencies
- `pdf-insights-app/next.config.ts` - Next.js config
- `extract-pdfplumber.py` - PDF parser
- `build_dictionary.py` - Merchant dictionary builder
- `match_merchants.py` - Merchant matcher

## Deployment Workflow

### ✅ Correct Workflow (with validation)

```bash
# 1. Make changes
git add .
git commit -m "feat: Add new feature"

# 2. Validate (optional - hook does this automatically)
./validate_deployment.sh

# 3. Push (validation runs automatically)
git push origin main

# If validation passes:
# → Push succeeds
# → Netlify auto-deploys
# → Site updates in 2-3 minutes

# If validation fails:
# → Push blocked
# → Fix errors
# → Try again
```

### ❌ Common Mistakes

**Mistake 1: Pushing without building locally**
```bash
git add .
git commit -m "fix: Update types"
git push origin main
# ❌ Fails in Netlify with type errors
```

**Why it happens**: Code works on your machine but has build errors in production

**Fix**: Run `./validate_deployment.sh` first

**Mistake 2: Different Node.js versions**
```bash
# Local: Node.js 18
# Netlify: Node.js 20.9.0
# ❌ Builds locally, fails in Netlify
```

**Fix**: Update `netlify.toml` to match your local version OR upgrade local Node.js

**Mistake 3: Missing dependencies**
```bash
# You: pip3 install pdfplumber (local only)
# Netlify: Doesn't have pdfplumber
# ❌ Works locally, fails in production
```

**Fix**: Ensure `requirements.txt` lists all Python dependencies

## Bypassing Validation (Emergency Only)

If you need to push without validation (NOT recommended):

```bash
git push origin main --no-verify
```

**When to use**:
- Emergency hotfix
- You know validation is wrong
- Testing deployment configuration changes

**Warning**: Can break production deployment!

## Troubleshooting Validation Failures

### Build fails with "Command not found: next"

**Cause**: npm dependencies not installed in `pdf-insights-app`

**Fix**:
```bash
cd pdf-insights-app
npm install
cd ..
./validate_deployment.sh
```

### TypeScript errors in files you didn't change

**Cause**: Dependency update broke types

**Fix**:
```bash
cd pdf-insights-app
npm update
npx tsc --noEmit  # See specific errors
```

### Python dependencies not found

**Cause**: Virtual environment not activated or packages not installed

**Fix**:
```bash
pip3 install pdfplumber python-dateutil
./validate_deployment.sh
```

### Validation passes but deployment still fails

**Possible causes**:
1. **Environment differences**: Netlify uses different OS (Linux) vs your machine (macOS/Windows)
2. **Missing environment variables**: Production needs variables not in repo
3. **Netlify configuration**: Issue with `netlify.toml`

**Debug steps**:
1. Check Netlify build logs for exact error
2. Compare local build output to Netlify output
3. Test with same Node.js version as Netlify (`nvm use 20.9.0`)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./validate_deployment.sh` | Run all validation checks |
| `cd pdf-insights-app && npm run build` | Test Next.js build only |
| `cd pdf-insights-app && npx tsc --noEmit` | Test TypeScript only |
| `git push origin main` | Push with automatic validation |
| `git push origin main --no-verify` | Push without validation (dangerous) |

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs the same checks on every push:

```yaml
- Run TypeScript type check
- Build Next.js app
```

This provides a second layer of validation before Netlify deployment.

**Status**: Check GitHub Actions tab to see if checks passed

## Best Practices

1. **Always run validation before pushing**
   - Pre-push hook does this automatically
   - Catches 90% of deployment issues

2. **Keep local environment similar to production**
   - Use Node.js version from `netlify.toml`
   - Install Python dependencies from `requirements.txt`

3. **Test builds locally after major changes**
   - After updating dependencies
   - After changing configuration files
   - After TypeScript type changes

4. **Monitor deployment logs**
   - Even with validation, check Netlify build logs
   - Catch environment-specific issues early

5. **Document configuration changes**
   - Update this guide when adding new checks
   - Update `netlify.toml` comments

## Summary

**The 404 errors you encountered happened because**:
1. Configuration pushed without local testing
2. Node.js version mismatch (18 vs 20.9.0)
3. Redirect rules conflicting with Next.js routing

**Now with validation**:
- Pre-push hook catches issues before they reach production
- Failed builds don't get deployed
- Faster iteration (no waiting for Netlify to fail)

**Remember**: `./validate_deployment.sh` is your friend! Run it before every push.
