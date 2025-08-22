"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Navigation, MapPin, Plus, Layers } from "lucide-react"

interface Report {
  id: string
  title: string
  latitude: number | null
  longitude: number | null
  category: string
  status: string
  priority: string
  created_at: string
}

interface Project {
  id: string
  title: string
  latitude: number | null
  longitude: number | null
  status: string
  category: string
}

interface InteractiveMapProps {
  reports: Report[]
  projects?: Project[]
  onLocationSelect?: (lat: number, lng: number, address?: string) => void
  height?: string
  showControls?: boolean
}

const isValidCoordinate = (lat: number | null, lng: number | null): boolean => {
  if (lat === null || lng === null) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !isNaN(lat) && !isNaN(lng)
}

export function InteractiveMap({
  reports,
  projects = [],
  onLocationSelect,
  height = "h-96",
  showControls = true,
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<Report | Project | null>(null)
  const [showReports, setShowReports] = useState(true)
  const [showProjects, setShowProjects] = useState(true)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    const initializeMap = async () => {
      if (typeof window === "undefined" || !mapRef.current || leafletMapRef.current) return

      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = (await import("leaflet")).default

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Initialize map with default center (NYC)
        const map = L.map(mapRef.current).setView([40.7128, -74.006], 12)

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map)

        // Handle map clicks for location selection
        if (onLocationSelect) {
          map.on("click", (e: any) => {
            const { lat, lng } = e.latlng
            if (isValidCoordinate(lat, lng)) {
              onLocationSelect(lat, lng)
            }
          })
        }

        leafletMapRef.current = map
        setIsMapLoaded(true)

        // Auto-get user location
        getCurrentLocation()
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setLocationError("Failed to load map. Please refresh the page.")
      }
    }

    initializeMap()

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [onLocationSelect])

  useEffect(() => {
    if (!leafletMapRef.current || !isMapLoaded) return

    const L = require("leaflet")

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      leafletMapRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Add report markers with coordinate validation
    if (showReports) {
      reports.forEach((report) => {
        if (isValidCoordinate(report.latitude, report.longitude)) {
          const color = getMarkerColor(report)
          const marker = L.circleMarker([report.latitude!, report.longitude!], {
            radius: 8,
            fillColor: color,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          }).addTo(leafletMapRef.current)

          marker.bindPopup(`
            <div class="p-2">
              <h4 class="font-medium text-sm mb-1">${report.title}</h4>
              <p class="text-xs text-gray-600 mb-1">${report.category}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-100">${report.status.replace("_", " ")}</span>
              <p class="text-xs text-gray-500 mt-1">Reported ${new Date(report.created_at).toLocaleDateString()}</p>
              <p class="text-xs text-gray-400 mt-1">Coords: ${report.latitude!.toFixed(6)}, ${report.longitude!.toFixed(6)}</p>
            </div>
          `)

          markersRef.current.push(marker)
        }
      })
    }

    // Add project markers with coordinate validation
    if (showProjects) {
      projects.forEach((project) => {
        if (isValidCoordinate(project.latitude, project.longitude)) {
          const color = getMarkerColor(project)
          const marker = L.marker([project.latitude!, project.longitude!], {
            icon: L.divIcon({
              className: "custom-project-marker",
              html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 2px solid white; border-radius: 2px;"></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          }).addTo(leafletMapRef.current)

          marker.bindPopup(`
            <div class="p-2">
              <h4 class="font-medium text-sm mb-1">${project.title}</h4>
              <p class="text-xs text-gray-600 mb-1">${project.category}</p>
              <span class="inline-block px-2 py-1 text-xs rounded-full bg-gray-100">${project.status.replace("_", " ")}</span>
              <p class="text-xs text-gray-400 mt-1">Coords: ${project.latitude!.toFixed(6)}, ${project.longitude!.toFixed(6)}</p>
            </div>
          `)

          markersRef.current.push(marker)
        }
      })
    }
  }, [reports, projects, showReports, showProjects, isMapLoaded])

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.")
      return
    }

    setIsTracking(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        if (!isValidCoordinate(lat, lng)) {
          setLocationError("Invalid location coordinates received.")
          setIsTracking(false)
          return
        }

        const newLocation = { lat, lng }
        setUserLocation(newLocation)
        setLocationError(null)
        setIsTracking(false)

        // Center map on user location if map is loaded
        if (leafletMapRef.current) {
          leafletMapRef.current.setView([newLocation.lat, newLocation.lng], 15)

          // Add user location marker
          const L = require("leaflet")
          const userMarker = L.circleMarker([newLocation.lat, newLocation.lng], {
            radius: 10,
            fillColor: "#3b82f6",
            color: "#fff",
            weight: 3,
            opacity: 1,
            fillOpacity: 1,
          }).addTo(leafletMapRef.current)

          userMarker.bindPopup(`
            <div class="p-2">
              <strong>Your Location</strong>
              <p class="text-xs text-gray-400 mt-1">Coords: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            </div>
          `)
          markersRef.current.push(userMarker)
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location."

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out."
            break
        }

        setLocationError(errorMessage)
        console.error("Geolocation error:", error)
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    )
  }

  const getMarkerColor = (item: Report | Project) => {
    if ("priority" in item) {
      // It's a report
      switch (item.status) {
        case "resolved":
          return "#10b981" // green
        case "in_progress":
          return "#f59e0b" // yellow
        case "rejected":
          return "#ef4444" // red
        default:
          return "#3b82f6" // blue
      }
    } else {
      // It's a project
      switch (item.status) {
        case "completed":
          return "#059669" // green-600
        case "in_progress":
          return "#f97316" // orange
        case "planned":
          return "#8b5cf6" // purple
        default:
          return "#6b7280" // gray
      }
    }
  }

  return (
    <div className={`${height} relative rounded-lg overflow-hidden border`}>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />

      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Loading overlay */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="absolute top-4 right-4 flex flex-col space-y-2 z-30">
          <Button
            size="sm"
            variant="secondary"
            onClick={getCurrentLocation}
            disabled={isTracking}
            className="bg-white/90 backdrop-blur-sm"
          >
            <Navigation className="h-4 w-4" />
          </Button>

          <div className="bg-white/90 backdrop-blur-sm rounded-md p-2">
            <div className="flex flex-col space-y-1">
              <Button
                size="sm"
                variant={showReports ? "default" : "ghost"}
                onClick={() => setShowReports(!showReports)}
                className="text-xs"
              >
                <MapPin className="h-3 w-3 mr-1" />
                Reports
              </Button>
              <Button
                size="sm"
                variant={showProjects ? "default" : "ghost"}
                onClick={() => setShowProjects(!showProjects)}
                className="text-xs"
              >
                <Layers className="h-3 w-3 mr-1" />
                Projects
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Location Status */}
      <div className="absolute top-4 left-4 z-30">
        {userLocation && (
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
            <Navigation className="h-3 w-3 mr-1" />
            Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
          </Badge>
        )}
        {locationError && (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            {locationError}
          </Badge>
        )}
        {isTracking && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Getting location...
          </Badge>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 z-30">
        <h3 className="font-medium text-sm mb-2">Map Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Pending Reports</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Resolved</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
            <span>Projects</span>
          </div>
        </div>
      </div>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <div className="absolute bottom-4 right-4 z-30 max-w-xs">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm line-clamp-2">{selectedMarker.title}</h4>
                <Button size="sm" variant="ghost" onClick={() => setSelectedMarker(null)} className="h-6 w-6 p-0">
                  ×
                </Button>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <Badge
                  variant="secondary"
                  className={
                    getMarkerColor(selectedMarker)
                      .replace("bg-", "bg-")
                      .replace("-500", "-100")
                      .replace("-600", "-100") + " text-gray-800"
                  }
                >
                  {selectedMarker.status.replace("_", " ")}
                </Badge>
                <span className="text-gray-500">{selectedMarker.category}</span>
              </div>
              {"created_at" in selectedMarker && (
                <p className="text-xs text-gray-500 mt-1">
                  Reported {new Date(selectedMarker.created_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Click to add instruction */}
      {onLocationSelect && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
            <Plus className="h-3 w-3 mr-1" />
            Click on map to select location
          </Badge>
        </div>
      )}
    </div>
  )
}
