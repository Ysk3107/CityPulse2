"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock, Camera } from "lucide-react"
import { VoteButtons } from "./vote-buttons"

interface Report {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  upvotes: number
  downvotes: number
  created_at: string
  address: string | null
  photos?: string[] // Added photos array to Report interface
}

interface ReportsListProps {
  reports: Report[]
  userId?: string | null
}

export function ReportsList({ reports, userId }: ReportsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (reports.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No reports yet. Be the first to report an issue!</p>
      </div>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="space-y-3 p-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm line-clamp-1">{report.title}</h3>
                <VoteButtons
                  reportId={report.id}
                  userId={userId}
                  initialUpvotes={report.upvotes}
                  initialDownvotes={report.downvotes}
                />
              </div>

              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{report.description}</p>

              {report.photos && report.photos.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center space-x-1 mb-2">
                    <Camera className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{report.photos.length} photo(s)</span>
                  </div>
                  <div className="flex space-x-2 overflow-x-auto">
                    {report.photos.slice(0, 3).map((photo, index) => (
                      <img
                        key={index}
                        src={photo || "/placeholder.svg"}
                        alt={`Report photo ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(photo, "_blank")}
                      />
                    ))}
                    {report.photos.length > 3 && (
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-gray-500">+{report.photos.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className={getStatusColor(report.status)}>
                    {report.status.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className={getPriorityColor(report.priority)}>
                    {report.priority}
                  </Badge>
                </div>

                <div className="flex items-center space-x-1 text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {report.address && (
                <div className="flex items-center space-x-1 mt-2 text-gray-500">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs truncate">{report.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
