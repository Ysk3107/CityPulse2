import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MapView } from "@/components/map-view"
import { ReportsList } from "@/components/reports-list"
import { StatsCards } from "@/components/stats-cards"
import { Navigation } from "@/components/navigation"

export default async function HomePage() {
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

  const { data: reports } = await supabase
    .from("reports")
    .select("*, photos")
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} credits={totalCredits} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CityPulse Dashboard</h1>
          <p className="text-gray-600">Track city issues, earn rewards, and make a difference in your community</p>
        </div>

        <StatsCards />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">City Map</h2>
            </div>
            <MapView reports={reports || []} />
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Recent Reports</h2>
            </div>
            <ReportsList reports={reports || []} userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  )
}
