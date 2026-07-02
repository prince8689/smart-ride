# Smart Ride — Final Pre-Launch Checklist

## Backend Checklist
- [ ] All 11 DB tables created and indexed
- [ ] All 4 migrations run
- [ ] Seed data created (admin + test users)
- [ ] All 79 API endpoints tested
- [ ] JWT_SECRET is strong (64+ chars)
- [ ] RAZORPAY switched to live keys
- [ ] EMAIL_USER configured with App Password
- [ ] VAPID keys generated and set
- [ ] MAP_PROVIDER and keys set
- [ ] FRONTEND_URL set in CORS
- [ ] Webhook URL registered in Razorpay dashboard
- [ ] Health endpoint returns `{ database: 'healthy' }`
- [ ] Scheduler running (check logs for expiry + renewal)
- [ ] Socket.io connections working

## Frontend Checklist
- [ ] All env vars set in Vercel dashboard
- [ ] REACT_APP_API_URL points to Railway backend
- [ ] Maps loading (Google/Mappls API key working)
- [ ] Razorpay key matches backend key
- [ ] vercel.json rewrites configured
- [ ] PWA icons generated (all 8 sizes)
- [ ] Service worker registering in production
- [ ] Offline page working
- [ ] Push notification permission prompt working
- [ ] Install prompt appearing on mobile

## Feature Checklist
- [ ] Register → OTP → Login flow working
- [ ] Subscription creation end-to-end working
- [ ] Payment flow working (test payment)
- [ ] Invoice generation working (HTML invoice renders)
- [ ] Driver onboarding working
- [ ] Admin verify driver working
- [ ] Driver assignment working  
- [ ] Live location tracking working
- [ ] Socket.io notifications working
- [ ] Push notifications working
- [ ] Rating submission working
- [ ] Smart match returning results
- [ ] Renewal reminders in scheduler logs
- [ ] Complaint submission + response working
- [ ] Admin analytics charts rendering
- [ ] PWA installable on Android

## Security Checklist
- [ ] No console.log with sensitive data in production
- [ ] No API keys in frontend source code
- [ ] HTTPS on both Railway and Vercel
- [ ] Admin route inaccessible to non-admin users
- [ ] Rate limiting active (test by rapid requests)
- [ ] JWT expiry working (test with expired token)

## Performance Checklist
- [ ] Lighthouse Performance score > 80
- [ ] Lighthouse PWA score > 90
- [ ] Lighthouse Accessibility score > 80
- [ ] API response time < 3 seconds for all endpoints
- [ ] No console errors in browser
- [ ] Mobile responsive on all pages
- [ ] Maps loading correctly on mobile
