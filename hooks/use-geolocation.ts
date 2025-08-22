"use client"

import { useState, useEffect, useCallback } from "react"

interface GeolocationState {
  location: { lat: number; lng: number } | null
  error: string | null
  loading: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng)
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { enableHighAccuracy = true, timeout = 15000, maximumAge = 30000, watch = false } = options

  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
  })

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by this browser",
        loading: false,
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        if (!isValidCoordinate(lat, lng)) {
          setState((prev) => ({
            ...prev,
            error: "Invalid coordinates received from GPS",
            loading: false,
          }))
          return
        }

        setState({
          location: { lat, lng },
          error: null,
          loading: false,
        })
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location"

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions and try again."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please check your GPS settings."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again."
            break
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }))
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      },
    )
  }, [enableHighAccuracy, timeout, maximumAge])

  useEffect(() => {
    if (!watch) return

    let watchId: number

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude

          if (!isValidCoordinate(lat, lng)) {
            return // Skip invalid coordinates
          }

          setState((prev) => ({
            ...prev,
            location: { lat, lng },
            error: null,
            loading: false,
          }))
        },
        (error) => {
          setState((prev) => ({
            ...prev,
            error: "Unable to track your location",
            loading: false,
          }))
        },
        {
          enableHighAccuracy,
          timeout: 10000,
          maximumAge: 15000,
        },
      )
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watch, enableHighAccuracy, timeout, maximumAge])

  return {
    ...state,
    getCurrentLocation,
    isSupported: !!navigator.geolocation,
  }
}
