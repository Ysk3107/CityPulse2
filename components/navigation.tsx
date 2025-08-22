"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Plus, MessageCircle, LogOut, Coins, Users, Settings, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface NavigationProps {
  user: any
  credits: number
}

export function Navigation({ user, credits }: NavigationProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <MapPin className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">CityPulse</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className="text-gray-700 hover:text-blue-600 flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link href="/reports/new" className="text-gray-700 hover:text-blue-600 flex items-center space-x-1">
                <Plus className="h-4 w-4" />
                <span>Report Issue</span>
              </Link>
              <Link href="/users" className="text-gray-700 hover:text-blue-600 flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Community</span>
              </Link>
              <Link href="/chat" className="text-gray-700 hover:text-blue-600 flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span>Support</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/credits">
              <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80">
                <Coins className="h-4 w-4 text-yellow-500" />
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {credits} Credits
                </Badge>
              </div>
            </Link>

            <div className="flex items-center space-x-2">
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>

              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
