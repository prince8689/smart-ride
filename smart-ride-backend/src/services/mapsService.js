// ========== FILE: src/services/mapsService.js ==========
const axios = require('axios');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const env = require('../config/env');

const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address string to lat/lng/place_id.
 * @param {string} address
 * @returns {{ lat: number, lng: number, formatted_address: string, place_id: string }}
 */
const geocodeAddress = async (address) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key: GOOGLE_MAPS_API_KEY },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Geocode API error: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id,
    };
  } catch (error) {
    logger.error('geocodeAddress error:', error);
    throw new Error('GEOCODE_FAILED');
  }
};

/**
 * Get driving directions between two points.
 * @returns {{ distance_km: number, duration_minutes: number, polyline: string }}
 */
const getDirections = async (originLat, originLng, destLat, destLng) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: 'driving',
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Directions API error: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    let totalDistanceM = 0;
    let totalDurationS = 0;

    route.legs.forEach((leg) => {
      totalDistanceM += leg.distance.value;
      totalDurationS += leg.duration.value;
    });

    return {
      distance_km: parseFloat((totalDistanceM / 1000).toFixed(2)),
      duration_minutes: Math.round(totalDurationS / 60),
      polyline: route.overview_polyline.points,
    };
  } catch (error) {
    logger.error('getDirections error:', error);
    throw new Error('DIRECTIONS_FAILED');
  }
};

/**
 * Decode a Google-encoded polyline string into an array of { lat, lng }.
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * @param {string} encoded
 * @returns {Array<{ lat: number, lng: number }>}
 */
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
};

/**
 * Calculate Haversine distance between two points in km.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Generate 1km route segments from origin to destination using Google Directions polyline.
 * Inserts segments into the route_segments table.
 *
 * @param {string} routeId - driver_routes.id
 * @param {number} originLat
 * @param {number} originLng
 * @param {number} destLat
 * @param {number} destLng
 * @returns {Array} - array of segment objects
 */
const generateRouteSegments = async (routeId, originLat, originLng, destLat, destLng) => {
  // 1. Get directions to obtain polyline
  const directions = await getDirections(originLat, originLng, destLat, destLng);
  const decodedPoints = decodePolyline(directions.polyline);

  if (decodedPoints.length === 0) {
    return [];
  }

  // 2. Walk along the polyline and sample every ~1km
  const segments = [];
  let accumulatedDistance = 0;
  let sequenceNumber = 1;

  // Always include the first point
  segments.push({
    driver_route_id: routeId,
    sequence_number: sequenceNumber++,
    lat: decodedPoints[0].lat,
    lng: decodedPoints[0].lng,
    distance_from_start: 0,
  });

  let lastSampledIndex = 0;

  for (let i = 1; i < decodedPoints.length; i++) {
    const dist = haversineDistance(
      decodedPoints[i - 1].lat, decodedPoints[i - 1].lng,
      decodedPoints[i].lat, decodedPoints[i].lng
    );
    accumulatedDistance += dist;

    // Sample every ~1km
    if (accumulatedDistance >= 1.0) {
      segments.push({
        driver_route_id: routeId,
        sequence_number: sequenceNumber++,
        lat: decodedPoints[i].lat,
        lng: decodedPoints[i].lng,
        distance_from_start: parseFloat(
          segments.reduce((sum, s) => sum, 0) === 0
            ? accumulatedDistance.toFixed(2)
            : (parseFloat(segments[segments.length - 1].distance_from_start) + accumulatedDistance).toFixed(2)
        ),
      });
      accumulatedDistance = 0;
      lastSampledIndex = i;
    }
  }

  // Always include the last point if not already sampled
  const lastPoint = decodedPoints[decodedPoints.length - 1];
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.lat !== lastPoint.lat || lastSegment.lng !== lastPoint.lng) {
    segments.push({
      driver_route_id: routeId,
      sequence_number: sequenceNumber++,
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      distance_from_start: directions.distance_km,
    });
  }

  // 3. Insert segments into DB
  for (const seg of segments) {
    await query(
      `INSERT INTO route_segments (driver_route_id, sequence_number, lat, lng, distance_from_start)
       VALUES ($1, $2, $3, $4, $5)`,
      [seg.driver_route_id, seg.sequence_number, seg.lat, seg.lng, seg.distance_from_start]
    );
  }

  return segments;
};

module.exports = {
  geocodeAddress,
  getDirections,
  decodePolyline,
  haversineDistance,
  generateRouteSegments,
};
// ========== END ==========
