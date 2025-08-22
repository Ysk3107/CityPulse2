"use client"

import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Shield, Users, AlertTriangle, Search, Eye, CheckCircle, XCircle, Clock, MapPin } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Report {
  id: string
  title: string
  description: string
  category: string
  status: string
  priority: string
  latitude: number | null
  longitude: number | null
  photos: string[] | null
  created_at: string
  user_id: string
  profiles?: {
    full_name: string
    email: string
  }
}

interface Profile {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

interface Credit {
  id: string
  amount: number
  reason: string
  type: string
  created_at: string
  user_id: string
  profiles?: {
    full_name: string
    email: string
  }
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [reports, setReports] = useState<Report[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recentCredits, setRecentCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      // Fetch user's credits
      const { data: creditsData } = await supabase.from("credits").select("amount").eq("user_id", user.id)
      const totalCredits = creditsData?.reduce((sum, credit) => sum + credit.amount, 0) || 0
      setCredits(totalCredits)

      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false })

      if (reportsError) {
        console.error("Error fetching reports:", reportsError)
        // Add mock data for demo
        setReports([
          {
            id: "mock-1",
            title: "Broken streetlight on Main St",
            description: "The streetlight at the corner of Main St and Oak Ave has been out for 3 days",
            category: "infrastructure",
            status: "pending",
            priority: "high",
            latitude: 40.7128,
            longitude: -74.006,
            photos: ["/placeholder.svg?key=street1"],
            created_at: new Date().toISOString(),
            user_id: "user-1",
            profiles: { full_name: "John Doe", email: "john@example.com" },
          },
          {
            id: "mock-2",
            title: "Pothole on Elm Street",
            description: "Large pothole causing damage to vehicles",
            category: "infrastructure",
            status: "in_progress",
            priority: "medium",
            latitude: 40.7589,
            longitude: -73.9851,
            photos: ["/placeholder.svg?key=pothole1"],
            created_at: new Date(Date.now() - 86400000).toISOString(),
            user_id: "user-2",
            profiles: { full_name: "Jane Smith", email: "jane@example.com" },
          },
        ])
      } else {
        setReports(reportsData || [])
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
      setProfiles(profilesData || [])

      const { data: creditsHistoryData } = await supabase
        .from("credits")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      setRecentCredits(creditsHistoryData || [])
      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  const updateReportStatus = async (reportId: string, newStatus: string, adminNotes?: string) => {
    setUpdating(reportId)

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId)

      if (error) throw error

      // Update local state
      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, status: newStatus } : report)))

      toast({
        title: "Report Updated",
        description: `Report status changed to ${newStatus.replace("_", " ")}`,
      })

      setSelectedReport(null)
    } catch (error: any) {
      console.error("Error updating report:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update report status",
        variant: "destructive",
      })
    } finally {
      setUpdating(null)
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    const matchesSearch =
      searchQuery === "" ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalReports = reports.length
  const pendingReports = reports.filter((r) => r.status === "pending").length
  const totalUsers = profiles.length
  const totalCreditsIssued = recentCredits.reduce((sum, credit) => sum + Math.abs(credit.amount), 0)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} credits={credits} />

        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage CityPulse platform and community reports</p>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReports}</div>
                <p className="text-xs text-muted-foreground">All time submissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingReports}</div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered citizens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Credits Issued</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCreditsIssued}</div>
                <p className="text-xs text-muted-foreground">Community rewards</p>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs */}
          <Tabs defaultValue="reports" className="space-y-6">
            <TabsList>
              <TabsTrigger value="reports">Reports Management</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="credits">Credits System</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            {/* Reports Management */}
            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>Reports Management</CardTitle>
                  <CardDescription>Review, verify, and manage all community reports</CardDescription>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 flex-1">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search reports, users..."
                        className="flex-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(report.status)}
                            <h4 className="font-semibold">{report.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{report.description}</p>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="secondary" className={getStatusColor(report.status)}>
                              {report.status.replace("_", " ")}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(report.priority)}>
                              {report.priority}
                            </Badge>
                            <Badge variant="outline">{report.category}</Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>by {report.profiles?.full_name || "Anonymous"}</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            {report.latitude && report.longitude && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>Located</span>
                              </span>
                            )}
                            {report.photos && report.photos.length > 0 && <span>{report.photos.length} photo(s)</span>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedReport(report)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Review Report: {report.title}</DialogTitle>
                                <DialogDescription>
                                  Submitted by {report.profiles?.full_name || "Anonymous"} on{" "}
                                  {new Date(report.created_at).toLocaleDateString()}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Description</h4>
                                  <p className="text-sm text-gray-600">{report.description}</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-1">Category</h4>
                                    <Badge variant="outline">{report.category}</Badge>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Priority</h4>
                                    <Badge variant="outline" className={getPriorityColor(report.priority)}>
                                      {report.priority}
                                    </Badge>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Status</h4>
                                    <Badge variant="secondary" className={getStatusColor(report.status)}>
                                      {report.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                </div>
                                {report.photos && report.photos.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2">Photos</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {report.photos.map((photo, index) => (
                                        <img
                                          key={index}
                                          src={photo || "/placeholder.svg"}
                                          alt={`Report photo ${index + 1}`}
                                          className="w-full h-32 object-cover rounded-lg"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {report.latitude && report.longitude && (
                                  <div>
                                    <h4 className="font-medium mb-1">Location</h4>
                                    <p className="text-sm text-gray-600">
                                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => updateReportStatus(report.id, "rejected")}
                                  disabled={updating === report.id}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => updateReportStatus(report.id, "in_progress")}
                                  disabled={updating === report.id}
                                >
                                  <Clock className="h-4 w-4 mr-1" />
                                  In Progress
                                </Button>
                                <Button
                                  onClick={() => updateReportStatus(report.id, "resolved")}
                                  disabled={updating === report.id}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Resolve
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredReports.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No reports found matching your criteria.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage community members and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {profiles.slice(0, 20).map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{profile.full_name || "Anonymous User"}</h4>
                          <p className="text-sm text-gray-600">{profile.email}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(profile.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">User</Badge>
                          <Button variant="outline" size="sm">
                            Manage
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credits System */}
            <TabsContent value="credits">
              <Card>
                <CardHeader>
                  <CardTitle>Credits System</CardTitle>
                  <CardDescription>Monitor and manage the credits and rewards system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentCredits.map((credit) => (
                      <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{credit.reason}</h4>
                          <p className="text-sm text-gray-600">{credit.profiles?.full_name || "Anonymous User"}</p>
                          <p className="text-xs text-gray-500">{new Date(credit.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={credit.amount > 0 ? "default" : "secondary"}>
                            {credit.amount > 0 ? "+" : ""}
                            {credit.amount}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Settings */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Credits Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Report Submission Reward</label>
                          <Input type="number" defaultValue="10" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Photo Upload Bonus</label>
                          <Input type="number" defaultValue="2" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Vote Reward</label>
                          <Input type="number" defaultValue="1" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Platform Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Max Photos Per Report</label>
                          <Input type="number" defaultValue="5" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-medium">Auto-approve Reports</label>
                          <Select defaultValue="false">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Enabled</SelectItem>
                              <SelectItem value="false">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  )
}
