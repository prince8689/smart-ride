const { query } = require('../config/db');

/**
 * Haversine formula to calculate distance between two coordinates in km
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  console.log('calculateDistance inputs:', lat1, lon1, lat2, lon2);
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const l1 = Number(lat1), g1 = Number(lon1), l2 = Number(lat2), g2 = Number(lon2);
  const R = 6371; // km
  const dLat = (l2 - l1) * Math.PI / 180;
  const dLon = (g2 - g1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

const formatMinsToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

/**
 * Smart Match Algorithm (Route-Based with Return Shift Support)
 */
exports.smartMatchDriver = async (subscriptionId) => {
  try {
    // 1. Get plan details
    const planResult = await query(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [subscriptionId]
    );

    if (planResult.rows.length === 0) {
      return { subscription_id: subscriptionId, recommended_drivers: [], best_match: null };
    }

    const plan = planResult.rows[0];

    // 2. Get candidate driver routes (Has capacity, active, verified and available)
    const routesResult = await query(
      `SELECT dr.*, u.full_name, u.phone, 
              d.id as driver_profile_id, d.rating, d.total_trips, d.current_lat, d.current_lng,
              v.id as vehicle_id, v.brand, v.model, v.vehicle_number as plate_number
       FROM driver_routes dr
       JOIN users u ON dr.driver_id = u.id
       JOIN drivers d ON d.user_id = u.id
       JOIN vehicles v ON v.driver_id = d.id
       JOIN driver_attendance_v2 da ON da.driver_id = u.id
       WHERE dr.status = 'active' 
         AND dr.available_seats >= $1
         AND d.is_verified = true 
         AND d.is_available = true
         AND da.date = CURRENT_DATE
         AND da.status = 'ready'`,
      [plan.number_of_passengers || 1]
    );

    console.log(`Routes fetched for sub ${subscriptionId}:`, routesResult.rows.length);

    const candidates = [];
    const planMins = parseTime(plan.morning_pickup_time); // user's requested time

    for (const route of routesResult.rows) {
      const segmentsRes = await query(`SELECT * FROM route_segments WHERE driver_route_id = $1 ORDER BY sequence_number`, [route.id]);
      const segments = segmentsRes.rows;

      // --- EVALUATE FORWARD SHIFT ---
      let fPickupDist = calculateDistance(route.start_lat, route.start_lng, plan.pickup_lat, plan.pickup_lng);
      let fDropDist = calculateDistance(route.end_lat, route.end_lng, plan.drop_lat, plan.drop_lng);
      let fPickupTimeStr = route.morning_time;
      let fPickupMins = parseTime(fPickupTimeStr);
      let fPickupIndex = -1;
      let fDropIndex = -1;

      if (segments.length > 0) {
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const sDistP = calculateDistance(seg.lat, seg.lng, plan.pickup_lat, plan.pickup_lng);
          if (sDistP < fPickupDist) {
            fPickupDist = sDistP;
            fPickupIndex = i;
            if (seg.estimated_arrival_time) {
              fPickupTimeStr = seg.estimated_arrival_time;
              fPickupMins = parseTime(fPickupTimeStr);
            }
          }
          const sDistD = calculateDistance(seg.lat, seg.lng, plan.drop_lat, plan.drop_lng);
          if (sDistD < fDropDist) {
            fDropDist = sDistD;
            fDropIndex = i;
          }
        }
      }
      
      const fPIdx = fPickupIndex === -1 ? 0 : fPickupIndex;
      const fDIdx = fDropIndex === -1 ? segments.length : fDropIndex;
      const isForwardValid = fPIdx <= fDIdx;

      // --- EVALUATE RETURN SHIFT (If evening_time is set) ---
      let rPickupDist = 9999;
      let rDropDist = 9999;
      let rPickupTimeStr = route.evening_time;
      let rPickupMins = parseTime(rPickupTimeStr);
      let rPickupIndex = -1;
      let rDropIndex = -1;

      if (route.evening_time) {
        rPickupDist = calculateDistance(route.end_lat, route.end_lng, plan.pickup_lat, plan.pickup_lng);
        rDropDist = calculateDistance(route.start_lat, route.start_lng, plan.drop_lat, plan.drop_lng);
        
        if (segments.length > 0) {
          for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i];
            const sDistP = calculateDistance(seg.lat, seg.lng, plan.pickup_lat, plan.pickup_lng);
            if (sDistP < rPickupDist) {
              rPickupDist = sDistP;
              rPickupIndex = i;
            }
            const sDistD = calculateDistance(seg.lat, seg.lng, plan.drop_lat, plan.drop_lng);
            if (sDistD < rDropDist) {
              rDropDist = sDistD;
              rDropIndex = i;
            }
          }
        }
      }
      
      const rPIdx = rPickupIndex === -1 ? segments.length : rPickupIndex;
      const rDIdx = rDropIndex === -1 ? 0 : rDropIndex;
      const isReturnValid = rPIdx >= rDIdx; // Returning, so pickup index should be higher (closer to end)

      // Check which shift is better (if any)
      const MAX_DIST = 15;
      const MAX_TIME_DIFF = 120; // 2 hours

      let bestShift = null;

      // Evaluate Forward
      let fTimeDiff = 0;
      if (planMins > 0 && fPickupMins > 0) {
        fTimeDiff = Math.abs(planMins - fPickupMins);
      }
      
      if (isForwardValid && fPickupDist <= MAX_DIST && fDropDist <= MAX_DIST && fTimeDiff <= MAX_TIME_DIFF) {
        let score = 100 - (fPickupDist * 2) - (fDropDist * 2) - (fTimeDiff * 0.5) + (parseFloat(route.rating || 0) * 2);
        bestShift = {
          type: 'forward',
          score,
          pickupDist: fPickupDist,
          dropDist: fDropDist,
          timeDiff: fTimeDiff,
          estimatedMins: fPickupMins
        };
      } else {
         console.log('Forward rejected:', { routeId: route.id, isForwardValid, fPickupDist, fDropDist, fTimeDiff });
      }

      // Evaluate Return
      if (route.evening_time) {
        let rTimeDiff = 0;
        if (planMins > 0 && rPickupMins > 0) {
          rTimeDiff = Math.abs(planMins - rPickupMins);
        }
        
        if (isReturnValid && rPickupDist <= MAX_DIST && rDropDist <= MAX_DIST && rTimeDiff <= MAX_TIME_DIFF) {
          let score = 100 - (rPickupDist * 2) - (rDropDist * 2) - (rTimeDiff * 0.5) + (parseFloat(route.rating || 0) * 2);
          if (!bestShift || score > bestShift.score) {
            bestShift = {
              type: 'return',
              score,
              pickupDist: rPickupDist,
              dropDist: rDropDist,
              timeDiff: rTimeDiff,
              estimatedMins: rPickupMins
            };
          }
        }
      }

      if (bestShift) {
        candidates.push({
          driver_profile_id: route.driver_profile_id,
          user_id: route.driver_id,
          full_name: route.full_name,
          phone: route.phone,
          vehicle: {
            id: route.vehicle_id,
            brand: route.brand,
            model: route.model,
            plate_number: route.plate_number
          },
          driver_route_id: route.id,
          available_seats: route.available_seats,
          morning_time: route.morning_time,
          evening_time: route.evening_time,
          shift_type: bestShift.type,
          estimated_pickup_time: formatMinsToTime(bestShift.estimatedMins),
          time_lag_mins: bestShift.timeDiff,
          score: Math.round(bestShift.score),
          score_breakdown: {
            proximity_pickup: bestShift.pickupDist.toFixed(2),
            proximity_drop: bestShift.dropDist.toFixed(2),
            time_lag: bestShift.timeDiff,
          }
        });
      }
    }

    // Sort DESC by score
    candidates.sort((a, b) => b.score - a.score);

    const recommended_drivers = candidates.slice(0, 5);

    return {
      subscription_id: subscriptionId,
      recommended_drivers,
      best_match: recommended_drivers.length > 0 ? recommended_drivers[0] : null
    };

  } catch (error) {
    console.error('Smart Match Error:', error);
    return { subscription_id: subscriptionId, recommended_drivers: [], best_match: null };
  }
};
