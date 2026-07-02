// Tracks map loading state at module level
// Prevents duplicate script injection when multiple components mount
let googleMapsPromise = null
let mapplsPromise = null

const MAP_PROVIDER = process.env.REACT_APP_MAP_PROVIDER || 'google'
const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY
const MAPPLS_KEY = process.env.REACT_APP_MAPPLS_KEY

export function loadGoogleMaps() {
  // If already loaded return immediately
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps)
  }

  // If loading in progress return same promise
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places,directions,geometry`
    script.async = true
    script.defer = true

    script.onload = () => {
      resolve(window.google.maps)
    }

    script.onerror = () => {
      googleMapsPromise = null
      reject(new Error('Google Maps failed to load. Check your API key.'))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export function loadMappls() {
  if (window.mappls) {
    return Promise.resolve(window.mappls)
  }

  if (mapplsPromise) return mapplsPromise

  mapplsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/map_load?v=1.5`
    script.async = true

    script.onload = () => resolve(window.mappls)
    script.onerror = () => {
      mapplsPromise = null
      reject(new Error('Mappls Maps failed to load. Check your API key.'))
    }

    document.head.appendChild(script)
  })

  return mapplsPromise
}

export function loadMap() {
  if (MAP_PROVIDER === 'mappls') return loadMappls()
  return loadGoogleMaps()
}

export function getMapProvider() {
  return MAP_PROVIDER
}

// Calculate distance between two coordinates using Haversine formula
// No API call needed for basic distance calculation
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
