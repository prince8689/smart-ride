# Smart Ride Frontend — Vercel Deployment

## Step 1: Prepare Build
```bash
# Test build locally first
npm run build

# Check build output (should be ~2-5MB)
ls -la build/
```

## Step 2: Push to GitHub
```bash
git init
git add .
git commit -m "feat: Smart Ride frontend complete"
git remote add origin https://github.com/yourusername/smart-ride-frontend.git
git push -u origin main
```

## Step 3: Deploy on Vercel
1. Go to vercel.com → New Project
2. Import from GitHub → select smart-ride-frontend
3. Framework: Create React App (auto-detected)
4. Build Command: npm run build (default)
5. Output Directory: build (default)
6. Click Deploy

## Step 4: Set Environment Variables in Vercel
Go to Project → Settings → Environment Variables → Add:

| Variable | Value |
|----------|-------|
| REACT_APP_API_URL | https://your-backend.railway.app/api |
| REACT_APP_SOCKET_URL | https://your-backend.railway.app |
| REACT_APP_MAP_PROVIDER | google |
| REACT_APP_GOOGLE_MAPS_KEY | your_key |
| REACT_APP_MAPPLS_KEY | your_key |
| REACT_APP_MAPPLS_CLIENT_ID | your_id |
| REACT_APP_RAZORPAY_KEY_ID | rzp_live_xxx |

## Step 5: Redeploy with Environment Variables
Vercel Dashboard → Deployments → Redeploy

## Step 6: Update Backend CORS
In Railway backend env vars:
FRONTEND_URL=https://your-smart-ride.vercel.app

Redeploy backend on Railway.

## Step 7: Verify Deployment
- [ ] Home page loads
- [ ] Login works
- [ ] API calls succeed (no CORS errors in console)
- [ ] Socket.io connects
- [ ] Maps load
- [ ] Payment flow works

## Custom Domain (Optional)
Vercel Dashboard → Project → Settings → Domains → Add your domain

## Troubleshooting

### CORS Error
- Check FRONTEND_URL in Railway matches exact Vercel URL (no trailing slash)
- Redeploy backend after changing env vars

### Blank Page after Deploy
- Check browser console for errors
- Verify vercel.json rewrites are correct
- Check all REACT_APP_ env vars are set

### Socket.io Not Connecting
- Verify REACT_APP_SOCKET_URL is correct (no /api at end)
- Check Railway logs for socket errors

### Maps Not Loading
- Check API key restrictions in Google Cloud Console
- Add Vercel domain to allowed referrers in Google Cloud

### Payment Not Working
- Switch to live Razorpay keys for production
- Update REACT_APP_RAZORPAY_KEY_ID to rzp_live_xxx
