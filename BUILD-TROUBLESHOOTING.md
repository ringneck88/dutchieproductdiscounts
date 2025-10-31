# Build Troubleshooting Guide

## ✅ Fixed: `tsc: not found` Error

**Problem:** TypeScript compiler (`tsc`) not found during build.

**Root Cause:** TypeScript is in `devDependencies` but Docker/Railway was only installing production dependencies.

**Solution:** We've fixed this with three approaches:

---

## Solution 1: Updated Dockerfile (Simple)

**File:** `Dockerfile`

**What changed:**
```dockerfile
# Before (broken):
RUN npm ci --only=production  # Skips devDependencies
RUN npm run build             # Fails - no TypeScript!

# After (fixed):
RUN npm ci                    # Installs ALL dependencies
RUN npm run build             # Works! TypeScript available
RUN npm prune --production    # Clean up after build
```

**Result:** Builds successfully, final image is still small.

---

## Solution 2: Multi-stage Dockerfile (Optimal)

**File:** `Dockerfile.multistage`

**What it does:**
1. **Stage 1 (Builder):** Installs all deps, builds TypeScript
2. **Stage 2 (Runtime):** Copies only built files + prod deps

**Benefits:**
- Smallest final image
- Fastest runtime
- Most efficient

**To use:**
```bash
docker build -t dutchie-sync -f Dockerfile.multistage .
```

---

## Solution 3: Railway Configuration (Easiest)

**Files Created:**
- `railway.toml` - Railway project config
- `nixpacks.toml` - Build instructions for Railway
- `.railwayignore` - Exclude unnecessary files

**What these do:**
- Tell Railway to install all dependencies
- Run TypeScript build
- Start the correct command

**Railway will automatically use these files!**

---

## How Railway Builds Work

Railway uses **Nixpacks** (not Docker) by default:

```
1. Detect: "Oh, this is a Node.js project"
2. Setup: Install Node.js 18
3. Install: npm ci (with our config: includes devDependencies)
4. Build: npm run build (TypeScript → JavaScript)
5. Start: npm start (runs compiled code)
```

Our `nixpacks.toml` ensures step 3 includes devDependencies.

---

## Alternative: Move TypeScript to Dependencies

If you still have issues, you can move TypeScript to regular dependencies:

**Edit `package.json`:**
```json
{
  "dependencies": {
    "axios": "^1.6.2",
    "typescript": "^5.3.3",  // Move from devDependencies
    "ts-node": "^10.9.2"      // Move from devDependencies
  },
  "devDependencies": {
    "@types/node": "^20.10.0"
  }
}
```

**Pros:**
- Guaranteed to work everywhere
- Simpler to understand

**Cons:**
- Slightly larger final package
- Not "proper" separation of concerns

---

## Testing Builds Locally

### Test with Docker (Simple)
```bash
docker build -t dutchie-sync .
docker run --env-file .env dutchie-sync
```

### Test with Docker (Multi-stage)
```bash
docker build -t dutchie-sync -f Dockerfile.multistage .
docker run --env-file .env dutchie-sync
```

### Test with Railway CLI
```bash
npm install -g @railway/cli
railway login
railway run npm run build
```

---

## Common Build Errors & Solutions

### Error: `Cannot find module 'typescript'`

**Cause:** TypeScript not installed.

**Fix:**
```bash
npm install typescript --save-dev
# or move to dependencies:
npm install typescript
```

### Error: `tsc: command not found`

**Cause:** TypeScript binary not in PATH.

**Fix:** Use `npx`:
```json
{
  "scripts": {
    "build": "npx tsc"  // Instead of just "tsc"
  }
}
```

### Error: `Cannot find tsconfig.json`

**Cause:** TypeScript config not copied to build.

**Fix:** Ensure Dockerfile copies it:
```dockerfile
COPY tsconfig.json ./
```

### Error: `Module not found` after build

**Cause:** Source files not copied.

**Fix:** Ensure Dockerfile copies src:
```dockerfile
COPY src ./src
```

---

## Railway-Specific Issues

### Build Succeeds but Deploy Fails

**Check:**
1. Environment variables set?
2. Redis plugin connected?
3. Correct start command?

**Railway Dashboard:**
- Settings → Start Command: `npm start`
- Or: `node dist/index.js`

### Build Times Out

**Cause:** Installing too many dependencies or slow build.

**Fix:**
```toml
# nixpacks.toml
[phases.install]
cmds = ["npm ci --prefer-offline"]  # Use cache
```

### Wrong Node Version

**Fix:**
```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]  # Specify version
```

---

## Verification Checklist

After fixing, verify:

✅ `npm run build` works locally
✅ `dist/` folder created with `.js` files
✅ Docker build succeeds (if using Docker)
✅ Railway build succeeds (check logs)
✅ Service starts without errors

---

## Quick Reference

| File | Purpose |
|------|---------|
| `Dockerfile` | Simple Docker build |
| `Dockerfile.multistage` | Optimized Docker build |
| `railway.toml` | Railway project config |
| `nixpacks.toml` | Railway build instructions |
| `.railwayignore` | Exclude files from deploy |
| `package.json` | Dependencies & scripts |
| `tsconfig.json` | TypeScript config |

---

## Still Having Issues?

1. **Check Railway logs:**
   ```bash
   railway logs --tail 100
   ```

2. **Verify files are committed:**
   ```bash
   git status
   git add railway.toml nixpacks.toml
   git commit -m "Add Railway config"
   git push
   ```

3. **Try manual build:**
   ```bash
   npm ci
   npm run build
   npm start
   ```

4. **Check Railway docs:**
   - https://docs.railway.app/deploy/builds
   - https://nixpacks.com/docs

---

## Summary

✅ **Problem:** TypeScript not found during build
✅ **Cause:** Only production deps installed, TypeScript in devDeps
✅ **Solution:** Install all deps, build, then prune
✅ **Files:** Dockerfile updated, Railway configs added
✅ **Result:** Builds successfully on Railway and Docker

🎉 Your build should now work!
