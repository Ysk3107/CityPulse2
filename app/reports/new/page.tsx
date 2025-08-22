"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { LocationPicker } from "@/components/location-picker"
import { PhotoUpload } from "@/components/photo-upload"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Camera } from "lucide-react"

const categories = [
  { value: "infrastructure", label: "Infrastructure" },
  { value: "safety", label: "Safety" },
  { value: "environment", label: "Environment" },
  { value: "transportation", label: "Transportation" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
]

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

export default function NewReportPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("medium")
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Get credits
      const { data: creditsData } = await supabase.from("credits").select("amount").eq("user_id", user.id)
      const totalCredits = creditsData?.reduce((sum, credit) => sum + credit.amount, 0) || 0
      setCredits(totalCredits)
    }

    getUser()
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !location) return

    setLoading(true)

    try {
      // Create the report
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          priority,
          latitude: location.lat,
          longitude: location.lng,
          address: location.address,
          status: "pending",
          photos: photos,
        })
        .select()
        .single()

      if (reportError) throw reportError

      const baseCredits = 10
      const photoBonus = photos.length * 2 // 2 extra credits per photo
      const totalCredits = baseCredits + photoBonus

      const { error: creditsError } = await supabase.rpc("award_credits", {
        p_user_id: user.id,
        p_amount: totalCredits,
        p_reason: `Report submitted: ${title}${photos.length > 0 ? ` (+${photoBonus} photo bonus)` : ""}`,
        p_type: "earned",
        p_related_report_id: reportData.id,
      })

      if (creditsError) console.error("Error awarding credits:", creditsError)

      router.push("/")
    } catch (error) {
      console.error("Error creating report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} credits={credits} />

        <main className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
              <p className="text-gray-600">Help improve your community by reporting problems</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Issue Details</span>
                  </CardTitle>
                  <CardDescription>Provide clear details about the issue you're reporting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the issue, including any relevant context"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map((pri) => (
                            <SelectItem key={pri.value} value={pri.value}>
                              {pri.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Photos</span>
                  </CardTitle>
                  <CardDescription>Add photos to help illustrate the issue (+2 credits per photo)</CardDescription>
                </CardHeader>
                <CardContent>
                  <PhotoUpload photos={photos} onPhotosChange={setPhotos} maxPhotos={5} />
                </CardContent>
              </Card>

              <LocationPicker onLocationSelect={setLocation} selectedLocation={location} />

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !title || !description || !category || !location}>
                  {loading ? "Submitting..." : `Submit Report (+${10 + photos.length * 2} Credits)`}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
