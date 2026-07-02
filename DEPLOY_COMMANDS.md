# Smart Ride — Complete Deployment Commands

> Every command needed to go from zero to deployed, in exact order.

---

## Prerequisites Check

```bash
node --version    # Must be >= 18
npm --version     # Must be >= 9
git --version     # Any recent version
psql --version    # PostgreSQL client (for running schema)
```

---

## Step 1: Clone and Install

### Backend

```bash
git clone https://github.com/yourusername/smart-ride-backend.git
cd smart-ride-backend
npm install
cp .env.example .env
# Edit .env with your values before continuing
```

### Frontend

```bash
git clone https://github.com/yourusername/smart-ride-frontend.git
cd smart-ride-frontend
npm install
cp .env.example .env.local
# Edit .env.local with your values before continuing
```

---

## Step 2: Database Setup

```bash
# Create database
createdb smartride

# Run complete schema (all tables + indexes + default data)
psql smartride -f src/config/schema.sql

# Run all migrations safely
npm run migrate:safe

# Verify tables created
psql smartride -c "\dt"
# Should show 12 tables

# Seed with test data
npm run seed

# Seed with demo data (rich data for client demo)
npm run demo:seed
```

---

## Step 3: Generate Required Keys

```bash
# Generate VAPID keys for push notifications
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY='+k.publicKey); console.log('VAPID_PRIVATE_KEY='+k.privateKey);"
# Copy output to .env

# Generate strong JWT secret
node -e "console.log('JWT_SECRET='+require('crypto').randomBytes(64).toString('hex'))"
# Copy output to .env

# Generate PWA icons
cd smart-ride-frontend
node public/icons/generate-icons.js
```

---

## Step 4: Local Test Run

```bash
# Terminal 1: Backend
cd smart-ride-backend
npm run dev
# Should see: Smart Ride server running on port 5000

# Terminal 2: Frontend
cd smart-ride-frontend
npm start
# Should see: Compiled successfully, browser opens localhost:3000

# Terminal 3: Verify health
curl http://localhost:5000/api/health
# Should see: { "data": { "status": "ok", "database": "healthy" } }
```

---

## Step 5: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (or link existing)
railway init
# OR: railway link [project-id]

# Push code
git add . && git commit -m "deploy: production ready" && git push origin main
# Railway auto-deploys from GitHub

# Run migrations on Railway database
railway run npm run migrate:safe

# Run seed on Railway
railway run npm run seed

# Check logs
railway logs

# Get your backend URL
railway status
```

---

## Step 6: Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd smart-ride-frontend
vercel --prod

# Set environment variables (do this in Vercel dashboard or CLI)
vercel env add REACT_APP_API_URL production
# Enter: https://your-backend.railway.app/api

# Set all other REACT_APP_ variables same way
# Then redeploy to pick up env vars
vercel --prod
```

---

## Step 7: Post-Deployment Verification

```bash
# Check backend health
curl https://your-backend.railway.app/api/health

# Check frontend loads
open https://your-app.vercel.app

# Run quality check
chmod +x scripts/quality-check.sh
./scripts/quality-check.sh

# Check Lighthouse score (use Chrome DevTools)
# Target: Performance 85+, PWA 95+, Accessibility 90+
```

---

## Step 8: Configure External Services

### Razorpay Webhook

1. Razorpay Dashboard → Settings → Webhooks
2. URL: `https://your-backend.railway.app/api/payments/webhook`
3. Events: `payment.captured`, `payment.failed`, `refund.processed`
4. Copy webhook secret → set as `RAZORPAY_WEBHOOK_SECRET` in Railway

### Google Maps API Key Restriction

1. console.cloud.google.com → Credentials → Your API Key
2. Application restrictions → HTTP referrers
3. Add: `https://your-app.vercel.app/*` and `https://your-backend.railway.app/*`

### Gmail App Password

1. myaccount.google.com → Security → 2-Step Verification → App passwords
2. Create password for "Smart Ride"
3. Copy 16-char password → `EMAIL_PASS` in Railway

---

## Rollback Commands (if something goes wrong)

```bash
# Railway: redeploy previous version
railway rollback

# Vercel: rollback to previous deployment
vercel rollback

# Database: restore from Railway backup
# Railway Dashboard → Database → Backups → Restore
```

---

> **Tip:** After first deployment, subsequent deploys are automatic via GitHub push.
> Just `git push origin main` and both Railway and Vercel will redeploy.
