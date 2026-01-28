# SeatHarmony - Vercel Deployment Guide

This guide walks you through deploying SeatHarmony to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (free tier works)
2. [Vercel CLI](https://vercel.com/cli) installed (optional, but recommended)
3. All required API keys (see below)

## Required API Keys

Before deploying, ensure you have:

### Backend (.env variables)
- **GROQ_API_KEY**: Get from [console.groq.com/keys](https://console.groq.com/keys) (free)
- **WLSACCESSID, WLSSECRET, LICENSEID**: Get from [gurobi.com/academia](https://www.gurobi.com/academia/) (free for academics)

### Frontend (.env variables)
- **GEMINI_API_KEY**: (Optional) Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **VITE_API_BASE**: Will be set to your Vercel deployment URL

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your SeatHarmony repository
   - Vercel will auto-detect settings from `vercel.json`

3. **Configure Environment Variables**

   In the Vercel dashboard, go to Settings → Environment Variables and add:

   **Production Environment:**
   ```
   GROQ_API_KEY=your_groq_api_key
   WLSACCESSID=your_wls_access_id
   WLSSECRET=your_wls_secret
   LICENSEID=your_license_id
   GEMINI_API_KEY=your_gemini_api_key (optional)
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://your-app.vercel.app`

5. **Update Frontend API Base**
   - Go back to Settings → Environment Variables
   - Add: `VITE_API_BASE=https://your-app.vercel.app`
   - Redeploy to apply changes

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add GROQ_API_KEY
   vercel env add WLSACCESSID
   vercel env add WLSSECRET
   vercel env add LICENSEID
   vercel env add GEMINI_API_KEY
   vercel env add VITE_API_BASE
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Project Structure

```
SeatHarmony/
├── frontend/           # React + Vite frontend
│   ├── dist/          # Build output (auto-generated)
│   └── .env.example   # Environment template
├── backend/           # FastAPI backend
│   ├── api.py         # Main API logic
│   └── .env.example   # Environment template
├── api/               # Vercel serverless functions
│   └── index.py       # API wrapper for Vercel
├── vercel.json        # Vercel configuration
└── .vercelignore      # Files to exclude from deployment
```

## Configuration Files

### vercel.json
Configures Vercel to:
- Build the frontend with Vite
- Route `/api/*` requests to Python serverless functions
- Serve static files from `frontend/dist`
- Handle SPA routing (all routes → index.html)

### api/index.py
Wraps the FastAPI app for Vercel's serverless function runtime.

## Post-Deployment Checklist

- [ ] Verify frontend loads at your Vercel URL
- [ ] Test API endpoints (e.g., `/api/layouts/generate`)
- [ ] Check that environment variables are set correctly
- [ ] Test guest import functionality
- [ ] Test AI seating generation
- [ ] Test PDF/Excel export features
- [ ] Set up custom domain (optional)

## Troubleshooting

### Build Fails

**Issue**: `Module not found` errors
- **Solution**: Ensure `requirements.txt` and `package.json` are up to date

**Issue**: Python version mismatch
- **Solution**: Vercel uses Python 3.9 by default. If needed, add `runtime.txt`:
  ```
  python-3.10
  ```

### API Requests Fail

**Issue**: CORS errors
- **Solution**: The FastAPI app already has CORS middleware configured in `backend/api.py`

**Issue**: 500 errors on API calls
- **Solution**: Check Vercel function logs: Settings → Functions → View Logs

### Environment Variables Not Working

**Issue**: App can't access env vars
- **Solution**: Ensure variables are added in Vercel dashboard and you've redeployed

## Performance Optimization

1. **Enable Edge Caching**
   - Add cache headers for static assets
   - Consider using Vercel Edge Config for frequently accessed data

2. **Optimize Bundle Size**
   - The Vite config already includes code splitting for React
   - Review bundle size: `cd frontend && npm run build`

3. **Monitor Function Execution**
   - Check function duration in Vercel dashboard
   - Optimize slow API endpoints if needed

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically redeploy on push to main branch.

## Custom Domain

To use a custom domain:

1. Go to your project in Vercel dashboard
2. Settings → Domains
3. Add your domain and follow DNS configuration steps

## Support

- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- Vercel Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- SeatHarmony Issues: [github.com/your-repo/issues](https://github.com/your-username/SeatHarmony/issues)

## Cost Considerations

**Vercel Free Tier includes:**
- 100 GB bandwidth
- 6,000 minutes of serverless function execution
- Automatic HTTPS
- Continuous deployment

For most use cases, the free tier is sufficient. Monitor usage in the Vercel dashboard.

---

**Note**: Gurobi optimization may have longer cold start times (~5-10 seconds) on the first API call. Subsequent calls will be faster due to Vercel's function caching.
