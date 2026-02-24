# Vercel 404 Error Debugging Guide - papar-studio

## Root Cause Analysis

Your project is a **Vite-based React application** (NOT Next.js), and the 404 error occurs because there's no `vercel.json` configuration file to handle **SPA (Single Page Application) routing**.

### The Problem

When visiting `https://papar-studio.vercel.app/apps/project4`:
1. Vercel's server looks for a file at `/apps/project4` 
2. This file doesn't exist (it's a client-side route handled by React Router)
3. Vercel returns a 404 error
4. The browser never loads the JavaScript to handle the routing

---

## Project Configuration Summary

| Property | Value |
|----------|-------|
| **Framework** | Vite + React 18 |
| **Router** | React Router DOM (v6.21.0) |
| **Build Command** | `vite build` |
| **Output Directory** | `dist` |
| **Routes** | `/`, `/editor/:id`, `/view/:id`, `/apps/:id` |

---

## Solution 1: Create vercel.json (Recommended)

Create a `vercel.json` file in the project root with SPA redirect configuration:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

This tells Vercel to serve `index.html` for all routes, allowing React Router to handle the routing.

### Alternative configurations:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/" }
  ]
}
```

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/" }
  ]
}
```

---

## Solution 2: Use Vercel CLI (Alternative)

If you prefer not to create a config file, you can configure the project using the Vercel dashboard:

1. Go to your project on Vercel
2. Navigate to **Settings → General**
3. Under **Build & Development Settings**:
   - Framework Preset: `Vite` (or Other)
   - Build Command: `npm run build` or `vite build`
   - Output Directory: `dist`
4. Save changes
5. Redeploy

---

## Solution 3: Update package.json

You can also add Vercel-specific configuration to `package.json`:

```json
{
  "name": "papar-studio",
  "vercel": {
    "builds": [
      {
        "src": "package.json",
        "use": "@vercel/static-build"
      }
    ],
    "routes": [
      { "handle": "filesystem" },
      { "src": "/.*", "dest": "/" }
    ]
  }
}
```

---

## Detailed Debugging Steps

### Step 1: Verify Build Output
```bash
npm run build
```
- Check that the `dist` folder is created
- Verify `dist/index.html` exists
- Ensure all assets are generated in `dist/assets/`

### Step 2: Test Locally with Preview
```bash
npm run preview
```
- Visit `http://localhost:4173/apps/test`
- Verify the route works locally

### Step 3: Check Vercel Deployment Settings
1. Log in to Vercel Dashboard
2. Select your project
3. Go to **Settings → General**
4. Verify:
   - **Build Command**: `npm run build` or `vite build`
   - **Output Directory**: `dist` (NOT `.next`)
   - **Install Command**: `npm install` (or your package manager)

### Step 4: Check for Environment Variables
If your app uses environment variables:
1. Go to **Settings → Environment Variables**
2. Ensure all required variables are set
3. Variables starting with `VITE_` are exposed to the client

### Step 5: Check for API Routes
If you have serverless functions:
- Ensure they're in the `/api` directory
- API routes must be configured separately

---

## Route Structure Mapping

Your React Router routes:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Dashboard | Main landing page |
| `/editor/:id` | EditorPage | Project editor |
| `/view/:id` | Viewer | Project viewer |
| `/apps/:id` | AppRunner | Published AR app |

The URL `https://papar-studio.vercel.app/apps/project4` maps to the `/apps/:id` route where `id = "project4"`.

---

## Common Causes of 404 Errors on Vercel

| Cause | Solution |
|-------|----------|
| Missing vercel.json | Add SPA rewrite rules |
| Wrong output directory | Set to `dist` for Vite |
| Wrong build command | Use `vite build` |
| Framework misconfiguration | Set Framework Preset to "Vite" or "Other" |
| File case sensitivity | Linux is case-sensitive; check file names |
| Missing assets | Verify build output includes all files |
| Route conflicts | Check for static files matching routes |

---

## Verification Checklist

After applying the fix:

- [ ] `vercel.json` exists in project root
- [ ] Build completes successfully (`npm run build`)
- [ ] `dist/index.html` is generated
- [ ] Vercel settings show correct build command
- [ ] Vercel settings show `dist` as output directory
- [ ] Redeploy triggers new build
- [ ] `https://papar-studio.vercel.app/` loads
- [ ] `https://papar-studio.vercel.app/apps/project4` loads without 404
- [ ] All routes work (editor, viewer, apps)

---

## Next Steps

1. **Create `vercel.json`** with the SPA redirect configuration
2. **Commit and push** to your Git repository
3. **Vercel will automatically deploy** on the next push
4. **Verify** the `/apps/project4` route works

If the issue persists after adding `vercel.json`, check the Vercel deployment logs for any build errors or misconfigurations.
