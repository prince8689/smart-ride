# Smart Ride — Quick Reference

> Single-page cheat sheet for the developer maintaining this project.

---

## URLs

| Resource | URL |
|----------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend API | `https://your-backend.railway.app/api` |
| Health Check | `https://your-backend.railway.app/api/health` |
| Admin Monitor | `https://your-backend.railway.app/api/admin/monitor` |

---

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@smartride.in` | `Admin@1234` |
| Commuter | `user1@test.in` | `User@1234` |
| Driver | `driver1@test.in` | `Driver@1234` |

---

## Common Commands

```bash
# Start local backend
cd smart-ride-backend && npm run dev

# Start local frontend
cd smart-ride-frontend && npm start

# Run all tests
npm test

# Run migrations (idempotent — safe to repeat)
npm run migrate:safe

# Fresh demo data
npm run demo:seed

# Seed test data
npm run seed

# Check production logs
railway logs --tail

# Quality check
./scripts/quality-check.sh
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server.js` | Server entry point |
| `src/app.js` | Express app config |
| `src/config/schema.sql` | Complete DB schema |
| `src/config/runMigrations.js` | Idempotent migration runner |
| `src/config/seed.js` | Test/demo data seeder |
| `src/config/db.js` | PostgreSQL pool config |
| `src/config/env.js` | Environment variable loader |
| `src/socket/socket.init.js` | Socket.io setup |
| `src/utils/scheduler.js` | Background jobs |
| `src/App.jsx` | Frontend routing |
| `src/context/AuthContext.jsx` | Auth state |
| `public/sw.js` | Service worker |

---

## Environment Variables Quick Reference

| Variable | Backend/Frontend | Critical? |
|----------|-----------------|-----------|
| `DATABASE_URL` | Backend | ✅ Yes |
| `JWT_SECRET` | Backend | ✅ Yes |
| `RAZORPAY_KEY_SECRET` | Backend | ✅ Yes |
| `RAZORPAY_KEY_ID` | Both | ✅ Yes |
| `FRONTEND_URL` | Backend | ✅ Yes |
| `REACT_APP_API_URL` | Frontend | ✅ Yes |
| `VAPID_PUBLIC_KEY` | Both | For push |
| `VAPID_PRIVATE_KEY` | Backend | For push |
| `GOOGLE_MAPS_API_KEY` | Both | For maps |
| `MAPPLS_API_KEY` | Backend | Alt maps |
| `EMAIL_USER` | Backend | For email |
| `EMAIL_PASS` | Backend | For email |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | For webhooks |
| `MAP_PROVIDER` | Backend | `google` or `mappls` |

---

## Troubleshooting

### Backend not starting

1. Check `.env` file exists and all required vars set
2. Check `DATABASE_URL` is correct
3. Run: `node -e "require('./src/config/db')"` to test DB connection
4. Check Railway logs: `railway logs`

### Frontend blank page

1. Check browser console for errors
2. Verify `REACT_APP_API_URL` is set correctly
3. Check `vercel.json` rewrites are correct
4. Try: `vercel --prod` to redeploy

### Payments not working

1. Verify `RAZORPAY_KEY_ID` matches between backend and frontend
2. Check if using test vs live keys correctly
3. Test with Razorpay test card: `4111 1111 1111 1111` / Any future date / Any CVV
4. Check webhook URL is registered in Razorpay dashboard

### Maps not loading

1. Check API key is valid and has correct APIs enabled
2. Check allowed domains include current domain
3. Verify `MAP_PROVIDER` matches which key is set
4. Check browser console for specific Maps error

### Socket.io not connecting

1. Check `REACT_APP_SOCKET_URL` does **not** have `/api` at end
2. Verify `FRONTEND_URL` in backend allows your domain
3. Check Railway logs for socket errors
4. Test: open browser console on frontend, look for `[Socket] Connected` log

### Push notifications not working

1. Must be on HTTPS (automatic on Railway + Vercel)
2. Check VAPID keys match between backend and frontend
3. Check browser allows notifications for the domain
4. Run migration 003 if `push_subscriptions` table missing: `npm run migrate:safe`

---

## Database Quick Queries

```sql
-- Check all table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find stuck pending payments
SELECT * FROM payments
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '2 hours';

-- Active subscriptions without driver
SELECT us.id, u.full_name, r.route_name
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN routes r ON us.route_id = r.id
WHERE us.status = 'active' AND us.driver_id IS NULL;

-- Driver attendance rate this month
SELECT u.full_name,
  COUNT(*) FILTER (WHERE da.status = 'completed') AS completed,
  COUNT(*) AS total,
  ROUND(
    COUNT(*) FILTER (WHERE da.status = 'completed')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS rate
FROM driver_attendance da
JOIN driver_profiles dp ON da.driver_id = dp.id
JOIN users u ON dp.user_id = u.id
WHERE da.date >= DATE_TRUNC('month', NOW())
GROUP BY u.full_name
ORDER BY rate DESC;

-- Monthly revenue
SELECT
  DATE_TRUNC('month', created_at) AS month,
  SUM(amount) AS revenue,
  COUNT(*) AS transactions
FROM payments
WHERE status = 'success'
GROUP BY month
ORDER BY month DESC
LIMIT 6;
```

---

## Project Stats

| Metric | Value |
|--------|-------|
| Total API endpoints | 79 |
| Database tables | 12 |
| Socket.io events | 25+ |
| React pages | 30+ |
| Test cases | 50+ |
| Backend files | ~85 |
| Frontend files | ~95 |
| Estimated LOC | 18,000+ |

---

> **Need more details?** See `API_DOCS.md`, `DEPLOY_COMMANDS.md`, or `ACHIEVEMENT_REPORT.md`.
