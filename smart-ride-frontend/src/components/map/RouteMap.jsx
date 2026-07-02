import React, { useEffect, useRef, useState } from 'react'
import { loadMap, getMapProvider } from '../../utils/mapLoader'
import Spinner from '../ui/Spinner'

export default function RouteMap({
  pickupLat, pickupLng, pickupLabel = 'Pickup',
  dropLat, dropLng, dropLabel = 'Drop',
  height = '400px',
  showDirections = true
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const directionsRendererRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function initMap() {
      try {
        await loadMap()
        if (!isMounted || !mapRef.current) return

        const provider = getMapProvider()

        if (provider === 'google') {
          initGoogleMap()
        } else {
          initMapplsMap()
        }

        setIsLoading(false)
      } catch (err) {
        if (isMounted) {
          setError(err.message)
          setIsLoading(false)
        }
      }
    }

    initMap()

    return () => {
      isMounted = false
      // Cleanup markers on unmount
      markersRef.current.forEach(marker => {
        if (marker.setMap) marker.setMap(null)
      })
      markersRef.current = []
    }
  }, [])

  function initGoogleMap() {
    const center = {
      lat: (pickupLat + dropLat) / 2,
      lng: (pickupLng + dropLng) / 2
    }

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    })

    mapInstanceRef.current = map

    // Green marker for pickup
    const pickupMarker = new window.google.maps.Marker({
      position: { lat: pickupLat, lng: pickupLng },
      map,
      title: pickupLabel,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#16a34a" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="12" font-weight="bold">P</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(36, 36),
        anchor: new window.google.maps.Point(18, 18)
      }
    })

    // Red marker for drop
    const dropMarker = new window.google.maps.Marker({
      position: { lat: dropLat, lng: dropLng },
      map,
      title: dropLabel,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="#dc2626" stroke="white" stroke-width="2"/>
            <text x="18" y="23" text-anchor="middle" fill="white" font-size="12" font-weight="bold">D</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(36, 36),
        anchor: new window.google.maps.Point(18, 18)
      }
    })

    markersRef.current = [pickupMarker, dropMarker]

    // Draw route directions
    if (showDirections) {
      const directionsService = new window.google.maps.DirectionsService()
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563EB',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      })

      directionsRenderer.setMap(map)
      directionsRendererRef.current = directionsRenderer

      directionsService.route({
        origin: { lat: pickupLat, lng: pickupLng },
        destination: { lat: dropLat, lng: dropLng },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result)
        }
      })
    }
  }

  function initMapplsMap() {
    const map = window.mappls.Map(mapRef.current, {
      center: [(pickupLat + dropLat) / 2, (pickupLng + dropLng) / 2],
      zoom: 12
    })

    mapInstanceRef.current = map

    window.mappls.Marker({
      map,
      position: { lat: pickupLat, lng: pickupLng },
      popupHtml: `<b>${pickupLabel}</b>`
    })

    window.mappls.Marker({
      map,
      position: { lat: dropLat, lng: dropLng },
      popupHtml: `<b>${dropLabel}</b>`
    })
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded-2xl flex flex-col items-center justify-center text-center p-6"
      >
        <span className="text-4xl mb-3">🗺️</span>
        <p className="text-gray-600 font-medium">Map unavailable</p>
        <p className="text-gray-400 text-sm mt-1">{error}</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>📍 Pickup: {pickupLabel}</p>
          <p>📍 Drop: {dropLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="text-gray-500 text-sm mt-3">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
