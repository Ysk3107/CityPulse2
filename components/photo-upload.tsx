"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PhotoUploadProps {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
}

export function PhotoUpload({ photos, onPhotosChange, maxPhotos = 5 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const compressImage = useCallback((file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      if (!ctx) {
        reject(new Error("Canvas context not available"))
        return
      }

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width
              width = maxWidth
            }
          } else {
            if (height > maxWidth) {
              width = (width * maxWidth) / height
              height = maxWidth
            }
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error("Failed to compress image"))
              }
            },
            file.type,
            quality,
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error("Failed to load image for compression"))
      }

      img.src = URL.createObjectURL(file)
    })
  }, [])

  const uploadPhoto = async (file: File, fileId: string, retryCount = 0): Promise<any> => {
    const maxRetries = 2
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file)

      const formData = new FormData()
      formData.append("file", compressedFile)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Upload failed with status ${response.status}`)
      }

      const result = await response.json()
      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

      // Clean up progress after a delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev }
          delete newProgress[fileId]
          return newProgress
        })
      }, 1000)

      return result
    } catch (error: any) {
      setUploadProgress((prev) => {
        const newProgress = { ...prev }
        delete newProgress[fileId]
        return newProgress
      })

      if (retryCount < maxRetries && (error.name === "AbortError" || error.message.includes("network"))) {
        console.log(`Retrying upload for ${file.name}, attempt ${retryCount + 1}`)
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
        return uploadPhoto(file, fileId, retryCount + 1)
      }

      throw error
    }
  }

  const validateFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return `${file.name}: Invalid file type. Only images are allowed.`
    }

    if (file.size > maxSize) {
      return `${file.name}: File too large (max 10MB).`
    }

    if (file.size === 0) {
      return `${file.name}: File is empty.`
    }

    // Check for suspicious file names
    if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
      return `${file.name}: Invalid filename.`
    }

    return null
  }

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `You can only upload up to ${maxPhotos} photos per report.`,
        variant: "destructive",
      })
      return
    }

    const validFiles: File[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)

      if (validationError) {
        errors.push(validationError)
      } else {
        validFiles.push(file)
      }
    }

    if (errors.length > 0) {
      setUploadErrors(errors)
      if (validFiles.length === 0) return
    } else {
      setUploadErrors([])
    }

    setUploading(true)
    const newPhotos: string[] = []
    let successCount = 0

    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        const fileId = `${file.name}-${Date.now()}-${index}`

        try {
          const result = await uploadPhoto(file, fileId)
          newPhotos.push(result.url)
          successCount++
        } catch (error: any) {
          console.error(`Upload error for ${file.name}:`, error)
          errors.push(`${file.name}: ${error.message}`)
        }
      })

      await Promise.all(uploadPromises)

      if (newPhotos.length > 0) {
        onPhotosChange([...photos, ...newPhotos])
        toast({
          title: "Photos uploaded",
          description: `${successCount} photo(s) uploaded successfully.`,
        })
      }

      if (errors.length > 0) {
        setUploadErrors(errors)
      }
    } finally {
      setUploading(false)
    }
  }

  const checkCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop()) // Stop the stream immediately
      return true
    } catch (error: any) {
      console.error("Camera permission error:", error)

      let errorMessage = "Camera access denied. Please allow camera access to take photos."
      if (error.name === "NotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (error.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please enable camera permissions in your browser settings."
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    }
  }

  const handleCameraClick = async () => {
    // Check camera permission before opening camera input
    const hasPermission = await checkCameraPermission()
    if (hasPermission) {
      cameraInputRef.current?.click()
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
    toast({
      title: "Photo removed",
      description: "Photo has been removed from your report.",
    })
  }

  const clearErrors = () => {
    setUploadErrors([])
  }

  return (
    <div className="space-y-4">
      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Upload errors:</p>
              {uploadErrors.map((error, index) => (
                <p key={index} className="text-sm">
                  {error}
                </p>
              ))}
              <Button variant="outline" size="sm" onClick={clearErrors} className="mt-2 bg-transparent">
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="flex items-center gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload Photos
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={uploading || photos.length >= maxPhotos}
          className="flex items-center gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Take Photo
        </Button>

        {photos.length >= maxPhotos && (
          <p className="text-sm text-muted-foreground self-center">Maximum {maxPhotos} photos reached</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative overflow-hidden group">
              <div className="aspect-square relative">
                {photo ? (
                  <img
                    src={photo || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/broken-image.png"
                      target.alt = "Failed to load image"
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploading photos...</p>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          {photos.length}/{maxPhotos} photos uploaded
        </span>
        {photos.length > 0 && <span className="text-green-600">+{photos.length * 2} credits earned</span>}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Photos are automatically compressed for faster upload</p>
        <p>• Maximum file size: 10MB per photo</p>
        <p>• Supported formats: JPG, PNG, WebP, GIF</p>
        <p>• Earn 2 credits for each photo you add</p>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
