const { query } = require('../config/db');
const logger = require('./logger');

const getIo = () => {
  try {
    const { getIO } = require('../socket/index');
    return getIO();
  } catch (e) {
    return null;
  }
};

const findAndNotifySimilarRequests = async (newRequest) => {
  try {
    logger.info(`Running sharedRideEngine for request ${newRequest.id}`);
    
    // 1. Find similar requests
    const similarResult = await query(`
      SELECT sr.*, u.full_name, u.phone
      FROM subscription_requests sr
      JOIN users u ON sr.user_id = u.id  
      WHERE sr.user_id != $1
      AND sr.status IN ('pending_review','driver_assigned')
      AND ABS(sr.pickup_lat - $2) < 0.05
      AND ABS(sr.pickup_lng - $3) < 0.05
      AND ABS(sr.drop_lat - $4) < 0.05
      AND ABS(sr.drop_lng - $5) < 0.05
      AND sr.preferred_vehicle_type = $6
    `, [
      newRequest.user_id,
      newRequest.pickup_lat,
      newRequest.pickup_lng,
      newRequest.drop_lat,
      newRequest.drop_lng,
      newRequest.preferred_vehicle_type
    ]);

    const similarRequests = similarResult.rows;

    if (similarRequests.length > 0) {
      // 2. Check if shared_ride_group already exists
      let groupId = null;
      let existingGroup = null;

      // See if any similar request is already in a group
      const existingGroupReq = similarRequests.find(r => r.shared_ride_group_id !== null);

      if (existingGroupReq) {
        groupId = existingGroupReq.shared_ride_group_id;
        const groupResult = await query('SELECT * FROM shared_ride_groups WHERE id = $1', [groupId]);
        existingGroup = groupResult.rows[0];
        
        // Add new request to group
        await query(`
          UPDATE shared_ride_groups SET users_count = users_count + 1 WHERE id = $1
        `, [groupId]);
      } else {
        // Create new shared_ride_group
        // We'll need a table for this, assuming one exists or just using a UUID if not
        // A simple query to insert if the table exists:
        try {
          const newGroupResult = await query(`
            INSERT INTO shared_ride_groups (users_count, status)
            VALUES ($1, 'active') RETURNING id
          `, [similarRequests.length + 1]);
          groupId = newGroupResult.rows[0].id;
        } catch (e) {
          // If table doesn't exist, we skip or log error. For V2 we assume it exists
          // Since PRD didn't ask to create it in initDb, we might need to handle it.
          // Wait, PRD Phase 1 initDb did NOT have shared_ride_groups table!
          // Ah. "INSERT new shared_ride_group".
          // If it fails, I'll log and continue. Let's create it if it doesn't exist.
          await query(`
            CREATE TABLE IF NOT EXISTS shared_ride_groups (
              id SERIAL PRIMARY KEY,
              users_count INT DEFAULT 1,
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          const newGroupResult = await query(`
            INSERT INTO shared_ride_groups (users_count, status)
            VALUES ($1, 'active') RETURNING id
          `, [similarRequests.length + 1]);
          groupId = newGroupResult.rows[0].id;
        }
      }

      // We need to update all matched requests to this group ID
      const reqIdsToUpdate = [newRequest.id, ...similarRequests.map(r => r.id)];
      await query(`
        UPDATE subscription_requests 
        SET is_shared_ride_suggested = true, shared_ride_group_id = $1 
        WHERE id = ANY($2)
      `, [groupId, reqIdsToUpdate]);

      // 3. Calculate shared price
      const standard_monthly = Number(newRequest.calculated_monthly_price);
      const shared_monthly = Math.round(standard_monthly * 0.70);
      const savings = standard_monthly - shared_monthly;
      const count = similarRequests.length + 1;

      // 4. Notify new user
      await query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, '🎉 Save 30% with Shared Subscription!', $2, 'subscription')
      `, [newRequest.user_id, `${count} commuters travel your route! Private: ₹${standard_monthly}/month | Shared: ₹${shared_monthly}/month — Save ₹${savings}!`]);
      
      const io = getIo();
      if (io) {
        io.to(`user:${newRequest.user_id}`).emit('subscription:shared_opportunity', {
          group_id: groupId,
          shared_price: shared_monthly,
          standard_price: standard_monthly,
          users_count: count
        });
      }

      // 5. Notify admin
      const adminsResult = await query("SELECT id FROM users WHERE role = 'admin'");
      const adminMessage = `Shared ride opportunity: ${count} users on similar route. Potential: ₹${shared_monthly * count}/month shared vs ₹${standard_monthly}/month private`;
      for (const admin of adminsResult.rows) {
        await query(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES ($1, 'Shared Ride Opportunity', $2, 'system')
        `, [admin.id, adminMessage]);
      }

      if (io) {
        io.to('admin_room').emit('admin:shared_opportunity', { message: adminMessage });
      }
    }
  } catch (error) {
    logger.error('findAndNotifySimilarRequests error:', error);
  }
};

module.exports = {
  findAndNotifySimilarRequests
};
