# Deploying to Netlify

## Quick Deploy (Drag & Drop)

1. Run the build command:
   ```bash
   npm run build
   ```

2. Go to [Netlify Drop](https://app.netlify.com/drop)

3. Drag and drop the `dist` folder onto the page

4. Your site is live! 🎉

---

## Deploy via Git (Recommended)

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - EWA Admin Portal"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize
4. Select your repository
5. Netlify will auto-detect the settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Click "Deploy site"

### Step 3: (Optional) Set Environment Variables

If you want to enable Claude AI mode for Penny:

1. Go to Site Settings → Environment Variables
2. Add:
   - `VITE_PENNY_AI_MODE` = `claude`
   - `VITE_CLAUDE_API_ENDPOINT` = your backend API URL

---

## Project Structure

```
client-admin-portal/
├── dist/                 # Built files (after npm run build)
├── public/               # Static assets
├── src/                  # Source code
├── netlify.toml          # Netlify configuration
├── _redirects            # SPA routing redirects
├── vite.config.js        # Vite build configuration
├── package.json          # Dependencies
└── .nvmrc                # Node version (18)
```

## Build Settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 18 |

## Features

- ✅ SPA routing (React Router works on all paths)
- ✅ Asset caching (1 year for static files)
- ✅ Security headers configured
- ✅ Mobile responsive design
- ✅ Penny AI Assistant (pattern matching mode)

## Troubleshooting

**Blank page after deploy?**
- Make sure the `_redirects` file or `netlify.toml` redirects are in place

**Routes returning 404?**
- The SPA redirect (`/* → /index.html`) should fix this
- Check that `netlify.toml` was deployed

**Build failing?**
- Ensure Node 18+ is being used
- Check for any TypeScript/ESLint errors locally first
