"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MessageCircle,
  Send,
  Bot,
  User,
  HelpCircle,
  Book,
  Phone,
  Mail,
  Sparkles,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm the CityPulse AI support assistant, powered by Google Gemini. I can help you with questions about reporting issues, earning credits, using the app, and more. What would you like to know?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [lastError, setLastError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const getBotResponse = async (userMessage: string, conversationHistory: Message[]): Promise<string> => {
    if (!isOnline) {
      throw new Error("You're currently offline. Please check your internet connection.")
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: conversationHistory.slice(-10), // Send last 10 messages for context
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many messages sent. Please wait a moment before trying again.")
        } else if (response.status === 503) {
          throw new Error("AI service is temporarily unavailable. Please try again in a few minutes.")
        } else if (response.status === 408) {
          throw new Error("Request timed out. Please try a shorter message.")
        } else {
          throw new Error(data.error || "Failed to get AI response")
        }
      }

      if (!data.message) {
        throw new Error("Invalid response from AI service")
      }

      return data.message
    } catch (error: any) {
      console.error("Error getting AI response:", error)

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection.")
      }

      throw error
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    if (inputMessage.length > 1000) {
      toast({
        title: "Message Too Long",
        description: "Please keep your message under 1000 characters.",
        variant: "destructive",
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputMessage
    setInputMessage("")
    setIsTyping(true)
    setLastError(null)

    try {
      const aiResponse = await getBotResponse(currentInput, messages)

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botResponse])
      setRetryCount(0) // Reset retry count on success
    } catch (error: any) {
      console.error("Error sending message:", error)
      setLastError(error.message)

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm sorry, I encountered an error: ${error.message}\n\nFor immediate help, please contact our support team at support@citypulse.com or call (555) 123-4567.`,
        sender: "bot",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorResponse])

      toast({
        title: "Chat Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsTyping(false)
    }
  }

  const retryLastMessage = () => {
    if (messages.length >= 2) {
      const lastUserMessage = messages[messages.length - 2]
      if (lastUserMessage.sender === "user") {
        setInputMessage(lastUserMessage.content)
        setRetryCount((prev) => prev + 1)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQuestions = [
    "How to report an issue?",
    "How do credits work?",
    "How to upload photos?",
    "What are the report statuses?",
    "How to contact support?",
    "What rewards can I redeem?",
    "How does the voting system work?",
    "Can I edit my reports?",
  ]

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
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Support Chat</h1>
              <p className="text-gray-600">Get intelligent help with CityPulse features powered by Google Gemini</p>
            </div>

            {!isOnline && (
              <Alert variant="destructive" className="mb-4">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  You're currently offline. Please check your internet connection to use the chat.
                </AlertDescription>
              </Alert>
            )}

            {lastError && retryCount > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Last message failed: {lastError}</span>
                  <Button variant="outline" size="sm" onClick={retryLastMessage}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Quick Help Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <HelpCircle className="h-5 w-5" />
                      <span>Quick Help</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Common Questions</h4>
                      <div className="space-y-2">
                        {quickQuestions.map((question, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="w-full text-left justify-start h-auto p-2 text-xs"
                            onClick={() => setInputMessage(question)}
                            disabled={isTyping || !isOnline}
                          >
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Contact Support</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4" />
                          <span>support@citypulse.com</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>(555) 123-4567</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Book className="h-4 w-4" />
                          <span>Help Center</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">AI-Powered</span>
                      </div>
                      <p className="text-xs text-purple-700">
                        This chat is enhanced with Google Gemini AI for more intelligent and helpful responses.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-3">
                <Card className="h-[600px] flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>CityPulse AI Assistant</span>
                      <Badge
                        variant="secondary"
                        className={isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {isOnline ? "Online" : "Offline"}
                      </Badge>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI-Powered
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Ask questions about reporting issues, credits, features, and more - powered by Google Gemini
                    </CardDescription>
                  </CardHeader>

                  {/* Messages Area */}
                  <CardContent className="flex-1 overflow-y-auto space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {message.sender === "bot" ? (
                              <div className="flex items-center space-x-1">
                                <Bot className="h-4 w-4" />
                                <Sparkles className="h-3 w-3 text-purple-600" />
                              </div>
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                            <span className="text-xs opacity-75">{message.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Bot className="h-4 w-4" />
                            <Sparkles className="h-3 w-3 text-purple-600" />
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Input Area */}
                  <div className="p-4 border-t">
                    <div className="flex space-x-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={
                          isOnline ? "Ask me anything about CityPulse..." : "You're offline - check your connection"
                        }
                        className="flex-1"
                        disabled={isTyping || !isOnline}
                        maxLength={1000}
                      />
                      <Button onClick={sendMessage} disabled={!inputMessage.trim() || isTyping || !isOnline}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">
                        Powered by Google Gemini AI • Responses are generated and may not always be accurate
                      </p>
                      <p className="text-xs text-gray-400">{inputMessage.length}/1000</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
