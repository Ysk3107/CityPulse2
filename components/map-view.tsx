"use client"

import { InteractiveMap } from "./interactive-map"

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

interface MapViewProps {
  reports: Report[]
}

export function MapView({ reports }: MapViewProps) {
  return <InteractiveMap reports={reports} height="h-96" showControls={true} />
}
