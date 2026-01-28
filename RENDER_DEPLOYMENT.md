# SeatHarmony - Render Deployment Guide

Complete guide for deploying both frontend and backend to Render.

## Why Render?

- **Excellent Python Support**: Native FastAPI hosting
- **Free Tier**: Both services can run on free tier
- **Auto HTTPS**: Automatic SSL certificates
- **Easy Setup**: Git-based deployments
- **Monorepo Support**: Deploy both services from one repository

---

## Prerequisites

1. A [Render account](https://render.com/signup) (free)
2. Your GitHub repository pushed to main branch
3. API keys ready:
   - Groq API Key
   - Gurobi WLS credentials (WLSACCESSID, WLSSECRET, LICENSEID)
   - Gemini API Key (optional)

---

## Deployment Methods

### Method 1: Hybrid Deployment (Recommended)

Deploy backend via Blueprint, frontend manually.

#### Part A: Deploy Backend (Blueprint)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if not already connected
4. Select the `SeatHarmony` repository
5. Branch: `render-version` (or `main` if you've merged)
6. Click **"Apply"**

Render will detect the `render.yaml` file and create:
- **seatharmony-api** (Web Service - Backend)

**Set Backend Environment Variables:**
1. Go to `seatharmony-api` service → Environment
2. Add these variables:
   ```
   GROQ_API_KEY=your_groq_key
   WLSACCESSID=your_wls_access_id
   WLSSECRET=your_wls_secret
   LICENSEID=your_license_id
   ```

Backend will build automatically (~3-5 minutes). **Note the backend URL** (e.g., `https://seatharmony-api.onrender.com`) - you'll need it for the frontend.

#### Part B: Deploy Frontend (Manual Static Site)

1. In Render Dashboard, click **"New"** → **"Static Site"**
2. Connect repository: `SeatHarmony`
3. Branch: `render-version`

**Configure:**
```
Name: seatharmony-frontend
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/dist
```

**Environment Variables:**
```
VITE_API_BASE_URL=https://seatharmony-api.onrender.com
GEMINI_API_KEY=your_gemini_key (optional)
```

4. Click **"Create Static Site"**

Frontend will build (~2-3 minutes) and deploy automatically.

---

### Method 2: Manual Service Creation

If you prefer manual setup or the blueprint doesn't work:

#### Backend (Web Service)

1. **New Web Service**
   - Click **"New"** → **"Web Service"**
   - Connect repository: `SeatHarmony`
   - Branch: `render-version`

2. **Configure**
   ```
   Name: seatharmony-api
   Runtime: Python 3
   Build Command: pip install -r backend/requirements.txt && pip install -r tree-of-thought-llm/requirements.txt && cd tree-of-thought-llm && pip install -e .
   Start Command: uvicorn backend.api:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment Variables**
   Add the same variables as in Method 1

4. **Create Web Service**

#### Frontend (Static Site)

1. **New Static Site**
   - Click **"New"** → **"Static Site"**
   - Connect repository: `SeatHarmony`
   - Branch: `render-version`

2. **Configure**
   ```
   Name: seatharmony-frontend
   Build Command: cd frontend && npm install && npm run build
   Publish Directory: frontend/dist
   ```

3. **Environment Variables**
   ```
   NODE_VERSION=18.17.0
   VITE_API_BASE_URL=https://seatharmony-api.onrender.com
   GEMINI_API_KEY=your_key (optional)
   ```

4. **Create Static Site**

---

## Post-Deployment

### 1. Verify Backend

Visit: `https://seatharmony-api.onrender.com/docs`

You should see the FastAPI Swagger documentation.

### 2. Verify Frontend

Visit: `https://seatharmony-frontend.onrender.com`

The landing page should load properly.

### 3. Test API Connection

1. Upload a guest list on the frontend
2. Go to Venues → Select a venue
3. Generate recommendations
4. Check if AI features work

### 4. Update README

Once deployed, update your README.md with the live URLs:
```markdown
🌐 **Live Demo**: https://seatharmony-frontend.onrender.com
```

---

## Troubleshooting

### Backend Issues

**Issue**: `ModuleNotFoundError`
- **Solution**: Check build logs, ensure all dependencies in `requirements.txt`
- Verify `tree-of-thought-llm` is being installed correctly

**Issue**: `500 Internal Server Error`
- **Solution**: Check environment variables are set correctly
- View Runtime Logs in Render dashboard
- Verify Gurobi license credentials

**Issue**: Backend takes long to respond
- **Solution**: First request after idle may be slow (cold start on free tier)
- Consider upgrading to paid tier for always-on

### Frontend Issues

**Issue**: "Couldn't reach the ToT backend"
- **Solution**: Verify `VITE_API_BASE_URL` points to correct backend URL
- Check backend is running and healthy
- Ensure CORS is configured (it should be in `backend/api.py`)

**Issue**: Build fails with "command not found"
- **Solution**: Verify build command paths:
  ```bash
  cd frontend && npm install && npm run build
  ```

**Issue**: 404 on routes
- **Solution**: Render should handle SPA routing automatically
- If issues persist, add a `_redirects` file:
  ```
  /*  /index.html  200
  ```

### Environment Variable Issues

**Issue**: Variables not loading
- **Solution**:
  1. Ensure they're added in Render dashboard (not just .env file)
  2. Redeploy after adding variables
  3. For frontend, must start with `VITE_`

---

## Performance Optimization

### Free Tier Limitations

- **Backend**: Spins down after 15 min inactivity (cold starts ~30s)
- **Frontend**: Always available, served from CDN
- **Solution**: Upgrade to paid tier ($7/month per service) for always-on

### Improving Cold Starts

1. **Reduce dependencies**: Only include necessary packages
2. **Use caching**: Render caches dependencies between builds
3. **Keep alive**: Use a cron job to ping your service every 10 minutes

---

## Updating Your Deployment

### Auto-Deploy on Git Push

Render auto-deploys when you push to the connected branch:

```bash
git add .
git commit -m "Update features"
git push origin render-version
```

Both services will rebuild automatically.

### Manual Redeploy

In Render dashboard:
1. Select service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Custom Domain (Optional)

### Add Custom Domain to Frontend

1. Go to `seatharmony-frontend` service
2. Settings → Custom Domain
3. Add your domain (e.g., `seatharmony.com`)
4. Follow DNS configuration instructions

### Add Custom Domain to Backend

1. Go to `seatharmony-api` service
2. Settings → Custom Domain
3. Add subdomain (e.g., `api.seatharmony.com`)
4. Update frontend `VITE_API_BASE_URL` to new domain
5. Redeploy frontend

---

## Cost Breakdown

### Free Tier
- ✅ Backend: 750 hours/month free
- ✅ Frontend: Unlimited bandwidth (100GB free)
- ✅ Automatic HTTPS
- ⚠️ Cold starts after inactivity

### Paid Tier ($7/month per service)
- ✅ Always-on (no cold starts)
- ✅ More compute resources
- ✅ Priority support

**Total for production**: $14/month (or free for demo/testing)

---

## Monitoring & Logs

### View Logs

**Backend Runtime Logs:**
1. Go to `seatharmony-api` service
2. Logs tab
3. Real-time logs of API requests, errors

**Frontend Build Logs:**
1. Go to `seatharmony-frontend` service
2. Logs tab (only shows build logs)

### Health Checks

Render automatically monitors your services:
- Backend: HTTP health check every 60s
- Frontend: Availability monitored by CDN

---

## Security Checklist

- [ ] All API keys stored as environment variables (not in code)
- [ ] `.env` files in `.gitignore`
- [ ] CORS configured correctly in backend
- [ ] HTTPS enabled (automatic on Render)
- [ ] No sensitive data in frontend (anything in `VITE_*` is public!)

---

## Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Community**: [community.render.com](https://community.render.com/)
- **SeatHarmony Issues**: [Your GitHub Issues](https://github.com/your-username/SeatHarmony/issues)

---

## Quick Reference

### Backend URL Format
```
https://your-service-name.onrender.com
```

### Frontend URL Format
```
https://your-site-name.onrender.com
```

### Key Files
- `render.yaml` - Blueprint configuration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node dependencies
- `.env.example` files - Environment variable templates

---

**Ready to deploy? Follow Method 1 (Blueprint) for the fastest setup!**
