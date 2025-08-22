import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "")

const SYSTEM_PROMPT = `You are a helpful support assistant for CityPulse, a civic engagement app where citizens report infrastructure issues and earn credits for community participation.

Key features of CityPulse:
- Users can report issues like potholes, broken streetlights, graffiti, etc.
- Users earn credits: +10 for reporting, +2 per photo, +1 for voting
- Credits can be redeemed for rewards like gift cards and city merchandise
- Reports go through stages: Pending → In Progress → Resolved/Rejected
- Users can upload up to 5 photos per report
- Interactive map shows all reports and city projects
- Users can vote on reports to show support

Guidelines:
- Be helpful, friendly, and concise
- Focus on CityPulse features and functionality
- If asked about technical issues, suggest contacting support
- Encourage civic engagement and community participation
- Keep responses under 200 words when possible
- Use bullet points for lists and instructions

Contact info for escalation:
- Email: support@citypulse.com
- Phone: (555) 123-4567`

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 10 // 10 requests per minute

  const current = rateLimitMap.get(identifier)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error("Google AI API key not configured")
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please contact support." },
        { status: 503 },
      )
    }

    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 },
      )
    }

    const { message, conversationHistory = [] } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required and must be a string" }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Message too long. Please keep messages under 1000 characters." },
        { status: 400 },
      )
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json({ error: "Invalid conversation history format" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Build conversation context with validation
    const validHistory = conversationHistory
      .filter((msg: any) => msg && typeof msg.content === "string" && typeof msg.sender === "string")
      .slice(-10) // Keep last 10 messages for context
      .map((msg: any) => `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n")

    const prompt = `${SYSTEM_PROMPT}

Previous conversation:
${validHistory}

User: ${message}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      const response = await model.generateContent(prompt)
      clearTimeout(timeoutId)

      const assistantMessage = response.text()

      if (!assistantMessage || assistantMessage.length === 0) {
        throw new Error("Empty response from AI")
      }

      return NextResponse.json({ message: assistantMessage })
    } catch (aiError: any) {
      clearTimeout(timeoutId)

      if (aiError.name === "AbortError") {
        return NextResponse.json({ error: "Request timed out. Please try a shorter message." }, { status: 408 })
      }

      if (aiError.message?.includes("quota") || aiError.message?.includes("limit")) {
        return NextResponse.json(
          { error: "AI service is currently at capacity. Please try again in a few minutes." },
          { status: 503 },
        )
      }

      throw aiError // Re-throw for general error handling
    }
  } catch (error: any) {
    console.error("Chat API error:", error)

    if (error.status === 400) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error.status === 429) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }

    if (error.status === 503) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }

    // Generic fallback response
    return NextResponse.json(
      {
        error:
          "I'm experiencing technical difficulties. For immediate help, please contact our support team at support@citypulse.com or call (555) 123-4567.",
      },
      { status: 500 },
    )
  }
}
