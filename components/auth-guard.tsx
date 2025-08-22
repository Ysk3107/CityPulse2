"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import type { User } from "@supabase/supabase-js"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const redirectToLogin = useCallback(() => {
    router.push("/auth/login")
  }, [router])

  useEffect(() => {
    let mounted = true

    const getUser = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (authError) {
          console.error("Auth error:", authError)
          setError("Authentication error occurred")
          setLoading(false)
          redirectToLogin()
          return
        }

        setUser(user)
        setError(null)
        setLoading(false)

        if (!user) {
          redirectToLogin()
        }
      } catch (err) {
        console.error("Failed to get user:", err)
        if (mounted) {
          setError("Failed to authenticate")
          setLoading(false)
          redirectToLogin()
        }
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      try {
        if (event === "SIGNED_OUT" || !session) {
          setUser(null)
          redirectToLogin()
        } else if (event === "SIGNED_IN" && session?.user) {
          setUser(session.user)
          setError(null)
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user)
        }
      } catch (err) {
        console.error("Auth state change error:", err)
        setError("Authentication state error")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [redirectToLogin, supabase.auth])

  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Authenticating...</p>
          </div>
        </div>
      )
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
