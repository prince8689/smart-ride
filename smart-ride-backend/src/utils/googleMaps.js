const axios = require('axios');
const { query } = require('../config/db');
const logger = require('./logger');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBEslUO2mJK1GbB046MD8GJPcuQ_UGOYsU';

/**
 * Reverse geocode coordinates to an address
 */
const getAddressFromCoordinates = async (lat, lng) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const result = response.data.results[0];
    let city = '';
    let state = '';
    let pincode = '';

    result.address_components.forEach(component => {
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    return {
      formatted_address: result.formatted_address,
      city,
      state,
      pincode
    };
  } catch (error) {
    logger.error('Error in getAddressFromCoordinates:', error);
    throw new Error('Failed to get address from coordinates');
  }
};

/**
 * Geocode address to coordinates
 */
const getCoordinatesFromAddress = async (address) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address
    };
  } catch (error) {
    logger.error('Error in getCoordinatesFromAddress:', error);
    throw new Error('Failed to get coordinates from address');
  }
};

/**
 * Get road distance and duration between two points
 */
const getDistanceAndDuration = async (originLat, originLng, destLat, destLng) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        mode: 'driving',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];
    if (element.status !== 'OK') {
      throw new Error(`Distance Matrix Error: ${element.status}`);
    }

    // Convert meters to km, seconds to minutes
    const distanceKm = element.distance.value / 1000;
    const durationMin = Math.round(element.duration.value / 60);

    return {
      distance_km: parseFloat(distanceKm.toFixed(2)),
      duration_min: durationMin,
      distance_text: element.distance.text,
      duration_text: element.duration.text
    };
  } catch (error) {
    logger.error('Error in getDistanceAndDuration:', error);
    throw new Error('Failed to calculate distance');
  }
};

/**
 * Find optimized pickup route for shared rides
 */
const getOptimizedPickupRoute = async (driverLat, driverLng, passengers) => {
  try {
    const waypoints = passengers.map(p => `${p.lat},${p.lng}`).join('|');
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${driverLat},${driverLng}`,
        destination: `${passengers[passengers.length-1].lat},${passengers[passengers.length-1].lng}`,
        waypoints: `optimize:true|${waypoints}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Directions API Error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const waypointOrder = route.waypoint_order; // Array defining optimized sequence
    
    // Reorder passengers based on optimization
    const ordered_passengers = waypointOrder.map(index => passengers[index]);

    let total_distance_m = 0;
    let total_duration_s = 0;
    
    route.legs.forEach(leg => {
      total_distance_m += leg.distance.value;
      total_duration_s += leg.duration.value;
    });

    return {
      ordered_passengers,
      total_distance_km: parseFloat((total_distance_m / 1000).toFixed(2)),
      estimated_minutes: Math.round(total_duration_s / 60),
      polyline: route.overview_polyline.points
    };
  } catch (error) {
    logger.error('Error in getOptimizedPickupRoute:', error);
    throw new Error('Failed to optimize route');
  }
};

/**
 * SQL Query using Haversine formula to find nearby drivers
 */
const findNearbyDrivers = async (lat, lng, radiusKm = 15, vehicleType = null) => {
  try {
    const values = [lat, lng, radiusKm];
    let vehicleCondition = '';
    
    if (vehicleType) {
      vehicleCondition = 'AND v.vehicle_type = $4';
      values.push(vehicleType);
    }

    // In postgres, you can't use an alias in HAVING directly unless you wrap it.
    // Instead we compute it in the WHERE/HAVING clause directly.
    const result = await query(`
      SELECT 
        d.*, 
        u.full_name, u.phone, u.profile_photo,
        v.vehicle_type, v.brand, v.model, v.vehicle_number, v.color,
        (6371 * acos(cos(radians($1)) * cos(radians(d.current_lat)) *
        cos(radians(d.current_lng) - radians($2)) +
        sin(radians($1)) * sin(radians(d.current_lat)))) AS distance_km
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
      WHERE d.is_verified = true 
      AND d.is_available = true
      ${vehicleCondition}
      AND (6371 * acos(cos(radians($1)) * cos(radians(d.current_lat)) *
              cos(radians(d.current_lng) - radians($2)) +
              sin(radians($1)) * sin(radians(d.current_lat)))) < $3
      ORDER BY distance_km ASC, d.rating DESC
    `, values);

    return result.rows;
  } catch (error) {
    logger.error('Error in findNearbyDrivers:', error);
    throw new Error('Failed to find nearby drivers');
  }
};

module.exports = {
  getAddressFromCoordinates,
  getCoordinatesFromAddress,
  getDistanceAndDuration,
  getOptimizedPickupRoute,
  findNearbyDrivers
};
