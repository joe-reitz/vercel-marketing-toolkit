'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const IMAGE_FORMATS = {
  'og': { width: 1200, height: 630 },
  'youtube': { width: 1280, height: 720 },
  'email-small': { width: 600, height: 200 },
  'email-large': { width: 600, height: 400 },
}

export default function ImageGenerator() {
  const [text, setText] = useState('')
  const [format, setFormat] = useState('og')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vercelLogo, setVercelLogo] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const logo = new Image()
    logo.src = '/vercel-logotype-light.svg'
    logo.onload = () => setVercelLogo(logo)
  }, [])

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = IMAGE_FORMATS[format as keyof typeof IMAGE_FORMATS]
    canvas.width = width
    canvas.height = height

    // Set background to black
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    // Draw Vercel logo
    if (vercelLogo) {
      const logoHeight = Math.min(height / 4, 50)
      const logoWidth = (logoHeight / vercelLogo.height) * vercelLogo.width
      ctx.drawImage(vercelLogo, 20, 20, logoWidth, logoHeight)
    }

    // Draw text in white using Geist font
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.floor(height / 10)}px "Geist", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const maxWidth = width - 40
    const words = text.split(' ')
    let line = ''
    let y = height / 2
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' '
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, width / 2, y)
        line = words[i] + ' '
        y += Math.floor(height / 10) + 10
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, width / 2, y)
  }, [text, format, vercelLogo])

  useEffect(() => {
    if (canvasRef.current && vercelLogo) {
      drawImage()
    }
  }, [text, format, vercelLogo, drawImage])

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `vercel-image-${format}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h1 className="text-2xl font-bold">Vercel Image Generator</h1>
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your text here"
        className="w-full max-w-md"
      />
      <Select value={format} onValueChange={setFormat}>
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select image format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="og">Social Media OG (1200x630)</SelectItem>
          <SelectItem value="youtube">YouTube Poster (1280x720)</SelectItem>
          <SelectItem value="email-small">Email Banner Small (600x200)</SelectItem>
          <SelectItem value="email-large">Email Banner Large (600x400)</SelectItem>
        </SelectContent>
      </Select>
      <canvas ref={canvasRef} className="border border-gray-300" />
      <Button onClick={handleExport}>Export Image</Button>
    </div>
  )
}