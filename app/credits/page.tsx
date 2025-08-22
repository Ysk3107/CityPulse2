"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Coins, Trophy, Gift, History, Star, TrendingUp } from "lucide-react"

interface Credit {
  id: string
  amount: number
  reason: string
  type: string
  created_at: string
}

interface Reward {
  id: string
  title: string
  description: string
  cost: number
  category: string
  image_url: string | null
  stock_quantity: number
  is_active: boolean
}

interface Achievement {
  id: string
  achievement_type: string
  achievement_name: string
  description: string
  credits_awarded: number
  earned_at: string
}

interface Redemption {
  id: string
  reward_id: string
  credits_spent: number
  status: string
  redemption_code: string
  created_at: string
  rewards: {
    title: string
    description: string
  }
}

export default function CreditsPage() {
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [creditHistory, setCreditHistory] = useState<Credit[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)
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

      try {
        const { data: creditsData, error: creditsError } = await supabase
          .from("credits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (creditsError) {
          console.error("Error fetching credits:", creditsError)
        }

        if (creditsData) {
          setCreditHistory(creditsData)
          const totalCredits = creditsData.reduce((sum, credit) => sum + credit.amount, 0)
          setCredits(Math.max(0, totalCredits)) // Ensure credits never go negative in display
        }

        // Fetch rewards
        const { data: rewardsData, error: rewardsError } = await supabase
          .from("rewards")
          .select("*")
          .eq("is_active", true)
          .order("cost")

        if (rewardsError) {
          console.error("Error fetching rewards:", rewardsError)
        }

        const fallbackRewards = [
          {
            id: "reward-1",
            title: "$5 Coffee Shop Gift Card",
            description: "Enjoy a free coffee at participating local cafes",
            cost: 50,
            category: "digital",
            image_url: "/coffee-gift-card.png",
            stock_quantity: 25,
            is_active: true,
          },
          {
            id: "reward-2",
            title: "CityPulse T-Shirt",
            description: "Show your civic pride with official CityPulse merchandise",
            cost: 100,
            category: "physical",
            image_url: "/city-t-shirt.png",
            stock_quantity: 10,
            is_active: true,
          },
          {
            id: "reward-3",
            title: "Priority Support Badge",
            description: "Get faster response times on your reports for 30 days",
            cost: 75,
            category: "digital",
            image_url: "/priority-badge.png",
            stock_quantity: 50,
            is_active: true,
          },
          {
            id: "reward-4",
            title: "City Hall Tour",
            description: "Exclusive behind-the-scenes tour of your local government",
            cost: 200,
            category: "experience",
            image_url: "/classic-city-hall.png",
            stock_quantity: 5,
            is_active: true,
          },
        ]

        setRewards(rewardsData?.length ? rewardsData : fallbackRewards)

        // Fetch achievements
        const { data: achievementsData } = await supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", user.id)
          .order("earned_at", { ascending: false })

        if (achievementsData) {
          setAchievements(achievementsData)
        }

        // Fetch redemptions
        const { data: redemptionsData } = await supabase
          .from("reward_redemptions")
          .select(
            `
            *,
            rewards (
              title,
              description
            )
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (redemptionsData) {
          setRedemptions(redemptionsData)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [supabase, router])

  const handleRedeemReward = async (rewardId: string) => {
    if (!user) return

    const reward = rewards.find((r) => r.id === rewardId)
    if (!reward) return

    if (credits < reward.cost) {
      alert(`Insufficient credits. You need ${reward.cost} credits but only have ${credits}.`)
      return
    }

    setRedeeming(rewardId)

    try {
      const { data, error } = await supabase.rpc("redeem_reward", {
        p_user_id: user.id,
        p_reward_id: rewardId,
      })

      if (error) {
        // Fallback: manually create redemption record
        const redemptionCode = `CP-${Date.now().toString(36).toUpperCase()}`

        // Insert redemption record
        const { error: redemptionError } = await supabase.from("reward_redemptions").insert({
          user_id: user.id,
          reward_id: rewardId,
          credits_spent: reward.cost,
          status: "pending",
          redemption_code: redemptionCode,
        })

        if (redemptionError) throw redemptionError

        // Deduct credits
        const { error: creditError } = await supabase.from("credits").insert({
          user_id: user.id,
          amount: -reward.cost,
          reason: `Redeemed: ${reward.title}`,
          type: "redeemed",
        })

        if (creditError) throw creditError

        alert(`Reward redeemed successfully! Your redemption code is: ${redemptionCode}`)
      }

      // Refresh data
      window.location.reload()
    } catch (error: any) {
      console.error("Redemption error:", error)
      alert(error.message || "Failed to redeem reward. Please try again.")
    } finally {
      setRedeeming(null)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "digital":
        return <Star className="h-4 w-4" />
      case "physical":
        return <Gift className="h-4 w-4" />
      case "experience":
        return <Trophy className="h-4 w-4" />
      case "discount":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "earned":
        return "bg-green-100 text-green-800"
      case "bonus":
        return "bg-blue-100 text-blue-800"
      case "redeemed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Credits & Rewards</h1>
            <p className="text-gray-600">Earn credits by contributing to your community and redeem them for rewards</p>
          </div>

          {/* Credits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <Coins className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{credits}</div>
                <p className="text-xs text-muted-foreground">Available to spend</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                <Trophy className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{achievements.length}</div>
                <p className="text-xs text-muted-foreground">Unlocked badges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
                <Gift className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{redemptions.length}</div>
                <p className="text-xs text-muted-foreground">Rewards claimed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="rewards" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rewards">Rewards Store</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="history">Credit History</TabsTrigger>
              <TabsTrigger value="redemptions">My Redemptions</TabsTrigger>
            </TabsList>

            <TabsContent value="rewards" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 relative">
                      {reward.image_url && (
                        <img
                          src={reward.image_url || "/placeholder.svg"}
                          alt={reward.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                          {getCategoryIcon(reward.category)}
                          <span className="ml-1 capitalize">{reward.category}</span>
                        </Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{reward.title}</CardTitle>
                      <CardDescription>{reward.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold text-yellow-600">{reward.cost} Credits</span>
                        </div>
                        <Button
                          onClick={() => handleRedeemReward(reward.id)}
                          disabled={credits < reward.cost || redeeming === reward.id || reward.stock_quantity === 0}
                          size="sm"
                        >
                          {redeeming === reward.id
                            ? "Redeeming..."
                            : reward.stock_quantity === 0
                              ? "Out of Stock"
                              : "Redeem"}
                        </Button>
                      </div>
                      {reward.stock_quantity > 0 && reward.stock_quantity <= 5 && (
                        <p className="text-xs text-orange-600 mt-2">Only {reward.stock_quantity} left!</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span>{achievement.achievement_name}</span>
                        {achievement.credits_awarded > 0 && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            +{achievement.credits_awarded} Credits
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{achievement.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="capitalize">{achievement.achievement_type}</span>
                        <span>Earned {new Date(achievement.earned_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {achievements.length === 0 && (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No achievements yet. Keep contributing to unlock badges!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5" />
                    <span>Credit History</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {creditHistory.map((credit) => (
                      <div key={credit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{credit.reason}</p>
                          <p className="text-xs text-gray-500">{new Date(credit.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className={getTypeColor(credit.type)}>
                            {credit.type}
                          </Badge>
                          <span className={`font-semibold ${credit.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {credit.amount > 0 ? "+" : ""}
                            {credit.amount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {creditHistory.length === 0 && (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No credit history yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="redemptions" className="space-y-4">
              <div className="space-y-4">
                {redemptions.map((redemption) => (
                  <Card key={redemption.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{redemption.rewards.title}</span>
                        <Badge
                          variant={
                            redemption.status === "fulfilled"
                              ? "default"
                              : redemption.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {redemption.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{redemption.rewards.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span>
                            Code: <code className="bg-gray-100 px-2 py-1 rounded">{redemption.redemption_code}</code>
                          </span>
                          <span className="text-red-600">-{redemption.credits_spent} Credits</span>
                        </div>
                        <span className="text-gray-500">{new Date(redemption.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {redemptions.length === 0 && (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No redemptions yet. Browse the rewards store!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  )
}
