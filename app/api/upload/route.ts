import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES_PER_HOUR = 20 // Rate limiting

const uploadCounts = new Map<string, { count: number; resetTime: number }>()

function checkUploadRateLimit(identifier: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour

  const current = uploadCounts.get(identifier)

  if (!current || now > current.resetTime) {
    uploadCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= MAX_FILES_PER_HOUR) {
    return false
  }

  current.count++
  return true
}

function validateFileName(filename: string): boolean {
  // Check for path traversal attempts and malicious patterns
  const dangerousPatterns = [/\.\./, /[<>:"|?*]/, /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, /^\./, /\.$/]

  return !dangerousPatterns.some((pattern) => pattern.test(filename))
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    if (!checkUploadRateLimit(clientIP)) {
      return NextResponse.json({ error: "Upload limit exceeded. Please try again later." }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 },
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    if (!validateFileName(file.name)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
    }

    // Generate secure filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split(".").pop()?.toLowerCase()

    if (!extension || !ALLOWED_TYPES.some((type) => type.endsWith(extension))) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 })
    }

    const filename = `report-${timestamp}-${randomSuffix}.${extension}`

    try {
      const blob = await put(filename, file, {
        access: "public",
      })

      return NextResponse.json({
        url: blob.url,
        filename: filename,
        size: file.size,
        type: file.type,
      })
    } catch (blobError) {
      console.error("Blob storage error:", blobError)
      return NextResponse.json(
        {
          error: "Failed to store file. Please try again.",
        },
        { status: 503 },
      )
    }
  } catch (error: any) {
    console.error("Upload error:", error)

    if (error.name === "PayloadTooLargeError") {
      return NextResponse.json({ error: "File too large" }, { status: 413 })
    }

    if (error.message?.includes("timeout")) {
      return NextResponse.json({ error: "Upload timeout. Please try again." }, { status: 408 })
    }

    return NextResponse.json(
      {
        error: "Upload failed. Please try again.",
      },
      { status: 500 },
    )
  }
}
