# Smart Ride — Integration Test Checklist

## AUTH FLOW TESTS
- [ ] Register as vehicle_owner → receive OTP email → verify OTP → redirect to /dashboard
- [ ] Register as driver → receive OTP email → verify OTP → redirect to /driver (onboarding)
- [ ] Login as existing user → correct redirect based on role
- [ ] Login with wrong password → error message shown
- [ ] Forgot password → OTP email → reset password → login with new password
- [ ] Token expiry → auto redirect to login with toast
- [ ] Logout → clears storage → redirects to home

## USER DASHBOARD TESTS
- [ ] Dashboard loads with correct stats
- [ ] Browse Plans → all plans loaded from API
- [ ] Select plan → select route (with map showing) → set details → payment flow
- [ ] Razorpay checkout opens with correct amount
- [ ] Payment success → subscription shows as ACTIVE
- [ ] My Subscriptions → all statuses display correctly
- [ ] Cancel subscription → confirm modal → subscription cancelled
- [ ] View invoice → HTML invoice opens
- [ ] Notifications page → loads correctly, mark as read works
- [ ] Submit complaint → appears in complaints list
- [ ] Update profile → changes reflect immediately
- [ ] Change password → works correctly

## DRIVER DASHBOARD TESTS
- [ ] New driver → onboarding flow shown (create profile → add vehicle)
- [ ] After profile creation → pending verification screen shown
- [ ] Admin verifies driver → driver sees full dashboard
- [ ] Dashboard loads stats correctly
- [ ] Online/Offline toggle → updates availability
- [ ] Live map → location permission → geolocation updates marker
- [ ] Socket location events → emitted on position change
- [ ] Passengers list → assigned passengers shown correctly
- [ ] Mark attendance → attendance records created
- [ ] Earnings page → calculation correct (80% of subscription amount)

## ADMIN DASHBOARD TESTS
- [ ] Dashboard stats load correctly
- [ ] Revenue chart renders with data
- [ ] Users table → search, filter, pagination work
- [ ] Deactivate user → user cannot login → reactivate works
- [ ] Drivers list → verified/unverified filter works
- [ ] Verify driver → driver gets notification + full access
- [ ] Reject driver → driver gets rejection notification
- [ ] Assign driver to subscription → passenger gets notification
- [ ] Unassigned subscriptions list → correct count
- [ ] Bulk assign → results modal shown
- [ ] Subscription status change → user notified
- [ ] Respond to complaint → complainant gets notification
- [ ] Create route → map distance auto-calculated
- [ ] Analytics charts load correctly
- [ ] System health shows DB: healthy
- [ ] Broadcast → toast appears for connected users

## SOCKET.IO TESTS
- [ ] Connect socket on login → connect event fired
- [ ] Disconnect on logout → disconnect event fired
- [ ] Driver location update → passengers in subscription room receive broadcast
- [ ] RIDE_STARTED → passenger receives notification
- [ ] RIDE_COMPLETED → passenger receives notification
- [ ] Admin STATS_UPDATE → admin dashboard live stats update
- [ ] New subscription → admin gets real-time alert
- [ ] New complaint → admin gets real-time alert

## PAYMENT TESTS
- [ ] Create order → Razorpay order created
- [ ] Test payment (use Razorpay test card) → verify payment → subscription activated
- [ ] Invoice generated → HTML invoice correct
- [ ] Refund (within window) → initiated successfully
- [ ] Payment webhook → handled correctly
