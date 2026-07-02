# Smart Ride Demo Rehearsal Script (20 Minutes)

## Pre-flight Checklist
- [ ] Backend running (`npm start`)
- [ ] Frontend running (`npm start`)
- [ ] Database seeded successfully (`npm run seed`)
- [ ] 3 Incognito windows open for separate role sessions

---

## Part 1: The Commuter Experience (5 mins)
*Goal: Show how easy it is to book and track a ride.*

1. **Login** as Rahul Sharma (`user1@test.in` / `User@1234`)
2. **Dashboard Overview:** Point out the active "Monthly Premium" subscription.
3. **Tracking:** Click on the active subscription. Note the assigned driver (Suresh Kumar).
4. **Push Notification Demo:** Click "Enable Notifications" to show the PWA native prompt.

## Part 2: The Driver Experience (5 mins)
*Goal: Demonstrate the driver's daily workflow.*

1. **Login** as Suresh Kumar (`driver1@test.in` / `Driver@1234`) in a new incognito window.
2. **Dashboard Overview:** Show today's assigned route (Noida to CP).
3. **Passengers List:** Show the passenger manifest (Rahul Sharma and Rohan Mehta).
4. **Start Trip:** Click "Start Trip". *Explain that this triggers a Socket.io event broadcasting location to assigned commuters.*
5. **Switch window:** Briefly switch back to the Commuter window to show the live notification "Your ride has started!".

## Part 3: The Admin Power (8 mins)
*Goal: Highlight control, analytics, and issue resolution.*

1. **Login** as Admin (`admin@smartride.in` / `Admin@1234`) in the third window.
2. **Analytics Dashboard:** Highlight Revenue chart, Active Subscriptions, and System Health stats.
3. **Smart Match Demo:** 
   - Navigate to "Driver Assignment".
   - Find Vikram Singh's pending subscription (Dwarka to Nehru Place).
   - Click "Auto-Match". Explain the algorithm matching route proximity and vehicle capacity.
   - Assign to Deepak Yadav.
4. **Complaint Resolution:**
   - Go to Complaints. Open "AC not working" (In Progress).
   - Mark it as Resolved and type a final response.
5. **Global Broadcast:**
   - Go to Broadcast page.
   - Send message: "Heavy rain in Delhi NCR today. Please expect 10-15 minute delays." Target: "All".
   - **Switch windows:** Show the instant toast notification appearing on both the Commuter and Driver screens.

## Part 4: Q&A (2 mins)
- Wrap up.
- Highlight architecture choices (PostgreSQL, Socket.io, React PWA).
