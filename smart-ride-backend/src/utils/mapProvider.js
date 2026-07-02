const axios = require('axios');
const {
  MAP_PROVIDER,
  GOOGLE_MAPS_API_KEY,
  MAPPLS_API_KEY,
  MAPPLS_CLIENT_ID,
  MAPPLS_CLIENT_SECRET,
} = require('../config/env');
const logger = require('./logger');

/**
 * Returns the map configuration based on the configured provider.
 * @returns {Object} Map provider config with script URL for frontend embedding.
 */
const getMapConfig = () => {
  if (MAP_PROVIDER === 'mappls') {
    return {
      provider: 'mappls',
      apiKey: MAPPLS_API_KEY,
      clientId: MAPPLS_CLIENT_ID,
      clientSecret: MAPPLS_CLIENT_SECRET,
      scriptUrl: `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_API_KEY}/map_load?v=1.5`,
    };
  }

  // Default: Google Maps
  return {
    provider: 'google',
    apiKey: GOOGLE_MAPS_API_KEY,
    scriptUrl: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions`,
  };
};

/**
 * Get distance and duration between two coordinates.
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @returns {Promise<{ distance_km: number, duration_min: number }>}
 */
const getDistanceMatrix = async (origin, destination) => {
  try {
    if (MAP_PROVIDER === 'mappls') {
      const url = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_API_KEY}/distance_matrix/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = response.data;

      if (
        result &&
        result.results &&
        result.results.durations &&
        result.results.distances
      ) {
        return {
          distance_km: parseFloat((result.results.distances[0][1] / 1000).toFixed(2)),
          duration_min: Math.ceil(result.results.durations[0][1] / 60),
        };
      }

      throw new Error('Invalid response from Mappls distance matrix API');
    }

    // Default: Google Maps Distance Matrix
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const response = await axios.get(url, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: GOOGLE_MAPS_API_KEY,
        units: 'metric',
      },
    });

    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Google Distance Matrix returned status: ${element.status}`);
    }

    return {
      distance_km: parseFloat((element.distance.value / 1000).toFixed(2)),
      duration_min: Math.ceil(element.duration.value / 60),
    };
  } catch (error) {
    logger.error(`Distance matrix error (${MAP_PROVIDER}): ${error.message}`);
    throw error;
  }
};

/**
 * Geocode an address string to lat/lng coordinates.
 * @param {string} address
 * @returns {Promise<{ lat: number, lng: number, formatted_address: string }>}
 */
const getGeocode = async (address) => {
  try {
    if (MAP_PROVIDER === 'mappls') {
      const tokenResponse = await axios.post(
        'https://outpost.mappls.com/api/security/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: MAPPLS_CLIENT_ID,
          client_secret: MAPPLS_CLIENT_SECRET,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      const geocodeResponse = await axios.get(
        'https://atlas.mappls.com/api/places/geocode',
        {
          params: { address },
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = geocodeResponse.data;

      if (result && result.copResults) {
        return {
          lat: parseFloat(result.copResults.latitude),
          lng: parseFloat(result.copResults.longitude),
          formatted_address: result.copResults.formattedAddress || address,
        };
      }

      throw new Error('Invalid response from Mappls Geocoding API');
    }

    // Default: Google Geocoding
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const response = await axios.get(url, {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      throw new Error(`Google Geocoding returned status: ${response.data.status}`);
    }

    const result = response.data.results[0];

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
    };
  } catch (error) {
    logger.error(`Geocoding error (${MAP_PROVIDER}): ${error.message}`);
    throw error;
  }
};

module.exports = { getMapConfig, getDistanceMatrix, getGeocode };
