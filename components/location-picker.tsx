"use client"

import { useState } from "react"
import { InteractiveMap } from "./interactive-map"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Search, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void
  selectedLocation?: { lat: number; lng: number; address?: string } | null
}

const isValidCoordinate = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    )
    const data = await response.json()

    if (data && data.display_name) {
      return data.display_name
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    console.error("Reverse geocoding failed:", error)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

const forwardGeocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
    )
    const data = await response.json()

    if (data && data.length > 0) {
      const result = data[0]
      const lat = Number.parseFloat(result.lat)
      const lng = Number.parseFloat(result.lon)

      if (isValidCoordinate(lat, lng)) {
        return { lat, lng }
      }
    }
    return null
  } catch (error) {
    console.error("Forward geocoding failed:", error)
    return null
  }
}

export function LocationPicker({ onLocationSelect, selectedLocation }: LocationPickerProps) {
  const [manualAddress, setManualAddress] = useState(selectedLocation?.address || "")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    if (!isValidCoordinate(lat, lng)) {
      setSearchError("Invalid coordinates selected. Please try again.")
      return
    }

    setSearchError(null)

    try {
      const address = await reverseGeocode(lat, lng)
      onLocationSelect({ lat, lng, address })
      setManualAddress(address)
    } catch (error) {
      console.error("Error getting address:", error)
      onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` })
      setManualAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    }
  }

  const handleAddressSearch = async () => {
    if (!manualAddress.trim()) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const coordinates = await forwardGeocode(manualAddress.trim())

      if (coordinates) {
        onLocationSelect({ lat: coordinates.lat, lng: coordinates.lng, address: manualAddress.trim() })
      } else {
        setSearchError("Address not found. Please try a different search term or click on the map.")
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      setSearchError("Failed to search for address. Please try again or click on the map.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Select Location</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Address Search */}
          <div className="space-y-2">
            <Label htmlFor="address">Search by Address</Label>
            <div className="flex space-x-2">
              <Input
                id="address"
                placeholder="Enter address, landmark, or coordinates"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddressSearch()}
              />
              <Button onClick={handleAddressSearch} disabled={isSearching || !manualAddress.trim()} size="sm">
                <Search className="h-4 w-4" />
                {isSearching && <span className="ml-1">...</span>}
              </Button>
            </div>
          </div>

          {searchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          )}

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Selected Location:</p>
              <p className="text-sm text-blue-700">
                {selectedLocation.address || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <InteractiveMap reports={[]} onLocationSelect={handleMapLocationSelect} height="h-64" showControls={true} />
    </div>
  )
}
