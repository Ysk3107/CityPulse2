import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Award, Calendar, MapPin, Trophy, Medal, Crown } from "lucide-react"

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's credits
  const { data: credits } = await supabase.from("credits").select("amount").eq("user_id", user.id)
  const totalCredits = credits?.reduce((sum, credit) => sum + credit.amount, 0) || 0

  // Fetch all users with their stats
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      *,
      reports:reports(count),
      credits:credits(amount)
    `)
    .order("created_at", { ascending: false })

  // Calculate user stats
  const usersWithStats =
    profiles?.map((profile) => {
      const reportCount = profile.reports?.[0]?.count || 0
      const userCredits = profile.credits?.reduce((sum: number, credit: any) => sum + credit.amount, 0) || 0

      return {
        ...profile,
        reportCount,
        totalCredits: userCredits,
      }
    }) || []

  const mockUsers = [
    {
      id: "mock-1",
      full_name: "Sarah Johnson",
      avatar_url: null,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 15,
      totalCredits: 245,
    },
    {
      id: "mock-2",
      full_name: "Michael Chen",
      avatar_url: null,
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 12,
      totalCredits: 198,
    },
    {
      id: "mock-3",
      full_name: "Emily Rodriguez",
      avatar_url: null,
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 18,
      totalCredits: 287,
    },
    {
      id: "mock-4",
      full_name: "David Thompson",
      avatar_url: null,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 8,
      totalCredits: 134,
    },
    {
      id: "mock-5",
      full_name: "Lisa Park",
      avatar_url: null,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      reportCount: 22,
      totalCredits: 356,
    },
  ]

  const displayUsers = usersWithStats.length > 0 ? usersWithStats : mockUsers

  const leaderboard = [...displayUsers].sort((a, b) => b.totalCredits - a.totalCredits).slice(0, 100) // Show only top 100 users

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getRankBadgeColor = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-200"
      case 3:
        return "bg-amber-100 text-amber-800 border-amber-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} credits={totalCredits} />

        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Leaderboard</h1>
            <p className="text-gray-600">Top contributors making a difference in our community</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contributors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboard.length}</div>
                <p className="text-xs text-muted-foreground">Active members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Crown className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboard[0]?.totalCredits || 0}</div>
                <p className="text-xs text-muted-foreground">Credits earned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboard.reduce((sum, u) => sum + u.reportCount, 0)}</div>
                <p className="text-xs text-muted-foreground">Community submissions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaderboard.reduce((sum, u) => sum + u.totalCredits, 0)}</div>
                <p className="text-xs text-muted-foreground">Community-wide</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span>Top 100 Contributors</span>
              </CardTitle>
              <CardDescription>
                Community leaders ranked by total credits earned through civic engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Top 3 Podium */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {leaderboard.slice(0, 3).map((profile, index) => (
                  <Card
                    key={profile.id}
                    className={`relative overflow-hidden ${index === 0 ? "ring-2 ring-yellow-200" : ""}`}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="absolute top-2 right-2">{getRankIcon(index + 1)}</div>
                      <Avatar className="h-16 w-16 mx-auto mb-4">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {profile.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg mb-2">{profile.full_name || "Anonymous User"}</h3>
                      <Badge variant="secondary" className={`mb-2 ${getRankBadgeColor(index + 1)}`}>
                        #{index + 1} • {profile.totalCredits} Credits
                      </Badge>
                      <p className="text-sm text-gray-600">{profile.reportCount} reports submitted</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Member since {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Full Leaderboard Table */}
              <div className="space-y-2">
                <h4 className="font-semibold text-lg mb-4">Complete Rankings (Top 100)</h4>
                <div className="max-h-96 overflow-y-auto">
                  {leaderboard.map((profile, index) => (
                    <div
                      key={profile.id}
                      className={`flex items-center space-x-4 p-4 rounded-lg border transition-colors hover:bg-gray-50 ${index < 3 ? "bg-gradient-to-r from-yellow-50 to-transparent" : ""}`}
                    >
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2 ${getRankBadgeColor(index + 1)}`}
                      >
                        {index < 3 ? getRankIcon(index + 1) : index + 1}
                      </div>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {profile.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{profile.full_name || "Anonymous User"}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{profile.reportCount} reports</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                          {profile.totalCredits} Credits
                        </Badge>
                        {index < 10 && <p className="text-xs text-gray-500 mt-1">Top 10</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {leaderboard.length === 0 && (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No contributors yet.</p>
                  <p className="text-gray-400">Be the first to make a difference in your community!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
