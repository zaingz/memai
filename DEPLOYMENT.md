# MemAI Deployment Guide

## Quick Start

```bash
# Deploy backend to Encore Cloud
make deploy-backend

# Deploy frontend to Vercel
make deploy-frontend

# Deploy both
make deploy-all
```

---

## Architecture: Monorepo with Git Subtree

This repository uses a **monorepo structure** with **separate deployments** for backend and frontend.

### Directory Structure

```
memai-backend/
├── backend/           # Encore.ts backend
│   ├── encore.app     # Encore configuration
│   ├── bookmarks/     # Bookmarks service
│   ├── users/         # Users service
│   └── package.json
├── frontend/          # React frontend
│   ├── src/
│   └── package.json
├── Makefile          # Deployment automation
└── DEPLOYMENT.md     # This file
```

### Why This Structure?

**Problem**: Encore expects `encore.app` at repository root, but we want separate `backend/` and `frontend/` directories.

**Solution**: Git subtree deployment
- Repository keeps `backend/` and `frontend/` separate
- Deployment uses `git subtree` to extract ONLY `backend/`
- Creates temporary branch where `backend/encore.app` becomes `encore.app` at root
- Pushes this branch to Encore Cloud
- Encore sees the correct structure

---

## Backend Deployment (Encore Cloud)

### Command

```bash
make deploy-backend
```

### What Happens

1. **Git Subtree Split**: Extracts `backend/` directory into temporary branch `backend-deploy`
   ```bash
   git subtree split --prefix=backend -b backend-deploy
   ```

2. **File Structure Transform**:
   ```
   Before (monorepo):          After (backend-deploy branch):
   /backend/encore.app    →    /encore.app
   /backend/bookmarks/    →    /bookmarks/
   /backend/users/        →    /users/
   /frontend/             →    (not included)
   ```

3. **Push to Encore**:
   ```bash
   git push encore backend-deploy:main --force
   ```

4. **Cleanup**:
   ```bash
   git branch -D backend-deploy
   ```

### Manual Deployment

If you need to deploy manually:

```bash
# 1. Split backend into temporary branch
git subtree split --prefix=backend -b backend-deploy

# 2. Push to Encore
git push encore backend-deploy:main --force

# 3. Clean up
git branch -D backend-deploy
```

### Viewing Deployments

- Dashboard: https://app.encore.cloud/memai-backend-cno2/deploys
- Logs: `make logs` or `cd backend && encore logs --env=staging`

---

## Frontend Deployment (Vercel)

### Command

```bash
make deploy-frontend
```

### What Happens

```bash
cd frontend && vercel --prod
```

Vercel CLI:
1. Builds React app with Vite
2. Deploys to Vercel CDN
3. Updates production domain

### Manual Deployment

```bash
cd frontend
vercel --prod
```

---

## Common Issues

### 1. "encore.app not found"

**Cause**: Makefile git subtree deployment was modified or broken

**Fix**:
```bash
# Check Makefile has this:
git subtree split --prefix=backend -b backend-deploy
git push encore backend-deploy:main --force
git branch -D backend-deploy
```

### 2. "unable to resolve module @vitejs/plugin-react"

**Cause**: Encore is trying to compile frontend code

**Fix**: Verify git subtree deployment is working. Frontend should NOT be in the backend-deploy branch.

```bash
# Test subtree split
git subtree split --prefix=backend -b test-backend
git ls-tree -r test-backend --name-only | grep frontend
# Should return nothing (frontend not included)
git branch -D test-backend
```

### 3. Git subtree fails

**Cause**: Uncommitted changes or merge conflicts

**Fix**:
```bash
# Commit or stash changes first
git status
git add .
git commit -m "your message"

# Then deploy
make deploy-backend
```

---

## Development Workflow

### Local Development

```bash
# Backend
make dev-backend
# or
cd backend && encore run

# Frontend
cd frontend && npm run dev
```

### Testing

```bash
# Backend tests
make test
# or
cd backend && encore test

# Type checking
make typecheck
# or
cd backend && npx tsc --noEmit
```

### Database

```bash
# Open database shell
make db-shell
# or
cd backend && encore db shell bookmarks

# View connection URI
cd backend && encore db conn-uri bookmarks
```

---

## Important Notes

### ⚠️ DO NOT

1. **DO NOT** move `backend/` contents to repository root
2. **DO NOT** remove `backend/` or `frontend/` directories
3. **DO NOT** modify the git subtree deployment in Makefile
4. **DO NOT** try to deploy backend without using git subtree

### ✅ DO

1. **DO** use `make deploy-backend` for backend deployment
2. **DO** use `make deploy-frontend` for frontend deployment
3. **DO** keep `backend/` and `frontend/` directories separate
4. **DO** commit changes before deploying

---

## Encore Remote Configuration

The `encore` remote should point to:
```
encore://memai-backend-cno2
```

To verify:
```bash
git remote -v
```

To add if missing:
```bash
encore app link
# Select memai-backend-cno2
```

---

## Troubleshooting

### Check deployment status
```bash
# Via Makefile
make logs

# Direct command
cd backend && encore logs --env=staging
```

### Verify git subtree
```bash
# This should create a clean backend-only branch
git subtree split --prefix=backend -b verify-backend

# Check what's in it (should be only backend files, no frontend)
git ls-tree -r verify-backend --name-only

# Clean up
git branch -D verify-backend
```

### Reset to working state

If deployment is completely broken:

```bash
# 1. Verify repository structure
ls -la
# Should see: backend/ frontend/ Makefile

# 2. Verify backend/encore.app exists
ls -la backend/encore.app

# 3. Check Makefile has git subtree deployment
grep "git subtree" Makefile

# 4. If all correct, deploy
make deploy-backend
```

---

## Summary

- **Monorepo**: Keeps backend and frontend together in one repository
- **Git Subtree**: Deploys ONLY backend to Encore (extracts backend/ to temp branch)
- **Separate Deployments**: Backend → Encore Cloud, Frontend → Vercel
- **Automation**: Use `make deploy-backend` and `make deploy-frontend`
- **Never**: Move files between directories to "fix" deployment

**The structure is intentional. Git subtree handles the complexity. Trust the process.**
