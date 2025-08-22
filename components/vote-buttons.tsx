"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { useState, useEffect } from "react"

interface VoteButtonsProps {
  reportId: string
  userId: string | null
  initialUpvotes: number
  initialDownvotes: number
}

export function VoteButtons({ reportId, userId, initialUpvotes, initialDownvotes }: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const fetchUserVote = async () => {
      const { data } = await supabase
        .from("report_votes")
        .select("vote_type")
        .eq("user_id", userId)
        .eq("report_id", reportId)
        .single()

      if (data) {
        setUserVote(data.vote_type as "upvote" | "downvote")
      }
    }

    fetchUserVote()
  }, [supabase, userId, reportId])

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (!userId || loading) return

    setLoading(true)

    try {
      // Remove existing vote if same type
      if (userVote === voteType) {
        const { error } = await supabase.from("report_votes").delete().eq("user_id", userId).eq("report_id", reportId)

        if (error) throw error

        // Update local state
        if (voteType === "upvote") {
          setUpvotes((prev) => prev - 1)
        } else {
          setDownvotes((prev) => prev - 1)
        }
        setUserVote(null)

        // Update report counts
        await supabase
          .from("reports")
          .update({
            [voteType === "upvote" ? "upvotes" : "downvotes"]: voteType === "upvote" ? upvotes - 1 : downvotes - 1,
          })
          .eq("id", reportId)
      } else {
        // Add or change vote
        const { error } = await supabase
          .from("report_votes")
          .upsert({
            user_id: userId,
            report_id: reportId,
            vote_type: voteType,
          })
          .select()

        if (error) throw error

        // Update local state
        if (userVote) {
          // Changing vote
          if (userVote === "upvote") {
            setUpvotes((prev) => prev - 1)
            setDownvotes((prev) => prev + 1)
          } else {
            setDownvotes((prev) => prev - 1)
            setUpvotes((prev) => prev + 1)
          }
        } else {
          // New vote
          if (voteType === "upvote") {
            setUpvotes((prev) => prev + 1)
          } else {
            setDownvotes((prev) => prev + 1)
          }
        }
        setUserVote(voteType)

        // Update report counts
        await supabase
          .from("reports")
          .update({
            upvotes: voteType === "upvote" ? upvotes + (userVote ? 0 : 1) : upvotes - (userVote === "upvote" ? 1 : 0),
            downvotes:
              voteType === "downvote" ? downvotes + (userVote ? 0 : 1) : downvotes - (userVote === "downvote" ? 1 : 0),
          })
          .eq("id", reportId)

        // Award credits for voting (first time only)
        if (!userVote) {
          await supabase.rpc("award_credits", {
            p_user_id: userId,
            p_amount: 2,
            p_reason: "Voted on community report",
            p_type: "earned",
          })
        }
      }
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) return null

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={userVote === "upvote" ? "default" : "outline"}
        size="sm"
        onClick={() => handleVote("upvote")}
        disabled={loading}
        className="flex items-center space-x-1"
      >
        <ThumbsUp className="h-3 w-3" />
        <span>{upvotes}</span>
      </Button>
      <Button
        variant={userVote === "downvote" ? "destructive" : "outline"}
        size="sm"
        onClick={() => handleVote("downvote")}
        disabled={loading}
        className="flex items-center space-x-1"
      >
        <ThumbsDown className="h-3 w-3" />
        <span>{downvotes}</span>
      </Button>
    </div>
  )
}
