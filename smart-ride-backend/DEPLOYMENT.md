# Smart Ride Backend — Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway account (railway.app)
- Razorpay account
- Gmail with App Password enabled
- Google Cloud Console account (for Maps API) OR Mappls account

## Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "feat: Smart Ride backend complete"
git remote add origin https://github.com/yourusername/smart-ride-backend.git
git push -u origin main
```

## Step 2: Railway Setup
1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Railway auto-detects Node.js via nixpacks.toml

## Step 3: Add PostgreSQL
1. In Railway project → New Service → Database → PostgreSQL
2. Railway auto-sets DATABASE_URL in your app service (check Variables tab)

## Step 4: Set Environment Variables
Go to Variables tab of your app service in Railway and set the following:
- `NODE_ENV=production`
- `JWT_SECRET` (Use `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` to generate)
- `JWT_EXPIRES_IN=7d`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `FRONTEND_URL` (e.g. `https://smart-ride.vercel.app`)
- `MAP_PROVIDER=google`
- `GOOGLE_MAPS_API_KEY`

## Step 5: Run Database Schema
```bash
# Install Railway CLI on your local machine
npm install -g @railway/cli

# Login to your railway account
railway login

# Link your project locally
railway link

# Run schemas and migrations against production DB
railway run npm run migrate
railway run psql $DATABASE_URL -f src/config/migrations/001_add_invoice_html.sql
railway run npm run migrate:indexes

# Seed the production DB (optional, but creates admin)
railway run npm run seed
```

## Step 6: Verify Deployment
- Health check: `https://your-app.railway.app/api/health`
- Expected response: `{ status: 'ok', database: 'healthy' }`

## Step 7: Configure Razorpay Webhook
- URL: `https://your-app.railway.app/api/payments/webhook`
- Events: `payment.captured`, `payment.failed`, `refund.processed`

## Troubleshooting
- **Build fails:** Check Node version in `nixpacks.toml` and ensure package.json has all dependencies.
- **Port issue:** Do not set PORT manually in Railway; it handles it automatically.
- **CORS error:** Ensure `FRONTEND_URL` exactly matches your frontend URL (no trailing slash).
- **App crash:** Check the Railway deployment logs. The `validateEnv.js` script will clearly log any missing environment variables.
