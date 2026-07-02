import React, { useEffect, useRef, useState, useCallback } from 'react'
import { loadMap, getMapProvider } from '../../utils/mapLoader'
import { MapPin } from 'lucide-react'
import Spinner from '../ui/Spinner'

export default function LocationPicker({
  onLocationSelect,
  initialLat = 28.6139,
  initialLng = 77.2090,
  label = 'Select Location',
  height = '250px'
}) {
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState({ lat: initialLat, lng: initialLng })

  // Reverse geocode coordinates to address string
  const reverseGeocode = useCallback(async (lat, lng) => {
    const provider = getMapProvider()

    if (provider === 'google' && window.google) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const formatted = results[0].formatted_address
          setAddress(formatted)
          onLocationSelect({ lat, lng, address: formatted })
        }
      })
    } else {
      // Fallback: use coordinates as address
      const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setAddress(formatted)
      onLocationSelect({ lat, lng, address: formatted })
    }
  }, [onLocationSelect])

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        await loadMap()
        if (!isMounted || !mapRef.current) return

        const provider = getMapProvider()

        if (provider === 'google') {
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: initialLat, lng: initialLng },
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          })

          const marker = new window.google.maps.Marker({
            position: { lat: initialLat, lng: initialLng },
            map,
            draggable: true,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" fill="#2563EB" stroke="white" stroke-width="2"/>
                  <circle cx="20" cy="20" r="6" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(40, 40),
              anchor: new window.google.maps.Point(20, 20)
            }
          })

          markerRef.current = marker
          mapInstanceRef.current = map

          marker.addListener('dragend', () => {
            const pos = marker.getPosition()
            const lat = pos.lat()
            const lng = pos.lng()
            setCoords({ lat, lng })
            reverseGeocode(lat, lng)
          })

          map.addListener('click', (e) => {
            const lat = e.latLng.lat()
            const lng = e.latLng.lng()
            marker.setPosition({ lat, lng })
            setCoords({ lat, lng })
            reverseGeocode(lat, lng)
          })

          reverseGeocode(initialLat, initialLng)
        }

        setIsLoading(false)
      } catch (err) {
        if (isMounted) {
          setError(err.message)
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      if (markerRef.current?.setMap) {
        markerRef.current.setMap(null)
      }
    }
  }, [])

  if (error) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
        <MapPin className="mx-auto text-gray-400 mb-2" size={24} />
        <p className="text-gray-500 text-sm">Map unavailable</p>
        <p className="text-xs text-gray-400 mt-1">Enter address manually above</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-navy-700 mb-2">{label}</p>
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <Spinner size="md" />
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
      {address && (
        <div className="mt-2 flex items-start gap-2 p-2 bg-primary-50 rounded-lg">
          <MapPin size={14} className="text-primary-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-primary-700">{address}</p>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">
        Drag the marker or click on map to set exact location
      </p>
    </div>
  )
}
